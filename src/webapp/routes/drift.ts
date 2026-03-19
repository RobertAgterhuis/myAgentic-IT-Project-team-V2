// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Drift detection route handler — GET /api/drift.
 *
 * Thin HTTP wrapper over SessionService (M20-003).
 *
 * @module routes/drift
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import { detectDrift } from '../drift-detector';
import { SessionService, toServiceContext } from '../services';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const svc = new SessionService(toServiceContext(ctx));

  app.get('/api/drift', { schema: { tags: ['drift'] } }, async (_request, reply: FastifyReply) => {
    const report = svc.checkDrift(detectDrift);
    return reply.send(report);
  });
}
