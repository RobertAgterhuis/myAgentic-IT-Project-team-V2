// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import Database from 'better-sqlite3';
import type { StorageProvider } from '../../../../platform/engine/persistence';
import type {
  AgentRoleId,
  AgentWorkloadIdentity as ConsentStatusIdentity,
} from '../identity/workload-identity-types';
import { WorkloadIdentityStore } from '../../services/workload-identity-store';
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
  AgentWorkloadIdentity,
  AgentType,
  AgentPermissionView,
  DoctorReport,
  DoctorCheckResult,
  EnvironmentPolicy,
  EnvironmentScope,
  McpDiagnosticsReport,
  McpOverride,
  McpServerRegistry,
  McpSyncResult,
  PermissionLevel,
  PermissionMatrix,
  ReconcileRun,
  ResolvedServerPermission,
  ResolvedToolPermission,
  RuntimeManifest,
  WorkloadIdentityAuthStatus,
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
  private readonly _workloadIdentitiesFile: string;
  private readonly _overridesFile: string;
  private readonly _reconcileRunsFile: string;

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
    this._workloadIdentitiesFile = path.join(this._stateDir, 'workload-identities.json');
    this._overridesFile = path.join(this._stateDir, 'overrides.json');
    this._reconcileRunsFile = path.join(this._stateDir, 'reconcile-runs.json');
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

  async listWorkloadIdentities(): Promise<AgentWorkloadIdentity[]> {
    return this._readJsonFile<AgentWorkloadIdentity[]>(this._workloadIdentitiesFile, []);
  }

  async saveWorkloadIdentities(identities: AgentWorkloadIdentity[]): Promise<void> {
    await this._writeJsonFile(this._workloadIdentitiesFile, identities);
  }

  private _deriveAuthStatus(
    identity: AgentWorkloadIdentity | undefined
  ): WorkloadIdentityAuthStatus {
    if (!identity) return 'not_configured';
    if (!identity.servicePrincipalReady) return 'identity_not_provisioned';
    if (!identity.consentGranted) return 'consent_pending';
    if (!identity.credentialPolicyValid) return 'credential_policy_violation';
    return 'consent_granted';
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

  private _resolveToolPermissionInternal(
    agentId: string,
    serverId: string,
    toolId: string,
    environment: EnvironmentScope,
    serverPolicies: AgentServerPolicy[],
    envPolicies: EnvironmentPolicy[],
    toolPolicies: AgentToolPolicy[]
  ): ResolvedToolPermission {
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

  private _isAuthPending(server: McpServerRegistry): boolean {
    if (server.authType === 'none') return false;
    if (!server.tenantEnabled) return true;

    const workspaceStates = Object.values(server.workspaceEnabled || {});
    if (workspaceStates.length === 0) return false;
    return workspaceStates.every((enabled) => enabled === false);
  }

  private _isMicrosoftBackedServer(server: McpServerRegistry): boolean {
    if (server.authType === 'entra') return true;
    const fingerprint = `${server.id} ${server.endpoint}`.toLowerCase();
    return (
      fingerprint.includes('azure') ||
      fingerprint.includes('microsoft') ||
      fingerprint.includes('entra')
    );
  }

  private _resolveIdentityDbPath(): string {
    return process.env.STORAGE_PATH || path.join(this.projectRoot, '.agentic', 'data.db');
  }

  private _loadWorkloadIdentityByRole(): Map<AgentRoleId, ConsentStatusIdentity> {
    const map = new Map<AgentRoleId, ConsentStatusIdentity>();
    const dbPath = this._resolveIdentityDbPath();
    if (!fs.existsSync(dbPath)) return map;

    let db: Database.Database | null = null;
    try {
      db = new Database(dbPath);
      const store = new WorkloadIdentityStore(db);
      store.migrate();
      const rows = store.listIdentities();
      for (const row of rows) {
        map.set(row.agent_role, row);
      }
      return map;
    } catch {
      return map;
    } finally {
      db?.close();
    }
  }

  private _resolveRuntimeAuthStatus(
    agent: AgentType,
    server: McpServerRegistry,
    identity: ConsentStatusIdentity | null
  ):
    | 'ready'
    | 'auth_pending'
    | 'consent_pending'
    | 'identity_not_provisioned'
    | 'credential_policy_violation' {
    const serverAuthPending = this._isAuthPending(server);

    if (!agent.requiresWorkloadIdentity || !this._isMicrosoftBackedServer(server)) {
      return serverAuthPending ? 'auth_pending' : 'ready';
    }

    if (!identity) {
      return 'identity_not_provisioned';
    }

    const consentGranted = identity.consent_status === 'consent_granted';
    if (!consentGranted) {
      return 'consent_pending';
    }

    const servicePrincipalReady =
      identity.service_principal_id.trim().length > 0 &&
      identity.app_registration_id.trim().length > 0;
    if (!servicePrincipalReady) {
      return 'identity_not_provisioned';
    }

    const credentialNotExpired =
      !identity.credential_expires_at || new Date(identity.credential_expires_at) >= new Date();
    const credentialPolicyValid =
      identity.credential_type.trim().length > 0 && credentialNotExpired;
    if (!credentialPolicyValid) {
      return 'credential_policy_violation';
    }

    return serverAuthPending ? 'auth_pending' : 'ready';
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
    return this._resolveToolPermissionInternal(
      agentId,
      serverId,
      toolId,
      environment,
      serverPolicies,
      envPolicies,
      toolPolicies
    );
  }

  async buildRuntimeArtifacts(): Promise<RuntimeBuildResult> {
    const [agents, servers, serverPolicies, toolPolicies, envPolicies, workloadIdentities] =
      await Promise.all([
        this.listAgents(),
        this.listServers(),
        this.listServerPolicies(),
        this.listToolPolicies(),
        this.getDefinedEnvironmentPolicies(),
        this.listWorkloadIdentities(),
      ]);

    if (agents.length === 0) {
      throw new Error(
        'Missing runtime policy data: no agents found. Run `npm run plugin -- agents sync --apply` first.'
      );
    }
    if (servers.length === 0) {
      throw new Error(
        'Missing runtime policy data: no MCP servers found. Run `npm run plugin -- mcp sync --apply` first.'
      );
    }
    if (serverPolicies.length === 0) {
      throw new Error(
        'Missing runtime policy data: no server policies found. Run `npm run plugin -- policies sync --apply` first.'
      );
    }
    if (toolPolicies.length === 0) {
      throw new Error(
        'Missing runtime policy data: no tool policies found. Run `npm run plugin -- tool-policies sync --apply` first.'
      );
    }

    const runtimeDir = path.join(this.generatedDir, 'runtime-manifests');
    const compiledPoliciesPath = path.join(this.generatedDir, 'compiled-policies.json');
    const registryPath = path.join(this.generatedDir, 'mcp-registry.json');

    await fsp.mkdir(runtimeDir, { recursive: true });
    await this._writeJsonFile(compiledPoliciesPath, {
      generatedAt: new Date().toISOString(),
      serverPolicies,
      toolPolicies,
      environmentPolicies: envPolicies,
    });
    await this._writeJsonFile(registryPath, {
      generatedAt: new Date().toISOString(),
      servers,
    });

    const identityByRole = this._loadWorkloadIdentityByRole();
    const identityMap = new Map(workloadIdentities.map((identity) => [identity.agentId, identity]));

    let manifestCount = 0;
    for (const agent of agents) {
      const environment: EnvironmentScope =
        process.env.ENV_SCOPE === 'prod' || process.env.ENV_SCOPE === 'test'
          ? (process.env.ENV_SCOPE as EnvironmentScope)
          : 'dev';
      const agentIdentity = agent.requiresWorkloadIdentity ? identityMap.get(agent.id) : undefined;
      const manifest: RuntimeManifest = {
        agentId: agent.id,
        generatedAt: new Date().toISOString(),
        servers: servers.map((server) => {
          const scopedToolPolicies = toolPolicies.filter(
            (p) =>
              p.agentId === agent.id &&
              p.serverId === server.id &&
              (p.envScope === environment || !p.envScope)
          );
          const toolIds = new Set<string>(['default', ...scopedToolPolicies.map((p) => p.toolId)]);
          const toolAuthStatus = this._resolveRuntimeAuthStatus(
            agent,
            server,
            identityByRole.get(agent.id as AgentRoleId) || null
          );
          const manifestAuthStatus: WorkloadIdentityAuthStatus | undefined =
            agent.requiresWorkloadIdentity && server.authType === 'entra'
              ? this._deriveAuthStatus(agentIdentity)
              : undefined;
          const degraded = server.healthStatus !== 'healthy';

          return {
            serverId: server.id,
            endpoint: server.endpoint,
            healthStatus: server.healthStatus,
            authType: server.authType,
            ...(manifestAuthStatus !== undefined ? { authStatus: manifestAuthStatus } : {}),
            tools: [...toolIds]
              .sort((a, b) => a.localeCompare(b))
              .map((toolId) => {
                const resolved = this._resolveToolPermissionInternal(
                  agent.id,
                  server.id,
                  toolId,
                  environment,
                  serverPolicies,
                  envPolicies,
                  toolPolicies
                );
                return {
                  toolId,
                  permissionLevel: resolved.permissionLevel,
                  approvalRequired: resolved.approvalRequired,
                  approvalMode: resolved.requiredApprovalMode,
                  blocked: resolved.blocked,
                  degraded,
                  authStatus: toolAuthStatus,
                };
              }),
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

  async doctor(): Promise<
    DoctorReport & {
      configExists: boolean;
      agentCount: number;
      serverCount: number;
      generatedExists: boolean;
      identityIssues: Array<{ agentId: string; issue: string; remediation: string }>;
      agentsWithPendingConsent: number;
      agentsWithMissingIdentity: number;
      agentsWithExpiringCredentials: number;
    }
  > {
    const checks: DoctorCheckResult[] = [];
    const [agents, servers, serverPolicies, toolPolicies, workloadIdentities] = await Promise.all([
      this.listAgents(),
      this.listServers(),
      this.listServerPolicies(),
      this.listToolPolicies(),
      this.listWorkloadIdentities(),
    ]);
    const identityMap = new Map(workloadIdentities.map((identity) => [identity.agentId, identity]));
    const identityIssues: Array<{ agentId: string; issue: string; remediation: string }> = [];
    const CREDENTIAL_EXPIRY_WARNING_DAYS = 30;
    const credentialExpiryWarningMs = CREDENTIAL_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;

    // Check 1: config directory exists
    const configExists = fs.existsSync(this.configDir);
    checks.push({
      name: 'config_dir',
      ok: configExists,
      message: configExists
        ? `Config directory found: ${this.configDir}`
        : `Config directory missing: ${this.configDir} — run \`npm run plugin -- init\``,
    });

    // Check 2: agents config present and populated
    checks.push({
      name: 'agents_loaded',
      ok: agents.length > 0,
      message:
        agents.length > 0
          ? `${agents.length} agent(s) loaded`
          : 'No agents found — run `npm run plugin -- agents sync --apply`',
    });

    // Check 3: servers config present and populated
    checks.push({
      name: 'servers_loaded',
      ok: servers.length > 0,
      message:
        servers.length > 0
          ? `${servers.length} MCP server(s) loaded`
          : 'No MCP servers found — run `npm run plugin -- mcp sync --apply`',
    });

    // Check 4: server policies present and populated
    checks.push({
      name: 'server_policies_loaded',
      ok: serverPolicies.length > 0,
      message:
        serverPolicies.length > 0
          ? `${serverPolicies.length} server polic${serverPolicies.length === 1 ? 'y' : 'ies'} loaded`
          : 'No server policies found — run `npm run plugin -- policies sync --apply`',
    });

    // Check 5: tool policies present and populated
    checks.push({
      name: 'tool_policies_loaded',
      ok: toolPolicies.length > 0,
      message:
        toolPolicies.length > 0
          ? `${toolPolicies.length} tool polic${toolPolicies.length === 1 ? 'y' : 'ies'} loaded`
          : 'No tool policies found — run `npm run plugin -- tool-policies sync --apply`',
    });

    // Check 6: generated directory exists
    const generatedExists = fs.existsSync(this.generatedDir);
    checks.push({
      name: 'generated_dir',
      ok: generatedExists,
      message: generatedExists
        ? `Generated directory found: ${this.generatedDir}`
        : `Generated directory missing — run \`npm run plugin -- runtime build\``,
    });

    // Check 7: at least one runtime manifest exists
    const runtimeDir = path.join(this.generatedDir, 'runtime-manifests');
    let manifestCount = 0;
    if (generatedExists && fs.existsSync(runtimeDir)) {
      try {
        manifestCount = (await fsp.readdir(runtimeDir)).filter((f) => f.endsWith('.json')).length;
      } catch {
        manifestCount = 0;
      }
    }
    checks.push({
      name: 'runtime_manifests',
      ok: manifestCount > 0,
      message:
        manifestCount > 0
          ? `${manifestCount} runtime manifest(s) found`
          : 'No runtime manifests found — run `npm run plugin -- runtime build`',
    });

    // Check 8: no unhealthy servers
    const unhealthyServers = servers.filter((s) => s.healthStatus === 'unhealthy');
    checks.push({
      name: 'server_health',
      ok: unhealthyServers.length === 0,
      message:
        unhealthyServers.length === 0
          ? 'All MCP servers are healthy or degraded'
          : `${unhealthyServers.length} unhealthy server(s): ${unhealthyServers.map((s) => s.id).join(', ')}`,
    });

    const identitiesByRole = this._loadWorkloadIdentityByRole();
    const identityAgents = agents.filter((a) => a.requiresWorkloadIdentity);
    const microsoftServers = servers.filter((s) => this._isMicrosoftBackedServer(s));

    // Check 9: Entra app registrations present for workload identity agents
    const missingAppRegistrationRoles = identityAgents
      .filter((agent) => {
        const identity = identitiesByRole.get(agent.id as AgentRoleId);
        return !identity || identity.app_registration_id.trim().length === 0;
      })
      .map((agent) => agent.id);
    checks.push({
      name: 'identity_app_registration',
      ok: missingAppRegistrationRoles.length === 0,
      message:
        missingAppRegistrationRoles.length === 0
          ? `All ${identityAgents.length} workload identity agent(s) have app registrations`
          : `Missing Entra app registration for: ${missingAppRegistrationRoles.join(', ')} — run \`npm run plugin -- identity bootstrap\``,
    });

    // Check 10: consent granted for workload identity agents on Microsoft-backed servers
    const consentPendingRoles =
      microsoftServers.length === 0
        ? []
        : identityAgents
            .filter((agent) => {
              const identity = identitiesByRole.get(agent.id as AgentRoleId);
              return !identity || identity.consent_status !== 'consent_granted';
            })
            .map((agent) => agent.id);
    checks.push({
      name: 'identity_consent',
      ok: consentPendingRoles.length === 0,
      message:
        consentPendingRoles.length === 0
          ? 'Workload identity consent granted for all Microsoft-backed runtime agents'
          : `Consent pending for: ${consentPendingRoles.join(', ')} — run \`npm run plugin -- identity consent status\` and grant consent in /admin/identity/consent`,
    });

    // Check 11: credentials not expired and not expiring within 30 days
    const now = Date.now();
    const expiryThresholdDays = 30;
    const expiringRoles = identityAgents
      .map((agent) => {
        const identity = identitiesByRole.get(agent.id as AgentRoleId);
        if (!identity?.credential_expires_at) return null;

        const expiryMs = new Date(identity.credential_expires_at).getTime();
        if (!Number.isFinite(expiryMs)) return `${agent.id}(invalid-date)`;

        const daysUntilExpiry = Math.floor((expiryMs - now) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= expiryThresholdDays ? `${agent.id}(${daysUntilExpiry}d)` : null;
      })
      .filter((value): value is string => Boolean(value));
    checks.push({
      name: 'identity_credential_expiry',
      ok: expiringRoles.length === 0,
      message:
        expiringRoles.length === 0
          ? 'No workload identity credentials expiring within 30 days'
          : `Credential expiry risk: ${expiringRoles.join(', ')} — run \`npm run plugin -- identity consent status\` and rotate credentials in Entra`,
    });

    let agentsWithPendingConsent = 0;
    let agentsWithMissingIdentity = 0;
    let agentsWithExpiringCredentials = 0;

    for (const agent of agents) {
      if (!agent.requiresWorkloadIdentity) {
        continue;
      }

      const identity = identityMap.get(agent.id);

      if (!identity) {
        agentsWithMissingIdentity += 1;
        identityIssues.push({
          agentId: agent.id,
          issue: 'No workload identity configured',
          remediation: `Run 'npx plugin identity bootstrap' to provision workload identity for agent '${agent.id}'.`,
        });
        continue;
      }

      if (!identity.servicePrincipalReady) {
        agentsWithMissingIdentity += 1;
        identityIssues.push({
          agentId: agent.id,
          issue: 'Service principal not ready',
          remediation: `Run 'npx plugin identity bootstrap' to provision the service principal for agent '${agent.id}'.`,
        });
      }

      if (!identity.consentGranted) {
        agentsWithPendingConsent += 1;
        identityIssues.push({
          agentId: agent.id,
          issue: 'Consent not granted',
          remediation: `Run 'npx plugin identity consent status' and grant admin consent for agent '${agent.id}'.`,
        });
      }

      if (!identity.credentialPolicyValid) {
        identityIssues.push({
          agentId: agent.id,
          issue: 'Credential policy violation',
          remediation: `Check and update credential configuration for agent '${agent.id}'.`,
        });
      }

      if (identity.credentialExpiresAt) {
        const expiresMs = new Date(identity.credentialExpiresAt).getTime();
        if (expiresMs - now < credentialExpiryWarningMs) {
          agentsWithExpiringCredentials += 1;
          identityIssues.push({
            agentId: agent.id,
            issue: `Credential expires soon (${identity.credentialExpiresAt})`,
            remediation: `Rotate credentials for agent '${agent.id}' before expiry.`,
          });
        }
      }
    }

    const healthy = checks.every((c) => c.ok);
    const failCount = checks.filter((c) => !c.ok).length;
    const summary = healthy
      ? `All ${checks.length} checks passed`
      : `${failCount} of ${checks.length} check(s) failed`;

    return {
      checks,
      healthy,
      summary,
      configExists,
      agentCount: agents.length,
      serverCount: servers.length,
      generatedExists,
      identityIssues,
      agentsWithPendingConsent,
      agentsWithMissingIdentity,
      agentsWithExpiringCredentials,
    };
  }

  // ── Overrides (#848) ────────────────────────────────────────────

  async listOverrides(): Promise<McpOverride[]> {
    if (this._storageProvider) {
      const rows = (await this._storageProvider.list('mcp_overrides')) as unknown as McpOverride[];
      return rows.filter((r) => !r.expiredAt);
    }
    const all = await this._readJsonFile<McpOverride[]>(this._overridesFile, []);
    return all.filter((r) => !r.expiredAt);
  }

  async createOverride(data: Omit<McpOverride, 'id' | 'createdAt'>): Promise<McpOverride> {
    const override: McpOverride = {
      ...data,
      id: `ovr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    if (this._storageProvider) {
      await this._storageProvider.transaction([
        {
          type: 'write',
          collection: 'mcp_overrides',
          id: override.id,
          data: override as unknown as import('../../../../platform/engine/persistence').Document,
        },
      ]);
    } else {
      const all = await this._readJsonFile<McpOverride[]>(this._overridesFile, []);
      await this._writeJsonFile(this._overridesFile, [...all, override]);
    }

    return override;
  }

  async expireOverride(id: string): Promise<boolean> {
    if (this._storageProvider) {
      const existing = (await this._storageProvider.read(
        'mcp_overrides',
        id
      )) as unknown as McpOverride | null;
      if (!existing) return false;
      await this._storageProvider.transaction([
        {
          type: 'write',
          collection: 'mcp_overrides',
          id,
          data: { ...existing, expiredAt: new Date().toISOString() },
        },
      ]);
      return true;
    }

    const all = await this._readJsonFile<McpOverride[]>(this._overridesFile, []);
    const idx = all.findIndex((r) => r.id === id);
    if (idx < 0) return false;
    all[idx] = { ...all[idx], expiredAt: new Date().toISOString() };
    await this._writeJsonFile(this._overridesFile, all);
    return true;
  }

  // ── Permission Matrix (#846) ────────────────────────────────────

  async getMatrix(): Promise<PermissionMatrix> {
    const [agents, servers, serverPolicies] = await Promise.all([
      this.listAgents(),
      this.listServers(),
      this.listServerPolicies(),
    ]);

    const matrix = agents.flatMap((agent) =>
      servers.map((server) => {
        const policy = serverPolicies.find(
          (p) => p.agentId === agent.id && p.serverId === server.id && !p.envScope
        );
        const permissionLevel: PermissionLevel = policy?.permission ?? 'N';
        return { agentId: agent.id, serverId: server.id, permissionLevel };
      })
    );

    return { agents, servers, matrix };
  }

  // ── Agent Permission View (#847) ────────────────────────────────

  async getAgentPermissions(agentId: string): Promise<AgentPermissionView | null> {
    const [agents, servers, serverPolicies] = await Promise.all([
      this.listAgents(),
      this.listServers(),
      this.listServerPolicies(),
    ]);

    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return null;

    const permissions = servers.map((server) => {
      const policy = serverPolicies.find(
        (p) => p.agentId === agentId && p.serverId === server.id && !p.envScope
      );
      const envPolicy = serverPolicies.find(
        (p) => p.agentId === agentId && p.serverId === server.id && p.envScope
      );
      const permissionLevel: PermissionLevel = policy?.permission ?? envPolicy?.permission ?? 'N';
      const approvalRequired = permissionLevel === 'W' || permissionLevel === 'A';
      const blocked = permissionLevel === 'N';
      return {
        server,
        permissionLevel,
        envScope: envPolicy?.envScope ?? undefined,
        approvalRequired,
        blocked,
      };
    });

    return { agent, permissions };
  }

  // ── Diagnostics (#849) ──────────────────────────────────────────

  async getDiagnostics(): Promise<McpDiagnosticsReport> {
    const [agents, servers, recentRuns] = await Promise.all([
      this.listAgents(),
      this.listServers(),
      this.listReconcileRuns(),
    ]);

    const unhealthyServers = servers.filter((s) => s.healthStatus === 'unhealthy');
    const identityByRole = this._loadWorkloadIdentityByRole();
    const authPendingCount = agents
      .filter((a) => a.requiresWorkloadIdentity)
      .filter((a) => {
        const identity = identityByRole.get(a.id as AgentRoleId);
        return !identity || identity.consent_status !== 'consent_granted';
      }).length;

    return {
      unhealthyServers,
      authPendingCount,
      totalAgents: agents.length,
      totalServers: servers.length,
      recentReconcileRuns: recentRuns.slice(0, 10),
    };
  }

  // ── Reconcile Runs (#851, #852) ──────────────────────────────────

  async listReconcileRuns(): Promise<ReconcileRun[]> {
    if (this._storageProvider) {
      const rows = (await this._storageProvider.list(
        'mcp_reconcile_runs'
      )) as unknown as ReconcileRun[];
      return rows.sort((a, b) => b.ranAt.localeCompare(a.ranAt));
    }
    const all = await this._readJsonFile<ReconcileRun[]>(this._reconcileRunsFile, []);
    return all.sort((a, b) => b.ranAt.localeCompare(a.ranAt));
  }

  async createReconcileRun(run: Omit<ReconcileRun, 'id'>): Promise<ReconcileRun> {
    const record: ReconcileRun = {
      ...run,
      id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };

    if (this._storageProvider) {
      await this._storageProvider.transaction([
        {
          type: 'write',
          collection: 'mcp_reconcile_runs',
          id: record.id,
          data: record as unknown as import('../../../../platform/engine/persistence').Document,
        },
      ]);
    } else {
      const all = await this._readJsonFile<ReconcileRun[]>(this._reconcileRunsFile, []);
      await this._writeJsonFile(this._reconcileRunsFile, [...all, record]);
    }

    return record;
  }

  // ── SQLite migration for 002 ─────────────────────────────────────

  async runSqliteMigration002(dbPath?: string): Promise<{ applied: string[] }> {
    const sqlitePath =
      dbPath || process.env.STORAGE_PATH || path.join(this.projectRoot, '.agentic', 'data.db');
    await fsp.mkdir(path.dirname(sqlitePath), { recursive: true });

    const migrationId = '002_experience_plane';
    const migrationSqlPath = path.join(
      this.projectRoot,
      'src',
      'webapp',
      'plugins',
      'mcp-governance',
      'migrations',
      '002_experience_plane.sql'
    );
    const sql = await fsp.readFile(migrationSqlPath, 'utf8');

    const Database = (await import('better-sqlite3')).default;
    const db = new Database(sqlitePath);
    try {
      db.exec('CREATE TABLE IF NOT EXISTS mcp_migrations (id TEXT PRIMARY KEY, applied_at TEXT)');
      const exists = db.prepare('SELECT id FROM mcp_migrations WHERE id = ?').get(migrationId) as
        | { id: string }
        | undefined;
      if (exists) return { applied: [] };

      db.exec(sql);
      return { applied: [migrationId] };
    } finally {
      db.close();
    }
  }
}
