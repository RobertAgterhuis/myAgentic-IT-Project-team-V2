'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { McpGovernanceService } = require('../../src/webapp/plugins/mcp-governance/service');

describe('McpGovernanceService', () => {
  let root;
  let svc;

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-governance-'));
    const pluginRoot = path.join(root, 'src', 'webapp', 'plugins', 'mcp-governance');
    fs.mkdirSync(path.join(pluginRoot, 'migrations'), { recursive: true });
    fs.writeFileSync(
      path.join(pluginRoot, 'migrations', '001_mcp_governance.sql'),
      [
        'CREATE TABLE IF NOT EXISTS agent_types (id TEXT PRIMARY KEY, category TEXT NOT NULL, control_posture TEXT NOT NULL, requires_workload_identity INTEGER NOT NULL, app_registration_ref TEXT, template_category TEXT NOT NULL);',
        "CREATE TABLE IF NOT EXISTS mcp_migrations (id TEXT PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')));",
      ].join('\n'),
      'utf8'
    );

    svc = new McpGovernanceService({ projectRoot: root, storageProvider: null });
    await svc.ensureConfigScaffold();
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('creates config scaffold idempotently', async () => {
    const first = await svc.ensureConfigScaffold();
    expect(first.skipped.length).toBeGreaterThan(0);

    const second = await svc.ensureConfigScaffold();
    expect(second.created).toEqual([]);
    expect(second.skipped.length).toBeGreaterThan(0);
  });

  it('syncs 12 agents idempotently', async () => {
    const defs = await svc.getDefinedAgents();
    expect(defs.length).toBe(12);

    const first = await svc.syncAgents(defs);
    expect(first.added).toBe(12);

    const second = await svc.syncAgents(defs);
    expect(second.added).toBe(0);
    expect(second.updated).toBe(0);
    expect(second.unchanged).toBe(12);

    const stored = await svc.listAgents();
    expect(stored.length).toBe(12);
  });

  it('runs sqlite migration and builds runtime artifacts', async () => {
    const dbPath = path.join(root, '.agentic', 'data.db');
    const migration = await svc.runSqliteMigrations(dbPath);
    expect(Array.isArray(migration.applied)).toBe(true);

    await svc.syncAgents(await svc.getDefinedAgents());
    await svc.syncServers(await svc.getDefinedServers());

    const runtime = await svc.buildRuntimeArtifacts();
    expect(fs.existsSync(runtime.compiledPoliciesPath)).toBe(true);
    expect(fs.existsSync(runtime.registryPath)).toBe(true);
    expect(runtime.manifestCount).toBe(12);

    const manifestPath = path.join(runtime.outputDir, 'runtime-manifests', 'orchestrator.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
  });

  it('syncs mcp servers in dry-run mode without writing state', async () => {
    const defs = await svc.getDefinedServers();
    const dry = await svc.syncServers(defs, { dryRun: true });
    expect(dry.added).toBeGreaterThan(0);

    const stored = await svc.listServers();
    expect(stored).toEqual([]);
  });
});
