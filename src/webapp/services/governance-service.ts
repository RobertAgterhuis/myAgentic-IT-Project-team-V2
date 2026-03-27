// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Governance service — shared business logic for approvals (M20-002).
 *
 * Consumed by: HTTP route (routes/approvals.ts) and MCP tool (mcp-server.ts).
 * Dependencies are injected via ServiceContext.
 */

import path from 'path';
import { GovernanceEngine as PersistedGovernanceEngine } from '../../../platform/sdlc/governance';
import type { ApprovalRequest } from '../../../platform/sdlc/governance';
import { ServiceValidationError } from './decisions-service';
import type {
  ServiceContext,
  ApprovalItem,
  ApprovalDecisionResult,
  CanonicalApprovalDecision,
} from './types';

/** Minimal governance engine shape. */
interface GovernanceEngine {
  getPendingApprovals(userId?: string): ApprovalRequest[];
  getApprovals(entityId: string, gateId?: string): ApprovalRequest[];
  getApprovalById?(approvalId: string): ApprovalRequest | undefined;
  requestApproval(
    entityId: string,
    stage: ApprovalRequest['stage'],
    gateId: string,
    requestedBy: string
  ): ApprovalRequest;
  decide(id: string, user: string, approved: boolean, reason: string): ApprovalRequest;
  expireTimedOut?(): string[];
  saveTo?(
    store: { writeFile(path: string, data: string): void; mkdirp(dir: string): void },
    path: string
  ): void;
}

function isGovernanceEngine(value: unknown): value is GovernanceEngine {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.getPendingApprovals === 'function' &&
    typeof candidate.getApprovals === 'function' &&
    typeof candidate.requestApproval === 'function' &&
    typeof candidate.decide === 'function'
  );
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

  private static readonly TOOL_EXEC_GATE_ID = 'G-REL-01';
  private static readonly TOOL_EXEC_ESCALATION_GATE_ID = 'G-REL-03';
  private static readonly TOOL_EXEC_STAGE = 'RELEASE' as ApprovalRequest['stage'];

  private toCanonicalDecision(
    result: ApprovalRequest,
    decidedBy: string
  ): CanonicalApprovalDecision {
    const decidedAt = result.decided_at || new Date().toISOString();
    const decision: CanonicalApprovalDecision['decision'] =
      result.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    return {
      schema: 'approval-policy-decision',
      version: '1.0',
      decision,
      approval_id: result.id,
      entity_id: result.entity_id,
      gate_id: result.gate_id,
      stage: result.stage,
      decided_by: result.decided_by || decidedBy,
      decided_at: decidedAt,
      reason: result.reason,
    };
  }

  /* ── List pending approvals ─────────────────────────────────── */

  listApprovals(): { approvals: ApprovalItem[]; count: number } {
    const engine = this.resolveEngine();
    if (!engine) throw new ServiceNotAvailableError('Governance engine not available');

    this.expireTimedOutApprovals(engine);

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
    const decision = this.toCanonicalDecision(result, user);

    return {
      ok: true,
      approval: {
        id: result.id,
        status: result.status,
        decided_by: decision.decided_by,
        decided_at: decision.decided_at,
        reason: result.reason,
      },
      decision,
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
    const decision = this.toCanonicalDecision(result, user);

    return {
      ok: true,
      approval: {
        id: result.id,
        status: result.status,
        decided_by: decision.decided_by,
        decided_at: decision.decided_at,
        reason: result.reason,
      },
      decision,
    };
  }

  requestToolExecutionApproval(input: { entityId: string; requestedBy: string }): {
    pending: boolean;
    approvalId: string;
    status: ApprovalRequest['status'];
    requiredRole: ApprovalRequest['required_role'];
    requestedAt: string;
  } {
    if (!input.entityId?.trim()) throw new ServiceValidationError('entityId is required');
    if (!input.requestedBy?.trim()) throw new ServiceValidationError('requestedBy is required');

    const engine = this.resolveEngine();
    if (!engine) throw new ServiceNotAvailableError('Governance engine not available');

    this.expireTimedOutApprovals(engine);

    const existing = this.getToolExecutionApprovals(engine, input.entityId);

    const pending = existing.find((approval) => approval.status === 'PENDING');
    if (pending) {
      return {
        pending: true,
        approvalId: pending.id,
        status: pending.status,
        requiredRole: pending.required_role,
        requestedAt: pending.requested_at,
      };
    }

    const latest = existing[0];
    if (latest?.status === 'EXPIRED') {
      const escalated = this.createEscalatedToolExecutionApproval(engine, input.entityId);
      engine.saveTo?.(this.ctx.store, this.governanceStatePath);
      return {
        pending: true,
        approvalId: escalated.id,
        status: escalated.status,
        requiredRole: escalated.required_role,
        requestedAt: escalated.requested_at,
      };
    }

    const created = engine.requestApproval(
      input.entityId,
      GovernanceService.TOOL_EXEC_STAGE,
      GovernanceService.TOOL_EXEC_GATE_ID,
      input.requestedBy
    );
    engine.saveTo?.(this.ctx.store, this.governanceStatePath);

    return {
      pending: created.status === 'PENDING',
      approvalId: created.id,
      status: created.status,
      requiredRole: created.required_role,
      requestedAt: created.requested_at,
    };
  }

  getToolExecutionApprovalStatus(entityId: string): {
    approved: boolean;
    pending: boolean;
    approvalId?: string;
    status?: ApprovalRequest['status'];
  } {
    if (!entityId?.trim()) throw new ServiceValidationError('entityId is required');

    const engine = this.resolveEngine();
    if (!engine) throw new ServiceNotAvailableError('Governance engine not available');

    this.expireTimedOutApprovals(engine);

    const sorted = this.getToolExecutionApprovals(engine, entityId);

    const approved = sorted.find((approval) => approval.status === 'APPROVED');
    if (approved) {
      return { approved: true, pending: false, approvalId: approved.id, status: approved.status };
    }

    const pending = sorted.find((approval) => approval.status === 'PENDING');
    if (pending) {
      return { approved: false, pending: true, approvalId: pending.id, status: pending.status };
    }

    const latest = sorted[0];
    if (latest?.status === 'EXPIRED') {
      const escalated = this.createEscalatedToolExecutionApproval(engine, entityId);
      engine.saveTo?.(this.ctx.store, this.governanceStatePath);
      return {
        approved: false,
        pending: true,
        approvalId: escalated.id,
        status: escalated.status,
      };
    }

    if (latest) {
      return {
        approved: false,
        pending: false,
        approvalId: latest.id,
        status: latest.status,
      };
    }

    return { approved: false, pending: false };
  }

  /* ── Private ────────────────────────────────────────────────── */

  private expireTimedOutApprovals(engine: GovernanceEngine): void {
    const expired = engine.expireTimedOut?.() || [];
    if (expired.length > 0) {
      engine.saveTo?.(this.ctx.store, this.governanceStatePath);
    }
  }

  private getToolExecutionApprovals(engine: GovernanceEngine, entityId: string): ApprovalRequest[] {
    return [
      ...engine.getApprovals(entityId, GovernanceService.TOOL_EXEC_GATE_ID),
      ...engine.getApprovals(entityId, GovernanceService.TOOL_EXEC_ESCALATION_GATE_ID),
    ]
      .slice()
      .sort((a, b) => String(b.requested_at).localeCompare(String(a.requested_at)));
  }

  private createEscalatedToolExecutionApproval(
    engine: GovernanceEngine,
    entityId: string
  ): ApprovalRequest {
    const existingEscalation = engine
      .getApprovals(entityId, GovernanceService.TOOL_EXEC_ESCALATION_GATE_ID)
      .slice()
      .sort((a, b) => String(b.requested_at).localeCompare(String(a.requested_at)));

    const pendingEscalation = existingEscalation.find((approval) => approval.status === 'PENDING');
    if (pendingEscalation) {
      return pendingEscalation;
    }

    return engine.requestApproval(
      entityId,
      GovernanceService.TOOL_EXEC_STAGE,
      GovernanceService.TOOL_EXEC_ESCALATION_GATE_ID,
      'system-escalation'
    );
  }

  private resolveEngine(): GovernanceEngine | null {
    // If an engine factory was provided (HTTP context), use it
    if (this._getEngine) {
      const raw = this._getEngine();
      if (!raw) {
        return this.loadPersistedEngine();
      }

      if (isGovernanceEngine(raw)) {
        return raw;
      }

      // Some callers pass an engine wrapper instead of the governance engine itself.
      // Only use getGovernance() when it actually exists and returns the right shape.
      if (
        typeof raw === 'object' &&
        raw !== null &&
        'getGovernance' in raw &&
        typeof (raw as Record<string, unknown>).getGovernance === 'function'
      ) {
        const governance = (raw as { getGovernance(): unknown }).getGovernance();
        if (isGovernanceEngine(governance)) {
          return governance;
        }
      }

      // If the wrapper does not expose governance directly, fall back to the
      // persisted governance-state.json instead of attempting to call methods on
      // the orchestrator engine wrapper.
      return this.loadPersistedEngine();
    }

    return this.loadPersistedEngine();
  }

  private loadPersistedEngine(): GovernanceEngine | null {
    try {
      const existing = PersistedGovernanceEngine.loadFrom(this.ctx.store, this.governanceStatePath);
      if (existing) {
        return existing;
      }

      const initialized = new PersistedGovernanceEngine();
      try {
        initialized.saveTo?.(this.ctx.store, this.governanceStatePath);
      } catch {
        // In lightweight contexts (for example some route tests), persistence may
        // be unavailable. The initialized engine is still valid for the current request.
      }
      return initialized;
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
