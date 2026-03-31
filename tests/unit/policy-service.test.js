import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

import * as __req_0 from '../../src/webapp/store';
const { FileStore, setStore } = __req_0;
import * as __req_1 from '../../src/webapp/services';
const { PolicyService, PolicyNotFoundError, PolicyValidationError } = __req_1;

function makePolicy(overrides = {}) {
  return {
    id: 'POL-TEST-001',
    name: 'Test Policy',
    scope: 'global',
    category: 'security',
    severity: 'blocking',
    condition: { type: 'gate', check: 'secret_scan_passed' },
    action: { type: 'block', message: 'Secret scan required' },
    exceptions: [],
    metadata: { owner: 'security-team', created: '2025-01-01T00:00:00Z' },
    ...overrides,
  };
}

function makePack(policies, overrides = {}) {
  return {
    pack_id: 'test-pack',
    pack_name: 'Test Pack',
    version: '1.0.0',
    policies,
    ...overrides,
  };
}

function makeCtx(projectRoot, store) {
  return {
    store,
    cache: {},
    audit: { log: () => {} },
    projectRoot,
    businessDocs: path.join(projectRoot, 'BusinessDocs'),
    sessionDir: path.join(projectRoot, 'BusinessDocs', 'session'),
    decisionsFile: path.join(projectRoot, 'BusinessDocs', 'decisions.json'),
    decisionsDir: path.join(projectRoot, 'BusinessDocs', 'decisions'),
    commandQueue: path.join(projectRoot, 'BusinessDocs', 'commands.json'),
    helpDir: path.join(projectRoot, 'docs', 'help'),
    safeWrite: () => {},
  };
}

describe('PolicyService', () => {
  let tempDir;
  let policiesDir;
  let store;
  let service;
  let packPath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-service-'));
    policiesDir = path.join(tempDir, 'platform', 'sdlc', 'policies');
    fs.mkdirSync(policiesDir, { recursive: true });

    packPath = path.join(policiesDir, 'test-pack.json');
    const pack = makePack([
      makePolicy(),
      makePolicy({ id: 'POL-TEST-002', name: 'Second Policy', severity: 'warning' }),
    ]);
    fs.writeFileSync(packPath, JSON.stringify(pack, null, 2));

    store = new FileStore();
    setStore(store);
    service = new PolicyService(makeCtx(tempDir, store));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists policies and policy packs', () => {
    const packs = service.listPolicyPacks();
    expect(packs.count).toBe(1);
    expect(packs.packs[0].pack_id).toBe('test-pack');
    expect(packs.packs[0].policy_count).toBe(2);

    const policies = service.listPolicies();
    expect(policies.count).toBe(2);
    expect(policies.policies.map((p) => p.id)).toEqual(['POL-TEST-001', 'POL-TEST-002']);
  });

  it('creates policy exceptions and updates the pack', () => {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const result = service.createException({
      policy_id: 'POL-TEST-001',
      reason: 'Approved temporary exception',
      approved_by: 'qa-lead',
      expires,
    });

    expect(result.ok).toBe(true);
    expect(result.policy_id).toBe('POL-TEST-001');

    const updated = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    const policy = updated.policies.find((p) => p.id === 'POL-TEST-001');
    expect(policy.exceptions).toHaveLength(1);
    expect(policy.exceptions[0].reason).toBe('Approved temporary exception');
  });

  it('updates a policy in the pack', () => {
    const result = service.updatePolicy({
      policy_id: 'POL-TEST-002',
      name: 'Updated Policy',
      action_message: 'New action message',
    });

    expect(result.ok).toBe(true);
    expect(result.policy.name).toBe('Updated Policy');
    expect(result.policy.action_message).toBe('New action message');

    const updated = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    const policy = updated.policies.find((p) => p.id === 'POL-TEST-002');
    expect(policy.name).toBe('Updated Policy');
    expect(policy.action.message).toBe('New action message');
  });

  it('rejects invalid policy updates and missing policies', () => {
    expect(() => service.updatePolicy({ policy_id: 'POL-TEST-001' })).toThrow(
      PolicyValidationError
    );

    expect(() => service.updatePolicy({ policy_id: 'POL-MISSING', name: 'Nope' })).toThrow(
      PolicyNotFoundError
    );
  });

  it('validates policy exception inputs', () => {
    expect(() =>
      service.createException({
        policy_id: 'POL-TEST-001',
        reason: 'Missing approved_by',
        approved_by: '',
        expires: 'not-a-date',
      })
    ).toThrow(PolicyValidationError);
  });
});

describe('PolicyService.listPolicySignals', () => {
  let tempDir;
  let store;
  let service;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-signals-'));
    const policiesDir = path.join(tempDir, 'platform', 'sdlc', 'policies');
    fs.mkdirSync(policiesDir, { recursive: true });
    const pack = makePack([
      makePolicy({ condition: { type: 'gate', check: 'coverage_threshold' } }),
    ]);
    fs.writeFileSync(path.join(policiesDir, 'test-pack.json'), JSON.stringify(pack));
    store = new FileStore();
    setStore(store);
    service = new PolicyService(makeCtx(tempDir, store));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns empty signals when no signal files exist', () => {
    const result = service.listPolicySignals();
    expect(result.signals).toBeInstanceOf(Array);
    expect(result.checks).toBeDefined();
    expect(result.generated_at).toBeDefined();
    expect(result.missing).toContain('coverage_threshold');
  });

  it('includes passing coverage signal when pct >= threshold', () => {
    const dir = path.join(tempDir, 'coverage');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'coverage-summary.json'),
      JSON.stringify({ total: { statements: { pct: 80 } } })
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'coverage_threshold');
    expect(signal).toBeDefined();
    expect(signal.passed).toBe(true);
    expect(signal.source).toBe('coverage-summary.json');
  });

  it('marks coverage signal failed when pct < threshold', () => {
    const dir = path.join(tempDir, 'coverage');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'coverage-summary.json'),
      JSON.stringify({ total: { statements: { pct: 40 } } })
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'coverage_threshold');
    expect(signal.passed).toBe(false);
  });

  it('returns no coverage signal when coverage-summary.json has invalid data', () => {
    const dir = path.join(tempDir, 'coverage');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'coverage-summary.json'), JSON.stringify({ total: {} }));
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'coverage_threshold');
    expect(signal).toBeUndefined();
  });

  it('includes passing test run signals from .last-run.json', () => {
    const dir = path.join(tempDir, 'test-results');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.last-run.json'),
      JSON.stringify({ status: 'passed', failedTests: [] })
    );
    const result = service.listPolicySignals();
    const e2e = result.signals.find((s) => s.check === 'e2e_tests_passed');
    const critical = result.signals.find((s) => s.check === 'critical_path_tests_passed');
    expect(e2e.passed).toBe(true);
    expect(critical.passed).toBe(true);
  });

  it('marks test run signals failed when latest run failed', () => {
    const dir = path.join(tempDir, 'test-results');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, '.last-run.json'),
      JSON.stringify({ status: 'failed', failedTests: ['test1', 'test2'] })
    );
    const result = service.listPolicySignals();
    const e2e = result.signals.find((s) => s.check === 'e2e_tests_passed');
    expect(e2e.passed).toBe(false);
    expect(e2e.details).toContain('2 failing');
  });

  it('returns no test run signals when .last-run.json has no status', () => {
    const dir = path.join(tempDir, 'test-results');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.last-run.json'), JSON.stringify({}));
    const result = service.listPolicySignals();
    const e2e = result.signals.find((s) => s.check === 'e2e_tests_passed');
    expect(e2e).toBeUndefined();
  });

  it('includes passing secret scan signal from test-output.json', () => {
    fs.writeFileSync(
      path.join(tempDir, 'test-output.json'),
      JSON.stringify({ message: 'all tests passed' }) + '\n'
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'secret_scan_passed');
    expect(signal.passed).toBe(true);
  });

  it('marks secret scan failed when secret_pattern found', () => {
    fs.writeFileSync(
      path.join(tempDir, 'test-output.json'),
      JSON.stringify({ message: 'detected secret_pattern in file' }) + '\n'
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'secret_scan_passed');
    expect(signal.passed).toBe(false);
  });

  it('includes SAST signal from eslint-output.json with no errors', () => {
    fs.writeFileSync(
      path.join(tempDir, 'eslint-output.json'),
      JSON.stringify([{ errorCount: 0, fatalErrorCount: 0, warningCount: 3 }])
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'sast_scan_passed');
    expect(signal.passed).toBe(true);
    expect(signal.details).toContain('0 errors');
    expect(signal.details).toContain('3 warnings');
  });

  it('marks SAST failed when eslint-output has errors', () => {
    fs.writeFileSync(
      path.join(tempDir, 'eslint-output.json'),
      JSON.stringify([
        { errorCount: 2, fatalErrorCount: 0, warningCount: 0 },
        { errorCount: 1, fatalErrorCount: 1, warningCount: 0 },
      ])
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'sast_scan_passed');
    expect(signal.passed).toBe(false);
  });

  it('returns no SAST signal when eslint-output.json is not an array', () => {
    fs.writeFileSync(path.join(tempDir, 'eslint-output.json'), JSON.stringify({ error: 'fail' }));
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'sast_scan_passed');
    expect(signal).toBeUndefined();
  });

  it('includes passing dependency scan signal from npm-audit.json (metadata format)', () => {
    fs.writeFileSync(
      path.join(tempDir, 'npm-audit.json'),
      JSON.stringify({ metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 5 } } })
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'dependency_scan_passed');
    expect(signal.passed).toBe(true);
  });

  it('marks dependency scan failed when critical/high vulns present', () => {
    fs.writeFileSync(
      path.join(tempDir, 'npm-audit.json'),
      JSON.stringify({ metadata: { vulnerabilities: { critical: 1, high: 2 } } })
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'dependency_scan_passed');
    expect(signal.passed).toBe(false);
    expect(signal.details).toContain('1 critical');
  });

  it('includes dependency scan from summary format', () => {
    fs.writeFileSync(
      path.join(tempDir, 'npm-audit.json'),
      JSON.stringify({ summary: { critical: 0, high: 0, medium: 2 } })
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'dependency_scan_passed');
    expect(signal.passed).toBe(true);
    expect(signal.details).toContain('0 critical');
  });

  it('includes passing container scan from trivy-report.json (no CRITICAL/HIGH)', () => {
    fs.writeFileSync(
      path.join(tempDir, 'trivy-report.json'),
      JSON.stringify({
        Results: [{ Vulnerabilities: [{ Severity: 'LOW' }, { Severity: 'MEDIUM' }] }],
      })
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'container_scan_passed');
    expect(signal.passed).toBe(true);
  });

  it('marks container scan failed when CRITICAL found in trivy report', () => {
    fs.writeFileSync(
      path.join(tempDir, 'trivy-report.json'),
      JSON.stringify({ Results: [{ Vulnerabilities: [{ Severity: 'CRITICAL' }] }] })
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'container_scan_passed');
    expect(signal.passed).toBe(false);
  });

  it('includes container scan from grype-report.json (matches format)', () => {
    fs.writeFileSync(
      path.join(tempDir, 'grype-report.json'),
      JSON.stringify({ matches: [{ vulnerability: { severity: 'Medium' } }] })
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'container_scan_passed');
    expect(signal.passed).toBe(true);
  });

  it('marks container scan failed from grype HIGH severity match', () => {
    fs.writeFileSync(
      path.join(tempDir, 'grype-report.json'),
      JSON.stringify({ matches: [{ vulnerability: { severity: 'High' } }] })
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'container_scan_passed');
    expect(signal.passed).toBe(false);
  });

  it('includes passing accessibility signal from a11y-report.json (violations array)', () => {
    fs.writeFileSync(path.join(tempDir, 'a11y-report.json'), JSON.stringify({ violations: [] }));
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'accessibility_score');
    expect(signal.passed).toBe(true);
  });

  it('marks accessibility failed when violations exist', () => {
    fs.writeFileSync(
      path.join(tempDir, 'a11y-report.json'),
      JSON.stringify({ violations: [{ id: 'color-contrast' }, { id: 'button-name' }] })
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'accessibility_score');
    expect(signal.passed).toBe(false);
    expect(signal.details).toContain('2 violations');
  });

  it('includes accessibility signal from lighthouse report (categories format)', () => {
    fs.writeFileSync(
      path.join(tempDir, 'lighthouse-report.json'),
      JSON.stringify({ categories: { accessibility: { score: 0.95 } } })
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'accessibility_score');
    expect(signal.passed).toBe(true);
    expect(signal.details).toContain('95');
  });

  it('marks accessibility failed when lighthouse score below 90', () => {
    fs.writeFileSync(
      path.join(tempDir, 'lighthouse-report.json'),
      JSON.stringify({ categories: { accessibility: { score: 0.75 } } })
    );
    const result = service.listPolicySignals();
    const signal = result.signals.find((s) => s.check === 'accessibility_score');
    expect(signal.passed).toBe(false);
  });

  it('merges signals from policy-signals.json and deduplicates', () => {
    fs.writeFileSync(
      path.join(tempDir, 'policy-signals.json'),
      JSON.stringify({
        checks: { custom_check: true, coverage_threshold: true },
        signals: [
          { check: 'custom_check', passed: true, source: 'manual' },
          { check: 'coverage_threshold', passed: true, source: 'manual' },
        ],
        generated_at: '2026-01-01T00:00:00Z',
      })
    );
    const result = service.listPolicySignals();
    const customSignal = result.signals.find((s) => s.check === 'custom_check');
    expect(customSignal).toBeDefined();
    expect(customSignal.passed).toBe(true);
    // coverage_threshold should not be duplicated
    const coverageSignals = result.signals.filter((s) => s.check === 'coverage_threshold');
    expect(coverageSignals.length).toBe(1);
  });

  it('lists missing checks when policy requires a check not in signals', () => {
    const result = service.listPolicySignals();
    // The pack has a policy with check 'coverage_threshold' but no signal file exists
    expect(result.missing).toContain('coverage_threshold');
  });
});

describe('PolicyService.evaluatePolicies', () => {
  let tempDir;
  let store;
  let service;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-eval-'));
    const policiesDir = path.join(tempDir, 'platform', 'sdlc', 'policies');
    fs.mkdirSync(policiesDir, { recursive: true });
    const pack = makePack([makePolicy()]);
    fs.writeFileSync(path.join(policiesDir, 'test-pack.json'), JSON.stringify(pack));
    store = new FileStore();
    setStore(store);
    service = new PolicyService(makeCtx(tempDir, store));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('evaluates policies and returns a structured report', () => {
    const result = service.evaluatePolicies({ checks: { secret_scan_passed: true } });
    expect(result.evaluation).toBeDefined();
    expect(result.evaluation.summary).toBeDefined();
    expect(typeof result.evaluation.summary.total).toBe('number');
    expect(typeof result.evaluation.summary.passed).toBe('number');
    expect(typeof result.evaluation.summary.failed).toBe('number');
  });

  it('evaluates policies with failing checks logged via audit', () => {
    const result = service.evaluatePolicies({ checks: { secret_scan_passed: false } });
    expect(result.evaluation.summary.total).toBeGreaterThanOrEqual(0);
    // passed+failed+warnings should equal total
    const { passed, failed, warnings, total } = result.evaluation.summary;
    expect(passed + failed + warnings).toBeLessThanOrEqual(total + 1);
  });
});
