import { describe, it, expect } from 'vitest';
import { adaptApproval, adaptPolicy, adaptSession } from './route-adapters';
import type { ApprovalEntry, PolicyEntry, Session } from './api-types';

describe('route-adapters', () => {
  it('adapts approvals for route-safe summaries', () => {
    const input: ApprovalEntry = {
      id: 'appr-1',
      entity_id: 'sess-9',
      gate_id: 'gate-2',
      stage: 'phase-2',
      requested_by: 'ops',
      requested_at: '2026-03-20T10:00:00Z',
      required_role: 'operator',
      status: 'PENDING',
    };

    expect(adaptApproval(input)).toEqual({
      id: 'appr-1',
      status: 'PENDING',
      gateId: 'gate-2',
      stage: 'phase-2',
      requestedBy: 'ops',
      requestedAt: '2026-03-20T10:00:00Z',
      requiredRole: 'operator',
    });
  });

  it('adapts policies for route-safe summaries', () => {
    const input: PolicyEntry = {
      id: 'pol-1',
      name: 'RBAC enforced',
      scope: 'global',
      category: 'security',
      severity: 'blocking',
      condition_type: 'gate',
      condition_check: 'rbac',
      exception_count: 2,
      description: 'Require RBAC checks',
      action_message: 'Add RBAC',
      pack_id: 'pack-1',
    };

    expect(adaptPolicy(input)).toEqual({
      id: 'pol-1',
      name: 'RBAC enforced',
      scope: 'global',
      severity: 'blocking',
      category: 'security',
      exceptionCount: 2,
    });
  });

  it('adapts sessions for route-safe summaries', () => {
    const input: Session = {
      id: 'sess-1',
      project: 'Control Plane',
      flow: 'DEFAULT',
      phase: 'PHASE-2',
      status: 'active',
      progress: 42,
      started_at: '2026-03-20T09:00:00Z',
      completed_at: null,
      current_agent: 'Security Architect',
    };

    expect(adaptSession(input)).toEqual({
      id: 'sess-1',
      project: 'Control Plane',
      phase: 'PHASE-2',
      status: 'active',
      progress: 42,
      currentAgent: 'Security Architect',
      startedAt: '2026-03-20T09:00:00Z',
      completedAt: null,
    });
  });
});
