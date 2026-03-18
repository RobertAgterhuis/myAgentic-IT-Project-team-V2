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

  /* ── GET /api/v1/policies/packs ─────────────────────────── */

  app.get('/api/v1/policies/packs', { schema: RS.policyPacks }, async (_request, reply) => {
    try {
      const result = svc.listPolicyPacks();
      structuredLog('INFO', 'policy_packs_list', { count: result.count });
      return reply.send(result);
    } catch (err) {
      structuredLog('ERROR', 'policy_packs_list_failed', { error: (err as Error).message });
      return reply.code(500).send(errorResponse('INTERNAL_ERROR', (err as Error).message));
    }
  });

  /* ── GET /api/v1/policies/signals ───────────────────────── */

  app.get('/api/v1/policies/signals', { schema: RS.policySignals }, async (_request, reply) => {
    try {
      const result = svc.listPolicySignals();
      structuredLog('INFO', 'policy_signals_list', { count: result.signals.length });
      return reply.send(result);
    } catch (err) {
      structuredLog('ERROR', 'policy_signals_list_failed', { error: (err as Error).message });
      return reply.code(500).send(errorResponse('INTERNAL_ERROR', (err as Error).message));
    }
  });

  /* ── POST /api/v1/policies/evaluate ──────────────────────── */

  app.post('/api/v1/policies/evaluate', { schema: RS.policyEvaluate }, async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const contextType = body.context_type as string;
      const scope = body.scope as string;
      const providedChecks = (body.checks || {}) as Record<string, boolean>;
      const resolvedSignals =
        Object.keys(providedChecks).length > 0 ? null : svc.listPolicySignals();
      const checks =
        Object.keys(providedChecks).length > 0 ? providedChecks : resolvedSignals?.checks || {};

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
      // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write
      return reply.type('application/json').send(result);
    } catch (err) {
      structuredLog('ERROR', 'policies_evaluate_failed', { error: (err as Error).message });
      return reply.code(500).send(errorResponse('INTERNAL_ERROR', (err as Error).message));
    }
  });

  app.post('/api/v1/policies/update', { schema: RS.policyUpdate }, async (request, reply) => {
    try {
      const body = request.body as Record<string, unknown>;
      const result = svc.updatePolicy({
        policy_id: body.policy_id as string,
        name: body.name as string | undefined,
        description: body.description as string | undefined,
        scope: body.scope as 'global' | 'org' | 'team' | 'repo' | 'sprint' | undefined,
        category: body.category as
          | 'security'
          | 'quality'
          | 'compliance'
          | 'process'
          | 'architecture'
          | undefined,
        severity: body.severity as 'blocking' | 'warning' | 'advisory' | undefined,
        condition_type: body.condition_type as
          | 'gate'
          | 'pr'
          | 'deploy'
          | 'artifact'
          | 'schedule'
          | undefined,
        condition_check: body.condition_check as string | undefined,
        action_message: body.action_message as string | undefined,
      });

      structuredLog('INFO', 'policy_updated', { policy_id: result.policy.id });
      ctx.sseNotify('policy_update', {
        type: 'policy_update',
        action: 'updated',
        policy: result.policy,
      });
      return reply.send(result);
    } catch (err) {
      if (err instanceof PolicyValidationError) {
        return reply.code(400).send(errorResponse('VALIDATION_ERROR', (err as Error).message));
      }
      if (err instanceof PolicyNotFoundError) {
        return reply.code(404).send(errorResponse('NOT_FOUND', (err as Error).message));
      }
      structuredLog('ERROR', 'policy_update_failed', { error: (err as Error).message });
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
          return reply.code(400).send(errorResponse('VALIDATION_ERROR', (err as Error).message));
        }
        if (err instanceof PolicyNotFoundError) {
          return reply.code(404).send(errorResponse('NOT_FOUND', (err as Error).message));
        }
        structuredLog('ERROR', 'policy_exception_failed', { error: (err as Error).message });
        return reply.code(500).send(errorResponse('INTERNAL_ERROR', (err as Error).message));
      }
    }
  );
}
