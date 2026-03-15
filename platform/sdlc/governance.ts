// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * SDLC Governance & Approval Model
 *
 * Defines roles, permissions, approval policies, and gate evaluations for the
 * SDLC lifecycle. The governance model ensures that stage transitions are
 * properly authorized and that approval chains are traceable.
 *
 * Zero external dependencies. Pure functions + data structures.
 *
 * @module sdlc/governance
 */

import type { LifecycleStage } from './entities.js';

// ─── Roles ───────────────────────────────────────────────────

export const ROLES = Object.freeze({
  PRODUCT_OWNER: 'PRODUCT_OWNER',
  ARCHITECT: 'ARCHITECT',
  DEVELOPER: 'DEVELOPER',
  QA_ENGINEER: 'QA_ENGINEER',
  SECURITY_REVIEWER: 'SECURITY_REVIEWER',
  RELEASE_MANAGER: 'RELEASE_MANAGER',
  DEVOPS_ENGINEER: 'DEVOPS_ENGINEER',
  STAKEHOLDER: 'STAKEHOLDER',
} as const);

export type Role = (typeof ROLES)[keyof typeof ROLES];

// ─── Permission ──────────────────────────────────────────────

export const PERMISSIONS = Object.freeze({
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  APPROVE: 'APPROVE',
  TRANSITION: 'TRANSITION',
  DEPLOY: 'DEPLOY',
} as const);

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── Role Binding ────────────────────────────────────────────

export interface RoleBinding {
  user_id: string;
  role: Role;
  scope: string; // project ID or '*' for global
  granted_at: string;
  granted_by: string;
}

// ─── Approval Request ────────────────────────────────────────

export const APPROVAL_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
} as const);

export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];

export interface ApprovalRequest {
  id: string;
  entity_id: string;
  stage: LifecycleStage;
  gate_id: string;
  requested_by: string;
  requested_at: string;
  required_role: Role;
  status: ApprovalStatus;
  decided_by: string | null;
  decided_at: string | null;
  reason: string;
}

// ─── Approval Policy ─────────────────────────────────────────

export interface ApprovalPolicy {
  stage: LifecycleStage;
  gate_id: string;
  required_approvals: number;
  required_roles: Role[];
  timeout_hours: number;
  auto_approve: boolean;
}

// ─── Default Policies (per gate) ─────────────────────────────

export const DEFAULT_POLICIES: readonly ApprovalPolicy[] = Object.freeze([
  // Requirements → Architecture transition
  {
    stage: 'REQUIREMENTS' as LifecycleStage,
    gate_id: 'G-REQ-01',
    required_approvals: 1,
    required_roles: [ROLES.PRODUCT_OWNER],
    timeout_hours: 48,
    auto_approve: false,
  },
  {
    stage: 'REQUIREMENTS' as LifecycleStage,
    gate_id: 'G-REQ-02',
    required_approvals: 1,
    required_roles: [ROLES.PRODUCT_OWNER, ROLES.STAKEHOLDER],
    timeout_hours: 72,
    auto_approve: false,
  },

  // Architecture → Planning
  {
    stage: 'ARCHITECTURE' as LifecycleStage,
    gate_id: 'G-ARCH-01',
    required_approvals: 1,
    required_roles: [ROLES.ARCHITECT],
    timeout_hours: 48,
    auto_approve: false,
  },
  {
    stage: 'ARCHITECTURE' as LifecycleStage,
    gate_id: 'G-ARCH-02',
    required_approvals: 1,
    required_roles: [ROLES.SECURITY_REVIEWER],
    timeout_hours: 48,
    auto_approve: false,
  },

  // Implementation → Testing
  {
    stage: 'IMPLEMENTATION' as LifecycleStage,
    gate_id: 'G-IMPL-01',
    required_approvals: 1,
    required_roles: [ROLES.DEVELOPER, ROLES.ARCHITECT],
    timeout_hours: 24,
    auto_approve: false,
  },
  {
    stage: 'IMPLEMENTATION' as LifecycleStage,
    gate_id: 'G-IMPL-02',
    required_approvals: 0,
    required_roles: [],
    timeout_hours: 0,
    auto_approve: true,
  },
  {
    stage: 'IMPLEMENTATION' as LifecycleStage,
    gate_id: 'G-IMPL-03',
    required_approvals: 0,
    required_roles: [],
    timeout_hours: 0,
    auto_approve: true,
  },

  // Security Validation → Release
  {
    stage: 'SECURITY_VALIDATION' as LifecycleStage,
    gate_id: 'G-SEC-01',
    required_approvals: 0,
    required_roles: [],
    timeout_hours: 0,
    auto_approve: true,
  },
  {
    stage: 'SECURITY_VALIDATION' as LifecycleStage,
    gate_id: 'G-SEC-02',
    required_approvals: 0,
    required_roles: [],
    timeout_hours: 0,
    auto_approve: true,
  },

  // Release → Operations
  {
    stage: 'RELEASE' as LifecycleStage,
    gate_id: 'G-REL-01',
    required_approvals: 1,
    required_roles: [ROLES.PRODUCT_OWNER],
    timeout_hours: 24,
    auto_approve: false,
  },
  {
    stage: 'RELEASE' as LifecycleStage,
    gate_id: 'G-REL-02',
    required_approvals: 0,
    required_roles: [],
    timeout_hours: 0,
    auto_approve: true,
  },
  {
    stage: 'RELEASE' as LifecycleStage,
    gate_id: 'G-REL-03',
    required_approvals: 1,
    required_roles: [ROLES.RELEASE_MANAGER],
    timeout_hours: 72,
    auto_approve: false,
  },
]);

// ─── Governance Engine ───────────────────────────────────────

export class GovernanceEngine {
  private _bindings: RoleBinding[] = [];
  private _approvals: ApprovalRequest[] = [];
  private _policies: ApprovalPolicy[];
  private _approvalCounter = 0;

  constructor(policies: ApprovalPolicy[] = [...DEFAULT_POLICIES]) {
    this._policies = policies;
  }

  // ─── Role Management ─────────────────────────────────────

  grantRole(userId: string, role: Role, scope: string, grantedBy: string): RoleBinding {
    const binding: RoleBinding = {
      user_id: userId,
      role,
      scope,
      granted_at: new Date().toISOString(),
      granted_by: grantedBy,
    };
    this._bindings.push(binding);
    return binding;
  }

  revokeRole(userId: string, role: Role, scope: string): boolean {
    const idx = this._bindings.findIndex(
      (b) => b.user_id === userId && b.role === role && b.scope === scope
    );
    if (idx < 0) return false;
    this._bindings.splice(idx, 1);
    return true;
  }

  getUserRoles(userId: string, scope: string): Role[] {
    return this._bindings
      .filter((b) => b.user_id === userId && (b.scope === scope || b.scope === '*'))
      .map((b) => b.role);
  }

  hasPermission(userId: string, role: Role, scope: string): boolean {
    return this.getUserRoles(userId, scope).includes(role);
  }

  // ─── Approval Workflow ────────────────────────────────────

  requestApproval(
    entityId: string,
    stage: LifecycleStage,
    gateId: string,
    requestedBy: string
  ): ApprovalRequest {
    const policy = this._policies.find((p) => p.gate_id === gateId);
    if (!policy) {
      throw new Error(`No approval policy found for gate: ${gateId}`);
    }

    // Auto-approve gates that don't require manual approval
    if (policy.auto_approve) {
      this._approvalCounter += 1;
      const req: ApprovalRequest = {
        id: `APR-${this._approvalCounter}`,
        entity_id: entityId,
        stage,
        gate_id: gateId,
        requested_by: requestedBy,
        requested_at: new Date().toISOString(),
        required_role: policy.required_roles[0] || ROLES.DEVELOPER,
        status: APPROVAL_STATUS.APPROVED,
        decided_by: 'SYSTEM',
        decided_at: new Date().toISOString(),
        reason: 'Auto-approved per policy',
      };
      this._approvals.push(req);
      return req;
    }

    this._approvalCounter += 1;
    const req: ApprovalRequest = {
      id: `APR-${this._approvalCounter}`,
      entity_id: entityId,
      stage,
      gate_id: gateId,
      requested_by: requestedBy,
      requested_at: new Date().toISOString(),
      required_role: policy.required_roles[0] || ROLES.DEVELOPER,
      status: APPROVAL_STATUS.PENDING,
      decided_by: null,
      decided_at: null,
      reason: '',
    };
    this._approvals.push(req);
    return req;
  }

  decide(
    approvalId: string,
    decidedBy: string,
    approved: boolean,
    reason: string
  ): ApprovalRequest {
    const req = this._approvals.find((a) => a.id === approvalId);
    if (!req) throw new Error(`Approval request not found: ${approvalId}`);
    if (req.status !== APPROVAL_STATUS.PENDING) {
      throw new Error(`Approval ${approvalId} is already ${req.status}`);
    }

    req.status = approved ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED;
    req.decided_by = decidedBy;
    req.decided_at = new Date().toISOString();
    req.reason = reason;
    return req;
  }

  getApprovals(entityId: string, gateId?: string): ApprovalRequest[] {
    return this._approvals.filter(
      (a) => a.entity_id === entityId && (!gateId || a.gate_id === gateId)
    );
  }

  getPendingApprovals(userId?: string): ApprovalRequest[] {
    let pending = this._approvals.filter((a) => a.status === APPROVAL_STATUS.PENDING);
    if (userId) {
      pending = pending.filter((a) => {
        const roles = this.getUserRoles(userId, '*');
        return roles.includes(a.required_role);
      });
    }
    return pending;
  }

  // ─── Gate Evaluation ──────────────────────────────────────

  evaluateGate(
    entityId: string,
    gateId: string
  ): { passed: boolean; approvals: ApprovalRequest[] } {
    const policy = this._policies.find((p) => p.gate_id === gateId);
    if (!policy) return { passed: false, approvals: [] };

    const gateApprovals = this._approvals.filter(
      (a) => a.entity_id === entityId && a.gate_id === gateId
    );

    const approvedCount = gateApprovals.filter((a) => a.status === APPROVAL_STATUS.APPROVED).length;

    return {
      passed: approvedCount >= policy.required_approvals,
      approvals: gateApprovals,
    };
  }

  // ─── Serialization ────────────────────────────────────────

  toJSON(): { bindings: RoleBinding[]; approvals: ApprovalRequest[]; policies: ApprovalPolicy[] } {
    return {
      bindings: [...this._bindings],
      approvals: [...this._approvals],
      policies: [...this._policies],
    };
  }

  static fromJSON(data: {
    bindings: RoleBinding[];
    approvals: ApprovalRequest[];
    policies: ApprovalPolicy[];
  }): GovernanceEngine {
    const engine = new GovernanceEngine(data.policies);
    engine._bindings = data.bindings || [];
    engine._approvals = data.approvals || [];
    engine._approvalCounter = data.approvals?.length || 0;
    return engine;
  }
}
