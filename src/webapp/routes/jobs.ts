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
import { PersistentQueue } from '../../../platform/engine/jobs';
import type { StorageProvider } from '../../../platform/engine/persistence';
import type { JobFilter, JobStatus, JobType } from '../../../platform/engine/jobs';
import * as RS from '../route-schemas';

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
      try {
        const q = getQueue();
        const filter: JobFilter = {};
        const { status, type, limit } = request.query;
        if (status) filter.status = status as JobStatus;
        if (type) filter.type = type as JobType;
        if (limit) filter.limit = parseInt(limit, 10);

        const jobs = await q.list(filter);
        return reply.send({ ok: true, total: jobs.length, jobs });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.code(500).send(errorResponse('JOB_LIST_ERROR', message));
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    '/api/jobs/:id',
    { schema: RS.jobDetail },
    async (request, reply) => {
      try {
        const q = getQueue();
        const id = request.params.id;
        const job = await q.status(id);
        if (!job)
          return reply.code(404).send(errorResponse('JOB_NOT_FOUND', `Job not found: ${id}`));
        return reply.send({ ok: true, job });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.code(500).send(errorResponse('JOB_GET_ERROR', message));
      }
    }
  );

  app.post('/api/jobs/cancel', { schema: RS.jobCancel }, async (request, reply) => {
    try {
      const q = getQueue();
      const body = request.body as Record<string, unknown>;
      await q.cancel(body.job_id as string);

      ctx.sseNotify('job_cancelled', {
        type: 'job_cancelled',
        job_id: body.job_id as string,
        timestamp: new Date().toISOString(),
      });

      return reply.send({ ok: true, message: `Job ${body.job_id} cancelled` });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes('not found') ? 404 : 400;
      return reply.code(status).send(errorResponse('JOB_CANCEL_ERROR', message));
    }
  });
}
