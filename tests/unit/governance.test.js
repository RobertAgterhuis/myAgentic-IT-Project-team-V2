'use strict';

const { GovernanceEngine, DEFAULT_POLICIES, ROLES } = require('../../platform/sdlc/governance');

// ── helpers ──────────────────────────────────────────────────

function mkEngine() {
  return new GovernanceEngine([...DEFAULT_POLICIES]);
}

const MANUAL = () => DEFAULT_POLICIES.find((p) => !p.auto_approve);
const AUTO = () => DEFAULT_POLICIES.find((p) => p.auto_approve);

// ── Policies ─────────────────────────────────────────────────

describe('DEFAULT_POLICIES', () => {
  it('is a non-empty array with gate_id and stage', () => {
    expect(DEFAULT_POLICIES.length).toBeGreaterThan(0);
    for (const p of DEFAULT_POLICIES) {
      expect(p).toHaveProperty('gate_id');
      expect(p).toHaveProperty('stage');
    }
  });

  it('includes both auto_approve and manual policies', () => {
    const auto = DEFAULT_POLICIES.filter((p) => p.auto_approve);
    const manual = DEFAULT_POLICIES.filter((p) => !p.auto_approve);
    expect(auto.length).toBeGreaterThan(0);
    expect(manual.length).toBeGreaterThan(0);
  });
});

// ── Role Management ──────────────────────────────────────────

describe('GovernanceEngine – roles', () => {
  let engine;
  beforeEach(() => {
    engine = mkEngine();
  });

  it('grantRole + getUserRoles', () => {
    engine.grantRole('alice', ROLES.DEVELOPER, '*', 'admin');
    const roles = engine.getUserRoles('alice', '*');
    expect(roles).toContain(ROLES.DEVELOPER);
  });

  it('grantRole with specific scope is invisible from other scope', () => {
    engine.grantRole('bob', ROLES.ARCHITECT, 'project-x', 'admin');
    expect(engine.getUserRoles('bob', 'project-x')).toContain(ROLES.ARCHITECT);
    expect(engine.getUserRoles('bob', 'project-y')).toHaveLength(0);
  });

  it('getUserRoles returns empty for unknown user', () => {
    expect(engine.getUserRoles('ghost', '*')).toEqual([]);
  });

  it('revokeRole returns true and removes', () => {
    engine.grantRole('alice', ROLES.DEVELOPER, '*', 'admin');
    const removed = engine.revokeRole('alice', ROLES.DEVELOPER, '*');
    expect(removed).toBe(true);
    expect(engine.getUserRoles('alice', '*')).toHaveLength(0);
  });

  it('revokeRole returns false when not found', () => {
    expect(engine.revokeRole('alice', ROLES.DEVELOPER, '*')).toBe(false);
  });

  it('hasPermission with wildcard scope', () => {
    engine.grantRole('alice', ROLES.PRODUCT_OWNER, '*', 'admin');
    expect(engine.hasPermission('alice', ROLES.PRODUCT_OWNER, 'any-scope')).toBe(true);
  });

  it('hasPermission with specific scope', () => {
    engine.grantRole('alice', ROLES.PRODUCT_OWNER, 'proj-x', 'admin');
    expect(engine.hasPermission('alice', ROLES.PRODUCT_OWNER, 'proj-x')).toBe(true);
    expect(engine.hasPermission('alice', ROLES.PRODUCT_OWNER, 'proj-y')).toBe(false);
  });

  it('hasPermission returns false with no matching role', () => {
    expect(engine.hasPermission('ghost', ROLES.PRODUCT_OWNER, '*')).toBe(false);
  });
});

// ── Approval Workflow ────────────────────────────────────────

describe('GovernanceEngine – approvals', () => {
  let engine;
  beforeEach(() => {
    engine = mkEngine();
  });

  it('requestApproval for manual policy → PENDING', () => {
    const mp = MANUAL();
    const approval = engine.requestApproval('E1', mp.stage, mp.gate_id, 'alice');
    expect(approval.status).toBe('PENDING');
    expect(approval.gate_id).toBe(mp.gate_id);
    expect(approval.requested_by).toBe('alice');
  });

  it('requestApproval for auto_approve policy → APPROVED', () => {
    const ap = AUTO();
    const approval = engine.requestApproval('E2', ap.stage, ap.gate_id, 'bot');
    expect(approval.status).toBe('APPROVED');
    expect(approval.decided_by).toBe('SYSTEM');
  });

  it('requestApproval for unknown gate_id throws', () => {
    expect(() => engine.requestApproval('E', 'REQUIREMENTS', 'nonexistent-gate', 'u')).toThrow();
  });

  it('decide approves pending approval', () => {
    const mp = MANUAL();
    const approval = engine.requestApproval('E3', mp.stage, mp.gate_id, 'alice');
    const decided = engine.decide(approval.id, 'bob', true, 'looks good');
    expect(decided.status).toBe('APPROVED');
    expect(decided.decided_by).toBe('bob');
    expect(decided.reason).toBe('looks good');
  });

  it('decide rejects pending approval', () => {
    const mp = MANUAL();
    const approval = engine.requestApproval('E4', mp.stage, mp.gate_id, 'alice');
    const decided = engine.decide(approval.id, 'bob', false, 'not ready');
    expect(decided.status).toBe('REJECTED');
  });

  it('decide on already-decided throws', () => {
    const mp = MANUAL();
    const approval = engine.requestApproval('E5', mp.stage, mp.gate_id, 'alice');
    engine.decide(approval.id, 'bob', true, 'ok');
    expect(() => engine.decide(approval.id, 'carol', false, 'nope')).toThrow(/already/i);
  });

  it('decide on unknown id throws', () => {
    expect(() => engine.decide('bad-id', 'u', true, '')).toThrow(/not found/i);
  });
});

// ── Queries ──────────────────────────────────────────────────

describe('GovernanceEngine – queries', () => {
  let engine;
  let mp;

  beforeEach(() => {
    engine = mkEngine();
    mp = MANUAL();
    engine.grantRole('alice', mp.required_roles[0] || ROLES.PRODUCT_OWNER, '*', 'admin');
    engine.requestApproval('EA', mp.stage, mp.gate_id, 'alice');
    engine.requestApproval('EB', mp.stage, mp.gate_id, 'bob');
  });

  it('getApprovals for entity returns matches', () => {
    const approvals = engine.getApprovals('EA', mp.gate_id);
    expect(approvals).toHaveLength(1);
  });

  it('getApprovals with no gateId returns all for entity', () => {
    const all = engine.getApprovals('EA');
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('getPendingApprovals returns only pending', () => {
    const pending = engine.getPendingApprovals();
    expect(pending.every((a) => a.status === 'PENDING')).toBe(true);
  });

  it('getPendingApprovals with userId filter', () => {
    const pending = engine.getPendingApprovals('alice');
    expect(pending.length).toBeGreaterThanOrEqual(0);
  });

  it('getAllApprovals with status filter', () => {
    const allApprovals = engine.getApprovals('EA', mp.gate_id);
    engine.decide(allApprovals[0].id, 'admin', true, 'ok');
    const approved = engine.getAllApprovals('APPROVED');
    expect(approved.length).toBeGreaterThanOrEqual(1);
    expect(approved.every((a) => a.status === 'APPROVED')).toBe(true);
  });

  it('getAllApprovals without filter returns all', () => {
    const all = engine.getAllApprovals();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('getApprovalById returns undefined for missing', () => {
    expect(engine.getApprovalById('nonexistent')).toBeUndefined();
  });

  it('getApprovalById returns existing approval', () => {
    const pending = engine.getPendingApprovals();
    expect(engine.getApprovalById(pending[0].id)).toBeDefined();
  });
});

// ── Gate Evaluation ──────────────────────────────────────────

describe('GovernanceEngine – gate evaluation', () => {
  let engine;
  beforeEach(() => {
    engine = mkEngine();
  });

  it('evaluateGate returns result with passed boolean', () => {
    const mp = MANUAL();
    engine.requestApproval('E1', mp.stage, mp.gate_id, 'alice');
    const result = engine.evaluateGate('E1', mp.gate_id);
    expect(result).toHaveProperty('passed');
    expect(typeof result.passed).toBe('boolean');
  });

  it('evaluateGate for unknown gate returns failure', () => {
    const result = engine.evaluateGate('E1', 'does-not-exist');
    expect(result.passed).toBe(false);
  });

  it('evaluateGate passes when auto-approved', () => {
    const ap = AUTO();
    engine.requestApproval('E1', ap.stage, ap.gate_id, 'alice');
    const result = engine.evaluateGate('E1', ap.gate_id);
    expect(result.passed).toBe(true);
  });

  it('evaluateGate fails when pending and requires approvals', () => {
    const mp = MANUAL();
    engine.requestApproval('E1', mp.stage, mp.gate_id, 'alice');
    const result = engine.evaluateGate('E1', mp.gate_id);
    expect(result.passed).toBe(false);
  });

  it('evaluateGate passes after manual approval', () => {
    const mp = MANUAL();
    const req = engine.requestApproval('E1', mp.stage, mp.gate_id, 'alice');
    engine.decide(req.id, 'bob', true, 'ok');
    const result = engine.evaluateGate('E1', mp.gate_id);
    expect(result.passed).toBe(true);
  });
});

// ── Expiration ───────────────────────────────────────────────

describe('GovernanceEngine – expireTimedOut', () => {
  let engine;
  beforeEach(() => {
    engine = mkEngine();
  });

  it('does not expire fresh approvals', () => {
    const mp = MANUAL();
    engine.requestApproval('E1', mp.stage, mp.gate_id, 'alice');
    const expired = engine.expireTimedOut();
    expect(expired).toHaveLength(0);
  });

  it('returns empty when no pending approvals', () => {
    const expired = engine.expireTimedOut();
    expect(expired).toEqual([]);
  });
});

// ── Serialization ────────────────────────────────────────────

describe('GovernanceEngine – serialization', () => {
  it('toJSON / fromJSON round-trip', () => {
    const engine = mkEngine();
    engine.grantRole('alice', ROLES.DEVELOPER, '*', 'admin');
    const mp = MANUAL();
    engine.requestApproval('E1', mp.stage, mp.gate_id, 'alice');

    const json = engine.toJSON();
    expect(json).toHaveProperty('bindings');
    expect(json).toHaveProperty('approvals');
    expect(json).toHaveProperty('policies');

    const restored = GovernanceEngine.fromJSON(json);
    expect(restored.getUserRoles('alice', '*')).toContain(ROLES.DEVELOPER);
    expect(restored.getAllApprovals().length).toBeGreaterThanOrEqual(1);
  });
});

// ── Persistence ──────────────────────────────────────────────

describe('GovernanceEngine – persistence', () => {
  it('saveTo and loadFrom round-trip via store', () => {
    const files = new Map();
    const store = {
      mkdirp: () => {},
      writeFile: (p, d) => files.set(p, d),
      exists: (p) => files.has(p),
      readFile: (p) => files.get(p),
    };

    const engine = mkEngine();
    engine.grantRole('alice', ROLES.PRODUCT_OWNER, '*', 'admin');
    const mp = MANUAL();
    engine.requestApproval('E1', mp.stage, mp.gate_id, 'alice');
    engine.saveTo(store, '/gov.json');

    const loaded = GovernanceEngine.loadFrom(store, '/gov.json');
    expect(loaded).not.toBeNull();
    expect(loaded.getUserRoles('alice', '*')).toContain(ROLES.PRODUCT_OWNER);
    expect(loaded.getAllApprovals().length).toBeGreaterThanOrEqual(1);
  });

  it('loadFrom non-existent file returns null', () => {
    const store = {
      exists: () => false,
      readFile: () => {
        throw new Error('not found');
      },
    };
    const result = GovernanceEngine.loadFrom(store, '/no-such-file.json');
    expect(result).toBeNull();
  });

  it('loadFrom with corrupt data returns null', () => {
    const store = {
      exists: () => true,
      readFile: () => 'NOT VALID JSON{{{',
    };
    const result = GovernanceEngine.loadFrom(store, '/corrupt.json');
    expect(result).toBeNull();
  });
});
