// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Questionnaire route handlers — GET /api/questionnaires, POST /api/save.
 *
 * Thin HTTP wrapper over QuestionnaireService (M20-003).
 *
 * @module routes/questionnaires
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import * as schemas from '../schemas';
import {
  QuestionnaireService,
  ServiceValidationError,
  ServiceNotFoundError,
  toServiceContext,
} from '../services';
import { attachSecretWarnings } from '../utils/secret-utils';
import { errorResponse } from '../utils/errors';
import { VALIDATION as V } from '../strings';
import {
  structuredLog,
  json,
  parseBody,
  assertString,
  safePath,
  detectSecrets,
} from '../middleware';

export = function createQuestionnaireRoutes(ctx): Record<string, unknown> {
  const { sseNotify, scheduleRebuildIndex, BUSINESS_DOCS } = ctx;

  const svc = new QuestionnaireService(toServiceContext(ctx));

  // Expose for ctx.scheduleRebuildIndex wiring
  ctx._rebuildQuestionnaireIndex = () => svc.rebuildIndex(ctx.Q_INDEX_FILE as string);

  async function apiGetQuestionnaires(_req, res) {
    const result = svc.listWithCorruptionCheck();
    const response: Record<string, unknown> = { questionnaires: result.questionnaires };
    if (result.corruptionWarnings.length > 0) {
      for (const w of result.corruptionWarnings) {
        structuredLog('warn', 'markdown_corruption', { file: w.file, issues: w.issues });
      }
      response.corruptionWarnings = result.corruptionWarnings;
    }
    json(res, 200, response);
  }

  function validateSaveUpdates(updates) {
    if (!Array.isArray(updates) || updates.length === 0 || updates.length > 200)
      return V.UPDATES_RANGE;
    for (const u of updates) {
      const r = schemas.validateQuestionnaireUpdate(u);
      if (!r.valid) return r.errors[0];
    }
    return null;
  }

  function detectSaveSecrets(updates) {
    const warnings: string[] = [];
    for (const u of updates) {
      if (u.answer) warnings.push(...detectSecrets(u.answer));
    }
    const unique = [...new Set(warnings)];
    if (unique.length > 0) structuredLog('warn', 'secret_pattern_in_save', { patterns: unique });
    return unique;
  }

  async function apiSave(req, res) {
    const body = await parseBody(req);
    assertString(body.file, 'file', 500);
    const updates = body.updates as Array<{ questionId: string; answer: string; status: string }>;
    const validationError = validateSaveUpdates(updates);
    if (validationError) return json(res, 400, errorResponse('VALIDATION_ERROR', validationError));

    const filePath = safePath(BUSINESS_DOCS as string, body.file as string);

    try {
      await svc.saveAnswers(filePath, updates, 'webapp');
    } catch (e) {
      if (e instanceof ServiceNotFoundError) {
        return json(res, 404, errorResponse('FILE_NOT_FOUND', e.message));
      }
      if (e instanceof ServiceValidationError) {
        return json(res, 400, errorResponse('VALIDATION_ERROR', e.message));
      }
      throw e;
    }

    const uniqueWarnings = detectSaveSecrets(updates);
    svc.invalidateDiscoveryCache();
    scheduleRebuildIndex();
    sseNotify('questionnaire_save', { file: body.file, count: updates.length });
    const response = { ok: true, saved: updates.length };
    attachSecretWarnings(response, uniqueWarnings);
    json(res, 200, response);
  }

  return {
    'GET /api/questionnaires': apiGetQuestionnaires,
    'POST /api/save': apiSave,
  };
};
