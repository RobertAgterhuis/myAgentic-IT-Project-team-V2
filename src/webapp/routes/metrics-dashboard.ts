// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Metrics & Velocity Dashboard route — GET /api/metrics/dashboard.
 *
 * Thin HTTP layer; all business logic lives in MetricsDashboardService.
 *
 * @module routes/metrics-dashboard
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import { MetricsDashboardService } from '../services/metrics-dashboard-service';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const svc = new MetricsDashboardService(ctx as unknown as Record<string, unknown>);

  app.get<{ Querystring: { lastN?: string } }>(
    '/api/metrics/dashboard',
    { schema: { tags: ['metrics'] } },
    async (request, reply: FastifyReply) => {
      const lastN = parseInt(request.query.lastN as string, 10);
      const data = svc.computeDashboard(Number.isFinite(lastN) ? lastN : undefined);
      // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
      return reply.send(data);
    }
  );
}
