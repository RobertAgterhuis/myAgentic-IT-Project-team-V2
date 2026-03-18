// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Dashboard Home API routes — SP-7 / M32-005.
 *
 * Thin HTTP layer; all business logic lives in DashboardService.
 *
 * @module routes/dashboard
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { DashboardService } from '../services/dashboard-service';
import * as RS from '../route-schemas';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const svc = new DashboardService(ctx as unknown as Record<string, unknown>);

  app.get(
    '/api/dashboard/health',
    { schema: RS.dashboardHealth },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        return reply.send({
          ok: true,
          data: svc.computeHealthStatus(),
          timestamp: new Date().toISOString(),
        });
      } catch {
        return reply
          .code(500)
          .send(errorResponse('INTERNAL_ERROR', 'Failed to compute health status'));
      }
    }
  );

  app.get(
    '/api/dashboard/metrics',
    { schema: RS.dashboardMetrics },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        return reply.send({
          ok: true,
          data: svc.computeKeyMetrics(),
          timestamp: new Date().toISOString(),
        });
      } catch {
        return reply.code(500).send(errorResponse('INTERNAL_ERROR', 'Failed to compute metrics'));
      }
    }
  );

  app.get(
    '/api/dashboard/activity',
    { schema: RS.dashboardActivity },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        return reply.send({
          ok: true,
          data: svc.computeActivityFeed(),
          timestamp: new Date().toISOString(),
        });
      } catch {
        return reply
          .code(500)
          .send(errorResponse('INTERNAL_ERROR', 'Failed to fetch activity feed'));
      }
    }
  );

  app.get(
    '/api/dashboard/stats',
    { schema: RS.dashboardStats },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        return reply.send({
          ok: true,
          data: await svc.computeQuickStats(),
          timestamp: new Date().toISOString(),
        });
      } catch {
        return reply
          .code(500)
          .send(errorResponse('INTERNAL_ERROR', 'Failed to compute statistics'));
      }
    }
  );
}
