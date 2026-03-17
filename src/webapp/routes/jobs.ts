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

import { json, parseBody, assertString } from '../middleware';
import { errorResponse } from '../utils/errors';
import { PersistentQueue } from '../../../platform/engine/jobs';
import type { StorageProvider } from '../../../platform/engine/persistence';
import type { JobFilter, JobStatus, JobType } from '../../../platform/engine/jobs';

export = function createJobRoutes(ctx): Record<string, unknown> {
  const { sseNotify, storageProvider } = ctx as {
    sseNotify: (event: string, data: unknown) => void;
    storageProvider?: StorageProvider;
  };

  function getQueue() {
    if (!storageProvider) throw new Error('StorageProvider not initialised');
    return new PersistentQueue(storageProvider);
  }

  async function apiListJobs(_req, res) {
    try {
      const q = getQueue();
      // Parse optional query params from URL
      const url = new URL(_req.url, 'http://localhost');
      const filter: JobFilter = {};
      const status = url.searchParams.get('status');
      const type = url.searchParams.get('type');
      const limit = url.searchParams.get('limit');
      if (status) filter.status = status as JobStatus;
      if (type) filter.type = type as JobType;
      if (limit) filter.limit = parseInt(limit, 10);

      const jobs = await q.list(filter);
      json(res, 200, { ok: true, total: jobs.length, jobs });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      json(res, 500, errorResponse('JOB_LIST_ERROR', message));
    }
  }

  async function apiGetJob(req, res) {
    try {
      const q = getQueue();
      const id = req.params?.id || req.url.split('/').pop();
      const job = await q.status(id);
      if (!job) return json(res, 404, errorResponse('JOB_NOT_FOUND', `Job not found: ${id}`));
      json(res, 200, { ok: true, job });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      json(res, 500, errorResponse('JOB_GET_ERROR', message));
    }
  }

  async function apiCancelJob(req, res) {
    try {
      const q = getQueue();
      const body = await parseBody(req);
      assertString(body.job_id, 'job_id', 100);
      await q.cancel(body.job_id as string);

      sseNotify('job_cancelled', {
        type: 'job_cancelled',
        job_id: body.job_id,
        timestamp: new Date().toISOString(),
      });

      json(res, 200, { ok: true, message: `Job ${body.job_id} cancelled` });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes('not found') ? 404 : 400;
      json(res, status, errorResponse('JOB_CANCEL_ERROR', message));
    }
  }

  return {
    'GET /api/jobs': apiListJobs,
    'GET /api/jobs/:id': apiGetJob,
    'POST /api/jobs/cancel': apiCancelJob,
  };
};
