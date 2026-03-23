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
    await svc.syncServerPolicies(await svc.getDefinedPolicies());
    await svc.syncToolPolicies(await svc.getDefinedToolPolicies());

    const runtime = await svc.buildRuntimeArtifacts();
    expect(fs.existsSync(runtime.compiledPoliciesPath)).toBe(true);
    expect(fs.existsSync(runtime.registryPath)).toBe(true);
    expect(runtime.manifestCount).toBe(12);

    const manifestPath = path.join(runtime.outputDir, 'runtime-manifests', 'orchestrator.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(Array.isArray(manifest.servers)).toBe(true);
    const firstTool = manifest.servers[0].tools[0];
    expect(firstTool).toHaveProperty('degraded');
    expect(firstTool).toHaveProperty('authStatus');
  });

  it('fails runtime build with clear error when policy data is missing', async () => {
    await svc.syncAgents(await svc.getDefinedAgents());
    await svc.syncServers(await svc.getDefinedServers());

    await expect(svc.buildRuntimeArtifacts()).rejects.toThrow(/Missing runtime policy data/i);
  });

  it('marks tools as degraded and auth_pending based on live server state', async () => {
    await svc.syncAgents(await svc.getDefinedAgents());
    await svc.syncServers(await svc.getDefinedServers());
    await svc.syncServerPolicies(await svc.getDefinedPolicies());
    await svc.syncToolPolicies(await svc.getDefinedToolPolicies());

    await svc.updateServer('workspace-management', {
      healthStatus: 'unhealthy',
      tenantEnabled: false,
    });

    const runtime = await svc.buildRuntimeArtifacts();
    const manifestPath = path.join(runtime.outputDir, 'runtime-manifests', 'orchestrator.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const server = manifest.servers.find((s) => s.serverId === 'workspace-management');

    expect(server).toBeDefined();
    expect(server.tools.length).toBeGreaterThan(0);
    for (const tool of server.tools) {
      expect(tool.degraded).toBe(true);
      expect(tool.authStatus).toBe('auth_pending');
    }
  });

  it('syncs mcp servers in dry-run mode without writing state', async () => {
    const defs = await svc.getDefinedServers();
    expect(defs).toHaveLength(8);
    const dry = await svc.syncServers(defs, { dryRun: true });
    expect(dry.added).toBe(8);

    const stored = await svc.listServers();
    expect(stored).toEqual([]);
  });

  it('supports CRUD operations for mcp server registry entries', async () => {
    const server = {
      id: 'custom-server',
      endpoint: 'https://mcp.local/custom-server/health',
      risk: 'medium',
      authType: 'oauth',
      healthStatus: 'healthy',
      tenantEnabled: true,
      workspaceEnabled: {},
      lastHealthCheck: null,
      consecutiveFailures: 0,
    };

    const created = await svc.createServer(server);
    expect(created.id).toBe('custom-server');

    const fetched = await svc.getServer('custom-server');
    expect(fetched).not.toBeNull();
    expect(fetched.endpoint).toBe(server.endpoint);

    const updated = await svc.updateServer('custom-server', {
      healthStatus: 'degraded',
      consecutiveFailures: 2,
    });
    expect(updated.healthStatus).toBe('degraded');
    expect(updated.consecutiveFailures).toBe(2);

    await expect(svc.createServer(server)).rejects.toThrow(/already exists/i);

    const deleted = await svc.deleteServer('custom-server');
    expect(deleted).toBe(true);
    expect(await svc.getServer('custom-server')).toBeNull();
    expect(await svc.deleteServer('custom-server')).toBe(false);
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

  it('defaults to deny (N) for unknown agent/server combinations', async () => {
    const unknownAgent = await svc.resolveServerPermission(
      'unknown-agent',
      'workspace-management',
      'dev'
    );
    expect(unknownAgent.permissionLevel).toBe('N');
    expect(unknownAgent.blocked).toBe(true);

    const unknownServer = await svc.resolveServerPermission(
      'orchestrator',
      'unknown-server',
      'dev'
    );
    expect(unknownServer.permissionLevel).toBe('N');
    expect(unknownServer.blocked).toBe(true);
  });

  it('applies environment restriction when environment default is more restrictive', async () => {
    vi.spyOn(svc, 'getDefinedPolicies').mockResolvedValue([
      {
        agentId: 'devops',
        serverId: 'workspace-management',
        permission: 'W',
      },
    ]);

    vi.spyOn(svc, 'getDefinedEnvironmentPolicies').mockResolvedValue([
      { env: 'dev', defaultPermission: 'W', writeRequiresApproval: false },
      { env: 'test', defaultPermission: 'W', writeRequiresApproval: false },
      { env: 'prod', defaultPermission: 'R', writeRequiresApproval: true },
    ]);

    const resolved = await svc.resolveServerPermission('devops', 'workspace-management', 'prod');
    expect(resolved.permissionLevel).toBe('R');
    expect(resolved.requiredApprovalMode).toBe('none');
  });

  it('covers all 12x8x3 server permission permutations (288)', async () => {
    const agents = Array.from({ length: 12 }, (_, i) => `agent-${i + 1}`);
    const servers = Array.from({ length: 8 }, (_, i) => `server-${i + 1}`);
    const envs = ['dev', 'test', 'prod'];

    const policies = [];
    for (const agentId of agents) {
      for (const serverId of servers) {
        policies.push({ agentId, serverId, permission: 'W' });
      }
    }

    vi.spyOn(svc, 'getDefinedPolicies').mockResolvedValue(policies);
    vi.spyOn(svc, 'getDefinedEnvironmentPolicies').mockResolvedValue([
      { env: 'dev', defaultPermission: 'W', writeRequiresApproval: false },
      { env: 'test', defaultPermission: 'W', writeRequiresApproval: false },
      { env: 'prod', defaultPermission: 'R', writeRequiresApproval: true },
    ]);

    let checked = 0;
    for (const agentId of agents) {
      for (const serverId of servers) {
        for (const env of envs) {
          const resolved = await svc.resolveServerPermission(agentId, serverId, env);
          expect(resolved.permissionLevel).toBeDefined();
          checked += 1;
        }
      }
    }

    expect(checked).toBe(288);
  });

  it('requires two_step approval mode for destructive prod operations', async () => {
    vi.spyOn(svc, 'getDefinedPolicies').mockResolvedValue([
      {
        agentId: 'devops',
        serverId: 'workspace-management',
        permission: 'W',
      },
    ]);

    vi.spyOn(svc, 'getDefinedEnvironmentPolicies').mockResolvedValue([
      { env: 'dev', defaultPermission: 'W', writeRequiresApproval: false },
      { env: 'test', defaultPermission: 'W', writeRequiresApproval: false },
      { env: 'prod', defaultPermission: 'W', writeRequiresApproval: true },
    ]);

    vi.spyOn(svc, 'getDefinedToolPolicies').mockResolvedValue([]);

    const resolved = await svc.resolveToolPermission(
      'devops',
      'workspace-management',
      'workspace-management.delete_resource',
      'prod'
    );

    expect(resolved.permissionLevel).toBe('W');
    expect(resolved.approvalRequired).toBe(true);
    expect(resolved.requiredApprovalMode).toBe('two_step');
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
});
