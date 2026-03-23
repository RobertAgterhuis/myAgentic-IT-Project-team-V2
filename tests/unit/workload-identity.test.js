'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const {
  isEffectivelyEnabled,
} = require('../../src/webapp/plugins/identity/workload-identity-types');
const { WorkloadIdentityStore } = require('../../src/webapp/services/workload-identity-store');
const {
  WorkloadIdentityService,
} = require('../../src/webapp/plugins/identity/workload-identity-service');
const { run } = require('../../src/webapp/plugins/mcp-governance/cli');

function identity(seed = {}) {
  return {
    id: 'awid-infra',
    agent_role: 'infra',
    app_registration_id: 'app-infra',
    app_registration_name: 'Agentic-Infra',
    service_principal_id: 'sp-infra',
    tenant_id: 'tenant-1',
    required_permissions: [],
    consent_status: 'consent_granted',
    credential_type: 'certificate',
    credential_expires_at: null,
    effective_enabled: true,
    last_validated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...seed,
  };
}

describe('M-INFRA-2c workload identity (#876/#877/#878)', () => {
  let db;
  let store;
  let service;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new WorkloadIdentityStore(db);
    store.migrate();
    service = new WorkloadIdentityService(store);
  });

  afterEach(() => {
    db.close();
  });

  it('runs migration clean and supports CRUD', () => {
    const created = store.createOrUpdateIdentity(identity());
    expect(created.agent_role).toBe('infra');

    const fetched = store.getIdentity('infra');
    expect(fetched).toBeTruthy();
    expect(fetched.app_registration_id).toBe('app-infra');

    const updated = store.createOrUpdateIdentity(
      identity({ consent_status: 'pending_consent', effective_enabled: false })
    );
    expect(updated.consent_status).toBe('pending_consent');

    const deleted = store.deleteIdentity('infra');
    expect(deleted).toBe(true);
    expect(store.getIdentity('infra')).toBeNull();
  });

  it('implements effectiveEnabled as 9-condition gate', () => {
    expect(isEffectivelyEnabled(identity())).toBe(true);
    expect(isEffectivelyEnabled(identity({ consent_status: 'pending_consent' }))).toBe(false);
    expect(isEffectivelyEnabled(identity({ service_principal_id: '' }))).toBe(false);
    expect(isEffectivelyEnabled(identity({ tenant_id: '' }))).toBe(false);
    expect(
      isEffectivelyEnabled(
        identity({
          credential_expires_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        })
      )
    ).toBe(false);
  });

  it('plan/bootstrap/consentStatus/validate return structured output', () => {
    const plan = service.plan();
    expect(plan.success).toBe(true);
    expect(plan.total_count).toBeGreaterThan(0);

    const first = service.bootstrap();
    expect(first.success).toBe(true);
    expect(first.created).toBeGreaterThan(0);

    const second = service.bootstrap();
    expect(second.success).toBe(true);
    expect(second.updated).toBeGreaterThan(0);

    const status = service.consentStatus();
    expect(status.length).toBe(plan.total_count);
    expect(status[0]).toHaveProperty('agent_role');
    expect(status[0]).toHaveProperty('consent_status');

    const validation = service.validate('infra');
    expect(validation).toHaveProperty('effective_enabled');
    expect(Array.isArray(validation.reasons)).toBe(true);
  });

  it('identity CLI commands run and return schema-shaped output', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'identity-cli-'));
    const pluginRoot = path.join(root, 'src', 'webapp', 'plugins', 'mcp-governance');
    fs.mkdirSync(path.join(pluginRoot, 'migrations'), { recursive: true });
    fs.writeFileSync(
      path.join(pluginRoot, 'migrations', '001_mcp_governance.sql'),
      'CREATE TABLE IF NOT EXISTS mcp_migrations (id TEXT PRIMARY KEY, applied_at TEXT);',
      'utf8'
    );

    const originalArgv = process.argv;
    const chunks = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      chunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
      return true;
    });

    try {
      process.env.STORAGE_PATH = path.join(root, '.agentic', 'data.db');
      fs.mkdirSync(path.dirname(process.env.STORAGE_PATH), { recursive: true });

      process.argv = ['node', 'cli.ts', 'identity', 'plan'];
      await run(root);
      let result = JSON.parse(chunks.join(''));
      expect(result.command).toBe('identity plan');
      expect(result.schema).toBe('AgentWorkloadIdentity');
      expect(result.total_count).toBeGreaterThan(0);

      chunks.length = 0;
      process.argv = ['node', 'cli.ts', 'identity', 'bootstrap'];
      await run(root);
      result = JSON.parse(chunks.join(''));
      expect(result.command).toBe('identity bootstrap');
      expect(result.idempotent).toBe(true);

      chunks.length = 0;
      process.argv = ['node', 'cli.ts', 'identity', 'consent', 'status'];
      await run(root);
      result = JSON.parse(chunks.join(''));
      expect(result.command).toBe('identity consent status');
      expect(Array.isArray(result.identities)).toBe(true);
    } finally {
      process.argv = originalArgv;
      delete process.env.STORAGE_PATH;
      vi.restoreAllMocks();
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
