// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Job management route handlers — GET/POST /api/jobs.
 *
 * Exposes background job queue state to the UI (M24-006).
 *
 * @module routes/jobs
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { structuredLog } from '../middleware';
import { PersistentQueue } from '../../../platform/engine/jobs';
import type { StorageProvider } from '../../../platform/engine/persistence';
import type { JobFilter, JobStatus, JobType } from '../../../platform/engine/jobs';
import * as RS from '../route-schemas';

const DEFAULT_LIST_LIMIT = 100;
const MAX_LIST_LIMIT = 500;

function parseListLimit(raw?: string): number {
  if (!raw) return DEFAULT_LIST_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIST_LIMIT;
  return Math.max(1, Math.min(MAX_LIST_LIMIT, parsed));
}

function correlationIdFor(request: { id?: string; headers?: Record<string, unknown> }): string {
  const headerId = String(request.headers?.['x-correlation-id'] || '').trim();
  return headerId || String(request.id || 'n/a');
}

async function deriveQueueDegradedFlag(q: PersistentQueue): Promise<boolean> {
  const [queued, failed] = await Promise.all([q.size('queued'), q.size('failed')]);
  return queued >= 400 || failed > 0;
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const storageProvider = ctx.getStorageProvider() as StorageProvider | undefined;

  function getQueue() {
    if (!storageProvider) throw new Error('StorageProvider not initialised');
    return new PersistentQueue(storageProvider);
  }

  app.get<{ Querystring: { status?: string; type?: string; limit?: string } }>(
    '/api/jobs',
    { schema: RS.jobsList },
    async (request, reply) => {
      const correlationId = correlationIdFor(request);
      reply.header('x-correlation-id', correlationId);
      try {
        const q = getQueue();
        const filter: JobFilter = {};
        const { status, type, limit } = request.query;
        if (status) filter.status = status as JobStatus;
        if (type) filter.type = type as JobType;
        filter.limit = parseListLimit(limit);

        const jobs = await q.list(filter);
        return reply.send({
          ok: true,
          total: jobs.length,
          jobs,
          correlation_id: correlationId,
          degraded: await deriveQueueDegradedFlag(q),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        structuredLog('error', 'jobs_list_error', {
          correlation_id: correlationId,
          error: message,
        });
        return reply
          .code(500)
          .send({ ...errorResponse('JOB_LIST_ERROR', message), correlation_id: correlationId });
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    '/api/jobs/:id',
    { schema: RS.jobDetail },
    async (request, reply) => {
      const correlationId = correlationIdFor(request);
      reply.header('x-correlation-id', correlationId);
      try {
        const q = getQueue();
        const id = request.params.id;
        const job = await q.status(id);
        if (!job)
          return reply.code(404).send({
            ...errorResponse('JOB_NOT_FOUND', `Job not found: ${id}`),
            correlation_id: correlationId,
          });
        return reply.send({
          ok: true,
          job,
          correlation_id: correlationId,
          degraded: await deriveQueueDegradedFlag(q),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        structuredLog('error', 'jobs_get_error', {
          correlation_id: correlationId,
          error: message,
        });
        return reply
          .code(500)
          .send({ ...errorResponse('JOB_GET_ERROR', message), correlation_id: correlationId });
      }
    }
  );

  app.post('/api/jobs/cancel', { schema: RS.jobCancel }, async (request, reply) => {
    const correlationId = correlationIdFor(request);
    reply.header('x-correlation-id', correlationId);
    try {
      const q = getQueue();
      const body = request.body as Record<string, unknown>;
      await q.cancel(body.job_id as string);

      ctx.sseNotify('job_cancelled', {
        type: 'job_cancelled',
        job_id: body.job_id as string,
        timestamp: new Date().toISOString(),
      });

      return reply.send({
        ok: true,
        message: `Job ${body.job_id} cancelled`,
        correlation_id: correlationId,
        degraded: await deriveQueueDegradedFlag(q),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes('not found') ? 404 : 400;
      structuredLog('warn', 'jobs_cancel_error', {
        correlation_id: correlationId,
        error: message,
      });
      return reply
        .code(status)
        .send({ ...errorResponse('JOB_CANCEL_ERROR', message), correlation_id: correlationId });
    }
  });
}
