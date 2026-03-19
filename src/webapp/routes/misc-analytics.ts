// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'path';
import type { FastifyInstance, FastifyReply, FastifyRequest, FastifySchema } from 'fastify';
import * as schemas from '../schemas';
import { withFileLock } from '../file-lock';
import { errorResponse } from '../utils/errors';
import { VALIDATION as V } from '../strings';

interface StoreLike {
  exists(filePath: string): boolean;
  mkdirp(dirPath: string): void;
}

interface CacheLike {
  read(filePath: string): string;
}

export interface RegisterAnalyticsRoutesOptions {
  app: FastifyInstance;
  analyticsPostSchema?: FastifySchema;
  analyticsGetSchema?: FastifySchema;
  analyticsFile: string;
  analyticsMaxEvents: number;
  getStore: () => StoreLike;
  cache: CacheLike;
  safeWriteSync: (filePath: string, content: string) => void;
}

function validateAnalyticsEvent(evt: unknown): string | null {
  const r = schemas.validateAnalyticsEvent(evt);
  return r.valid ? null : r.errors[0];
}

export function registerAnalyticsRoutes(options: RegisterAnalyticsRoutesOptions): void {
  const {
    app,
    analyticsPostSchema,
    analyticsGetSchema,
    analyticsFile,
    analyticsMaxEvents,
    getStore,
    cache,
    safeWriteSync,
  } = options;

  app.post(
    '/api/analytics',
    { schema: analyticsPostSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as Record<string, unknown>;
      if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > 100) {
        return reply.code(400).send(errorResponse('VALIDATION_ERROR', V.EVENTS_RANGE));
      }

      const errors: string[] = [];
      const valid: Array<{ event: unknown; properties: unknown; timestamp: string }> = [];
      for (const evt of body.events) {
        const err = validateAnalyticsEvent(evt);
        if (err) {
          errors.push(err);
          continue;
        }
        const castEvt = evt as Record<string, unknown>;
        valid.push({
          event: castEvt.event,
          properties: castEvt.properties || {},
          timestamp: new Date().toISOString(),
        });
      }

      if (valid.length > 0) {
        await withFileLock(analyticsFile, () => {
          let existing: Array<Record<string, unknown>> = [];
          if (getStore().exists(analyticsFile)) {
            try {
              existing = JSON.parse(cache.read(analyticsFile));
            } catch {
              existing = [];
            }
          }
          existing.push(...valid);
          if (existing.length > analyticsMaxEvents) {
            existing = existing.slice(-analyticsMaxEvents);
          }
          getStore().mkdirp(path.dirname(analyticsFile));
          safeWriteSync(analyticsFile, JSON.stringify(existing, null, 2));
        });
      }

      reply.send({ ok: true, accepted: valid.length, rejected: errors.length });
    }
  );

  app.get(
    '/api/analytics',
    { schema: analyticsGetSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!getStore().exists(analyticsFile)) {
        return reply.send({ events: [], total: 0 });
      }

      let events: Array<Record<string, unknown>> = [];
      try {
        events = JSON.parse(cache.read(analyticsFile));
      } catch {
        events = [];
      }

      const q = request.query as Record<string, string>;
      const total = events.length;
      const limit = Math.min(Math.max(parseInt(q.limit, 10) || 100, 1), 1000);
      const offset = Math.max(parseInt(q.offset, 10) || 0, 0);
      const page = events.slice(offset, offset + limit);
      reply.send({ events: page, total, limit, offset });
    }
  );
}
