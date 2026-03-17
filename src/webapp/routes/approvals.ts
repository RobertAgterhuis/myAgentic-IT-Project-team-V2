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

import {
  GovernanceService,
  ServiceValidationError,
  ServiceNotAvailableError,
  toServiceContext,
} from '../services';
import { errorResponse } from '../utils/errors';
import { structuredLog, json, parseBody, assertString } from '../middleware';

export = function createApprovalRoutes(ctx): Record<string, unknown> {
  const { sseNotify } = ctx;

  const svc = new GovernanceService(toServiceContext(ctx), {
    getEngine: ctx._getEngine as (() => unknown) | undefined,
  } as { getEngine?: () => unknown });

  /* ── GET /api/v1/approvals ───────────────────────────────── */

  async function listApprovals(_req, res) {
    try {
      const result = svc.listApprovals();
      structuredLog('INFO', 'approvals_list', { count: result.count });
      return json(res, 200, result);
    } catch (err) {
      if (err instanceof ServiceNotAvailableError) {
        return json(res, 503, { error: 'Governance engine not available' });
      }
      structuredLog('ERROR', 'approvals_list_failed', { error: (err as Error).message });
      return json(res, 500, errorResponse('INTERNAL_ERROR', (err as Error).message));
    }
  }

  /* ── POST /api/v1/approvals/:id/approve ──────────────────── */

  async function approveRequest(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const segments = url.pathname.split('/').filter(Boolean);
      const approvalId = segments[3];
      if (!approvalId) {
        return json(res, 400, { error: 'Approval ID required' });
      }

      const body = await parseBody(req);
      const reason = (body.reason as string) || 'Approved via API';
      const decidedBy = (body.user as string) || 'api-user';
      assertString(reason, 'reason', 1000);
      assertString(decidedBy, 'user', 200);

      const result = svc.approve(approvalId, decidedBy, reason);
      structuredLog('INFO', 'approval_approved', { id: approvalId, decided_by: decidedBy });
      sseNotify?.({ type: 'approval', action: 'approved', id: approvalId });
      return json(res, 200, result);
    } catch (err) {
      if (err instanceof ServiceValidationError) {
        return json(res, 400, { error: (err as Error).message });
      }
      if (err instanceof ServiceNotAvailableError) {
        return json(res, 503, { error: (err as Error).message });
      }
      const msg = (err as Error).message;
      structuredLog('ERROR', 'approval_approve_failed', { error: msg });
      if (msg.includes('not found')) return json(res, 404, { error: msg });
      if (msg.includes('already')) return json(res, 409, { error: msg });
      return json(res, 500, errorResponse('INTERNAL_ERROR', msg));
    }
  }

  /* ── POST /api/v1/approvals/:id/reject ───────────────────── */

  async function rejectRequest(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const segments = url.pathname.split('/').filter(Boolean);
      const approvalId = segments[3];
      if (!approvalId) {
        return json(res, 400, { error: 'Approval ID required' });
      }

      const body = await parseBody(req);
      const reason = body.reason as string;
      const decidedBy = (body.user as string) || 'api-user';

      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        return json(res, 400, { error: 'Reason is required for rejection' });
      }
      assertString(reason, 'reason', 1000);
      assertString(decidedBy, 'user', 200);

      const result = svc.reject(approvalId, decidedBy, reason);
      structuredLog('INFO', 'approval_rejected', { id: approvalId, decided_by: decidedBy });
      sseNotify?.({ type: 'approval', action: 'rejected', id: approvalId });
      return json(res, 200, result);
    } catch (err) {
      if (err instanceof ServiceValidationError) {
        return json(res, 400, { error: (err as Error).message });
      }
      if (err instanceof ServiceNotAvailableError) {
        return json(res, 503, { error: (err as Error).message });
      }
      const msg = (err as Error).message;
      structuredLog('ERROR', 'approval_reject_failed', { error: msg });
      if (msg.includes('not found')) return json(res, 404, { error: msg });
      if (msg.includes('already')) return json(res, 409, { error: msg });
      return json(res, 500, errorResponse('INTERNAL_ERROR', msg));
    }
  }

  return {
    'GET /api/v1/approvals': listApprovals,
    'POST /api/v1/approvals/:id/approve': approveRequest,
    'POST /api/v1/approvals/:id/reject': rejectRequest,
  };
};
