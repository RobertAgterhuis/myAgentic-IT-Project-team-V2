// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Policy route handlers — GET/POST /api/v1/policies (M22-006).
 *
 * Thin HTTP wrapper over PolicyService.
 *
 * @module routes/policies
 */

import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../context';
import {
  PolicyService,
  PolicyValidationError,
  PolicyNotFoundError,
  toServiceContext,
} from '../services';
import { errorResponse } from '../utils/errors';
import { structuredLog } from '../middleware';
import * as RS from '../route-schemas';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const svc = new PolicyService(toServiceContext(ctx as unknown as Record<string, unknown>));

  /* ── GET /api/v1/policies ────────────────────────────────── */

  app.get('/api/v1/policies', { schema: RS.policiesList }, async (_request, reply) => {
    try {
      const result = svc.listPolicies();
      structuredLog('INFO', 'policies_list', { count: result.count });
      return reply.send(result);
    } catch (err) {
      structuredLog('ERROR', 'policies_list_failed', { error: (err as Error).message });
      return reply.code(500).send(errorResponse('INTERNAL_ERROR', (err as Error).message));
    }
  });

  /* ── POST /api/v1/policies/evaluate ──────────────────────── */

  app.post('/api/v1/policies/evaluate', { schema: RS.policyEvaluate }, async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const contextType = body.context_type as string;
      const scope = body.scope as string;
      const checks = (body.checks || {}) as Record<string, boolean>;

      const result = svc.evaluatePolicies({
        type: contextType as 'gate' | 'pr' | 'deploy' | 'artifact' | 'schedule',
        scope: scope as 'global' | 'org' | 'team' | 'repo' | 'sprint',
        checks,
      });

      structuredLog('INFO', 'policies_evaluated', {
        total: result.evaluation.summary.total,
        blocking: result.evaluation.summary.blocking_failures,
      });
      ctx.sseNotify('policy_evaluation', {
        type: 'policy_evaluation',
        summary: result.evaluation.summary,
      });
      return reply.send(result);
    } catch (err) {
      structuredLog('ERROR', 'policies_evaluate_failed', { error: (err as Error).message });
      return reply.code(500).send(errorResponse('INTERNAL_ERROR', (err as Error).message));
    }
  });

  /* ── POST /api/v1/policies/exceptions ────────────────────── */

  app.post(
    '/api/v1/policies/exceptions',
    { schema: RS.policyCreateException },
    async (request, reply) => {
      try {
        const body = request.body as Record<string, unknown>;
        const result = svc.createException({
          policy_id: body.policy_id as string,
          reason: body.reason as string,
          approved_by: body.approved_by as string,
          expires: body.expires as string,
          scope_override: body.scope_override as string | undefined,
        });

        structuredLog('INFO', 'policy_exception_created', {
          policy_id: body.policy_id,
          exception_id: result.exception.id,
        });
        ctx.sseNotify('policy_exception', {
          type: 'policy_exception',
          action: 'created',
          exception: result.exception,
        });
        return reply.code(201).send(result);
      } catch (err) {
        if (err instanceof PolicyValidationError) {
          return reply.code(400).send({ error: (err as Error).message });
        }
        if (err instanceof PolicyNotFoundError) {
          return reply.code(404).send({ error: (err as Error).message });
        }
        structuredLog('ERROR', 'policy_exception_failed', { error: (err as Error).message });
        return reply.code(500).send(errorResponse('INTERNAL_ERROR', (err as Error).message));
      }
    }
  );
}
