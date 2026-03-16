// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Approval route handlers — GET/POST /api/v1/approvals.
 *
 * Exposes governance approval management through HTTP API:
 *   GET  /api/v1/approvals           — list pending approvals
 *   POST /api/v1/approvals/:id/approve — approve a request
 *   POST /api/v1/approvals/:id/reject  — reject a request
 *
 * @module routes/approvals
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import { errorResponse } from '../utils/errors';
import { structuredLog, json, parseBody, assertString } from '../middleware';

/** Minimal governance shape for type-safe access. */
interface GovernanceLike {
  getPendingApprovals(): Array<{
    id: string;
    entity_id: string;
    gate_id: string;
    stage: string;
    requested_by: string;
    requested_at: string;
    required_role: string;
    status: string;
  }>;
  decide(
    id: string,
    user: string,
    approved: boolean,
    reason: string
  ): {
    id: string;
    status: string;
    decided_by: string;
    decided_at: string;
    reason: string;
  };
}

export = function createApprovalRoutes(ctx): Record<string, unknown> {
  const { sseNotify } = ctx;

  /**
   * Resolve the GovernanceEngine from the engine context.
   * Returns null if not available.
   */
  function getGovernance(): GovernanceLike | null {
    const engine = ctx._getEngine ? ctx._getEngine() : null;
    if (!engine) return null;
    return engine.getGovernance ? (engine.getGovernance() as GovernanceLike) : null;
  }

  /* ── GET /api/v1/approvals ───────────────────────────────── */

  async function listApprovals(_req, res) {
    try {
      const governance = getGovernance();
      if (!governance) {
        return json(res, 503, { error: 'Governance engine not available' });
      }

      const pending = governance.getPendingApprovals();
      const rows = pending.map((a) => ({
        id: a.id,
        entity_id: a.entity_id,
        gate_id: a.gate_id,
        stage: a.stage,
        requested_by: a.requested_by,
        requested_at: a.requested_at,
        required_role: a.required_role,
        status: a.status,
      }));

      structuredLog('INFO', 'approvals_list', { count: rows.length });
      return json(res, 200, { approvals: rows, count: rows.length });
    } catch (err) {
      structuredLog('ERROR', 'approvals_list_failed', { error: (err as Error).message });
      return json(res, 500, errorResponse('INTERNAL_ERROR', (err as Error).message));
    }
  }

  /* ── POST /api/v1/approvals/:id/approve ──────────────────── */

  async function approveRequest(req, res) {
    try {
      const governance = getGovernance();
      if (!governance) {
        return json(res, 503, { error: 'Governance engine not available' });
      }

      const url = new URL(req.url, `http://${req.headers.host}`);
      const segments = url.pathname.split('/').filter(Boolean);
      // Expected: api, v1, approvals, :id, approve
      const approvalId = segments[3];
      if (!approvalId) {
        return json(res, 400, { error: 'Approval ID required' });
      }

      const body = await parseBody(req);
      const reason = (body.reason as string) || 'Approved via API';
      const decidedBy = (body.user as string) || 'api-user';

      assertString(reason, 'reason', 1000);
      assertString(decidedBy, 'user', 200);

      const result = governance.decide(approvalId, decidedBy, true, reason);

      structuredLog('INFO', 'approval_approved', { id: approvalId, decided_by: decidedBy });
      sseNotify?.({ type: 'approval', action: 'approved', id: approvalId });

      return json(res, 200, {
        ok: true,
        approval: {
          id: result.id,
          status: result.status,
          decided_by: result.decided_by,
          decided_at: result.decided_at,
          reason: result.reason,
        },
      });
    } catch (err) {
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
      const governance = getGovernance();
      if (!governance) {
        return json(res, 503, { error: 'Governance engine not available' });
      }

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

      const result = governance.decide(approvalId, decidedBy, false, reason);

      structuredLog('INFO', 'approval_rejected', { id: approvalId, decided_by: decidedBy });
      sseNotify?.({ type: 'approval', action: 'rejected', id: approvalId });

      return json(res, 200, {
        ok: true,
        approval: {
          id: result.id,
          status: result.status,
          decided_by: result.decided_by,
          decided_at: result.decided_at,
          reason: result.reason,
        },
      });
    } catch (err) {
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
