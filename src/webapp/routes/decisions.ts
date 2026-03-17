// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Decision route handlers — GET/POST /api/decisions, POST /api/decisions/activate-category.
 *
 * Thin HTTP wrapper over DecisionService (M20-003).
 *
 * @module routes/decisions
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import path from 'path';
import { getStore } from '../store';
import * as models from '../models';
import * as schemas from '../schemas';
import { withFileLock } from '../file-lock';
import { DecisionService, ServiceValidationError, toServiceContext } from '../services';
import { attachSecretWarnings } from '../utils/secret-utils';
import { errorResponse } from '../utils/errors';
import { VALIDATION as V } from '../strings';
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
  const { sseNotify, DECISIONS_FILE } = ctx;

  const svc = new DecisionService(toServiceContext(ctx));

  /* ── HTTP-level validation & sanitization ────────────────── */

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

  /* ── Decisions API handlers ─────────────────────────────────── */

  async function apiGetDecisions(_req, res) {
    json(res, 200, svc.list());
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

    try {
      let result;
      if (body.action === 'create') {
        result = await svc.create(
          body as unknown as import('../services/types').DecisionCreateInput
        );
      } else {
        result = await svc.mutate(
          body as unknown as import('../services/types').DecisionMutateInput,
          'webapp'
        );
      }
      sseNotify('decision_update', { action: body.action, id: result.id });
      return json(res, 200, attachSecretWarnings(result, secretWarnings));
    } catch (e) {
      if (e instanceof ServiceValidationError) {
        return json(res, 400, errorResponse('INVALID_ACTION', e.message));
      }
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'ENOENT') {
        return json(res, 404, errorResponse('DECISIONS_NOT_FOUND', 'decisions.md not found'));
      }
      throw e;
    }
  }

  /* ── Activate Category API ──────────────────────────────────── */

  async function apiPostActivateCategory(req, res) {
    const body = await parseBody(req);
    assertString(body.file, 'file', 100);
    const fname = path.basename(body.file as string);
    if (!fname.endsWith('.md') || fname.includes('..') || fname.includes(path.sep)) {
      return json(res, 400, errorResponse('INVALID_FILE', 'Invalid category filename'));
    }

    try {
      const result = await svc.activateCategory(fname, 'webapp');
      sseNotify('decision_update', {
        action: result.action === 'already_active' ? 'already_active' : 'activate_category',
        file: fname,
        name: result.name,
      });
      return json(res, 200, result);
    } catch (e) {
      if (e instanceof ServiceValidationError) {
        return json(res, 400, errorResponse('INVALID_FILE', e.message));
      }
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'ENOENT') {
        return json(res, 404, errorResponse('FILE_NOT_FOUND', `Category file ${fname} not found`));
      }
      throw e;
    }
  }

  /* ── Promote Lesson API (HTTP-only, no MCP equivalent) ────── */

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
      ctx.safeWriteSync(DECISIONS_FILE, decContent, undefined, {
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
      ctx.safeWriteSync(LESSONS_FILE, updatedLessons, undefined, {
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
