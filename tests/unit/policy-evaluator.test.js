'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/**
 * Policy Evaluator — Unit Tests (M22-004)
 *
 * Validates: loading packs, inheritance resolution, evaluation logic,
 * exception handling, and the addPolicyException helper.
 */

const {
  listPolicyPackPaths,
  loadPolicyPack,
  loadAllPolicyPacks,
  resolvePolicyInheritance,
  evaluatePolicies,
  runPolicyEvaluation,
  addPolicyException,
  updatePolicyInPack,
} = require('../../platform/engine/policy-evaluator');

// ─── Helpers ─────────────────────────────────────────────────

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
    _files,
  };
}

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

// ─── loadPolicyPack ──────────────────────────────────────────

describe('loadPolicyPack', () => {
  it('returns null when file does not exist', () => {
    const store = createMockStore();
    expect(loadPolicyPack(store, '/missing.json')).toBeNull();
  });

  it('returns null when JSON is invalid', () => {
    const store = createMockStore({ '/bad.json': 'NOT JSON' });
    expect(loadPolicyPack(store, '/bad.json')).toBeNull();
  });

  it('returns null when policies array is missing', () => {
    const store = createMockStore({ '/no-arr.json': JSON.stringify({ name: 'x' }) });
    expect(loadPolicyPack(store, '/no-arr.json')).toBeNull();
  });

  it('loads a valid policy pack', () => {
    const pack = makePack([makePolicy()]);
    const store = createMockStore({ '/pack.json': JSON.stringify(pack) });
    const result = loadPolicyPack(store, '/pack.json');
    expect(result).not.toBeNull();
    expect(result.policies).toHaveLength(1);
    expect(result.policies[0].id).toBe('POL-TEST-001');
  });

  it('normalizes legacy pack header keys', () => {
    const legacyPack = {
      id: 'legacy-pack-id',
      name: 'Legacy Pack Name',
      version: '0.9.0',
      policies: [makePolicy()],
    };
    const store = createMockStore({ '/legacy-pack.json': JSON.stringify(legacyPack) });
    const result = loadPolicyPack(store, '/legacy-pack.json');

    expect(result).not.toBeNull();
    expect(result.pack_id).toBe('legacy-pack-id');
    expect(result.pack_name).toBe('Legacy Pack Name');
  });
});

// ─── loadAllPolicyPacks ──────────────────────────────────────

describe('loadAllPolicyPacks', () => {
  it('returns empty array when no pack files exist', () => {
    const store = createMockStore();
    const result = loadAllPolicyPacks(store, ['/a.json', '/b.json']);
    expect(result).toEqual([]);
  });

  it('loads only valid packs, skips missing', () => {
    const pack = makePack([makePolicy()]);
    const store = createMockStore({ '/valid.json': JSON.stringify(pack) });
    const result = loadAllPolicyPacks(store, ['/valid.json', '/missing.json']);
    expect(result).toHaveLength(1);
  });

  it('loads discovered pack paths from a policy directory', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-pack-test-'));

    try {
      fs.writeFileSync(
        path.join(tempDir, 'a-pack.json'),
        JSON.stringify(makePack([makePolicy({ id: 'POL-A' })]))
      );
      fs.writeFileSync(
        path.join(tempDir, 'b-pack.json'),
        JSON.stringify(makePack([makePolicy({ id: 'POL-B' })]))
      );
      fs.writeFileSync(path.join(tempDir, 'notes.txt'), 'ignore');

      const packPaths = listPolicyPackPaths(tempDir);
      const store = createMockStore({
        [packPaths[0]]: JSON.stringify(makePack([makePolicy({ id: 'POL-A' })])),
        [packPaths[1]]: JSON.stringify(makePack([makePolicy({ id: 'POL-B' })])),
      });

      const result = loadAllPolicyPacks(store, packPaths);
      expect(result).toHaveLength(2);
      expect(result.flatMap((pack) => pack.policies.map((policy) => policy.id))).toEqual([
        'POL-A',
        'POL-B',
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe('listPolicyPackPaths', () => {
  it('returns sorted JSON files only', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-pack-list-'));

    try {
      fs.writeFileSync(path.join(tempDir, 'zeta.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'alpha.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'readme.md'), '# ignore');

      expect(listPolicyPackPaths(tempDir)).toEqual([
        path.join(tempDir, 'alpha.json'),
        path.join(tempDir, 'zeta.json'),
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('includes the full baseline pack set from the repo', () => {
    const packPaths = listPolicyPackPaths();
    const packNames = packPaths.map((packPath) => path.basename(packPath));

    expect(packNames).toEqual(
      expect.arrayContaining([
        'security-baseline.json',
        'quality-baseline.json',
        'architecture-baseline.json',
        'api-design-baseline.json',
        'frontend-baseline.json',
        'accessibility-baseline.json',
        'data-baseline.json',
        'testing-baseline.json',
        'devops-baseline.json',
        'observability-baseline.json',
        'privacy-compliance-baseline.json',
        'documentation-baseline.json',
      ])
    );
    expect(packNames.length).toBeGreaterThanOrEqual(12);
  });
});

// ─── resolvePolicyInheritance ────────────────────────────────

describe('resolvePolicyInheritance', () => {
  it('returns unique policies from multiple packs', () => {
    const p1 = makePolicy({ id: 'POL-A', scope: 'global' });
    const p2 = makePolicy({ id: 'POL-B', scope: 'global' });
    const result = resolvePolicyInheritance([makePack([p1]), makePack([p2])]);
    expect(result).toHaveLength(2);
  });

  it('most specific scope wins when IDs collide', () => {
    const globalPolicy = makePolicy({ id: 'POL-A', scope: 'global', name: 'Global' });
    const sprintPolicy = makePolicy({ id: 'POL-A', scope: 'sprint', name: 'Sprint' });
    const result = resolvePolicyInheritance([makePack([globalPolicy]), makePack([sprintPolicy])]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sprint');
  });
});

// ─── evaluatePolicies ────────────────────────────────────────

describe('evaluatePolicies', () => {
  it('returns passed when check is true', () => {
    const policies = [makePolicy()];
    const context = { type: 'gate', scope: 'sprint', checks: { secret_scan_passed: true } };
    const report = evaluatePolicies(policies, context);
    expect(report.passed).toHaveLength(1);
    expect(report.failed).toHaveLength(0);
    expect(report.summary.passed).toBe(1);
  });

  it('returns failed for blocking policy when check is false', () => {
    const policies = [makePolicy({ severity: 'blocking' })];
    const context = { type: 'gate', scope: 'sprint', checks: { secret_scan_passed: false } };
    const report = evaluatePolicies(policies, context);
    expect(report.failed).toHaveLength(1);
    expect(report.summary.blocking_failures).toBe(1);
  });

  it('returns warning for warning-level policy when check is false', () => {
    const policies = [makePolicy({ severity: 'warning' })];
    const context = { type: 'gate', scope: 'sprint', checks: { secret_scan_passed: false } };
    const report = evaluatePolicies(policies, context);
    expect(report.warnings).toHaveLength(1);
    expect(report.failed).toHaveLength(0);
  });

  it('skips policy when condition type does not match context', () => {
    const policies = [makePolicy({ condition: { type: 'pr', check: 'x' } })];
    const context = { type: 'gate', scope: 'sprint', checks: { x: true } };
    const report = evaluatePolicies(policies, context);
    expect(report.skipped).toHaveLength(1);
    expect(report.passed).toHaveLength(0);
  });

  it('skips policy when scope does not apply', () => {
    const policies = [makePolicy({ scope: 'sprint' })];
    const context = { type: 'gate', scope: 'global', checks: { secret_scan_passed: true } };
    const report = evaluatePolicies(policies, context);
    expect(report.skipped).toHaveLength(1);
  });

  it('skips policy when check signal is missing', () => {
    const policies = [makePolicy({ condition: { type: 'gate', check: 'unknown_check' } })];
    const context = { type: 'gate', scope: 'sprint', checks: { secret_scan_passed: true } };
    const report = evaluatePolicies(policies, context);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0].message).toContain('unknown_check');
  });

  it('applies global policy to sprint scope', () => {
    const policies = [makePolicy({ scope: 'global' })];
    const context = { type: 'gate', scope: 'sprint', checks: { secret_scan_passed: true } };
    const report = evaluatePolicies(policies, context);
    expect(report.passed).toHaveLength(1);
  });

  it('skips expired policy', () => {
    const policies = [
      makePolicy({
        metadata: {
          owner: 'test',
          created: '2024-01-01T00:00:00Z',
          expires: '2024-06-01T00:00:00Z',
        },
      }),
    ];
    const context = { type: 'gate', scope: 'sprint', checks: { secret_scan_passed: false } };
    const report = evaluatePolicies(policies, context);
    expect(report.skipped).toHaveLength(1);
  });

  it('applies exception and skips policy', () => {
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString();
    const policies = [
      makePolicy({
        exceptions: [
          {
            id: 'EXC-1',
            reason: 'Temporary waiver',
            approved_by: 'admin',
            expires: futureDate,
          },
        ],
      }),
    ];
    const context = { type: 'gate', scope: 'sprint', checks: { secret_scan_passed: false } };
    const report = evaluatePolicies(policies, context);
    expect(report.skipped).toHaveLength(1);
    expect(report.skipped[0].exception_applied).toBe('EXC-1');
  });

  it('ignores expired exceptions', () => {
    const policies = [
      makePolicy({
        exceptions: [
          {
            id: 'EXC-1',
            reason: 'Old waiver',
            approved_by: 'admin',
            expires: '2024-01-01T00:00:00Z',
          },
        ],
      }),
    ];
    const context = { type: 'gate', scope: 'sprint', checks: { secret_scan_passed: false } };
    const report = evaluatePolicies(policies, context);
    // Should NOT be skipped — exception is expired
    expect(report.failed).toHaveLength(1);
  });

  it('evaluates multiple policies correctly', () => {
    const policies = [
      makePolicy({ id: 'P1', condition: { type: 'gate', check: 'check_a' } }),
      makePolicy({ id: 'P2', condition: { type: 'gate', check: 'check_b' }, severity: 'warning' }),
      makePolicy({ id: 'P3', condition: { type: 'gate', check: 'check_c' } }),
    ];
    const context = {
      type: 'gate',
      scope: 'sprint',
      checks: { check_a: true, check_b: false, check_c: true },
    };
    const report = evaluatePolicies(policies, context);
    expect(report.passed).toHaveLength(2);
    expect(report.warnings).toHaveLength(1);
    expect(report.summary.total).toBe(3);
  });
});

// ─── runPolicyEvaluation ─────────────────────────────────────

describe('runPolicyEvaluation', () => {
  it('returns null when no packs loaded', () => {
    const store = createMockStore();
    const result = runPolicyEvaluation(store, { type: 'gate', scope: 'sprint', checks: {} }, []);
    expect(result).toBeNull();
  });

  it('runs full evaluation pipeline with store', () => {
    const pack = makePack([
      makePolicy({ id: 'POL-1', condition: { type: 'gate', check: 'check_a' } }),
      makePolicy({
        id: 'POL-2',
        condition: { type: 'gate', check: 'check_b' },
        severity: 'warning',
      }),
    ]);
    const store = createMockStore({ '/pack.json': JSON.stringify(pack) });
    const result = runPolicyEvaluation(
      store,
      { type: 'gate', scope: 'sprint', checks: { check_a: true, check_b: false } },
      ['/pack.json']
    );
    expect(result).not.toBeNull();
    expect(result.summary.passed).toBe(1);
    expect(result.summary.warnings).toBe(1);
  });
});

// ─── addPolicyException ──────────────────────────────────────

describe('addPolicyException', () => {
  it('returns false when pack does not exist', () => {
    const store = createMockStore();
    const exc = {
      id: 'EXC-1',
      reason: 'test',
      approved_by: 'admin',
      expires: '2099-01-01T00:00:00Z',
    };
    expect(addPolicyException(store, '/missing.json', 'POL-1', exc)).toBe(false);
  });

  it('returns false when policy does not exist in pack', () => {
    const pack = makePack([makePolicy({ id: 'POL-A' })]);
    const store = createMockStore({ '/pack.json': JSON.stringify(pack) });
    const exc = {
      id: 'EXC-1',
      reason: 'test',
      approved_by: 'admin',
      expires: '2099-01-01T00:00:00Z',
    };
    expect(addPolicyException(store, '/pack.json', 'POL-B', exc)).toBe(false);
  });

  it('adds exception and persists to store', () => {
    const pack = makePack([makePolicy({ id: 'POL-A' })]);
    const store = createMockStore({ '/pack.json': JSON.stringify(pack) });
    const exc = {
      id: 'EXC-1',
      reason: 'Waiver',
      approved_by: 'admin',
      expires: '2099-01-01T00:00:00Z',
    };
    const result = addPolicyException(store, '/pack.json', 'POL-A', exc);
    expect(result).toBe(true);

    // Verify it was written
    const updated = JSON.parse(store._files['/pack.json']);
    expect(updated.policies[0].exceptions).toHaveLength(1);
    expect(updated.policies[0].exceptions[0].id).toBe('EXC-1');
  });
});

describe('updatePolicyInPack', () => {
  it('returns null when pack does not exist', () => {
    const store = createMockStore();
    expect(updatePolicyInPack(store, '/missing.json', 'POL-1', { name: 'Updated' })).toBeNull();
  });

  it('returns null when policy does not exist in pack', () => {
    const pack = makePack([makePolicy({ id: 'POL-A' })]);
    const store = createMockStore({ '/pack.json': JSON.stringify(pack) });
    expect(updatePolicyInPack(store, '/pack.json', 'POL-B', { name: 'Updated' })).toBeNull();
  });

  it('updates the policy and persists to store', () => {
    const pack = makePack([makePolicy({ id: 'POL-A' })]);
    const store = createMockStore({ '/pack.json': JSON.stringify(pack) });

    const result = updatePolicyInPack(store, '/pack.json', 'POL-A', {
      name: 'Updated Policy',
      severity: 'warning',
      condition_check: 'updated_check',
      action_message: 'Updated message',
    });

    expect(result).not.toBeNull();
    expect(result.name).toBe('Updated Policy');
    expect(result.severity).toBe('warning');
    expect(result.condition.check).toBe('updated_check');

    const updated = JSON.parse(store._files['/pack.json']);
    expect(updated.policies[0].name).toBe('Updated Policy');
    expect(updated.policies[0].action.message).toBe('Updated message');
    expect(updated.policies[0].metadata.updated).toBeDefined();
  });
});
