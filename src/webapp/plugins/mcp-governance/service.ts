// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import Database from 'better-sqlite3';
import type { StorageProvider } from '../../../../platform/engine/persistence';
import {
  DEFAULT_AGENTS,
  DEFAULT_ENVIRONMENT_POLICIES,
  DEFAULT_POLICIES,
  DEFAULT_SERVERS,
  DEFAULT_TOOL_POLICIES,
} from './defaults';
import type {
  ApprovalMode,
  AgentToolPolicy,
  AgentServerPolicy,
  AgentType,
  EnvironmentPolicy,
  EnvironmentScope,
  McpServerRegistry,
  McpSyncResult,
  PermissionLevel,
  ResolvedServerPermission,
  ResolvedToolPermission,
  RuntimeManifest,
} from './types';

interface SyncOptions {
  dryRun?: boolean;
}

export interface RuntimeBuildResult {
  outputDir: string;
  compiledPoliciesPath: string;
  registryPath: string;
  manifestCount: number;
}

export interface InitResult {
  created: string[];
  skipped: string[];
}

export class EnvScopeValidationError extends Error {
  readonly code = 'INVALID_ENV_SCOPE';
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'EnvScopeValidationError';
    this.statusCode = statusCode;
  }
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  if (typeof value !== 'object') return JSON.stringify(value);
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

function isEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

export class McpGovernanceService {
  readonly projectRoot: string;
  readonly configDir: string;
  readonly generatedDir: string;
  private readonly _storageProvider: StorageProvider | null;
  private readonly _stateDir: string;
  private readonly _agentsFile: string;
  private readonly _serversFile: string;
  private readonly _serverPoliciesFile: string;
  private readonly _toolPoliciesFile: string;

  constructor(opts?: { projectRoot?: string; storageProvider?: StorageProvider | null }) {
    this.projectRoot = opts?.projectRoot || path.resolve(__dirname, '../../../..');
    this.configDir = path.join(
      this.projectRoot,
      'src',
      'webapp',
      'plugins',
      'mcp-governance',
      'config'
    );
    this.generatedDir = path.join(this.projectRoot, '.generated');
    this._storageProvider = opts?.storageProvider || null;
    this._stateDir = path.join(this.projectRoot, '.agentic', 'mcp-governance');
    this._agentsFile = path.join(this._stateDir, 'agent-types.json');
    this._serversFile = path.join(this._stateDir, 'mcp-servers.json');
    this._serverPoliciesFile = path.join(this._stateDir, 'agent-server-policies.json');
    this._toolPoliciesFile = path.join(this._stateDir, 'agent-tool-policies.json');
  }

  private async _readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
    try {
      const content = await fsp.readFile(filePath, 'utf8');
      return JSON.parse(content) as T;
    } catch {
      return fallback;
    }
  }

  private async _writeJsonFile(filePath: string, data: unknown): Promise<void> {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }

  async ensureConfigScaffold(): Promise<InitResult> {
    const created: string[] = [];
    const skipped: string[] = [];

    await fsp.mkdir(this.configDir, { recursive: true });

    const files: Array<{ name: string; payload: unknown }> = [
      { name: 'agents.json', payload: DEFAULT_AGENTS },
      { name: 'servers.json', payload: DEFAULT_SERVERS },
      { name: 'policies.json', payload: DEFAULT_POLICIES },
      { name: 'tool-policies.json', payload: DEFAULT_TOOL_POLICIES },
      { name: 'environment-policies.json', payload: DEFAULT_ENVIRONMENT_POLICIES },
    ];

    for (const entry of files) {
      const filePath = path.join(this.configDir, entry.name);
      if (fs.existsSync(filePath)) {
        skipped.push(filePath);
        continue;
      }
      await this._writeJsonFile(filePath, entry.payload);
      created.push(filePath);
    }

    return { created, skipped };
  }

  async runSqliteMigrations(dbPath?: string): Promise<{ applied: string[] }> {
    const sqlitePath =
      dbPath || process.env.STORAGE_PATH || path.join(this.projectRoot, '.agentic', 'data.db');

    await fsp.mkdir(path.dirname(sqlitePath), { recursive: true });

    const migrationId = '001_mcp_governance';
    const migrationSqlPath = path.join(
      this.projectRoot,
      'src',
      'webapp',
      'plugins',
      'mcp-governance',
      'migrations',
      '001_mcp_governance.sql'
    );
    const sql = await fsp.readFile(migrationSqlPath, 'utf8');

    const db = new Database(sqlitePath);
    try {
      db.exec('CREATE TABLE IF NOT EXISTS mcp_migrations (id TEXT PRIMARY KEY, applied_at TEXT)');
      const exists = db.prepare('SELECT id FROM mcp_migrations WHERE id = ?').get(migrationId) as
        | { id: string }
        | undefined;
      if (exists) return { applied: [] };

      db.exec(sql);
      db.prepare("INSERT INTO mcp_migrations (id, applied_at) VALUES (?, datetime('now'))").run(
        migrationId
      );
      return { applied: [migrationId] };
    } finally {
      db.close();
    }
  }

  private async _readConfig<T>(name: string, fallback: T): Promise<T> {
    const filePath = path.join(this.configDir, name);
    return this._readJsonFile<T>(filePath, fallback);
  }

  async getDefinedAgents(): Promise<AgentType[]> {
    return this._readConfig<AgentType[]>('agents.json', DEFAULT_AGENTS);
  }

  async getDefinedServers(): Promise<McpServerRegistry[]> {
    return this._readConfig<McpServerRegistry[]>('servers.json', DEFAULT_SERVERS);
  }

  async getDefinedPolicies(): Promise<AgentServerPolicy[]> {
    return this._readConfig<AgentServerPolicy[]>('policies.json', DEFAULT_POLICIES);
  }

  async getDefinedToolPolicies(): Promise<AgentToolPolicy[]> {
    return this._readConfig<AgentToolPolicy[]>('tool-policies.json', DEFAULT_TOOL_POLICIES);
  }

  async getDefinedEnvironmentPolicies(): Promise<EnvironmentPolicy[]> {
    return this._readConfig<EnvironmentPolicy[]>(
      'environment-policies.json',
      DEFAULT_ENVIRONMENT_POLICIES
    );
  }

  async listAgents(): Promise<AgentType[]> {
    if (this._storageProvider) {
      return (await this._storageProvider.list('mcp_agent_types')) as unknown as AgentType[];
    }
    return this._readJsonFile<AgentType[]>(this._agentsFile, []);
  }

  async listServers(): Promise<McpServerRegistry[]> {
    if (this._storageProvider) {
      return (await this._storageProvider.list(
        'mcp_server_registry'
      )) as unknown as McpServerRegistry[];
    }
    return this._readJsonFile<McpServerRegistry[]>(this._serversFile, []);
  }

  async getServer(serverId: string): Promise<McpServerRegistry | null> {
    const servers = await this.listServers();
    return servers.find((server) => server.id === serverId) || null;
  }

  async createServer(server: McpServerRegistry): Promise<McpServerRegistry> {
    const servers = await this.listServers();
    if (servers.some((existing) => existing.id === server.id)) {
      throw new Error(`MCP server already exists: ${server.id}`);
    }

    const next = [...servers, server].sort((a, b) => a.id.localeCompare(b.id));
    await this._writeServers(next);
    return server;
  }

  async updateServer(
    serverId: string,
    patch: Partial<McpServerRegistry>
  ): Promise<McpServerRegistry | null> {
    const servers = await this.listServers();
    const index = servers.findIndex((server) => server.id === serverId);
    if (index < 0) {
      return null;
    }

    const updated: McpServerRegistry = {
      ...servers[index],
      ...patch,
      id: serverId,
    };
    servers[index] = updated;
    await this._writeServers(servers);
    return updated;
  }

  async deleteServer(serverId: string): Promise<boolean> {
    const servers = await this.listServers();
    const next = servers.filter((server) => server.id !== serverId);
    if (next.length === servers.length) {
      return false;
    }

    await this._writeServers(next);
    return true;
  }

  async listServerPolicies(): Promise<AgentServerPolicy[]> {
    if (this._storageProvider) {
      return (await this._storageProvider.list(
        'mcp_agent_server_policy'
      )) as unknown as AgentServerPolicy[];
    }
    return this._readJsonFile<AgentServerPolicy[]>(this._serverPoliciesFile, []);
  }

  async listToolPolicies(): Promise<AgentToolPolicy[]> {
    if (this._storageProvider) {
      return (await this._storageProvider.list(
        'mcp_agent_tool_policy'
      )) as unknown as AgentToolPolicy[];
    }
    return this._readJsonFile<AgentToolPolicy[]>(this._toolPoliciesFile, []);
  }

  private async _writeAgents(rows: AgentType[]): Promise<void> {
    if (this._storageProvider) {
      const ops = rows.map((row) => ({
        type: 'write' as const,
        collection: 'mcp_agent_types',
        id: row.id,
        data: { ...row, id: row.id },
      }));
      await this._storageProvider.transaction(ops);
      return;
    }
    await this._writeJsonFile(this._agentsFile, rows);
  }

  private async _writeServers(rows: McpServerRegistry[]): Promise<void> {
    if (this._storageProvider) {
      const ops = rows.map((row) => ({
        type: 'write' as const,
        collection: 'mcp_server_registry',
        id: row.id,
        data: { ...row, id: row.id },
      }));
      await this._storageProvider.transaction(ops);
      return;
    }
    await this._writeJsonFile(this._serversFile, rows);
  }

  private _serverPolicyKey(row: AgentServerPolicy): string {
    return `${row.agentId}:${row.serverId}:${row.envScope || '*'}`;
  }

  private _serverPolicyId(row: AgentServerPolicy): string {
    return encodeURIComponent(this._serverPolicyKey(row)).replace(/\*/g, '%2A');
  }

  private _toolPolicyKey(row: AgentToolPolicy): string {
    return `${row.agentId}:${row.serverId}:${row.toolId}:${row.envScope || '*'}`;
  }

  private _toolPolicyId(row: AgentToolPolicy): string {
    return encodeURIComponent(this._toolPolicyKey(row)).replace(/\*/g, '%2A');
  }

  private async _writeServerPolicies(rows: AgentServerPolicy[]): Promise<void> {
    if (this._storageProvider) {
      const ops = rows.map((row) => ({
        type: 'write' as const,
        collection: 'mcp_agent_server_policy',
        id: this._serverPolicyId(row),
        data: { ...row, id: this._serverPolicyId(row) },
      }));
      await this._storageProvider.transaction(ops);
      return;
    }
    await this._writeJsonFile(this._serverPoliciesFile, rows);
  }

  private async _writeToolPolicies(rows: AgentToolPolicy[]): Promise<void> {
    if (this._storageProvider) {
      const ops = rows.map((row) => ({
        type: 'write' as const,
        collection: 'mcp_agent_tool_policy',
        id: this._toolPolicyId(row),
        data: { ...row, id: this._toolPolicyId(row) },
      }));
      await this._storageProvider.transaction(ops);
      return;
    }
    await this._writeJsonFile(this._toolPoliciesFile, rows);
  }

  async syncAgents(nextAgents: AgentType[], opts?: SyncOptions): Promise<McpSyncResult> {
    const current = await this.listAgents();
    const currentMap = new Map(current.map((a) => [a.id, a]));

    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const agent of nextAgents) {
      const existing = currentMap.get(agent.id);
      if (!existing) {
        added += 1;
      } else if (!isEqual(existing, agent)) {
        updated += 1;
      } else {
        unchanged += 1;
      }
      currentMap.set(agent.id, agent);
    }

    if (!opts?.dryRun) {
      await this._writeAgents(
        Array.from(currentMap.values()).sort((a, b) => a.id.localeCompare(b.id))
      );
    }

    return { added, updated, unchanged };
  }

  async syncServers(nextServers: McpServerRegistry[], opts?: SyncOptions): Promise<McpSyncResult> {
    const current = await this.listServers();
    const currentMap = new Map(current.map((s) => [s.id, s]));

    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const server of nextServers) {
      const existing = currentMap.get(server.id);
      if (!existing) {
        added += 1;
      } else if (!isEqual(existing, server)) {
        updated += 1;
      } else {
        unchanged += 1;
      }
      currentMap.set(server.id, server);
    }

    if (!opts?.dryRun) {
      await this._writeServers(
        Array.from(currentMap.values()).sort((a, b) => a.id.localeCompare(b.id))
      );
    }

    return { added, updated, unchanged };
  }

  async syncServerPolicies(
    nextPolicies: AgentServerPolicy[],
    opts?: SyncOptions
  ): Promise<McpSyncResult> {
    const current = await this.listServerPolicies();
    const currentMap = new Map(current.map((p) => [this._serverPolicyKey(p), p]));

    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const policy of nextPolicies) {
      const key = this._serverPolicyKey(policy);
      const existing = currentMap.get(key);
      if (!existing) {
        added += 1;
      } else if (!isEqual(existing, policy)) {
        updated += 1;
      } else {
        unchanged += 1;
      }
      currentMap.set(key, policy);
    }

    if (!opts?.dryRun) {
      await this._writeServerPolicies(Array.from(currentMap.values()));
    }

    return { added, updated, unchanged };
  }

  async syncToolPolicies(
    nextPolicies: AgentToolPolicy[],
    opts?: SyncOptions
  ): Promise<McpSyncResult> {
    const current = await this.listToolPolicies();
    const currentMap = new Map(current.map((p) => [this._toolPolicyKey(p), p]));

    let added = 0;
    let updated = 0;
    let unchanged = 0;

    for (const policy of nextPolicies) {
      const key = this._toolPolicyKey(policy);
      const existing = currentMap.get(key);
      if (!existing) {
        added += 1;
      } else if (!isEqual(existing, policy)) {
        updated += 1;
      } else {
        unchanged += 1;
      }
      currentMap.set(key, policy);
    }

    if (!opts?.dryRun) {
      await this._writeToolPolicies(Array.from(currentMap.values()));
    }

    return { added, updated, unchanged };
  }

  async recordServerHealth(
    serverId: string,
    isHealthy: boolean,
    failureThreshold: number
  ): Promise<McpServerRegistry | null> {
    const servers = await this.listServers();
    const index = servers.findIndex((s) => s.id === serverId);
    if (index < 0) return null;

    const server = { ...servers[index] };
    server.lastHealthCheck = new Date().toISOString();

    if (isHealthy) {
      server.consecutiveFailures = 0;
      server.healthStatus = 'healthy';
    } else {
      server.consecutiveFailures += 1;
      server.healthStatus =
        server.consecutiveFailures >= failureThreshold ? 'unhealthy' : 'degraded';
    }

    servers[index] = server;
    await this._writeServers(servers);
    return server;
  }

  private _isWriteLike(level: PermissionLevel): boolean {
    return level === 'W' || level === 'A';
  }

  private _permissionRank(level: PermissionLevel): number {
    const order: Record<PermissionLevel, number> = {
      X: 0,
      N: 1,
      D: 2,
      R: 3,
      P: 4,
      W: 5,
      A: 6,
    };
    return order[level];
  }

  private _restrictByEnvironment(
    permissionLevel: PermissionLevel,
    environmentDefault: PermissionLevel | undefined
  ): PermissionLevel {
    if (!environmentDefault) return permissionLevel;
    if (this._permissionRank(permissionLevel) <= this._permissionRank(environmentDefault)) {
      return permissionLevel;
    }
    return environmentDefault;
  }

  private _isDestructiveTool(toolId: string): boolean {
    return /(delete|destroy|drop|purge|remove)/i.test(toolId);
  }

  private _resolveApprovalMode(
    permissionLevel: PermissionLevel,
    environment: EnvironmentScope,
    toolId?: string
  ): ApprovalMode {
    if (permissionLevel === 'X' || permissionLevel === 'N') {
      return 'none';
    }
    if (environment === 'prod' && toolId && this._isDestructiveTool(toolId)) {
      return 'two_step';
    }
    if (permissionLevel === 'A' || (environment === 'prod' && this._isWriteLike(permissionLevel))) {
      return 'approval_required';
    }
    return 'none';
  }

  validateEnvironmentScope(envScope: string | undefined, expectedScope?: string): EnvironmentScope {
    if (!envScope || envScope.trim() === '') {
      throw new EnvScopeValidationError('env_scope is required', 400);
    }
    if (envScope !== 'dev' && envScope !== 'test' && envScope !== 'prod') {
      throw new EnvScopeValidationError(`Invalid env_scope '${envScope}'`, 403);
    }
    if (expectedScope && envScope !== expectedScope) {
      throw new EnvScopeValidationError(
        `env_scope '${envScope}' is not allowed for this deployment context`,
        403
      );
    }
    return envScope;
  }

  private _resolveServerPermissionInternal(
    agentId: string,
    serverId: string,
    environment: EnvironmentScope,
    policies: AgentServerPolicy[],
    envPolicies: EnvironmentPolicy[]
  ): ResolvedServerPermission {
    const envPolicy = envPolicies.find((p) => p.env === environment);
    const scoped = policies.find(
      (p) => p.agentId === agentId && p.serverId === serverId && p.envScope === environment
    );
    const unscoped = policies.find(
      (p) => p.agentId === agentId && p.serverId === serverId && !p.envScope
    );
    const match = scoped || unscoped;

    if (!match) {
      return {
        agentId,
        serverId,
        environment,
        permissionLevel: 'N',
        approvalRequired: false,
        requiredApprovalMode: 'none',
        blocked: true,
        source: 'implicit-deny',
      };
    }

    const level = this._restrictByEnvironment(match.permission, envPolicy?.defaultPermission);
    const source: ResolvedServerPermission['source'] = 'server-policy';
    const requiredApprovalMode = this._resolveApprovalMode(level, environment);
    const approvalRequired = requiredApprovalMode !== 'none';

    return {
      agentId,
      serverId,
      environment,
      permissionLevel: level,
      approvalRequired,
      requiredApprovalMode,
      blocked: level === 'X' || level === 'N',
      source,
    };
  }

  async resolveServerPermission(
    agentId: string,
    serverId: string,
    environment: EnvironmentScope
  ): Promise<ResolvedServerPermission> {
    const [policies, envPolicies] = await Promise.all([
      this.getDefinedPolicies(),
      this.getDefinedEnvironmentPolicies(),
    ]);
    return this._resolveServerPermissionInternal(
      agentId,
      serverId,
      environment,
      policies,
      envPolicies
    );
  }

  async resolveToolPermission(
    agentId: string,
    serverId: string,
    toolId: string,
    environment: EnvironmentScope
  ): Promise<ResolvedToolPermission> {
    const [serverPolicies, envPolicies, toolPolicies] = await Promise.all([
      this.getDefinedPolicies(),
      this.getDefinedEnvironmentPolicies(),
      this.getDefinedToolPolicies(),
    ]);

    const base = this._resolveServerPermissionInternal(
      agentId,
      serverId,
      environment,
      serverPolicies,
      envPolicies
    );

    const toolPolicy = toolPolicies.find(
      (p) =>
        p.agentId === agentId &&
        p.serverId === serverId &&
        p.toolId === toolId &&
        (p.envScope === environment || !p.envScope)
    );

    if (!toolPolicy) {
      const baseApprovalMode = this._resolveApprovalMode(base.permissionLevel, environment, toolId);
      return {
        ...base,
        toolId,
        approvalRequired: baseApprovalMode !== 'none',
        requiredApprovalMode: baseApprovalMode,
        source: base.source,
      };
    }

    let permissionLevel = base.permissionLevel;
    let blocked = base.blocked;
    if (toolPolicy.overrideMode === 'deny') {
      permissionLevel = 'X';
      blocked = true;
    } else if (toolPolicy.overrideMode === 'set' && toolPolicy.permission) {
      permissionLevel = toolPolicy.permission;
      blocked = permissionLevel === 'X' || permissionLevel === 'N';
    }

    if (toolPolicy.blocked === true) {
      blocked = true;
    }

    const envPolicy = envPolicies.find((p) => p.env === environment);
    permissionLevel = this._restrictByEnvironment(permissionLevel, envPolicy?.defaultPermission);

    let requiredApprovalMode = this._resolveApprovalMode(permissionLevel, environment, toolId);
    if (toolPolicy.approvalRequired === true && requiredApprovalMode === 'none') {
      requiredApprovalMode = 'approval_required';
    }

    if (blocked) {
      requiredApprovalMode = 'none';
    }

    const approvalRequired = requiredApprovalMode !== 'none';

    return {
      agentId,
      serverId,
      toolId,
      environment,
      permissionLevel,
      approvalRequired,
      requiredApprovalMode,
      blocked,
      source: 'tool-override',
    };
  }

  async buildRuntimeArtifacts(): Promise<RuntimeBuildResult> {
    const [agents, servers, policies, envPolicies] = await Promise.all([
      this.listAgents(),
      this.listServers(),
      this.getDefinedPolicies(),
      this.getDefinedEnvironmentPolicies(),
    ]);

    const runtimeDir = path.join(this.generatedDir, 'runtime-manifests');
    const compiledPoliciesPath = path.join(this.generatedDir, 'compiled-policies.json');
    const registryPath = path.join(this.generatedDir, 'mcp-registry.json');

    await fsp.mkdir(runtimeDir, { recursive: true });
    await this._writeJsonFile(compiledPoliciesPath, {
      generatedAt: new Date().toISOString(),
      policies,
    });
    await this._writeJsonFile(registryPath, {
      generatedAt: new Date().toISOString(),
      servers,
    });

    let manifestCount = 0;
    for (const agent of agents) {
      const environment: EnvironmentScope =
        process.env.ENV_SCOPE === 'prod' || process.env.ENV_SCOPE === 'test'
          ? (process.env.ENV_SCOPE as EnvironmentScope)
          : 'dev';
      const manifest: RuntimeManifest = {
        agentId: agent.id,
        generatedAt: new Date().toISOString(),
        servers: servers.map((server) => {
          const resolved = this._resolveServerPermissionInternal(
            agent.id,
            server.id,
            environment,
            policies,
            envPolicies
          );
          return {
            serverId: server.id,
            endpoint: server.endpoint,
            healthStatus: server.healthStatus,
            authType: server.authType,
            tools: [
              {
                toolId: `${server.id}.default`,
                permissionLevel: resolved.permissionLevel,
                approvalRequired: resolved.approvalRequired,
                approvalMode: resolved.requiredApprovalMode,
                blocked: resolved.blocked,
              },
            ],
          };
        }),
      };
      const outPath = path.join(runtimeDir, `${agent.id}.json`);
      await this._writeJsonFile(outPath, manifest);
      manifestCount += 1;
    }

    return {
      outputDir: this.generatedDir,
      compiledPoliciesPath,
      registryPath,
      manifestCount,
    };
  }

  async doctor(): Promise<{
    configExists: boolean;
    agentCount: number;
    serverCount: number;
    generatedExists: boolean;
  }> {
    const [agents, servers] = await Promise.all([this.listAgents(), this.listServers()]);
    return {
      configExists: fs.existsSync(this.configDir),
      agentCount: agents.length,
      serverCount: servers.length,
      generatedExists: fs.existsSync(this.generatedDir),
    };
  }
}
