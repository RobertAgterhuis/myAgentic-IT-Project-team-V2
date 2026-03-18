'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { FileStore, setStore } = require('../../src/webapp/store');
const {
  PolicyService,
  PolicyNotFoundError,
  PolicyValidationError,
} = require('../../src/webapp/services');

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
