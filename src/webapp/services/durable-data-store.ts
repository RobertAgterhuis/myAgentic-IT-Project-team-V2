import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import {
  applySqliteConcurrencyPragmas,
  resolveSqliteConcurrencyConfig,
} from '../../../platform/engine/sqlite-concurrency';
import { RAG_INCREMENTAL_MIGRATION, RAG_MIGRATIONS } from './rag/types.js';

export interface WorkflowRunRecord {
  run_id: string;
  session_id?: string | null;
  project?: string | null;
  mode?: string | null;
  status?: string | null;
  current_state?: string | null;
  source?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  state_history?: unknown[];
  gate_results?: Record<string, unknown> | null;
}

export interface ToolCallRecord {
  call_id: string;
  run_id: string;
  tool_name: string;
  status: 'completed' | 'blocked' | 'error';
  started_at: string;
  duration_ms: number;
  input?: unknown;
  output?: unknown;
  error_message?: string | null;
}

export interface WorkflowRunStepRecord {
  step_id: string;
  run_id: string;
  sequence_no: number;
  from_state: string | null;
  to_state: string;
  event_type: string;
  transition_id: string | null;
  timestamp: string;
  actor: string | null;
  metadata: Record<string, unknown> | null;
}

export interface BackupRecord {
  backup_id: string;
  target_path: string;
  backup_path: string;
  checksum: string;
  size_bytes: number;
  created_at: string;
  restore_tested_at?: string | null;
}

interface MigrationDefinition {
  domain: string;
  version: string;
  description: string;
  apply(db: DatabaseType, projectRoot: string): void;
}

const DEFAULT_DB_PATH = path.join('.agentic', 'durable-data.db');
const DEFAULT_BACKUP_DIR = path.join('.agentic', 'durable-backups');
const DEFAULT_RETENTION_POLICIES = [
  { policy_name: 'workflow_runs', max_age_days: 180, max_entries: 1000 },
  { policy_name: 'workflow_run_steps', max_age_days: 180, max_entries: 20000 },
  { policy_name: 'tool_call_log', max_age_days: 30, max_entries: 5000 },
  { policy_name: 'control_plane_snapshots', max_age_days: 30, max_entries: 1500 },
  { policy_name: 'backup_records', max_age_days: 14, max_entries: 300 },
];
const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;
const CRITICAL_FILE_PATHS = [
  path.join('BusinessDocs', 'session', 'session-state.json'),
  path.join('BusinessDocs', 'session', 'run-history.json'),
  path.join('BusinessDocs', 'session', 'command-queue.json'),
  path.join('BusinessDocs', 'session', 'transition-events.json'),
  path.join('BusinessDocs', 'session', 'remediation-tasks.json'),
  path.join('BusinessDocs', 'audit', 'audit-log.db'),
  path.join('.agentic', 'auth.db'),
  path.join('.agentic', 'data.db'),
  path.join('.agentic', 'rag', 'rag.sqlite'),
];

const AUTH_DB_PATH = path.join('.agentic', 'auth.db');
const RAG_DB_PATH = path.join('.agentic', 'rag', 'rag.sqlite');

interface SqliteDomainMigration {
  id: string;
  sql: string;
}

function applySqliteDomainMigrations(
  dbPath: string,
  migrationTable: string,
  migrations: SqliteDomainMigration[]
): { applied: string[]; total: number } {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  applySqliteConcurrencyPragmas(db, resolveSqliteConcurrencyConfig());
  try {
    db.exec(
      `CREATE TABLE IF NOT EXISTS ${migrationTable} (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`
    );
    const applied: string[] = [];
    for (const migration of migrations) {
      const exists = db
        .prepare(`SELECT id FROM ${migrationTable} WHERE id = ?`)
        .get(migration.id) as { id: string } | undefined;
      if (exists) {
        continue;
      }
      db.exec(migration.sql);
      db.prepare(`INSERT INTO ${migrationTable} (id, applied_at) VALUES (?, ?)`).run(
        migration.id,
        nowIso()
      );
      applied.push(migration.id);
    }
    return { applied, total: migrations.length };
  } finally {
    db.close();
  }
}

const AUTH_DOMAIN_MIGRATIONS: SqliteDomainMigration[] = [
  {
    id: '001_auth_foundation',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT,
        role TEXT NOT NULL DEFAULT 'viewer',
        password_hash TEXT,
        provider_account_id TEXT,
        primary_provider TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS linked_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(provider, provider_account_id)
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        metadata_json TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_linked_accounts_user ON linked_accounts(user_id);
    `,
  },
];

const RAG_DOMAIN_MIGRATIONS: SqliteDomainMigration[] = [
  {
    id: '001_rag_schema',
    sql: `
      ${RAG_MIGRATIONS.createCollections}
      ;
      ${RAG_MIGRATIONS.createChunks}
      ;
      ${RAG_INCREMENTAL_MIGRATION}
      ;
    `,
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

function clampPageSize(limit?: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.min(MAX_PAGE_SIZE, Number(limit)));
}

function checksumFile(filePath: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function checksumString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function deriveRunIdFromState(snapshot: Record<string, unknown>): string {
  const sessionId = typeof snapshot.session_id === 'string' ? snapshot.session_id : null;
  const transitionId = typeof snapshot.transition_id === 'string' ? snapshot.transition_id : null;
  const startedAt =
    typeof snapshot.initiated_at === 'string'
      ? snapshot.initiated_at
      : typeof snapshot.last_updated === 'string'
        ? snapshot.last_updated
        : nowIso();
  if (sessionId) return `run-${sessionId}`;
  if (transitionId) return `run-${transitionId}`;
  return `run-${checksumString(startedAt).slice(0, 16)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseIsoLike(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

const MIGRATIONS: MigrationDefinition[] = [
  {
    domain: 'durable-data',
    version: '001-foundation',
    description: 'Create workflow, tool call, control plane, backup, and retention tables.',
    apply(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS migration_ledger (
          domain TEXT NOT NULL,
          version TEXT NOT NULL,
          description TEXT NOT NULL,
          checksum TEXT NOT NULL,
          applied_at TEXT NOT NULL,
          PRIMARY KEY (domain, version)
        );

        CREATE TABLE IF NOT EXISTS schema_domain_status (
          domain TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          storage_target TEXT,
          last_migration_version TEXT,
          last_checked_at TEXT NOT NULL,
          details_json TEXT
        );

        CREATE TABLE IF NOT EXISTS workflow_runs (
          run_id TEXT PRIMARY KEY,
          session_id TEXT,
          project TEXT,
          mode TEXT,
          status TEXT,
          current_state TEXT,
          source TEXT,
          started_at TEXT,
          ended_at TEXT,
          state_history_json TEXT,
          gate_results_json TEXT,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS workflow_run_steps (
          step_id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL,
          sequence_no INTEGER NOT NULL,
          from_state TEXT,
          to_state TEXT NOT NULL,
          event_type TEXT NOT NULL,
          transition_id TEXT,
          timestamp TEXT NOT NULL,
          actor TEXT,
          metadata_json TEXT,
          FOREIGN KEY (run_id) REFERENCES workflow_runs (run_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS tool_call_log (
          call_id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL,
          tool_name TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at TEXT NOT NULL,
          duration_ms INTEGER NOT NULL,
          input_json TEXT,
          output_json TEXT,
          error_message TEXT,
          FOREIGN KEY (run_id) REFERENCES workflow_runs (run_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS control_plane_snapshots (
          snapshot_key TEXT PRIMARY KEY,
          snapshot_type TEXT NOT NULL,
          scope TEXT NOT NULL,
          run_id TEXT,
          checksum TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS backup_records (
          backup_id TEXT PRIMARY KEY,
          target_path TEXT NOT NULL,
          backup_path TEXT NOT NULL,
          checksum TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          restore_tested_at TEXT
        );

        CREATE TABLE IF NOT EXISTS retention_policies (
          policy_name TEXT PRIMARY KEY,
          max_age_days INTEGER NOT NULL,
          max_entries INTEGER NOT NULL,
          last_compacted_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_workflow_runs_updated_at ON workflow_runs(updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_workflow_run_steps_run ON workflow_run_steps(run_id, sequence_no ASC);
        CREATE INDEX IF NOT EXISTS idx_tool_call_log_run_id ON tool_call_log(run_id, started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_control_plane_snapshots_type_scope ON control_plane_snapshots(snapshot_type, scope);
        CREATE INDEX IF NOT EXISTS idx_backup_records_created_at ON backup_records(created_at DESC);
      `);
    },
  },
  {
    domain: 'auth',
    version: '002-domain-migrations',
    description: 'Apply versioned auth schema migrations and track status.',
    apply(db, projectRoot) {
      const target = path.join(projectRoot, AUTH_DB_PATH);
      const result = applySqliteDomainMigrations(target, 'auth_migrations', AUTH_DOMAIN_MIGRATIONS);
      db.prepare(
        `INSERT INTO schema_domain_status (
          domain, status, storage_target, last_migration_version, last_checked_at, details_json
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(domain) DO UPDATE SET
          status = excluded.status,
          storage_target = excluded.storage_target,
          last_migration_version = excluded.last_migration_version,
          last_checked_at = excluded.last_checked_at,
          details_json = excluded.details_json`
      ).run('auth', 'ready', target, '002-domain-migrations', nowIso(), JSON.stringify(result));
    },
  },
  {
    domain: 'rag',
    version: '002-domain-migrations',
    description: 'Apply versioned RAG schema migrations and track status.',
    apply(db, projectRoot) {
      const target = path.join(projectRoot, RAG_DB_PATH);
      const result = applySqliteDomainMigrations(target, 'rag_migrations', RAG_DOMAIN_MIGRATIONS);
      db.prepare(
        `INSERT INTO schema_domain_status (
          domain, status, storage_target, last_migration_version, last_checked_at, details_json
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(domain) DO UPDATE SET
          status = excluded.status,
          storage_target = excluded.storage_target,
          last_migration_version = excluded.last_migration_version,
          last_checked_at = excluded.last_checked_at,
          details_json = excluded.details_json`
      ).run('rag', 'ready', target, '002-domain-migrations', nowIso(), JSON.stringify(result));
    },
  },
  {
    domain: 'provider',
    version: '002-domain-migrations',
    description: 'Track storage provider schema/migration state in unified ledger.',
    apply(db) {
      const provider = String(process.env.STORAGE_PROVIDER || 'file');
      db.prepare(
        `INSERT INTO schema_domain_status (
          domain, status, storage_target, last_migration_version, last_checked_at, details_json
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(domain) DO UPDATE SET
          status = excluded.status,
          storage_target = excluded.storage_target,
          last_migration_version = excluded.last_migration_version,
          last_checked_at = excluded.last_checked_at,
          details_json = excluded.details_json`
      ).run(
        'provider',
        'ready',
        provider,
        '002-domain-migrations',
        nowIso(),
        JSON.stringify({ provider, migration: 'not_applicable' })
      );
    },
  },
];

export class DurableDataStore {
  private readonly projectRoot: string;
  private readonly dbPath: string;
  private readonly backupDir: string;
  private db: DatabaseType | null = null;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.dbPath = path.join(projectRoot, DEFAULT_DB_PATH);
    this.backupDir = path.join(projectRoot, DEFAULT_BACKUP_DIR);
  }

  initialize(): void {
    if (this.db) return;
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    fs.mkdirSync(this.backupDir, { recursive: true });
    this.db = new Database(this.dbPath);
    applySqliteConcurrencyPragmas(this.db, resolveSqliteConcurrencyConfig());
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migration_ledger (
        domain TEXT NOT NULL,
        version TEXT NOT NULL,
        description TEXT NOT NULL,
        checksum TEXT NOT NULL,
        applied_at TEXT NOT NULL,
        PRIMARY KEY (domain, version)
      )
    `);
    for (const migration of MIGRATIONS) {
      const checksum = checksumString(
        `${migration.domain}:${migration.version}:${migration.description}`
      );
      const existing = this.db
        .prepare('SELECT checksum FROM migration_ledger WHERE domain = ? AND version = ?')
        .get(migration.domain, migration.version) as { checksum: string } | undefined;
      if (existing?.checksum === checksum) {
        continue;
      }
      migration.apply(this.db, this.projectRoot);
      this.db
        .prepare(
          `INSERT INTO migration_ledger (domain, version, description, checksum, applied_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(domain, version) DO UPDATE SET
             description = excluded.description,
             checksum = excluded.checksum,
             applied_at = excluded.applied_at`
        )
        .run(migration.domain, migration.version, migration.description, checksum, nowIso());
    }
    for (const policy of DEFAULT_RETENTION_POLICIES) {
      this.db
        .prepare(
          `INSERT INTO retention_policies (policy_name, max_age_days, max_entries, last_compacted_at)
           VALUES (?, ?, ?, NULL)
           ON CONFLICT(policy_name) DO NOTHING`
        )
        .run(policy.policy_name, policy.max_age_days, policy.max_entries);
    }
    this.applyRetentionPolicies();
    this.ensureBackupsForCriticalFiles();
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  private getDb(): DatabaseType {
    if (!this.db) {
      this.initialize();
    }
    return this.db as DatabaseType;
  }

  upsertWorkflowRun(record: WorkflowRunRecord): void {
    const db = this.getDb();
    db.prepare(
      `INSERT INTO workflow_runs (
        run_id, session_id, project, mode, status, current_state, source, started_at, ended_at,
        state_history_json, gate_results_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(run_id) DO UPDATE SET
        session_id = COALESCE(excluded.session_id, workflow_runs.session_id),
        project = COALESCE(excluded.project, workflow_runs.project),
        mode = COALESCE(excluded.mode, workflow_runs.mode),
        status = excluded.status,
        current_state = COALESCE(excluded.current_state, workflow_runs.current_state),
        source = COALESCE(excluded.source, workflow_runs.source),
        started_at = COALESCE(workflow_runs.started_at, excluded.started_at),
        ended_at = COALESCE(excluded.ended_at, workflow_runs.ended_at),
        state_history_json = CASE
          WHEN excluded.state_history_json = '[]' AND workflow_runs.state_history_json IS NOT NULL
            THEN workflow_runs.state_history_json
          ELSE excluded.state_history_json
        END,
        gate_results_json = CASE
          WHEN excluded.gate_results_json = '{}' AND workflow_runs.gate_results_json IS NOT NULL
            THEN workflow_runs.gate_results_json
          ELSE excluded.gate_results_json
        END,
        updated_at = excluded.updated_at`
    ).run(
      record.run_id,
      record.session_id || null,
      record.project || null,
      record.mode || null,
      record.status || null,
      record.current_state || null,
      record.source || 'control-plane',
      record.started_at || null,
      record.ended_at || null,
      JSON.stringify(record.state_history || []),
      JSON.stringify(record.gate_results || {}),
      nowIso()
    );
  }

  syncWorkflowRunFromState(snapshot: Record<string, unknown>): string {
    const runId = deriveRunIdFromState(snapshot);
    const stateHistory = Array.isArray(snapshot.state_history) ? snapshot.state_history : [];
    this.upsertWorkflowRun({
      run_id: runId,
      session_id: typeof snapshot.session_id === 'string' ? snapshot.session_id : null,
      project:
        typeof snapshot.projectName === 'string'
          ? snapshot.projectName
          : typeof snapshot.project_name === 'string'
            ? snapshot.project_name
            : null,
      mode: typeof snapshot.mode === 'string' ? snapshot.mode : null,
      status: typeof snapshot.status === 'string' ? snapshot.status : null,
      current_state: typeof snapshot.status === 'string' ? snapshot.status : null,
      source: 'session-state',
      started_at:
        typeof snapshot.initiated_at === 'string'
          ? snapshot.initiated_at
          : typeof snapshot.last_updated === 'string'
            ? snapshot.last_updated
            : nowIso(),
      ended_at:
        snapshot.status === 'COMPLETED' || snapshot.status === 'ERROR'
          ? typeof snapshot.last_updated === 'string'
            ? snapshot.last_updated
            : nowIso()
          : null,
      state_history: stateHistory,
      gate_results:
        snapshot.gate_results && typeof snapshot.gate_results === 'object'
          ? (snapshot.gate_results as Record<string, unknown>)
          : {},
    });
    this.rebuildWorkflowRunSteps(runId, stateHistory, snapshot);
    return runId;
  }

  private rebuildWorkflowRunSteps(
    runId: string,
    stateHistory: unknown[],
    snapshot: Record<string, unknown>
  ): void {
    const db = this.getDb();
    const historySteps: WorkflowRunStepRecord[] = [];
    for (let index = 0; index < stateHistory.length; index++) {
      const record = asRecord(stateHistory[index]);
      if (!record) {
        continue;
      }
      const toState =
        typeof record.to === 'string'
          ? record.to
          : typeof record.status === 'string'
            ? record.status
            : null;
      if (!toState) {
        continue;
      }
      historySteps.push({
        step_id: `${runId}:history:${index + 1}`,
        run_id: runId,
        sequence_no: index + 1,
        from_state: typeof record.from === 'string' ? record.from : null,
        to_state: toState,
        event_type: typeof record.event === 'string' ? record.event : 'state_transition',
        transition_id: typeof record.transition_id === 'string' ? record.transition_id : null,
        timestamp: parseIsoLike(record.timestamp, nowIso()),
        actor: typeof record.actor === 'string' ? record.actor : null,
        metadata: asRecord(record.metadata),
      });
    }

    const finalStatus = typeof snapshot.status === 'string' ? snapshot.status : null;
    const previousState =
      historySteps.length > 0 ? historySteps[historySteps.length - 1].to_state : null;
    const finalStep =
      finalStatus && (historySteps.length === 0 || previousState !== finalStatus)
        ? ({
            step_id: `${runId}:snapshot:final`,
            run_id: runId,
            sequence_no: historySteps.length + 1,
            from_state: previousState,
            to_state: finalStatus,
            event_type: 'snapshot_status',
            transition_id:
              typeof snapshot.transition_id === 'string' ? snapshot.transition_id : null,
            timestamp: parseIsoLike(snapshot.last_updated, nowIso()),
            actor: typeof snapshot.actor === 'string' ? snapshot.actor : null,
            metadata: null,
          } satisfies WorkflowRunStepRecord)
        : null;

    const steps = finalStep ? [...historySteps, finalStep] : historySteps;
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM workflow_run_steps WHERE run_id = ?').run(runId);
      const stmt = db.prepare(
        `INSERT INTO workflow_run_steps (
          step_id, run_id, sequence_no, from_state, to_state, event_type,
          transition_id, timestamp, actor, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      for (const step of steps) {
        stmt.run(
          step.step_id,
          step.run_id,
          step.sequence_no,
          step.from_state,
          step.to_state,
          step.event_type,
          step.transition_id,
          step.timestamp,
          step.actor,
          step.metadata ? JSON.stringify(step.metadata) : null
        );
      }
    });
    tx();
  }

  recordToolCall(record: ToolCallRecord): void {
    this.upsertWorkflowRun({
      run_id: record.run_id,
      source: 'tool-call',
      status: record.status,
      started_at: record.started_at,
    });
    this.getDb()
      .prepare(
        `INSERT INTO tool_call_log (
          call_id, run_id, tool_name, status, started_at, duration_ms, input_json, output_json, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(call_id) DO UPDATE SET
          status = excluded.status,
          duration_ms = excluded.duration_ms,
          output_json = excluded.output_json,
          error_message = excluded.error_message`
      )
      .run(
        record.call_id,
        record.run_id,
        record.tool_name,
        record.status,
        record.started_at,
        Math.max(0, Math.round(record.duration_ms)),
        record.input === undefined ? null : JSON.stringify(record.input),
        record.output === undefined ? null : JSON.stringify(record.output),
        record.error_message || null
      );
  }

  saveControlPlaneSnapshot(input: {
    snapshotType: string;
    scope: string;
    payload: unknown;
    runId?: string | null;
  }): void {
    const payloadJson = JSON.stringify(input.payload, null, 2);
    const snapshotKey = `${input.snapshotType}:${input.scope}`;
    this.getDb()
      .prepare(
        `INSERT INTO control_plane_snapshots (
          snapshot_key, snapshot_type, scope, run_id, checksum, payload_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(snapshot_key) DO UPDATE SET
          run_id = excluded.run_id,
          checksum = excluded.checksum,
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at`
      )
      .run(
        snapshotKey,
        input.snapshotType,
        input.scope,
        input.runId || null,
        checksumString(payloadJson),
        payloadJson,
        nowIso()
      );
  }

  getLatestSnapshot(snapshotType: string, scope: string): unknown | null {
    const row = this.getDb()
      .prepare(
        `SELECT payload_json FROM control_plane_snapshots WHERE snapshot_type = ? AND scope = ? LIMIT 1`
      )
      .get(snapshotType, scope) as { payload_json: string } | undefined;
    if (!row) return null;
    return JSON.parse(row.payload_json);
  }

  listWorkflowRuns(limit?: number, offset?: number): WorkflowRunRecord[] {
    const rows = this.getDb()
      .prepare(`SELECT * FROM workflow_runs ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
      .all(clampPageSize(limit), Math.max(0, Number(offset || 0))) as Array<
      Record<string, unknown>
    >;
    return rows.map((row) => ({
      run_id: String(row.run_id),
      session_id: (row.session_id as string | null) || null,
      project: (row.project as string | null) || null,
      mode: (row.mode as string | null) || null,
      status: (row.status as string | null) || null,
      current_state: (row.current_state as string | null) || null,
      source: (row.source as string | null) || null,
      started_at: (row.started_at as string | null) || null,
      ended_at: (row.ended_at as string | null) || null,
      state_history: row.state_history_json ? JSON.parse(String(row.state_history_json)) : [],
      gate_results: row.gate_results_json ? JSON.parse(String(row.gate_results_json)) : {},
    }));
  }

  listToolCalls(runId: string, limit?: number, offset?: number): ToolCallRecord[] {
    const rows = this.getDb()
      .prepare(
        `SELECT * FROM tool_call_log WHERE run_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?`
      )
      .all(runId, clampPageSize(limit), Math.max(0, Number(offset || 0))) as Array<
      Record<string, unknown>
    >;
    return rows.map((row) => ({
      call_id: String(row.call_id),
      run_id: String(row.run_id),
      tool_name: String(row.tool_name),
      status: row.status as ToolCallRecord['status'],
      started_at: String(row.started_at),
      duration_ms: Number(row.duration_ms),
      input: row.input_json ? JSON.parse(String(row.input_json)) : undefined,
      output: row.output_json ? JSON.parse(String(row.output_json)) : undefined,
      error_message: (row.error_message as string | null) || null,
    }));
  }

  listWorkflowRunSteps(runId: string, limit?: number, offset?: number): WorkflowRunStepRecord[] {
    const rows = this.getDb()
      .prepare(
        `SELECT * FROM workflow_run_steps WHERE run_id = ? ORDER BY sequence_no ASC LIMIT ? OFFSET ?`
      )
      .all(runId, clampPageSize(limit), Math.max(0, Number(offset || 0))) as Array<
      Record<string, unknown>
    >;
    return rows.map((row) => ({
      step_id: String(row.step_id),
      run_id: String(row.run_id),
      sequence_no: Number(row.sequence_no),
      from_state: (row.from_state as string | null) || null,
      to_state: String(row.to_state),
      event_type: String(row.event_type),
      transition_id: (row.transition_id as string | null) || null,
      timestamp: String(row.timestamp),
      actor: (row.actor as string | null) || null,
      metadata: row.metadata_json
        ? (JSON.parse(String(row.metadata_json)) as Record<string, unknown>)
        : null,
    }));
  }

  ensureBackupsForCriticalFiles(): BackupRecord[] {
    const created: BackupRecord[] = [];
    for (const relativePath of [DEFAULT_DB_PATH, ...CRITICAL_FILE_PATHS]) {
      const targetPath = path.join(this.projectRoot, relativePath);
      if (!fs.existsSync(targetPath)) {
        continue;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      const safeName = relativePath.replace(/[\\/:]+/g, '__');
      const backupPath = path.join(this.backupDir, `${safeName}.${stamp}.bak`);
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        fs.copyFileSync(targetPath, backupPath);
      }
      const record: BackupRecord = {
        backup_id: checksumString(`${targetPath}:${backupPath}`).slice(0, 24),
        target_path: targetPath,
        backup_path: backupPath,
        checksum: checksumFile(backupPath),
        size_bytes: fs.statSync(backupPath).size,
        created_at: nowIso(),
      };
      this.getDb()
        .prepare(
          `INSERT INTO backup_records (
            backup_id, target_path, backup_path, checksum, size_bytes, created_at, restore_tested_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(backup_id) DO UPDATE SET
            checksum = excluded.checksum,
            size_bytes = excluded.size_bytes,
            created_at = excluded.created_at`
        )
        .run(
          record.backup_id,
          record.target_path,
          record.backup_path,
          record.checksum,
          record.size_bytes,
          record.created_at,
          null
        );
      created.push(record);
    }
    return created;
  }

  restoreBackup(backupId: string): BackupRecord {
    const row = this.getDb()
      .prepare('SELECT * FROM backup_records WHERE backup_id = ?')
      .get(backupId) as Record<string, unknown> | undefined;
    if (!row) {
      throw new Error(`Backup not found: ${backupId}`);
    }
    const backupPath = String(row.backup_path);
    const targetPath = String(row.target_path);
    if (checksumFile(backupPath) !== String(row.checksum)) {
      throw new Error(`Backup checksum mismatch: ${backupId}`);
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(backupPath, targetPath);
    const testedAt = nowIso();
    this.getDb()
      .prepare('UPDATE backup_records SET restore_tested_at = ? WHERE backup_id = ?')
      .run(testedAt, backupId);
    return {
      backup_id: String(row.backup_id),
      target_path: targetPath,
      backup_path: backupPath,
      checksum: String(row.checksum),
      size_bytes: Number(row.size_bytes),
      created_at: String(row.created_at),
      restore_tested_at: testedAt,
    };
  }

  applyRetentionPolicies(): void {
    const db = this.getDb();
    const policies = db.prepare('SELECT * FROM retention_policies').all() as Array<
      Record<string, unknown>
    >;
    for (const policy of policies) {
      const name = String(policy.policy_name);
      const maxEntries = Number(policy.max_entries);
      if (name === 'workflow_runs') {
        db.exec(`
          DELETE FROM workflow_runs
          WHERE run_id NOT IN (
            SELECT run_id FROM workflow_runs ORDER BY updated_at DESC LIMIT ${Math.max(1, maxEntries)}
          )
        `);
      } else if (name === 'workflow_run_steps') {
        db.exec(`
          DELETE FROM workflow_run_steps
          WHERE step_id NOT IN (
            SELECT step_id FROM workflow_run_steps ORDER BY timestamp DESC LIMIT ${Math.max(1, maxEntries)}
          )
        `);
      } else if (name === 'tool_call_log') {
        db.exec(`
          DELETE FROM tool_call_log
          WHERE call_id NOT IN (
            SELECT call_id FROM tool_call_log ORDER BY started_at DESC LIMIT ${Math.max(1, maxEntries)}
          )
        `);
      } else if (name === 'control_plane_snapshots') {
        db.exec(`
          DELETE FROM control_plane_snapshots
          WHERE snapshot_key NOT IN (
            SELECT snapshot_key FROM control_plane_snapshots ORDER BY updated_at DESC LIMIT ${Math.max(1, maxEntries)}
          )
        `);
      } else if (name === 'backup_records') {
        db.exec(`
          DELETE FROM backup_records
          WHERE backup_id NOT IN (
            SELECT backup_id FROM backup_records ORDER BY created_at DESC LIMIT ${Math.max(1, maxEntries)}
          )
        `);
      }
      db.prepare('UPDATE retention_policies SET last_compacted_at = ? WHERE policy_name = ?').run(
        nowIso(),
        name
      );
    }
  }
}

const stores = new Map<string, DurableDataStore>();

export function getDurableDataStore(projectRoot = process.cwd()): DurableDataStore {
  const resolved = path.resolve(projectRoot);
  let store = stores.get(resolved);
  if (!store) {
    store = new DurableDataStore(resolved);
    stores.set(resolved, store);
  }
  return store;
}

export function initializeDurableDataStore(projectRoot = process.cwd()): DurableDataStore {
  const store = getDurableDataStore(projectRoot);
  store.initialize();
  return store;
}

export function resetDurableDataStoreForTests(projectRoot = process.cwd()): void {
  const resolved = path.resolve(projectRoot);
  const store = stores.get(resolved);
  store?.close();
  stores.delete(resolved);
}
