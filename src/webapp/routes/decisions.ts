// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Decision route handlers — GET/POST /api/decisions, POST /api/decisions/activate-category.
 * @module routes/decisions
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import path from 'path';
import { getStore } from '../store';
import * as models from '../models';
import * as schemas from '../schemas';
import { withFileLock } from '../file-lock';
import { attachSecretWarnings } from '../utils/secret-utils';
import { errorResponse } from '../utils/errors';
import { VALIDATION as V, RESPONSES as R } from '../strings';
import {
  structuredLog,
  json,
  parseBody,
  assertString,
  sanitizeMarkdown,
  sanitizeQID,
  checkSecretsInBody,
} from '../middleware';
import {
  findPromotionCandidates,
  markLessonPromoted,
  buildDecisionFromLesson,
} from '../lesson-promotion';

export = function createDecisionRoutes(ctx): Record<string, unknown> {
  const { _cache, safeWriteSync, sseNotify, DECISIONS_FILE, DECISIONS_DIR } = ctx;

  /* ── Decisions parser — reads index + category files ──────── */

  function classifyCategoryDecisions(result, header, decisions) {
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

  function processCategoryFile(result, fname) {
    const filePath = path.join(DECISIONS_DIR, fname);
    const content = _cache.read(filePath);
    const header = models.parseCategoryHeader(content);
    const decisions = models.parseCategoryDecisions(content, header.stack);
    result.categories.push({
      name: header.name,
      stack: header.stack,
      status: header.status,
      applicable: header.applicable,
      reason: header.reason,
      file: fname,
      count: decisions.length,
    });
    classifyCategoryDecisions(result, header, decisions);
  }

  function parseDecisions() {
    const store = getStore();
    const result = { open: [], decided: [], deferred: [], categories: [] };
    if (!store.exists(DECISIONS_FILE)) return result;
    const indexContent = _cache.read(DECISIONS_FILE);
    const indexData = models.parseDecisions(indexContent);
    result.open = indexData.open;
    result.decided = [...indexData.decided];
    result.deferred = indexData.deferred;

    if (store.exists(DECISIONS_DIR)) {
      try {
        const files = store
          .readdir(DECISIONS_DIR)
          .filter((f) =>
            typeof f === 'string' ? f.endsWith('.md') : (f.name || '').endsWith('.md')
          );
        for (const entry of files) {
          const fname = typeof entry === 'string' ? entry : entry.name;
          processCategoryFile(result, fname);
        }
      } catch {
        /* directory not readable — ignore */
      }
    }

    return result;
  }

  /* ── Decisions API handlers ─────────────────────────────────── */

  async function apiGetDecisions(_req, res) {
    const decisions = parseDecisions();
    json(res, 200, decisions);
  }

  const DECISION_TEXT_FIELDS = ['text', 'notes', 'answer', 'reason', 'scope'];
  const DECISION_SECRET_FIELDS = ['text', 'notes', 'answer', 'reason'];

  function validateDecisionBody(body) {
    const r = schemas.validateDecisionMutation(body);
    if (!r.valid) return r.errors[0];
    if (body.id && !models.DEC_ID_RE.test(body.id)) return V.INVALID_DEC_ID;
    for (const f of DECISION_TEXT_FIELDS) {
      if (body[f]) assertString(body[f], f, f === 'scope' ? 200 : 2000);
    }
    return null;
  }

  function sanitizeDecisionFields(body) {
    for (const f of DECISION_TEXT_FIELDS) {
      if (body[f]) body[f] = sanitizeMarkdown(sanitizeQID(body[f]));
    }
  }

  function detectDecisionSecrets(body) {
    return checkSecretsInBody(body, DECISION_SECRET_FIELDS);
  }

  function validateDecisionCreateFields(body) {
    const r = schemas.validateDecisionCreate(body);
    return r.valid ? null : r.errors[0];
  }

  function handleDecisionCreate(body, content) {
    const err = validateDecisionCreateFields(body);
    if (err) return { error: err };
    const id = models.nextDecisionId(content, 'DEC-');
    if (body.type === 'OPEN_QUESTION') {
      content = models.addOpenQuestion(content, {
        id,
        priority: body.priority,
        scope: body.scope,
        question: body.text,
        answer: '',
        date: models.today(),
      });
    } else {
      content = models.addOperationalDecision(content, {
        id,
        priority: body.priority,
        scope: body.scope,
        decision: body.text,
        notes: body.notes || '',
        date: models.today(),
      });
    }
    content = models.appendAuditTrail(content, 'create', id);
    return {
      content,
      result: {
        ok: true,
        id,
        action: body.type === 'OPEN_QUESTION' ? 'created_open_question' : 'created_decision',
      },
    };
  }

  function mutateAnswer(body, content) {
    if (!body.id || !body.answer) return { error: V.MISSING_ID_OR_ANSWER };
    return { content: models.answerOpenQuestion(content, body.id, body.answer) };
  }
  function mutateDecide(body, content) {
    if (!body.id || !body.answer) return { error: V.MISSING_ID_OR_ANSWER };
    content = models.answerOpenQuestion(content, body.id, body.answer);
    return { content: models.moveToDecided(content, body.id) };
  }
  function mutateDefer(body, content) {
    if (!body.id) return { error: V.MISSING_ID };
    return { content: models.deferOpenQuestion(content, body.id, body.reason || '') };
  }
  function mutateExpire(body, content) {
    if (!body.id) return { error: V.MISSING_ID };
    return { content: models.expireDecidedItem(content, body.id, body.reason || '') };
  }
  function mutateReopen(body, content) {
    if (!body.id) return { error: V.MISSING_ID };
    return { content: models.reopenItem(content, body.id) };
  }
  function mutateEdit(body, content) {
    if (!body.id) return { error: V.MISSING_ID };
    return {
      content: models.editDecidedRow(content, body.id, {
        priority: body.priority,
        scope: body.scope,
        text: body.text,
        notes: body.notes,
      }),
    };
  }

  const DECISION_HANDLERS = {
    answer: mutateAnswer,
    decide: mutateDecide,
    defer: mutateDefer,
    expire: mutateExpire,
    reopen: mutateReopen,
    edit: mutateEdit,
  };
  const PAST_TENSE = {
    answer: 'answered',
    decide: 'decided',
    defer: 'deferred',
    expire: 'expired',
    reopen: 'reopened',
    edit: 'edited',
  };

  function findDecisionFile(id) {
    const store = getStore();
    if (store.exists(DECISIONS_FILE)) {
      const content = store.readFile(DECISIONS_FILE);
      if (content.includes(id)) return DECISIONS_FILE;
    }
    if (store.exists(DECISIONS_DIR)) {
      try {
        const files = store
          .readdir(DECISIONS_DIR)
          .filter((f) =>
            typeof f === 'string' ? f.endsWith('.md') : (f.name || '').endsWith('.md')
          );
        for (const entry of files) {
          const fname = typeof entry === 'string' ? entry : entry.name;
          const filePath = path.join(DECISIONS_DIR, fname);
          const content = store.readFile(filePath);
          if (content.includes(id)) return filePath;
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  }

  const MULTI_FILE_ACTIONS = new Set(['edit', 'expire', 'reopen']);

  function handleDecisionMutate(body, content) {
    const handler = DECISION_HANDLERS[body.action];
    if (!handler) return { error: R.unknownAction(body.action) };
    const outcome = handler(body, content);
    if (outcome.error) return outcome;
    content = models.appendAuditTrail(outcome.content, body.action, body.id);
    return {
      content,
      result: { ok: true, id: body.id, action: PAST_TENSE[body.action] || body.action },
    };
  }

  async function syncExpireToIndex(body) {
    await withFileLock(DECISIONS_FILE, () => {
      let indexContent = getStore().readFile(DECISIONS_FILE);
      const esc = models.escRx(body.id);
      const rowRe = new RegExp(`\\|\\s*${esc}\\s*\\|`);
      if (!rowRe.test(indexContent.split('## Deferred')[1] || '')) {
        indexContent = models.insertDeferredRow(
          indexContent,
          body.id,
          'EXPIRED',
          body.scope || '',
          body.text || body.id,
          body.reason || 'Expired via webapp'
        );
        indexContent = models.appendAuditTrail(indexContent, 'expire', body.id);
        safeWriteSync(DECISIONS_FILE, indexContent, undefined, {
          operation: 'update',
          entityType: 'decision',
          entityId: body.id,
          user: 'webapp',
          summary: `Decision expire cross-file: ${body.id}`,
        });
      }
    });
  }

  async function writeDecisionOutcome(targetFile, body, outcome) {
    const entityId = outcome.result.id || body.id;
    safeWriteSync(targetFile, outcome.content, undefined, {
      operation: body.action === 'create' ? 'create' : 'update',
      entityType: 'decision',
      entityId,
      user: 'webapp',
      summary: `Decision ${body.action}: ${entityId}`,
    });
    if (body.action === 'expire' && targetFile !== DECISIONS_FILE) {
      await syncExpireToIndex(body);
    }
    return entityId;
  }

  async function apiPostDecision(req, res) {
    const body = await parseBody(req);
    const valErr = validateDecisionBody(body);
    if (valErr) return json(res, 400, errorResponse('VALIDATION_ERROR', valErr));
    sanitizeDecisionFields(body);
    const secretWarnings = detectDecisionSecrets(body);
    if (secretWarnings.length > 0)
      structuredLog('warn', 'secret_pattern_in_decision', {
        patterns: secretWarnings,
        action: body.action,
      });

    if (!getStore().exists(DECISIONS_FILE))
      return json(res, 404, errorResponse('DECISIONS_NOT_FOUND', 'decisions.md not found'));

    const targetFile =
      body.id && MULTI_FILE_ACTIONS.has(body.action as string)
        ? findDecisionFile(body.id) || DECISIONS_FILE
        : DECISIONS_FILE;

    return withFileLock(targetFile, async () => {
      const content = getStore().readFile(targetFile);
      const outcome =
        body.action === 'create'
          ? handleDecisionCreate(body, content)
          : handleDecisionMutate(body, content);
      if (outcome.error) return json(res, 400, errorResponse('INVALID_ACTION', outcome.error));

      const entityId = await writeDecisionOutcome(targetFile, body, outcome);
      sseNotify('decision_update', { action: body.action, id: entityId });
      return json(res, 200, attachSecretWarnings(outcome.result, secretWarnings));
    });
  }

  /* ── Activate Category API ──────────────────────────────────── */

  async function apiPostActivateCategory(req, res) {
    const body = await parseBody(req);
    assertString(body.file, 'file', 100);
    const fname = path.basename(body.file as string);
    if (!fname.endsWith('.md') || fname.includes('..') || fname.includes(path.sep)) {
      return json(res, 400, errorResponse('INVALID_FILE', 'Invalid category filename'));
    }
    const st = getStore();
    const filePath = path.join(DECISIONS_DIR, fname);
    if (!st.exists(filePath)) {
      return json(res, 404, errorResponse('FILE_NOT_FOUND', `Category file ${fname} not found`));
    }

    // Step 1: Update category file under its own lock
    const result = await withFileLock(filePath, () => {
      let content = st.readFile(filePath);
      const header = models.parseCategoryHeader(content);
      if (header.status === 'ACTIVE') {
        return { alreadyActive: true, header };
      }
      content = models.activateCategoryHeader(content);
      content = models.appendAuditTrail(content, 'activate', fname);
      safeWriteSync(filePath, content, undefined, {
        operation: 'activate',
        entityType: 'decision_category',
        entityId: fname,
        user: 'webapp',
        summary: `Category activated: ${header.name}`,
      });
      return { alreadyActive: false, header };
    });

    if (result.alreadyActive) {
      return json(res, 200, { ok: true, action: 'already_active', file: fname });
    }

    // Step 2: Update index file under a separate (non-nested) lock
    await withFileLock(DECISIONS_FILE, () => {
      let indexContent = st.readFile(DECISIONS_FILE);
      const rowRe = new RegExp(
        `(\\|[^|]*\\[${models.escRx(fname)}\\][^|]*\\|[^|]*\\|)\\s*DEFERRED\\s*(\\|)\\s*NO\\s*\\|`
      );
      indexContent = indexContent.replace(rowRe, '$1 ACTIVE $2 YES |');
      safeWriteSync(DECISIONS_FILE, indexContent, undefined, {
        operation: 'update',
        entityType: 'decision_index',
        entityId: fname,
        user: 'webapp',
        summary: `Category registry updated: ${fname} -> ACTIVE`,
      });
    });

    sseNotify('decision_update', {
      action: 'activate_category',
      file: fname,
      name: result.header.name,
    });
    return json(res, 200, {
      ok: true,
      action: 'activated',
      file: fname,
      name: result.header.name,
      stack: result.header.stack,
    });
  }

  /* ── Promote Lesson API ────────────────────────────────────── */

  const LESSONS_FILE = path.join(
    path.dirname(DECISIONS_FILE),
    'retrospectives',
    'lessons-learned.md'
  );

  async function apiPostPromoteLesson(req, res) {
    const body = await parseBody(req);
    if (!body.lessonId || typeof body.lessonId !== 'string') {
      return json(res, 400, errorResponse('VALIDATION_ERROR', V.MISSING_LESSON_ID));
    }

    const lessonId = sanitizeMarkdown(body.lessonId.trim());
    if (!/^L\d+$/.test(lessonId)) {
      return json(res, 400, errorResponse('VALIDATION_ERROR', V.INVALID_LESSON_ID));
    }

    const store = getStore();
    if (!store.exists(LESSONS_FILE)) {
      return json(res, 404, errorResponse('LESSONS_NOT_FOUND', 'lessons-learned.md not found'));
    }
    if (!store.exists(DECISIONS_FILE)) {
      return json(res, 404, errorResponse('DECISIONS_NOT_FOUND', 'decisions.md not found'));
    }

    const priority = (body.priority as string) || 'MEDIUM';
    const scope = sanitizeMarkdown((body.scope as string) || 'All');

    const lessonsContent = store.readFile(LESSONS_FILE);
    const candidates = findPromotionCandidates(lessonsContent);
    const lesson = candidates.find((c) => c.id === lessonId);
    if (!lesson) {
      return json(
        res,
        404,
        errorResponse(
          'LESSON_NOT_FOUND',
          `Lesson ${lessonId} not found or not flagged for promotion`
        )
      );
    }

    // Step 1: Create decision under DECISIONS_FILE lock
    const id = await withFileLock(DECISIONS_FILE, () => {
      let decContent = store.readFile(DECISIONS_FILE);
      const { decision, notes } = buildDecisionFromLesson(lesson);
      const newId = models.nextDecisionId(decContent, 'DEC-');
      decContent = models.addOperationalDecision(decContent, {
        id: newId,
        priority,
        scope,
        decision,
        notes,
        date: models.today(),
      });
      decContent = models.appendAuditTrail(decContent, 'promote-lesson', newId);
      safeWriteSync(DECISIONS_FILE, decContent, undefined, {
        operation: 'create',
        entityType: 'decision',
        entityId: newId,
        user: 'webapp',
        summary: `Decision promoted from lesson ${lessonId}: ${newId}`,
      });
      return newId;
    });

    // Step 2: Mark lesson as PROMOTED under a separate (non-nested) lock
    await withFileLock(LESSONS_FILE, () => {
      const currentLessons = store.readFile(LESSONS_FILE);
      const updatedLessons = markLessonPromoted(currentLessons, lessonId);
      safeWriteSync(LESSONS_FILE, updatedLessons, undefined, {
        operation: 'update',
        entityType: 'lesson',
        entityId: lessonId,
        user: 'webapp',
        summary: `Lesson ${lessonId} promoted to decision ${id}`,
      });
    });

    sseNotify('decision_update', { action: 'promote-lesson', id, lessonId });
    return json(res, 200, { ok: true, id, lessonId, action: 'promoted' });
  }

  return {
    'GET /api/decisions': apiGetDecisions,
    'POST /api/decisions': apiPostDecision,
    'POST /api/decisions/activate-category': apiPostActivateCategory,
    'POST /api/decisions/promote-lesson': apiPostPromoteLesson,
  };
};
