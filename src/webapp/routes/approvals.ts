// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Approval route handlers — GET/POST /api/v1/approvals.
 *
 * Thin HTTP wrapper over GovernanceService (M20-003).
 *
 * @module routes/approvals
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../context';
import {
  GovernanceService,
  ServiceValidationError,
  ServiceNotAvailableError,
  toServiceContext,
} from '../services';
import { errorResponse } from '../utils/errors';
import { structuredLog } from '../middleware';
import * as RS from '../route-schemas';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const svc = new GovernanceService(toServiceContext(ctx as unknown as Record<string, unknown>), {
    getEngine: ctx._getEngine as (() => unknown) | undefined,
  } as { getEngine?: () => unknown });

  /* ── GET /api/v1/approvals ───────────────────────────────── */

  app.get('/api/v1/approvals', { schema: RS.approvalsList }, async (_request, reply) => {
    try {
      const result = svc.listApprovals();
      structuredLog('INFO', 'approvals_list', { count: result.count });
      return reply.send(result);
    } catch (err) {
      if (err instanceof ServiceNotAvailableError) {
        structuredLog('WARN', 'approvals_list_unavailable', {
          fallback: 'empty-list',
          error: (err as Error).message,
        });
        return reply.send({ approvals: [], count: 0 });
      }
      structuredLog('ERROR', 'approvals_list_failed', { error: (err as Error).message });
      return reply.code(500).send(errorResponse('INTERNAL_ERROR', (err as Error).message));
    }
  });

  /* ── POST /api/v1/approvals/:id/approve ──────────────────── */

  app.post<{ Params: { id: string } }>(
    '/api/v1/approvals/:id/approve',
    { schema: RS.approvalApprove },
    async (request, reply) => {
      try {
        const approvalId = request.params.id;
        if (!approvalId) {
          return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Approval ID required'));
        }

        const body = request.body as Record<string, unknown>;
        const reason = (body.reason as string) || 'Approved via API';
        const decidedBy = (body.user as string) || 'api-user';

        const result = svc.approve(approvalId, decidedBy, reason);
        structuredLog('INFO', 'approval_approved', { id: approvalId, decided_by: decidedBy });
        ctx.sseNotify?.('approval', { action: 'approved', id: approvalId });
        return reply.type('application/json').send(result);
      } catch (err) {
        if (err instanceof ServiceValidationError) {
          return reply.code(400).send(errorResponse('VALIDATION_ERROR', (err as Error).message));
        }
        if (err instanceof ServiceNotAvailableError) {
          return reply.code(503).send(errorResponse('SERVICE_UNAVAILABLE', (err as Error).message));
        }
        const msg = (err as Error).message;
        structuredLog('ERROR', 'approval_approve_failed', { error: msg });
        if (msg.includes('not found')) return reply.code(404).send(errorResponse('NOT_FOUND', msg));
        if (msg.includes('already')) return reply.code(409).send(errorResponse('CONFLICT', msg));
        return reply.code(500).send(errorResponse('INTERNAL_ERROR', msg));
      }
    }
  );

  /* ── POST /api/v1/approvals/:id/reject ───────────────────── */

  app.post<{ Params: { id: string } }>(
    '/api/v1/approvals/:id/reject',
    { schema: RS.approvalReject },
    async (request, reply) => {
      try {
        const approvalId = request.params.id;
        if (!approvalId) {
          return reply.code(400).send(errorResponse('VALIDATION_ERROR', 'Approval ID required'));
        }

        const body = request.body as Record<string, unknown>;
        const reason = body.reason as string;
        const decidedBy = (body.user as string) || 'api-user';

        const result = svc.reject(approvalId, decidedBy, reason);
        structuredLog('INFO', 'approval_rejected', { id: approvalId, decided_by: decidedBy });
        ctx.sseNotify?.('approval', { action: 'rejected', id: approvalId });
        return reply.type('application/json').send(result);
      } catch (err) {
        if (err instanceof ServiceValidationError) {
          return reply.code(400).send(errorResponse('VALIDATION_ERROR', (err as Error).message));
        }
        if (err instanceof ServiceNotAvailableError) {
          return reply.code(503).send(errorResponse('SERVICE_UNAVAILABLE', (err as Error).message));
        }
        const msg = (err as Error).message;
        structuredLog('ERROR', 'approval_reject_failed', { error: msg });
        if (msg.includes('not found')) return reply.code(404).send(errorResponse('NOT_FOUND', msg));
        if (msg.includes('already')) return reply.code(409).send(errorResponse('CONFLICT', msg));
        return reply.code(500).send(errorResponse('INTERNAL_ERROR', msg));
      }
    }
  );
}
