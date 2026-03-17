// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Decision service — shared business logic for decisions (M20-002).
 *
 * Consumed by: HTTP route (routes/decisions.ts) and MCP tool (mcp-server.ts).
 * Dependencies are injected via ServiceContext.
 */

import path from 'path';
import * as models from '../models';
import * as schemas from '../schemas';
import { withFileLock } from '../file-lock';
import { sanitizeMarkdown, sanitizeQID, detectSecrets } from '../middleware';
import type {
  ServiceContext,
  DecisionCreateInput,
  DecisionMutateInput,
  DecisionResult,
  DecisionListResult,
} from './types';

export class DecisionService {
  private ctx: ServiceContext;

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  /* ── List all decisions ─────────────────────────────────────── */

  list(): DecisionListResult {
    const { store, cache, decisionsFile, decisionsDir } = this.ctx;
    const result: DecisionListResult = { open: [], decided: [], deferred: [], categories: [] };
    if (!store.exists(decisionsFile)) return result;

    const indexContent = cache.read(decisionsFile);
    const indexData = models.parseDecisions(indexContent);
    result.open = indexData.open;
    result.decided = [...indexData.decided];
    result.deferred = indexData.deferred;

    if (store.exists(decisionsDir)) {
      try {
        const files = store
          .readdir(decisionsDir)
          .filter((f) =>
            typeof f === 'string' ? f.endsWith('.md') : (f.name || '').endsWith('.md')
          );
        for (const entry of files) {
          const fname = typeof entry === 'string' ? entry : entry.name;
          const filePath = path.join(decisionsDir, fname);
          const content = cache.read(filePath);
          const header = models.parseCategoryHeader(content);
          const decisions = models.parseCategoryDecisions(content, header.stack);
          result.categories!.push({
            name: header.name,
            stack: header.stack,
            status: header.status,
            applicable: header.applicable,
            reason: header.reason,
            file: fname,
            count: decisions.length,
          });
          for (const d of decisions) {
            if (header.status === 'DEFERRED' || d.status === 'CAT_DEFERRED') {
              result.deferred.push({
                id: d.id,
                status: 'DEFERRED',
                scope: d.scope,
                subject: d.decision,
                reason: header.reason || 'Category deferred',
                date: d.date,
                category: d.category,
              });
            } else {
              result.decided.push(d);
            }
          }
        }
      } catch {
        /* directory not readable */
      }
    }
    return result;
  }

  /* ── Create a new decision ──────────────────────────────────── */

  async create(input: DecisionCreateInput): Promise<DecisionResult> {
    const { decisionsFile } = this.ctx;
    this.validateCreate(input);
    const safeText = sanitizeMarkdown(sanitizeQID(input.text));
    const safeNotes = input.notes ? sanitizeMarkdown(sanitizeQID(input.notes)) : '';

    return withFileLock(decisionsFile, async () => {
      let content = this.ctx.store.readFile(decisionsFile);
      const id = models.nextDecisionId(content, 'DEC-');
      const isQuestion = input.type === 'question' || input.type === 'OPEN_QUESTION';

      if (isQuestion) {
        content = models.addOpenQuestion(content, {
          id,
          priority: input.priority,
          scope: input.scope,
          question: safeText,
          answer: '',
          date: models.today(),
        });
      } else {
        content = models.addOperationalDecision(content, {
          id,
          priority: input.priority,
          scope: input.scope,
          decision: safeText,
          notes: safeNotes,
          date: models.today(),
        });
      }
      content = models.appendAuditTrail(content, 'create', id);

      this.ctx.safeWrite(decisionsFile, content, undefined, {
        operation: 'create',
        entityType: 'decision',
        entityId: id,
        user: 'service',
        summary: `${input.type}: ${input.text.slice(0, 80)}`,
      });

      return {
        ok: true,
        id,
        action: isQuestion ? 'created_open_question' : 'created_decision',
      };
    });
  }

  /* ── Answer an open question ────────────────────────────────── */

  async answer(id: string, answer: string, user = 'service'): Promise<DecisionResult> {
    this.validateId(id);
    if (!answer) throw new ServiceValidationError('Answer is required');
    const secrets = detectSecrets(answer);
    const safeAnswer = sanitizeMarkdown(sanitizeQID(answer));

    return withFileLock(this.ctx.decisionsFile, async () => {
      let content = this.ctx.store.readFile(this.ctx.decisionsFile);
      content = models.answerOpenQuestion(content, id, safeAnswer);
      content = models.appendAuditTrail(content, 'answer', id);

      this.ctx.safeWrite(this.ctx.decisionsFile, content, undefined, {
        operation: 'update',
        entityType: 'decision',
        entityId: id,
        user,
        summary: `Answered: ${answer.slice(0, 80)}`,
      });

      const result: DecisionResult = { ok: true, id, action: 'answered' };
      if (secrets.length) {
        result.warnings = ['Secret pattern detected in answer — review before committing'];
      }
      return result;
    });
  }

  /* ── Decide (finalize) an answered question ─────────────────── */

  async decide(id: string, user = 'service'): Promise<DecisionResult> {
    this.validateId(id);
    return withFileLock(this.ctx.decisionsFile, async () => {
      let content = this.ctx.store.readFile(this.ctx.decisionsFile);
      content = models.moveToDecided(content, id);
      content = models.appendAuditTrail(content, 'decide', id);

      this.ctx.safeWrite(this.ctx.decisionsFile, content, undefined, {
        operation: 'update',
        entityType: 'decision',
        entityId: id,
        user,
        summary: `Decided: ${id}`,
      });

      return { ok: true, id, action: 'decided' };
    });
  }

  /* ── Mutate: defer, expire, reopen, edit ────────────────────── */

  private static PAST_TENSE: Record<string, string> = {
    answer: 'answered',
    decide: 'decided',
    defer: 'deferred',
    expire: 'expired',
    reopen: 'reopened',
    edit: 'edited',
  };

  async mutate(input: DecisionMutateInput, user = 'service'): Promise<DecisionResult> {
    this.validateId(input.id);
    const targetFile = this.findDecisionFile(input.id) || this.ctx.decisionsFile;

    return withFileLock(targetFile, async () => {
      let content = this.ctx.store.readFile(targetFile);
      content = this.applyMutation(input, content);
      content = models.appendAuditTrail(content, input.action, input.id);

      this.ctx.safeWrite(targetFile, content, undefined, {
        operation: 'update',
        entityType: 'decision',
        entityId: input.id,
        user,
        summary: `Decision ${input.action}: ${input.id}`,
      });

      // Cross-file sync for expire
      if (input.action === 'expire' && targetFile !== this.ctx.decisionsFile) {
        await this.syncExpireToIndex(input);
      }

      const action = DecisionService.PAST_TENSE[input.action] || input.action;
      return { ok: true, id: input.id, action };
    });
  }

  /* ── Activate a category ────────────────────────────────────── */

  async activateCategory(
    fname: string,
    user = 'service'
  ): Promise<{ ok: boolean; action: string; file: string; name: string; stack?: string }> {
    const filePath = path.join(this.ctx.decisionsDir, fname);

    // Step 1: Update category file under its own lock
    const result = await withFileLock(filePath, () => {
      let content = this.ctx.store.readFile(filePath);
      const header = models.parseCategoryHeader(content);
      if (header.status === 'ACTIVE') {
        return { alreadyActive: true, header };
      }
      content = models.activateCategoryHeader(content);
      content = models.appendAuditTrail(content, 'activate', fname);
      this.ctx.safeWrite(filePath, content, undefined, {
        operation: 'activate',
        entityType: 'decision_category',
        entityId: fname,
        user,
        summary: `Category activated: ${header.name}`,
      });
      return { alreadyActive: false, header };
    });

    if (result.alreadyActive) {
      return { ok: true, action: 'already_active', file: fname, name: result.header.name };
    }

    // Step 2: Update index file under a separate lock
    await withFileLock(this.ctx.decisionsFile, () => {
      let indexContent = this.ctx.store.readFile(this.ctx.decisionsFile);
      const rowRe = new RegExp(
        `(\\|[^|]*\\[${models.escRx(fname)}\\][^|]*\\|[^|]*\\|)\\s*DEFERRED\\s*(\\|)\\s*NO\\s*\\|`
      );
      indexContent = indexContent.replace(rowRe, '$1 ACTIVE $2 YES |');
      this.ctx.safeWrite(this.ctx.decisionsFile, indexContent, undefined, {
        operation: 'update',
        entityType: 'decision_index',
        entityId: fname,
        user,
        summary: `Category registry updated: ${fname} -> ACTIVE`,
      });
    });

    return {
      ok: true,
      action: 'activated',
      file: fname,
      name: result.header.name,
      stack: result.header.stack,
    };
  }

  /* ── Private helpers ────────────────────────────────────────── */

  private validateCreate(input: DecisionCreateInput): void {
    const r = schemas.validateDecisionCreate(input);
    if (!r.valid) throw new ServiceValidationError(r.errors[0]);
  }

  private validateId(id: string): void {
    if (!id) throw new ServiceValidationError('Decision ID is required');
    if (!models.DEC_ID_RE.test(id))
      throw new ServiceValidationError(`Invalid decision ID format: ${id}`);
  }

  private findDecisionFile(id: string): string | null {
    const { store, decisionsFile, decisionsDir } = this.ctx;
    if (store.exists(decisionsFile)) {
      const content = store.readFile(decisionsFile);
      if (content.includes(id)) return decisionsFile;
    }
    if (store.exists(decisionsDir)) {
      try {
        const files = store
          .readdir(decisionsDir)
          .filter((f) =>
            typeof f === 'string' ? f.endsWith('.md') : (f.name || '').endsWith('.md')
          );
        for (const entry of files) {
          const fname = typeof entry === 'string' ? entry : entry.name;
          const fp = path.join(decisionsDir, fname);
          const content = store.readFile(fp);
          if (content.includes(id)) return fp;
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  private applyMutation(input: DecisionMutateInput, content: string): string {
    switch (input.action) {
      case 'answer':
        if (!input.answer) throw new ServiceValidationError('Answer is required');
        return models.answerOpenQuestion(content, input.id, sanitizeMarkdown(input.answer));
      case 'decide':
        if (!input.answer) throw new ServiceValidationError('Answer is required');
        content = models.answerOpenQuestion(content, input.id, sanitizeMarkdown(input.answer));
        return models.moveToDecided(content, input.id);
      case 'defer':
        return models.deferOpenQuestion(content, input.id, input.reason || '');
      case 'expire':
        return models.expireDecidedItem(content, input.id, input.reason || '');
      case 'reopen':
        return models.reopenItem(content, input.id);
      case 'edit':
        return models.editDecidedRow(content, input.id, {
          priority: input.priority,
          scope: input.scope,
          text: input.text,
          notes: input.notes,
        });
      default:
        throw new ServiceValidationError(`Unknown action: ${input.action}`);
    }
  }

  private async syncExpireToIndex(input: DecisionMutateInput): Promise<void> {
    await withFileLock(this.ctx.decisionsFile, () => {
      let indexContent = this.ctx.store.readFile(this.ctx.decisionsFile);
      const esc = models.escRx(input.id);
      const rowRe = new RegExp(`\\|\\s*${esc}\\s*\\|`);
      if (!rowRe.test(indexContent.split('## Deferred')[1] || '')) {
        indexContent = models.insertDeferredRow(
          indexContent,
          input.id,
          'EXPIRED',
          input.scope || '',
          input.text || input.id,
          input.reason || 'Expired via service'
        );
        indexContent = models.appendAuditTrail(indexContent, 'expire', input.id);
        this.ctx.safeWrite(this.ctx.decisionsFile, indexContent, undefined, {
          operation: 'update',
          entityType: 'decision',
          entityId: input.id,
          user: 'service',
          summary: `Decision expire cross-file: ${input.id}`,
        });
      }
    });
  }
}

/* ── Validation error ─────────────────────────────────────────── */

export class ServiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceValidationError';
  }
}
