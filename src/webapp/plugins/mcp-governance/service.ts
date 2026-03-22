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
} from './defaults';
import type {
  AgentServerPolicy,
  AgentType,
  McpServerRegistry,
  McpSyncResult,
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

  private _resolvePermission(
    agentId: string,
    serverId: string,
    policies: AgentServerPolicy[]
  ): { level: string; approvalRequired: boolean; blocked: boolean } {
    const match = policies.find((p) => p.agentId === agentId && p.serverId === serverId);
    const level = match?.permission || 'N';
    return {
      level,
      approvalRequired: level === 'A',
      blocked: level === 'X' || level === 'N',
    };
  }

  async buildRuntimeArtifacts(): Promise<RuntimeBuildResult> {
    const [agents, servers, policies] = await Promise.all([
      this.listAgents(),
      this.listServers(),
      this.getDefinedPolicies(),
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
      const manifest: RuntimeManifest = {
        agentId: agent.id,
        generatedAt: new Date().toISOString(),
        servers: servers.map((server) => {
          const resolved = this._resolvePermission(agent.id, server.id, policies);
          return {
            serverId: server.id,
            endpoint: server.endpoint,
            healthStatus: server.healthStatus,
            authType: server.authType,
            tools: [
              {
                toolId: `${server.id}.default`,
                permissionLevel:
                  resolved.level as RuntimeManifest['servers'][number]['tools'][number]['permissionLevel'],
                approvalRequired: resolved.approvalRequired,
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
