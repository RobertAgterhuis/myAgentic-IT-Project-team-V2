'use strict';

/**
 * Enforcing Governance Mode — Unit Tests (M6 #371)
 *
 * Tests the PENDING_APPROVAL verdict when governance mode is 'enforcing'
 * and unsatisfied policies exist that require manual approval.
 */

const { loadGovernancePolicies } = require('../../platform/engine/governance-config');

const { runGate } = require('../../platform/engine/gate-validator');

// ─── Test Helpers ────────────────────────────────────────────

function createMockStore(files = {}) {
  const _files = { ...files };
  return {
    exists: (fp) => fp in _files,
    readFile: (fp) => {
      if (!(fp in _files)) throw new Error(`File not found: ${fp}`);
      return _files[fp];
    },
    writeFile: (fp, data) => {
      _files[fp] = data;
    },
    mkdirp: () => {},
    _files,
  };
}

function buildPoliciesJson(overrides = {}) {
  return JSON.stringify({
    governance_mode: overrides.mode || 'enforcing',
    policies: overrides.policies || [
      {
        id: 'GOV-ENFORCE-01',
        gate_pattern: 'CRITIC_*',
        description: 'All critic gates need authorship',
        required_roles: ['DEVELOPER'],
        min_approvals: 0,
        auto_approve: true,
        advisory_message: 'Author identity should be tracked',
      },
      {
        id: 'GOV-ENFORCE-02',
        gate_pattern: 'CRITIC_2',
        description: 'Architecture needs architect sign-off',
        required_roles: ['ARCHITECT'],
        min_approvals: 1,
        auto_approve: false,
        advisory_message: 'Requires ARCHITECT review',
      },
    ],
    identity: {
      resolve_order: ['env'],
      env_variable: 'SDLC_USER',
      fallback: 'test-user',
    },
    audit: { log_governance_checks: false, log_identity_resolution: false },
  });
}

function buildCompliantDeliverable() {
  return [
    '# Deliverable',
    '',
    '## Analysis',
    'Content here.',
    '',
    '## Recommendations',
    'Content here.',
    '',
    '## HANDOFF CHECKLIST',
    '- [x] All required sections are filled',
  ].join('\n');
}

// ─── Tests ───────────────────────────────────────────────────

describe('runGate with governance enforcing mode', () => {
  const deliverablePath = 'deliverable.md';

  function buildGateStore(govMode = 'enforcing') {
    return createMockStore({
      [deliverablePath]: buildCompliantDeliverable(),
      'gov.json': buildPoliciesJson({ mode: govMode }),
    });
  }

  it('returns PENDING_APPROVAL when unsatisfied policies exist in enforcing mode', () => {
    const store = buildGateStore('enforcing');
    const govConfig = loadGovernancePolicies(store, 'gov.json');
    const identity = { user: 'dev', source: 'env', resolved_at: new Date().toISOString() };

    const result = runGate(store, {
      criticState: 'CRITIC_2',
      deliverables: [deliverablePath],
      governanceConfig: govConfig,
      identity,
      criticToPhase: { CRITIC_2: 'PHASE_2' },
      phaseContracts: { PHASE_2: [] },
      phaseGuardrails: { PHASE_2: [] },
    });

    expect(result.verdict).toBe('PENDING_APPROVAL');
    expect(result.summary.blocked_by_governance).toBe(true);
    expect(result.summary.unsatisfied_policies).toBeDefined();
    expect(result.summary.unsatisfied_policies.length).toBeGreaterThan(0);
  });

  it('returns APPROVED when all policies are auto_approve in enforcing mode', () => {
    const store = buildGateStore('enforcing');
    const govConfig = loadGovernancePolicies(store, 'gov.json');
    const identity = { user: 'dev', source: 'env', resolved_at: new Date().toISOString() };

    // CRITIC_1 only matches the wildcard policy (auto_approve=true)
    const result = runGate(store, {
      criticState: 'CRITIC_1',
      deliverables: [deliverablePath],
      governanceConfig: govConfig,
      identity,
      criticToPhase: { CRITIC_1: 'PHASE_1' },
      phaseContracts: { PHASE_1: [] },
      phaseGuardrails: { PHASE_1: [] },
    });

    // Should NOT be PENDING_APPROVAL — the only policy is auto-approved
    expect(result.verdict).toBe('APPROVED');
    expect(result.summary?.blocked_by_governance).toBeFalsy();
  });

  it('includes unsatisfied_policies array with policy details', () => {
    const store = buildGateStore('enforcing');
    const govConfig = loadGovernancePolicies(store, 'gov.json');
    const identity = { user: 'dev', source: 'env', resolved_at: new Date().toISOString() };

    const result = runGate(store, {
      criticState: 'CRITIC_2',
      deliverables: [deliverablePath],
      governanceConfig: govConfig,
      identity,
      criticToPhase: { CRITIC_2: 'PHASE_2' },
      phaseContracts: { PHASE_2: [] },
      phaseGuardrails: { PHASE_2: [] },
    });

    const unsatisfied = result.summary.unsatisfied_policies;
    expect(unsatisfied).toBeDefined();
    expect(unsatisfied).toContain('GOV-ENFORCE-02');
  });

  it('PENDING_APPROVAL includes approval_timeout_hours', () => {
    const store = buildGateStore('enforcing');
    const govConfig = loadGovernancePolicies(store, 'gov.json');
    const identity = { user: 'dev', source: 'env', resolved_at: new Date().toISOString() };

    const result = runGate(store, {
      criticState: 'CRITIC_2',
      deliverables: [deliverablePath],
      governanceConfig: govConfig,
      identity,
      criticToPhase: { CRITIC_2: 'PHASE_2' },
      phaseContracts: { PHASE_2: [] },
      phaseGuardrails: { PHASE_2: [] },
    });

    expect(result.summary.approval_timeout_hours).toBeGreaterThan(0);
  });

  it('enforcing mode does not block when mode is advisory', () => {
    const store = buildGateStore('advisory');
    const govConfig = loadGovernancePolicies(store, 'gov.json');
    const identity = { user: 'dev', source: 'env', resolved_at: new Date().toISOString() };

    const result = runGate(store, {
      criticState: 'CRITIC_2',
      deliverables: [deliverablePath],
      governanceConfig: govConfig,
      identity,
      criticToPhase: { CRITIC_2: 'PHASE_2' },
      phaseContracts: { PHASE_2: [] },
      phaseGuardrails: { PHASE_2: [] },
    });

    expect(result.verdict).toBe('APPROVED');
    expect(result.summary?.blocked_by_governance).toBeFalsy();
  });
});
