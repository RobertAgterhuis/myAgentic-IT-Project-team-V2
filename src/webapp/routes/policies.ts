// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Policy route handlers — GET/POST /api/v1/policies (M22-006).
 *
 * Thin HTTP wrapper over PolicyService.
 *
 * @module routes/policies
 */

import {
  PolicyService,
  PolicyValidationError,
  PolicyNotFoundError,
  toServiceContext,
} from '../services';
import { errorResponse } from '../utils/errors';
import { structuredLog, json, parseBody } from '../middleware';

export = function createPolicyRoutes(ctx): Record<string, unknown> {
  const { sseNotify } = ctx;
  const svc = new PolicyService(toServiceContext(ctx));

  /* ── GET /api/v1/policies ────────────────────────────────── */

  async function listPolicies(_req, res) {
    try {
      const result = svc.listPolicies();
      structuredLog('INFO', 'policies_list', { count: result.count });
      return json(res, 200, result);
    } catch (err) {
      structuredLog('ERROR', 'policies_list_failed', { error: (err as Error).message });
      return json(res, 500, errorResponse('INTERNAL_ERROR', (err as Error).message));
    }
  }

  /* ── POST /api/v1/policies/evaluate ──────────────────────── */

  async function evaluatePolicies(req, res) {
    try {
      const body = await parseBody(req);
      const contextType = body.context_type as string;
      const scope = body.scope as string;
      const checks = (body.checks || {}) as Record<string, boolean>;

      if (!contextType || !scope) {
        return json(res, 400, { error: 'context_type and scope are required' });
      }

      const result = svc.evaluatePolicies({
        type: contextType as 'gate' | 'pr' | 'deploy' | 'artifact' | 'schedule',
        scope: scope as 'global' | 'org' | 'team' | 'repo' | 'sprint',
        checks,
      });

      structuredLog('INFO', 'policies_evaluated', {
        total: result.evaluation.summary.total,
        blocking: result.evaluation.summary.blocking_failures,
      });
      sseNotify?.({ type: 'policy_evaluation', summary: result.evaluation.summary });
      return json(res, 200, result);
    } catch (err) {
      structuredLog('ERROR', 'policies_evaluate_failed', { error: (err as Error).message });
      return json(res, 500, errorResponse('INTERNAL_ERROR', (err as Error).message));
    }
  }

  /* ── POST /api/v1/policies/exceptions ────────────────────── */

  async function createException(req, res) {
    try {
      const body = await parseBody(req);
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
      sseNotify?.({ type: 'policy_exception', action: 'created', exception: result.exception });
      return json(res, 201, result);
    } catch (err) {
      if (err instanceof PolicyValidationError) {
        return json(res, 400, { error: (err as Error).message });
      }
      if (err instanceof PolicyNotFoundError) {
        return json(res, 404, { error: (err as Error).message });
      }
      structuredLog('ERROR', 'policy_exception_failed', { error: (err as Error).message });
      return json(res, 500, errorResponse('INTERNAL_ERROR', (err as Error).message));
    }
  }

  return {
    'GET /api/v1/policies': listPolicies,
    'POST /api/v1/policies/evaluate': evaluatePolicies,
    'POST /api/v1/policies/exceptions': createException,
  };
};
