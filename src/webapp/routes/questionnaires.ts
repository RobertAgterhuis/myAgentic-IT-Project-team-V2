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

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import {
  QuestionnaireService,
  ServiceValidationError,
  ServiceNotFoundError,
  toServiceContext,
} from '../services';
import { attachSecretWarnings } from '../utils/secret-utils';
import { errorResponse } from '../utils/errors';
import { structuredLog, safePath, detectSecrets } from '../middleware';
import * as RS from '../route-schemas';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const legacyCtx = ctx as unknown as Record<string, unknown>;
  const sseNotify = legacyCtx.sseNotify as (event: string, data: unknown) => void;
  const scheduleRebuildIndex = legacyCtx.scheduleRebuildIndex as () => void;
  const BUSINESS_DOCS = legacyCtx.BUSINESS_DOCS as string;

  const svc = new QuestionnaireService(toServiceContext(legacyCtx));

  // Expose for ctx.scheduleRebuildIndex wiring
  legacyCtx._rebuildQuestionnaireIndex = () => svc.rebuildIndex(legacyCtx.Q_INDEX_FILE as string);

  function detectSaveSecrets(updates: Array<{ answer?: string }>) {
    const warnings: string[] = [];
    for (const u of updates) {
      if (u.answer) warnings.push(...detectSecrets(u.answer));
    }
    const unique = [...new Set(warnings)];
    if (unique.length > 0) structuredLog('warn', 'secret_pattern_in_save', { patterns: unique });
    return unique;
  }

  // ── GET /api/questionnaires ──────────────────────────────

  app.get(
    '/api/questionnaires',
    { schema: RS.questionnairesList },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const result = svc.listWithCorruptionCheck();
      const response: Record<string, unknown> = { questionnaires: result.questionnaires };
      if (result.corruptionWarnings.length > 0) {
        for (const w of result.corruptionWarnings) {
          structuredLog('warn', 'markdown_corruption', { file: w.file, issues: w.issues });
        }
        response.corruptionWarnings = result.corruptionWarnings;
      }
      return reply.send(response);
    }
  );

  // ── POST /api/save ───────────────────────────────────────

  app.post<{
    Body: {
      file?: string;
      updates?: Array<{ questionId: string; answer: string; status: string }>;
    };
  }>('/api/save', { schema: RS.questionnaireSave }, async (request, reply) => {
    const body = request.body ?? {};
    const updates = body.updates as Array<{ questionId: string; answer: string; status: string }>;

    const filePath = safePath(BUSINESS_DOCS, body.file as string);

    try {
      await svc.saveAnswers(filePath, updates, 'webapp');
    } catch (e) {
      if (e instanceof ServiceNotFoundError) {
        return reply.code(404).send(errorResponse('FILE_NOT_FOUND', e.message));
      }
      if (e instanceof ServiceValidationError) {
        return reply.code(400).send(errorResponse('VALIDATION_ERROR', e.message));
      }
      throw e;
    }

    const uniqueWarnings = detectSaveSecrets(updates);
    svc.invalidateDiscoveryCache();
    scheduleRebuildIndex();
    sseNotify('questionnaire_save', { file: body.file, count: updates.length });
    const response: Record<string, unknown> = { ok: true, saved: updates.length };
    attachSecretWarnings(response, uniqueWarnings);
    return reply.send(response);
  });
}
