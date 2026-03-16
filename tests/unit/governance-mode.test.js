'use strict';

/**
 * Governance Mode & Advisory Logging — Unit Tests (M4)
 *
 * Covers:
 *   - Governance configuration loading (off / advisory / enforcing)
 *   - Identity resolver (env, git_config, fallback)
 *   - Policy matching (exact match, wildcard)
 *   - Advisory governance report in gate results
 *   - Governance audit event logging in AuditTrail
 *   - State persistence of governance_mode
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  loadGovernancePolicies,
  matchPolicies,
} = require('../../platform/engine/governance-config');

const { resolveIdentity } = require('../../platform/engine/identity');

const { runGate } = require('../../platform/engine/gate-validator');

const { AuditTrail } = require('../../src/webapp/audit');

const { saveSessionState, loadSessionState } = require('../../platform/engine/state-persistence');

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
    governance_mode: overrides.mode || 'advisory',
    policies: overrides.policies || [
      {
        id: 'GOV-TEST-01',
        gate_pattern: 'CRITIC_*',
        description: 'All critic gates need authorship',
        required_roles: ['DEVELOPER'],
        min_approvals: 0,
        auto_approve: true,
        advisory_message: 'Author identity should be tracked',
      },
      {
        id: 'GOV-TEST-02',
        gate_pattern: 'CRITIC_2',
        description: 'Architecture needs architect sign-off',
        required_roles: ['ARCHITECT'],
        min_approvals: 1,
        auto_approve: false,
        advisory_message: 'Requires ARCHITECT review',
      },
    ],
    identity: overrides.identity || {
      resolve_order: ['env', 'git_config'],
      env_variable: 'SDLC_USER',
      fallback: 'anonymous',
    },
    audit: overrides.audit || {
      log_governance_checks: true,
      log_identity_resolution: true,
      include_advisory_in_gate_result: true,
    },
  });
}

function buildCompliantDeliverable() {
  return [
    '# Analysis – Test',
    '## Metadata',
    'Agent: Test Agent',
    '## Findings',
    'F-001: Test finding. Source: test.md L1.',
    '## HANDOFF CHECKLIST',
    '- [x] All required sections are filled (not empty, not placeholder)',
    '- [x] All UNCERTAIN: items are documented and escalated',
    '- [x] All INSUFFICIENT_DATA: items are documented and escalated',
    '- [x] Output complies with the contract in /templates/sdlc/contracts/',
    '- [x] Guardrails from /templates/sdlc/guardrails/ have been checked',
    '- [x] Output is machine-readable and ready as input for the next agent',
    '- [x] No contradictory statements in this document',
    '- [x] All findings include a source reference',
    '- [x] Deliverable written to file (not only in chat) per MEMORY MANAGEMENT PROTOCOL',
  ].join('\n');
}

// ─── Governance Config Loading ───────────────────────────────

describe('loadGovernancePolicies', () => {
  it('returns default (mode=off) when file does not exist', () => {
    const store = createMockStore({});
    const config = loadGovernancePolicies(store, 'missing.json');
    expect(config.governance_mode).toBe('off');
    expect(config.policies).toEqual([]);
  });

  it('loads advisory mode from valid JSON', () => {
    const store = createMockStore({
      'gov.json': buildPoliciesJson({ mode: 'advisory' }),
    });
    const config = loadGovernancePolicies(store, 'gov.json');
    expect(config.governance_mode).toBe('advisory');
    expect(config.policies).toHaveLength(2);
  });

  it('loads enforcing mode from valid JSON', () => {
    const store = createMockStore({
      'gov.json': buildPoliciesJson({ mode: 'enforcing' }),
    });
    const config = loadGovernancePolicies(store, 'gov.json');
    expect(config.governance_mode).toBe('enforcing');
  });

  it('returns default for invalid mode value', () => {
    const store = createMockStore({
      'gov.json': JSON.stringify({ governance_mode: 'invalid' }),
    });
    const config = loadGovernancePolicies(store, 'gov.json');
    expect(config.governance_mode).toBe('off');
  });

  it('returns default for malformed JSON', () => {
    const store = createMockStore({
      'gov.json': '{ broken json',
    });
    const config = loadGovernancePolicies(store, 'gov.json');
    expect(config.governance_mode).toBe('off');
  });

  it('preserves identity and audit config from file', () => {
    const store = createMockStore({
      'gov.json': buildPoliciesJson({
        identity: {
          resolve_order: ['git_config'],
          env_variable: 'MY_USER',
          fallback: 'unknown',
        },
      }),
    });
    const config = loadGovernancePolicies(store, 'gov.json');
    expect(config.identity.env_variable).toBe('MY_USER');
    expect(config.identity.fallback).toBe('unknown');
    expect(config.identity.resolve_order).toEqual(['git_config']);
  });
});

// ─── Policy Matching ─────────────────────────────────────────

describe('matchPolicies', () => {
  const policies = [
    {
      id: 'P1',
      gate_pattern: 'CRITIC_*',
      description: 'All critics',
      required_roles: ['DEVELOPER'],
      min_approvals: 0,
      auto_approve: true,
      advisory_message: 'msg',
    },
    {
      id: 'P2',
      gate_pattern: 'CRITIC_2',
      description: 'Arch critic only',
      required_roles: ['ARCHITECT'],
      min_approvals: 1,
      auto_approve: false,
      advisory_message: 'msg2',
    },
    {
      id: 'P3',
      gate_pattern: 'SPRINT_GATE',
      description: 'Sprint gate',
      required_roles: ['PRODUCT_OWNER'],
      min_approvals: 1,
      auto_approve: false,
      advisory_message: 'msg3',
    },
  ];

  it('matches wildcard patterns', () => {
    const matched = matchPolicies(policies, 'CRITIC_1');
    expect(matched).toHaveLength(1);
    expect(matched[0].id).toBe('P1');
  });

  it('matches exact + wildcard for CRITIC_2', () => {
    const matched = matchPolicies(policies, 'CRITIC_2');
    expect(matched).toHaveLength(2);
    expect(matched.map((p) => p.id)).toContain('P1');
    expect(matched.map((p) => p.id)).toContain('P2');
  });

  it('matches exact pattern for SPRINT_GATE', () => {
    const matched = matchPolicies(policies, 'SPRINT_GATE');
    expect(matched).toHaveLength(1);
    expect(matched[0].id).toBe('P3');
  });

  it('returns empty for unmatched gate', () => {
    const matched = matchPolicies(policies, 'UNKNOWN_GATE');
    expect(matched).toHaveLength(0);
  });
});

// ─── Identity Resolver ───────────────────────────────────────

describe('resolveIdentity', () => {
  const originalEnv = process.env.SDLC_USER;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.SDLC_USER = originalEnv;
    } else {
      delete process.env.SDLC_USER;
    }
  });

  it('resolves from environment variable when set', () => {
    process.env.SDLC_USER = 'test-user';
    const identity = resolveIdentity({ resolve_order: ['env'], env_variable: 'SDLC_USER' });
    expect(identity.user).toBe('test-user');
    expect(identity.source).toBe('env');
    expect(identity.resolved_at).toBeTruthy();
  });

  it('falls back to git_config when env is empty', () => {
    delete process.env.SDLC_USER;
    const identity = resolveIdentity({
      resolve_order: ['env', 'git_config'],
      env_variable: 'SDLC_USER',
      fallback: 'fallback-user',
    });
    // git_config may or may not work in CI, but it should not throw
    expect(identity.user).toBeTruthy();
    expect(['env', 'git_config', 'fallback']).toContain(identity.source);
  });

  it('returns fallback when all resolvers fail', () => {
    delete process.env.SDLC_USER;
    const identity = resolveIdentity({
      resolve_order: [],
      fallback: 'fallback-user',
    });
    expect(identity.user).toBe('fallback-user');
    expect(identity.source).toBe('fallback');
  });

  it('uses default config when no config provided', () => {
    process.env.SDLC_USER = 'default-test';
    const identity = resolveIdentity();
    expect(identity.user).toBe('default-test');
  });

  it('skips unknown resolver methods gracefully', () => {
    delete process.env.SDLC_USER;
    const identity = resolveIdentity({
      resolve_order: ['nonexistent', 'env'],
      env_variable: 'SDLC_USER',
      fallback: 'fb',
    });
    expect(identity.user).toBe('fb');
    expect(identity.source).toBe('fallback');
  });

  it('uses custom env variable name', () => {
    process.env.MY_CUSTOM_USER = 'custom-user';
    try {
      const identity = resolveIdentity({
        resolve_order: ['env'],
        env_variable: 'MY_CUSTOM_USER',
      });
      expect(identity.user).toBe('custom-user');
    } finally {
      delete process.env.MY_CUSTOM_USER;
    }
  });
});

// ─── Advisory Governance in Gate Validator ────────────────────

describe('runGate with governance advisory', () => {
  const deliverablePath = 'deliverable.md';

  function buildGateStore(govMode = 'advisory') {
    return createMockStore({
      [deliverablePath]: buildCompliantDeliverable(),
      'gov.json': buildPoliciesJson({ mode: govMode }),
    });
  }

  it('includes governance_report when mode=advisory', () => {
    const store = buildGateStore('advisory');
    const govConfig = loadGovernancePolicies(store, 'gov.json');
    const identity = { user: 'test-user', source: 'env', resolved_at: new Date().toISOString() };

    const result = runGate(store, {
      criticState: 'CRITIC_1',
      deliverables: [deliverablePath],
      governanceConfig: govConfig,
      identity,
      criticToPhase: { CRITIC_1: 'PHASE_1' },
      phaseContracts: { PHASE_1: [] },
      phaseGuardrails: { PHASE_1: [] },
    });

    expect(result.governance_report).toBeDefined();
    expect(result.governance_report.mode).toBe('advisory');
    expect(result.governance_report.identity.user).toBe('test-user');
    expect(result.governance_report.policies_evaluated).toBeGreaterThanOrEqual(1);
  });

  it('does not include governance_report when mode=off', () => {
    const store = buildGateStore('off');
    const govConfig = loadGovernancePolicies(store, 'gov.json');
    // mode should be 'off' since we passed 'off'
    // Actually loadGovernancePolicies with mode 'off' should work
    const result = runGate(store, {
      criticState: 'CRITIC_1',
      deliverables: [deliverablePath],
      governanceConfig: { ...govConfig, governance_mode: 'off' },
      criticToPhase: { CRITIC_1: 'PHASE_1' },
      phaseContracts: { PHASE_1: [] },
      phaseGuardrails: { PHASE_1: [] },
    });

    expect(result.governance_report).toBeUndefined();
  });

  it('does not include governance_report when no governance config', () => {
    const store = buildGateStore();
    const result = runGate(store, {
      criticState: 'CRITIC_1',
      deliverables: [deliverablePath],
      criticToPhase: { CRITIC_1: 'PHASE_1' },
      phaseContracts: { PHASE_1: [] },
      phaseGuardrails: { PHASE_1: [] },
    });

    expect(result.governance_report).toBeUndefined();
  });

  it('marks auto_approve policies as satisfied', () => {
    const store = buildGateStore('advisory');
    const govConfig = loadGovernancePolicies(store, 'gov.json');
    const identity = { user: 'dev', source: 'env', resolved_at: new Date().toISOString() };

    const result = runGate(store, {
      criticState: 'CRITIC_1',
      deliverables: [deliverablePath],
      governanceConfig: govConfig,
      identity,
      criticToPhase: { CRITIC_1: 'PHASE_1' },
      phaseContracts: { PHASE_1: [] },
      phaseGuardrails: { PHASE_1: [] },
    });

    // CRITIC_1 matches only the wildcard policy (auto_approve=true)
    const advisories = result.governance_report.advisories;
    expect(advisories.length).toBeGreaterThanOrEqual(1);
    expect(advisories[0].satisfied).toBe(true);
  });

  it('reports unsatisfied policies for CRITIC_2', () => {
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

    // CRITIC_2 matches wildcard (satisfied) + exact (unsatisfied)
    expect(result.governance_report.policies_evaluated).toBe(2);
    expect(result.governance_report.unsatisfied_count).toBe(1);
  });

  it('governance report does not affect gate verdict (advisory mode)', () => {
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

    // Even with unsatisfied governance policies, verdict should be APPROVED
    // because governance is advisory, not blocking
    expect(result.verdict).toBe('APPROVED');
    expect(result.governance_report.unsatisfied_count).toBeGreaterThan(0);
  });
});

// ─── Governance Audit Events ─────────────────────────────────

describe('AuditTrail.logGovernanceCheck', () => {
  let tmpDir;
  let trail;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gov-audit-'));
    trail = new AuditTrail({ logDir: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('logs a governance check event with correct fields', () => {
    trail.logGovernanceCheck({
      criticState: 'CRITIC_1',
      mode: 'advisory',
      user: 'alice',
      policiesEvaluated: 2,
      unsatisfiedCount: 1,
      verdict: 'APPROVED',
    });

    const entries = trail.read();
    expect(entries).toHaveLength(1);
    expect(entries[0].operation).toBe('GOVERNANCE_CHECK');
    expect(entries[0].entity_type).toBe('gate');
    expect(entries[0].entity_id).toBe('CRITIC_1');
    expect(entries[0].user).toBe('alice');
    expect(entries[0].summary).toContain('mode=advisory');
    expect(entries[0].summary).toContain('policies=2');
    expect(entries[0].summary).toContain('unsatisfied=1');
    expect(entries[0].summary).toContain('verdict=APPROVED');
  });

  it('logs multiple governance events', () => {
    trail.logGovernanceCheck({
      criticState: 'CRITIC_1',
      mode: 'advisory',
      user: 'alice',
      policiesEvaluated: 1,
      unsatisfiedCount: 0,
      verdict: 'APPROVED',
    });
    trail.logGovernanceCheck({
      criticState: 'CRITIC_2',
      mode: 'advisory',
      user: 'bob',
      policiesEvaluated: 3,
      unsatisfiedCount: 2,
      verdict: 'APPROVED',
    });

    const entries = trail.read();
    expect(entries).toHaveLength(2);
    expect(entries[0].entity_id).toBe('CRITIC_1');
    expect(entries[1].entity_id).toBe('CRITIC_2');
  });
});

// ─── State Persistence with governance_mode ──────────────────

describe('State persistence with governance_mode', () => {
  it('persists governance_mode in session state', () => {
    const store = createMockStore({});
    const state = {
      status: 'PHASE_1',
      mode: 'CREATE',
      state_history: [],
      gate_results: {},
      last_updated: new Date().toISOString(),
      governance_mode: 'advisory',
    };

    saveSessionState(store, state, 'session.json');
    const loaded = loadSessionState(store, 'session.json');

    expect(loaded.governance_mode).toBe('advisory');
  });

  it('preserves governance_mode on merge with existing state', () => {
    const store = createMockStore({
      'session.json': JSON.stringify({
        project_name: 'test-project',
        governance_mode: 'advisory',
      }),
    });

    const state = {
      status: 'PHASE_2',
      mode: 'CREATE',
      state_history: [],
      gate_results: {},
      last_updated: new Date().toISOString(),
    };

    saveSessionState(store, state, 'session.json');
    const loaded = loadSessionState(store, 'session.json');

    expect(loaded.project_name).toBe('test-project');
    expect(loaded.governance_mode).toBe('advisory');
  });
});
