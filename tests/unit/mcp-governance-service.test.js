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
        'CREATE TABLE IF NOT EXISTS agent_server_policy (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, server_id TEXT NOT NULL, permission TEXT NOT NULL, env_scope TEXT);',
        'CREATE TABLE IF NOT EXISTS agent_tool_policy (id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, server_id TEXT NOT NULL, tool_id TEXT NOT NULL, override_mode TEXT NOT NULL, permission TEXT, approval_required INTEGER NOT NULL DEFAULT 0, blocked INTEGER NOT NULL DEFAULT 0, env_scope TEXT);',
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

  it('resolves server and tool permissions with environment scope', async () => {
    const server = await svc.resolveServerPermission('orchestrator', 'workspace-management', 'dev');
    expect(server.permissionLevel).toBe('R');
    expect(server.blocked).toBe(false);

    const tool = await svc.resolveToolPermission(
      'documentation',
      'workspace-management',
      'workspace-management.delete_workspace',
      'dev'
    );
    expect(tool.permissionLevel).toBe('X');
    expect(tool.blocked).toBe(true);
  });

  it('validates env_scope and rejects missing or invalid values', () => {
    expect(() => svc.validateEnvironmentScope(undefined)).toThrow(/env_scope is required/i);
    expect(() => svc.validateEnvironmentScope('staging')).toThrow(/Invalid env_scope/i);
    expect(() => svc.validateEnvironmentScope('prod', 'dev')).toThrow(/not allowed/i);
    expect(svc.validateEnvironmentScope('dev', 'dev')).toBe('dev');
  });

  it('syncs server and tool policies in dry-run mode without writing state', async () => {
    const serverPolicies = await svc.getDefinedPolicies();
    const toolPolicies = await svc.getDefinedToolPolicies();

    const serverDry = await svc.syncServerPolicies(serverPolicies, { dryRun: true });
    const toolDry = await svc.syncToolPolicies(toolPolicies, { dryRun: true });

    expect(serverDry.added).toBeGreaterThan(0);
    expect(toolDry.added).toBeGreaterThan(0);
    expect(await svc.listServerPolicies()).toEqual([]);
    expect(await svc.listToolPolicies()).toEqual([]);
  });

  it('workload identities default to empty array and can be saved and read back', async () => {
    const initial = await svc.listWorkloadIdentities();
    expect(initial).toEqual([]);

    const identities = [
      {
        agentId: 'infra',
        consentGranted: true,
        servicePrincipalReady: true,
        credentialPolicyValid: true,
        effectiveEnabled: true,
      },
    ];
    await svc.saveWorkloadIdentities(identities);

    const stored = await svc.listWorkloadIdentities();
    expect(stored).toHaveLength(1);
    expect(stored[0].agentId).toBe('infra');
    expect(stored[0].consentGranted).toBe(true);
  });

  it('buildRuntimeArtifacts embeds authStatus for entra servers when identity is configured', async () => {
    await svc.syncAgents(await svc.getDefinedAgents());
    await svc.syncServers(await svc.getDefinedServers());

    await svc.saveWorkloadIdentities([
      {
        agentId: 'infra',
        consentGranted: true,
        servicePrincipalReady: true,
        credentialPolicyValid: true,
        effectiveEnabled: true,
      },
    ]);

    const runtime = await svc.buildRuntimeArtifacts();
    expect(runtime.manifestCount).toBe(12);

    const manifestPath = require('path').join(
      runtime.outputDir,
      'runtime-manifests',
      'infra.json'
    );
    const manifest = JSON.parse(require('fs').readFileSync(manifestPath, 'utf8'));
    const entraServer = manifest.servers.find((s) => s.authType === 'entra');
    if (entraServer) {
      expect(entraServer.authStatus).toBe('consent_granted');
    }
  });

  it('buildRuntimeArtifacts embeds authStatus=consent_pending when consent not granted', async () => {
    await svc.syncAgents(await svc.getDefinedAgents());
    await svc.syncServers(await svc.getDefinedServers());

    await svc.saveWorkloadIdentities([
      {
        agentId: 'infra',
        consentGranted: false,
        servicePrincipalReady: true,
        credentialPolicyValid: true,
        effectiveEnabled: false,
      },
    ]);

    const runtime = await svc.buildRuntimeArtifacts();
    const manifestPath = require('path').join(
      runtime.outputDir,
      'runtime-manifests',
      'infra.json'
    );
    const manifest = JSON.parse(require('fs').readFileSync(manifestPath, 'utf8'));
    const entraServer = manifest.servers.find((s) => s.authType === 'entra');
    if (entraServer) {
      expect(entraServer.authStatus).toBe('consent_pending');
    }
  });

  it('buildRuntimeArtifacts sets authStatus=not_configured when no identity record exists', async () => {
    await svc.syncAgents(await svc.getDefinedAgents());
    await svc.syncServers(await svc.getDefinedServers());

    const runtime = await svc.buildRuntimeArtifacts();
    const manifestPath = require('path').join(
      runtime.outputDir,
      'runtime-manifests',
      'infra.json'
    );
    const manifest = JSON.parse(require('fs').readFileSync(manifestPath, 'utf8'));
    const entraServer = manifest.servers.find((s) => s.authType === 'entra');
    if (entraServer) {
      expect(entraServer.authStatus).toBe('not_configured');
    }
  });

  it('doctor returns identity issue arrays and counts', async () => {
    const result = await svc.doctor();
    expect(Array.isArray(result.identityIssues)).toBe(true);
    expect(typeof result.agentsWithPendingConsent).toBe('number');
    expect(typeof result.agentsWithMissingIdentity).toBe('number');
    expect(typeof result.agentsWithExpiringCredentials).toBe('number');
  });

  it('doctor flags agents with missing workload identity', async () => {
    await svc.syncAgents(await svc.getDefinedAgents());

    const result = await svc.doctor();
    expect(result.agentsWithMissingIdentity).toBeGreaterThan(0);
    const issue = result.identityIssues.find(
      (i) => i.issue === 'No workload identity configured'
    );
    expect(issue).toBeDefined();
    expect(issue.remediation).toMatch(/identity bootstrap/);
  });

  it('doctor flags agents with pending consent', async () => {
    await svc.syncAgents(await svc.getDefinedAgents());

    await svc.saveWorkloadIdentities([
      {
        agentId: 'infra',
        consentGranted: false,
        servicePrincipalReady: true,
        credentialPolicyValid: true,
        effectiveEnabled: false,
      },
    ]);

    const result = await svc.doctor();
    expect(result.agentsWithPendingConsent).toBeGreaterThan(0);
    const issue = result.identityIssues.find(
      (i) => i.agentId === 'infra' && i.issue === 'Consent not granted'
    );
    expect(issue).toBeDefined();
    expect(issue.remediation).toMatch(/consent status/);
  });

  it('doctor flags agents with expiring credentials', async () => {
    await svc.syncAgents(await svc.getDefinedAgents());

    const soonExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await svc.saveWorkloadIdentities([
      {
        agentId: 'devops',
        consentGranted: true,
        servicePrincipalReady: true,
        credentialPolicyValid: true,
        effectiveEnabled: true,
        credentialExpiresAt: soonExpiry,
      },
    ]);

    const result = await svc.doctor();
    expect(result.agentsWithExpiringCredentials).toBe(1);
    const issue = result.identityIssues.find(
      (i) => i.agentId === 'devops' && i.issue.includes('Credential expires soon')
    );
    expect(issue).toBeDefined();
    expect(issue.remediation).toMatch(/Rotate credentials/);
  });
});
