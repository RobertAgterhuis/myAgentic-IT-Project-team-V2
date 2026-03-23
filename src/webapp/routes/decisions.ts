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

import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../context';
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
import * as RS from '../route-schemas';

type SimilarDecisionResponse = {
  decisionId: string;
  title: string;
  score: number;
  excerpt: string;
};

function ensureOperatorOrAdmin(request, reply, ctx: ServerContext): boolean {
  if (!ctx._authMiddleware) return true;

  const user =
    (request as { user?: { role?: string } }).user ||
    (request.raw as { user?: { role?: string } } | undefined)?.user;
  if (!user) {
    reply.code(401).send(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return false;
  }

  const role = user.role || 'viewer';
  if (role !== 'operator' && role !== 'admin') {
    reply.code(403).send(errorResponse('FORBIDDEN', 'Operator or admin role required'));
    return false;
  }

  return true;
}

function truncateExcerpt(value: string, maxLength = 220): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

function extractDecisionId(value: string): string | null {
  const match = value.match(/\bDEC(?:-[A-Za-z0-9]+)+\b/);
  return match ? match[0] : null;
}

function tokenize(value: string): Set<string> {
  return new Set((value.toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter(Boolean));
}

function overlapRatio(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) shared += 1;
  }
  return shared / Math.max(left.size, right.size);
}

function getDecisionTitle(decision: Record<string, unknown>): string {
  if (typeof decision.decision === 'string' && decision.decision.trim())
    return decision.decision.trim();
  if (typeof decision.subject === 'string' && decision.subject.trim())
    return decision.subject.trim();
  if (typeof decision.question === 'string' && decision.question.trim())
    return decision.question.trim();
  return String(decision.id || 'Untitled decision');
}

function buildSimilarDecisionResults(
  svc: DecisionService,
  results: Array<{ chunk: { chunk_text: string }; score: number }>,
  topK: number
): SimilarDecisionResponse[] {
  const listed = svc.list();
  const candidates = [...listed.decided, ...listed.deferred].map((decision) => {
    const title = getDecisionTitle(decision as Record<string, unknown>);
    const searchText = [
      title,
      typeof decision.scope === 'string' ? decision.scope : '',
      typeof (decision as { notes?: unknown }).notes === 'string'
        ? (decision as { notes: string }).notes
        : '',
      typeof (decision as { reason?: unknown }).reason === 'string'
        ? (decision as { reason: string }).reason
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    return {
      decisionId: String(decision.id),
      title,
      tokens: tokenize(searchText),
    };
  });
  const candidatesById = new Map(candidates.map((candidate) => [candidate.decisionId, candidate]));
  const matches: SimilarDecisionResponse[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    const explicitId = extractDecisionId(result.chunk.chunk_text);
    const tokenizedResult = tokenize(result.chunk.chunk_text);
    const resolvedCandidate = explicitId
      ? candidatesById.get(explicitId) || null
      : candidates
          .map((candidate) => ({
            candidate,
            score:
              overlapRatio(candidate.tokens, tokenizedResult) +
              (result.chunk.chunk_text.toLowerCase().includes(candidate.title.toLowerCase())
                ? 1
                : 0),
          }))
          .sort((left, right) => right.score - left.score)[0]?.candidate || null;

    if (!resolvedCandidate || seen.has(resolvedCandidate.decisionId)) {
      continue;
    }

    seen.add(resolvedCandidate.decisionId);
    matches.push({
      decisionId: resolvedCandidate.decisionId,
      title: resolvedCandidate.title,
      score: result.score,
      excerpt: truncateExcerpt(result.chunk.chunk_text),
    });

    if (matches.length >= topK) {
      break;
    }
  }

  return matches;
}

function triggerDecisionGroundingRefresh(ctx: ServerContext): void {
  if (!ctx._ragIndexer) return;

  const decisionsPaths = [
    path.join(ctx.BUSINESS_DOCS, 'decisions.md'),
    path.join(ctx.BUSINESS_DOCS, 'decisions'),
  ];

  for (const target of decisionsPaths) {
    setImmediate(() => {
      void ctx._ragIndexer
        ?.syncDirectory('decisions', target, { incremental: true })
        .then((stats) => {
          ctx.recordMetric('RAG', '/decisions/refresh', stats.filesProcessed, 200);
        })
        .catch(() => {
          ctx.recordMetric('RAG', '/decisions/refresh', 1, 500);
        });
    });
  }
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const svc = new DecisionService(toServiceContext(ctx as unknown as Record<string, unknown>));

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

  app.get('/api/decisions', { schema: RS.decisionsList }, async (_request, reply) => {
    return reply.send(svc.list());
  });

  const similarHandler = async (request, reply) => {
    if (!ensureOperatorOrAdmin(request, reply, ctx)) return;

    try {
      const store = ctx._ragStore;
      const embeddingProvider = ctx._embeddingProvider;
      if (!store || !embeddingProvider) {
        return reply
          .code(500)
          .send(errorResponse('INTERNAL_ERROR', 'RAG services not initialised'));
      }

      const body = (request.body as Record<string, unknown>) || {};
      const queryText = String(body.query || '').trim();
      const topK = Number.isFinite(body.topK) ? Number(body.topK) : 3;

      if (!queryText) {
        return reply.code(400).send(errorResponse('INVALID_INPUT', 'Query is required'));
      }

      if (topK < 1 || topK > 10) {
        return reply
          .code(400)
          .send(errorResponse('INVALID_INPUT', 'topK must be between 1 and 10'));
      }

      const queryVector = await embeddingProvider.embedText(queryText);
      const results = await store.query('decisions', queryVector, Math.max(topK * 3, topK), 0);
      const payload = buildSimilarDecisionResults(svc, results, Math.min(topK, 3));
      return reply.type('application/json').send(payload);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return reply.code(500).send(errorResponse('RAG_QUERY_ERROR', message));
    }
  };

  app.post('/api/v1/decisions/similar', { schema: RS.decisionSimilar }, similarHandler);
  app.post('/api/decisions/similar', { schema: RS.decisionSimilar }, similarHandler);

  app.post('/api/decisions', { schema: RS.decisionMutate }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const valErr = validateDecisionBody(body);
    if (valErr) return reply.code(400).send(errorResponse('VALIDATION_ERROR', valErr));
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
      ctx.sseNotify('decision_update', { action: body.action as string, id: result.id });
      triggerDecisionGroundingRefresh(ctx);
      return reply.type('application/json').send(attachSecretWarnings(result, secretWarnings));
    } catch (e) {
      if (e instanceof ServiceValidationError) {
        return reply.code(400).send(errorResponse('INVALID_ACTION', e.message));
      }
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'ENOENT') {
        return reply.code(404).send(errorResponse('DECISIONS_NOT_FOUND', 'decisions.md not found'));
      }
      throw e;
    }
  });

  /* ── Activate Category API ──────────────────────────────────── */

  app.post(
    '/api/decisions/activate-category',
    { schema: RS.decisionActivateCategory },
    async (request, reply) => {
      const body = request.body as Record<string, unknown>;
      const fname = path.basename(body.file as string);
      if (!fname.endsWith('.md') || fname.includes('..') || fname.includes(path.sep)) {
        return reply.code(400).send(errorResponse('INVALID_FILE', 'Invalid category filename'));
      }

      try {
        const result = await svc.activateCategory(fname, 'webapp');
        ctx.sseNotify('decision_update', {
          action: result.action === 'already_active' ? 'already_active' : 'activate_category',
          file: fname,
          name: result.name,
        });
        triggerDecisionGroundingRefresh(ctx);
        return reply.type('application/json').send(result);
      } catch (e) {
        if (e instanceof ServiceValidationError) {
          return reply.code(400).send(errorResponse('INVALID_FILE', e.message));
        }
        if (
          e &&
          typeof e === 'object' &&
          'code' in e &&
          (e as { code: string }).code === 'ENOENT'
        ) {
          return reply
            .code(404)
            .send(errorResponse('FILE_NOT_FOUND', `Category file ${fname} not found`));
        }
        throw e;
      }
    }
  );

  /* ── Promote Lesson API (HTTP-only, no MCP equivalent) ────── */

  const LESSONS_FILE = path.join(
    path.dirname(ctx.DECISIONS_FILE),
    'retrospectives',
    'lessons-learned.md'
  );

  app.post(
    '/api/decisions/promote-lesson',
    { schema: RS.decisionPromoteLesson },
    async (request, reply) => {
      const body = request.body as Record<string, unknown>;
      const lessonId = sanitizeMarkdown((body.lessonId as string).trim());
      if (!/^L\d+$/.test(lessonId)) {
        return reply.code(400).send(errorResponse('VALIDATION_ERROR', V.INVALID_LESSON_ID));
      }

      const store = getStore();
      if (!store.exists(LESSONS_FILE)) {
        return reply
          .code(404)
          .send(errorResponse('LESSONS_NOT_FOUND', 'lessons-learned.md not found'));
      }
      if (!store.exists(ctx.DECISIONS_FILE)) {
        return reply.code(404).send(errorResponse('DECISIONS_NOT_FOUND', 'decisions.md not found'));
      }

      const priority = (body.priority as string) || 'MEDIUM';
      const scope = sanitizeMarkdown((body.scope as string) || 'All');

      const lessonsContent = store.readFile(LESSONS_FILE);
      const candidates = findPromotionCandidates(lessonsContent);
      const lesson = candidates.find((c) => c.id === lessonId);
      if (!lesson) {
        return reply
          .code(404)
          .send(
            errorResponse(
              'LESSON_NOT_FOUND',
              `Lesson ${lessonId} not found or not flagged for promotion`
            )
          );
      }

      // Step 1: Create decision under DECISIONS_FILE lock
      const id = await withFileLock(ctx.DECISIONS_FILE, () => {
        let decContent = store.readFile(ctx.DECISIONS_FILE);
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
        ctx.safeWriteSync(ctx.DECISIONS_FILE, decContent, undefined, {
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

      ctx.sseNotify('decision_update', { action: 'promote-lesson', id, lessonId });
      return reply.send({ ok: true, id, lessonId, action: 'promoted' });
    }
  );
}
