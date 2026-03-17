// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Questionnaire service — shared business logic for questionnaires (M20-002).
 *
 * Consumed by: HTTP route (routes/questionnaires.ts) and MCP tool (mcp-server.ts).
 * Dependencies are injected via ServiceContext.
 */

import path from 'path';
import * as models from '../models';
import * as schemas from '../schemas';
import { withFileLock } from '../file-lock';
import { sanitizeMarkdown, sanitizeQID, detectSecrets, safePath } from '../middleware';
import { ServiceValidationError, ServiceNotFoundError } from './decisions-service';
import type { ServiceContext, QuestionnaireUpdate, SaveAnswersResult } from './types';

export class QuestionnaireService {
  private ctx: ServiceContext;
  private _discoveryCache: string[] | null = null;
  private _discoveryCacheTime = 0;
  private static readonly DISCOVERY_CACHE_TTL_MS = 10_000;

  constructor(ctx: ServiceContext) {
    this.ctx = ctx;
  }

  /* ── List all questionnaires with completion stats ──────────── */

  list(): Array<ReturnType<typeof models.parseQuestionnaire>> {
    this.discoverFiles();
    const files = this._discoveryCache || [];
    const result: Array<ReturnType<typeof models.parseQuestionnaire>> = [];
    for (const f of files) {
      let content: string;
      try {
        content = this.ctx.cache.read(f);
      } catch {
        continue;
      }
      result.push(models.parseQuestionnaire(content, f, this.ctx.businessDocs));
    }
    return result;
  }

  /* ── Get a single questionnaire by file path ────────────────── */

  get(file: string): ReturnType<typeof models.parseQuestionnaire> {
    const abs = safePath(this.ctx.businessDocs, file);
    if (!this.ctx.store.exists(abs)) {
      throw new ServiceValidationError(`File not found: ${file}`);
    }
    const content = this.ctx.store.readFile(abs);
    return models.parseQuestionnaire(content, abs, this.ctx.businessDocs);
  }

  /* ── Get corruption warnings for listed questionnaires ──────── */

  listWithCorruptionCheck(): {
    questionnaires: Array<ReturnType<typeof models.parseQuestionnaire>>;
    corruptionWarnings: Array<{ file: string; issues: string[] }>;
  } {
    this.discoverFiles();
    const files = this._discoveryCache || [];
    const questionnaires: Array<ReturnType<typeof models.parseQuestionnaire>> = [];
    const corruptionWarnings: Array<{ file: string; issues: string[] }> = [];

    for (const f of files) {
      let content: string;
      try {
        content = this.ctx.cache.read(f);
      } catch {
        continue;
      }
      const issues = models.detectMarkdownCorruption(content);
      if (issues.length > 0) {
        const relative = path.relative(this.ctx.projectRoot, f).replace(/\\/g, '/');
        corruptionWarnings.push({ file: relative, issues });
      }
      questionnaires.push(models.parseQuestionnaire(content, f, this.ctx.businessDocs));
    }
    return { questionnaires, corruptionWarnings };
  }

  /* ── Save answers to a questionnaire ────────────────────────── */

  async saveAnswers(
    file: string,
    updates: QuestionnaireUpdate[],
    user = 'service'
  ): Promise<SaveAnswersResult> {
    this.validateUpdates(updates);
    const filePath = safePath(this.ctx.businessDocs, file);
    if (!this.ctx.store.exists(filePath)) {
      throw new ServiceNotFoundError(`File not found: ${file}`);
    }

    // Sanitize
    for (const u of updates) {
      if (u.answer) u.answer = sanitizeMarkdown(sanitizeQID(u.answer));
    }

    const warnings: string[] = [];
    await withFileLock(filePath, () => {
      let content = this.ctx.store.readFile(filePath);
      for (const u of updates) {
        const secrets = detectSecrets(u.answer || '');
        if (secrets.length) warnings.push(`Secret pattern detected in answer for ${u.questionId}`);
        content = models.updateAnswerInContent(content, u.questionId, u.answer, u.status);
      }
      this.ctx.safeWrite(filePath, content, undefined, {
        operation: 'update',
        entityType: 'questionnaire',
        entityId: updates.map((u) => u.questionId).join(','),
        user,
        summary: `Updated ${updates.length} answer(s) in ${file}`,
      });
    });

    this.invalidateDiscoveryCache();

    const result: SaveAnswersResult = {
      saved: true,
      file,
      applied: updates.length,
      total: updates.length,
    };
    if (warnings.length) result.warnings = [...new Set(warnings)];
    return result;
  }

  /* ── Rebuild the questionnaire index ────────────────────────── */

  async rebuildIndex(indexFile: string): Promise<void> {
    const files = this.discoverFiles();
    if (files.length === 0) return;

    await withFileLock(indexFile, () => {
      const rows: string[] = [];
      for (const f of files) {
        let content: string;
        try {
          content = this.ctx.cache.read(f);
        } catch {
          continue;
        }
        const p = models.parseQuestionnaire(content, f, this.ctx.businessDocs);
        const total = p.questions.length;
        const answered = p.questions.filter((q) => q.status === 'ANSWERED').length;
        const status =
          total === 0
            ? 'OPEN'
            : answered === total
              ? 'COMPLETE'
              : answered > 0
                ? 'PARTIAL'
                : 'OPEN';
        rows.push(
          `| ${p.file} | ${p.phase} | ${(p as unknown as { agent: string }).agent} | ${total} | ${answered} | ${status} |`
        );
      }

      const md = [
        '# Questionnaire Index',
        `> Last updated: ${models.isoNow()}`,
        '',
        '| File | Phase | Agent | Questions | Answered | Status |',
        '|------|-------|-------|-----------|----------|--------|',
        ...rows,
        '',
      ].join('\n');

      this.ctx.safeWrite(indexFile, md);
    });
  }

  /* ── Cache management ───────────────────────────────────────── */

  invalidateDiscoveryCache(): void {
    this._discoveryCache = null;
    this._discoveryCacheTime = 0;
  }

  /* ── Private discovery ──────────────────────────────────────── */

  private discoverFiles(): string[] {
    const now = Date.now();
    if (
      this._discoveryCache &&
      now - this._discoveryCacheTime < QuestionnaireService.DISCOVERY_CACHE_TTL_MS
    ) {
      return this._discoveryCache;
    }
    if (!this.ctx.store.exists(this.ctx.businessDocs)) return [];
    const results: string[] = [];
    this.walkDir(this.ctx.businessDocs, 0, results);
    const sorted = results.sort();
    this._discoveryCache = sorted;
    this._discoveryCacheTime = now;
    return sorted;
  }

  private walkDir(dir: string, depth: number, results: string[]): void {
    if (depth > 20) return;
    let entries: Array<string | { name: string; isDirectory(): boolean; isFile(): boolean }>;
    try {
      entries = this.ctx.store.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const name = typeof entry === 'string' ? entry : entry.name;
      const full = path.join(dir, name);
      try {
        if (typeof entry !== 'string' && entry.isDirectory()) {
          this.walkDir(full, depth + 1, results);
        } else if (
          (typeof entry !== 'string' && entry.isFile() && name.endsWith('-questionnaire.md')) ||
          (typeof entry === 'string' && name.endsWith('-questionnaire.md'))
        ) {
          results.push(full);
        }
      } catch {
        /* skip inaccessible */
      }
    }
  }

  private validateUpdates(updates: QuestionnaireUpdate[]): void {
    if (!Array.isArray(updates) || updates.length === 0 || updates.length > 200) {
      throw new ServiceValidationError('Updates must be a non-empty array (max 200)');
    }
    for (const u of updates) {
      const r = schemas.validateQuestionnaireUpdate(u);
      if (!r.valid) throw new ServiceValidationError(r.errors[0]);
      if (!models.Q_ID_RE.test(u.questionId)) {
        throw new ServiceValidationError(`Invalid Q-ID format: ${u.questionId}`);
      }
    }
  }
}
