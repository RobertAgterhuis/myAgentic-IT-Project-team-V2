/**
 * SDLC Governance Model — Unit Tests
 *
 * Validates GovernanceEngine: role management, approval workflow,
 * gate evaluation, serialisation, and default policies.
 */

import * as __req_0 from '../../platform/sdlc/governance';
const { GovernanceEngine, ROLES, PERMISSIONS, DEFAULT_POLICIES } = __req_0;

// ─── Enum Guards ─────────────────────────────────────────────

describe('Governance enums', () => {
  it('ROLES has 8 entries', () => {
    expect(Object.keys(ROLES)).toHaveLength(8);
  });

  it('PERMISSIONS has 7 entries', () => {
    expect(Object.keys(PERMISSIONS)).toHaveLength(7);
  });

  it('DEFAULT_POLICIES is frozen', () => {
    expect(Object.isFrozen(DEFAULT_POLICIES)).toBe(true);
  });

  it('DEFAULT_POLICIES is an array with 12 entries', () => {
    expect(Array.isArray(DEFAULT_POLICIES)).toBe(true);
    expect(DEFAULT_POLICIES).toHaveLength(12);
  });

  it('every default policy has required_approvals >= 0', () => {
    for (const policy of DEFAULT_POLICIES) {
      expect(policy.required_approvals).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── GovernanceEngine — role management ──────────────────────

describe('GovernanceEngine roles', () => {
  let engine;

  beforeEach(() => {
    engine = new GovernanceEngine();
  });

  it('grantRole() binds a user to a role within a scope', () => {
    const binding = engine.grantRole('alice', 'ARCHITECT', 'project-x', 'admin');
    expect(binding.user_id).toBe('alice');
    expect(binding.role).toBe('ARCHITECT');
    expect(binding.scope).toBe('project-x');
    expect(binding.granted_by).toBe('admin');
  });

  it('getUserRoles() returns roles for a user in a scope', () => {
    engine.grantRole('alice', 'ARCHITECT', 'project-x', 'admin');
    engine.grantRole('alice', 'DEVELOPER', 'project-x', 'admin');
    const roles = engine.getUserRoles('alice', 'project-x');
    expect(roles).toContain('ARCHITECT');
    expect(roles).toContain('DEVELOPER');
  });

  it('getUserRoles() includes global (*) scope bindings', () => {
    engine.grantRole('bob', 'DEVELOPER', '*', 'admin');
    const roles = engine.getUserRoles('bob', 'any-project');
    expect(roles).toContain('DEVELOPER');
  });

  it('revokeRole() removes a binding and returns true', () => {
    engine.grantRole('carol', 'QA_ENGINEER', 'project-y', 'admin');
    const result = engine.revokeRole('carol', 'QA_ENGINEER', 'project-y');
    expect(result).toBe(true);
    expect(engine.getUserRoles('carol', 'project-y')).toHaveLength(0);
  });

  it('revokeRole() returns false when binding does not exist', () => {
    expect(engine.revokeRole('nobody', 'DEVELOPER', 'scope')).toBe(false);
  });

  it('hasPermission() checks if user has a role in scope', () => {
    engine.grantRole('alice', 'ARCHITECT', 'proj', 'admin');
    expect(engine.hasPermission('alice', 'ARCHITECT', 'proj')).toBe(true);
    expect(engine.hasPermission('alice', 'DEVELOPER', 'proj')).toBe(false);
  });
});

// ─── GovernanceEngine — approval workflow ────────────────────

describe('GovernanceEngine approvals', () => {
  let engine;

  beforeEach(() => {
    engine = new GovernanceEngine();
  });

  it('requestApproval() creates a PENDING request for manual gate', () => {
    const req = engine.requestApproval('feat-001', 'REQUIREMENTS', 'G-REQ-01', 'alice');
    expect(req.status).toBe('PENDING');
    expect(req.gate_id).toBe('G-REQ-01');
    expect(req.entity_id).toBe('feat-001');
    expect(req.requested_by).toBe('alice');
  });

  it('requestApproval() auto-approves when policy has auto_approve', () => {
    const req = engine.requestApproval('feat-001', 'IMPLEMENTATION', 'G-IMPL-02', 'alice');
    expect(req.status).toBe('APPROVED');
    expect(req.decided_by).toBe('SYSTEM');
  });

  it('requestApproval() throws for unknown gate id', () => {
    expect(() => engine.requestApproval('feat-001', 'REQUIREMENTS', 'G-FAKE-99', 'alice')).toThrow(
      /No approval policy/
    );
  });

  it('decide() approves a pending request (boolean true)', () => {
    const req = engine.requestApproval('feat-001', 'REQUIREMENTS', 'G-REQ-01', 'alice');
    const result = engine.decide(req.id, 'bob', true, 'LGTM');
    expect(result.status).toBe('APPROVED');
    expect(result.decided_by).toBe('bob');
    expect(result.reason).toBe('LGTM');
  });

  it('decide() rejects a pending request (boolean false)', () => {
    const req = engine.requestApproval('feat-001', 'REQUIREMENTS', 'G-REQ-01', 'alice');
    const result = engine.decide(req.id, 'carol', false, 'Needs rework');
    expect(result.status).toBe('REJECTED');
  });

  it('decide() throws for unknown request id', () => {
    expect(() => engine.decide('no-such', 'bob', true, 'reason')).toThrow(/not found/);
  });

  it('decide() throws for already decided request', () => {
    const req = engine.requestApproval('feat-001', 'REQUIREMENTS', 'G-REQ-01', 'alice');
    engine.decide(req.id, 'bob', true, 'ok');
    expect(() => engine.decide(req.id, 'carol', false, 'too late')).toThrow(/already/);
  });
});

// ─── GovernanceEngine — query methods ────────────────────────

describe('GovernanceEngine query methods', () => {
  let engine;

  beforeEach(() => {
    engine = new GovernanceEngine();
  });

  it('getApprovals() returns approvals for an entity', () => {
    engine.requestApproval('feat-001', 'REQUIREMENTS', 'G-REQ-01', 'alice');
    engine.requestApproval('feat-001', 'REQUIREMENTS', 'G-REQ-02', 'alice');
    engine.requestApproval('feat-002', 'REQUIREMENTS', 'G-REQ-01', 'bob');

    const approvals = engine.getApprovals('feat-001');
    expect(approvals).toHaveLength(2);
  });

  it('getApprovals() filters by gateId', () => {
    engine.requestApproval('feat-001', 'REQUIREMENTS', 'G-REQ-01', 'alice');
    engine.requestApproval('feat-001', 'REQUIREMENTS', 'G-REQ-02', 'alice');

    const approvals = engine.getApprovals('feat-001', 'G-REQ-01');
    expect(approvals).toHaveLength(1);
  });

  it('getPendingApprovals() returns only PENDING requests', () => {
    const req1 = engine.requestApproval('feat-001', 'REQUIREMENTS', 'G-REQ-01', 'alice');
    engine.requestApproval('feat-002', 'REQUIREMENTS', 'G-REQ-01', 'bob');
    engine.decide(req1.id, 'carol', true, 'ok');

    const pending = engine.getPendingApprovals();
    expect(pending).toHaveLength(1);
    expect(pending[0].entity_id).toBe('feat-002');
  });
});

// ─── GovernanceEngine — gate evaluation ──────────────────────

describe('GovernanceEngine evaluateGate', () => {
  let engine;

  beforeEach(() => {
    engine = new GovernanceEngine();
  });

  it('returns { passed: false } when no approvals exist', () => {
    // G-REQ-01 requires 1 approval
    const result = engine.evaluateGate('feat-001', 'G-REQ-01');
    expect(result.passed).toBe(false);
    expect(result.approvals).toHaveLength(0);
  });

  it('returns { passed: true } when required approvals are met', () => {
    const req = engine.requestApproval('feat-001', 'REQUIREMENTS', 'G-REQ-01', 'alice');
    engine.decide(req.id, 'bob', true, 'approved');
    const result = engine.evaluateGate('feat-001', 'G-REQ-01');
    expect(result.passed).toBe(true);
    expect(result.approvals).toHaveLength(1);
  });

  it('returns { passed: false } when only rejections exist', () => {
    const req = engine.requestApproval('feat-001', 'REQUIREMENTS', 'G-REQ-01', 'alice');
    engine.decide(req.id, 'bob', false, 'rejected');
    const result = engine.evaluateGate('feat-001', 'G-REQ-01');
    expect(result.passed).toBe(false);
  });

  it('returns { passed: false } for unknown gate', () => {
    const result = engine.evaluateGate('feat-001', 'G-UNKNOWN-99');
    expect(result.passed).toBe(false);
    expect(result.approvals).toHaveLength(0);
  });
});

// ─── GovernanceEngine — serialisation ────────────────────────

describe('GovernanceEngine serialisation', () => {
  it('toJSON → fromJSON round-trips', () => {
    const e1 = new GovernanceEngine();
    e1.grantRole('alice', 'ARCHITECT', 'proj-1', 'admin');
    e1.requestApproval('adr-001', 'ARCHITECTURE', 'G-ARCH-01', 'alice');

    const json = e1.toJSON();
    expect(json.bindings).toHaveLength(1);
    expect(json.approvals).toHaveLength(1);
    expect(json.policies).toHaveLength(12);

    const e2 = GovernanceEngine.fromJSON(json);
    expect(e2.getUserRoles('alice', 'proj-1')).toContain('ARCHITECT');
    expect(e2.getApprovals('adr-001')).toHaveLength(1);
  });
});
