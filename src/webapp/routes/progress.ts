// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Progress route handler — GET /api/progress.
 *
 * Thin HTTP wrapper over SessionService (M20-003).
 *
 * @module routes/progress
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import { SessionService, toServiceContext } from '../services';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const svc = new SessionService(toServiceContext(ctx as unknown as Record<string, unknown>));

  app.get(
    '/api/progress',
    { schema: { tags: ['progress'] } },
    async (_request, reply: FastifyReply) => {
      const command = ctx._getLatestCommand?.();
      const session = svc.readSessionState();

      if (!session) {
        return reply.send({
          active: false,
          phases: svc.buildEmptyPhases(),
          session: null,
          command,
        });
      }

      const sprints = session.sprint_backlog
        ? {
            total: session.sprint_backlog.total_sprints || 0,
            statuses: session.sprint_backlog.sprint_statuses || {},
          }
        : null;

      return reply.send({
        active: true,
        session: svc.buildSessionSummary(session),
        phases: svc.buildPhaseProgress(session),
        sprints,
        command,
      });
    }
  );
}
