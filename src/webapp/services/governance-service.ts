// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Governance service — shared business logic for approvals (M20-002).
 *
 * Consumed by: HTTP route (routes/approvals.ts) and MCP tool (mcp-server.ts).
 * Dependencies are injected via ServiceContext.
 */

import path from 'path';
import { ServiceValidationError } from './decisions-service';
import type { ServiceContext, ApprovalItem, ApprovalDecisionResult } from './types';

/** Minimal governance engine shape. */
interface GovernanceEngine {
  getPendingApprovals(): ApprovalItem[];
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
  saveTo?(store: { writeFile(p: string, d: string): void }, path: string): void;
}

export class GovernanceService {
  private ctx: ServiceContext;
  private governanceStatePath: string;
  private _getEngine: (() => GovernanceEngine | null) | null;

  constructor(ctx: ServiceContext, opts?: { getEngine?: () => unknown }) {
    this.ctx = ctx;
    this.governanceStatePath = path.join(ctx.sessionDir, 'governance-state.json');
    this._getEngine = (opts?.getEngine as () => GovernanceEngine | null) || null;
  }

  /* ── List pending approvals ─────────────────────────────────── */

  listApprovals(): { approvals: ApprovalItem[]; count: number } {
    const engine = this.resolveEngine();
    if (!engine) throw new ServiceNotAvailableError('Governance engine not available');

    const pending = engine.getPendingApprovals();
    const approvals = pending.map((a) => ({
      id: a.id,
      entity_id: a.entity_id,
      gate_id: a.gate_id,
      stage: a.stage,
      requested_by: a.requested_by,
      requested_at: a.requested_at,
      required_role: a.required_role,
      status: a.status,
    }));
    return { approvals, count: approvals.length };
  }

  /* ── Approve a request ──────────────────────────────────────── */

  approve(
    approvalId: string,
    user: string,
    reason = 'Approved via service'
  ): ApprovalDecisionResult {
    if (!approvalId) throw new ServiceValidationError('Approval ID is required');
    const engine = this.resolveEngine();
    if (!engine) throw new ServiceNotAvailableError('Governance engine not available');

    const result = engine.decide(approvalId, user, true, reason);
    engine.saveTo?.(this.ctx.store, this.governanceStatePath);
    return {
      ok: true,
      approval: {
        id: result.id,
        status: result.status,
        decided_by: result.decided_by,
        decided_at: result.decided_at,
        reason: result.reason,
      },
    };
  }

  /* ── Reject a request ───────────────────────────────────────── */

  reject(approvalId: string, user: string, reason: string): ApprovalDecisionResult {
    if (!approvalId) throw new ServiceValidationError('Approval ID is required');
    if (!reason?.trim()) throw new ServiceValidationError('Reason is required for rejection');
    const engine = this.resolveEngine();
    if (!engine) throw new ServiceNotAvailableError('Governance engine not available');

    const result = engine.decide(approvalId, user, false, reason);
    engine.saveTo?.(this.ctx.store, this.governanceStatePath);
    return {
      ok: true,
      approval: {
        id: result.id,
        status: result.status,
        decided_by: result.decided_by,
        decided_at: result.decided_at,
        reason: result.reason,
      },
    };
  }

  /* ── Private ────────────────────────────────────────────────── */

  private resolveEngine(): GovernanceEngine | null {
    // If an engine factory was provided (HTTP context), use it
    if (this._getEngine) {
      const raw = this._getEngine();
      if (!raw) return null;
      // The factory may return a wrapper with getGovernance() instead of the engine directly
      if (
        'getGovernance' in raw &&
        typeof (raw as Record<string, unknown>).getGovernance === 'function'
      ) {
        return (raw as unknown as { getGovernance(): GovernanceEngine | null }).getGovernance();
      }
      return raw;
    }

    // Otherwise, try to load from file (MCP context)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { GovernanceEngine: GE } = require('../../platform/sdlc/governance') as {
        GovernanceEngine: {
          loadFrom(
            s: { exists(p: string): boolean; readFile(p: string): string },
            p: string
          ): GovernanceEngine | null;
        };
      };
      return GE.loadFrom(this.ctx.store, this.governanceStatePath);
    } catch {
      return null;
    }
  }
}

export class ServiceNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceNotAvailableError';
  }
}
