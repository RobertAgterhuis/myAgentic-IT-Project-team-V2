// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── SQLiteStorageProvider (M23-003) ──────────────────────────── *
 * Database-backed StorageProvider using better-sqlite3.           *
 * Zero-config single-file database with WAL mode for concurrent   *
 * read performance.  JSON column for flexible document storage.   *
 * Auto-creates tables per collection on first access.             *
 * ─────────────────────────────────────────────────────────────── */

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import {
  applySqliteConcurrencyPragmas,
  resolveSqliteConcurrencyConfig,
  type SqliteConcurrencyConfig,
  type SqliteJournalMode,
  type SqliteSynchronousMode,
} from '../sqlite-concurrency';
import type {
  StorageProvider,
  Document,
  Filter,
  Query,
  Operation,
  HealthStatus,
  StorageMetrics,
} from './storage-provider';

const MAX_LATENCY_SAMPLES = 200;

// Allowlist of safe collection names (alphanumeric + underscore + hyphen)
const COLLECTION_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

export interface SQLiteStorageProviderOptions {
  /** Path to the SQLite database file (default: .agentic/data.db). */
  dbPath?: string;
  journalMode?: SqliteJournalMode;
  synchronous?: SqliteSynchronousMode;
  busyTimeoutMs?: number;
}

export class SQLiteStorageProvider implements StorageProvider {
  readonly name = 'sqlite';
  private _dbPath: string;
  private _concurrency: SqliteConcurrencyConfig;
  private _db: DatabaseType | null = null;
  private _ensuredTables = new Set<string>();
  private _metrics: StorageMetrics = {
    reads: 0,
    writes: 0,
    deletes: 0,
    errors: 0,
    readLatencies: [],
    writeLatencies: [],
  };

  constructor(opts?: SQLiteStorageProviderOptions) {
    this._dbPath = opts?.dbPath || path.join(process.cwd(), '.agentic', 'data.db');
    this._concurrency = resolveSqliteConcurrencyConfig({
      journalMode: opts?.journalMode,
      synchronous: opts?.synchronous,
      busyTimeoutMs: opts?.busyTimeoutMs,
    });
  }

  // ── Helpers ────────────────────────────────────────────────────

  private _getDb(): DatabaseType {
    if (!this._db) {
      throw new Error('SQLiteStorageProvider not initialized — call initialize() first');
    }
    return this._db;
  }

  private _tableName(collection: string): string {
    if (!COLLECTION_RE.test(collection)) {
      throw new Error(`Invalid collection name: ${collection}`);
    }
    return `col_${collection.replace(/-/g, '_')}`;
  }

  private _ensureTable(collection: string): void {
    if (this._ensuredTables.has(collection)) return;
    const table = this._tableName(collection);
    const db = this._getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS "${table}" (
        id TEXT PRIMARY KEY NOT NULL,
        data TEXT NOT NULL,
        status TEXT GENERATED ALWAYS AS (json_extract(data, '$.status')) STORED,
        type TEXT GENERATED ALWAYS AS (json_extract(data, '$.type')) STORED,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    // Create indexes for common query patterns
    db.exec(`CREATE INDEX IF NOT EXISTS "idx_${table}_status" ON "${table}" (status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS "idx_${table}_type" ON "${table}" (type)`);
    db.exec(`CREATE INDEX IF NOT EXISTS "idx_${table}_updated" ON "${table}" (updated_at)`);
    this._ensuredTables.add(collection);
  }

  private _recordLatency(arr: number[], ms: number): void {
    arr.push(ms);
    if (arr.length > MAX_LATENCY_SAMPLES) arr.shift();
  }

  // ── StorageProvider implementation ─────────────────────────────

  async initialize(): Promise<void> {
    const dir = path.dirname(this._dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this._db = new Database(this._dbPath);
    applySqliteConcurrencyPragmas(this._db, this._concurrency);
  }

  async close(): Promise<void> {
    if (this._db) {
      this._db.close();
      this._db = null;
      this._ensuredTables.clear();
    }
  }

  async read(collection: string, id: string): Promise<Document | null> {
    const start = Date.now();
    try {
      this._ensureTable(collection);
      const table = this._tableName(collection);
      const row = this._getDb().prepare(`SELECT data FROM "${table}" WHERE id = ?`).get(id) as
        | { data: string }
        | undefined;

      this._metrics.reads++;
      this._recordLatency(this._metrics.readLatencies, Date.now() - start);
      return row ? (JSON.parse(row.data) as Document) : null;
    } catch {
      this._metrics.errors++;
      return null;
    }
  }

  async write(collection: string, id: string, data: Document): Promise<void> {
    const start = Date.now();
    try {
      this._ensureTable(collection);
      const table = this._tableName(collection);
      const json = JSON.stringify(data);
      this._getDb()
        .prepare(
          `INSERT INTO "${table}" (id, data, updated_at) VALUES (?, ?, datetime('now'))
           ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`
        )
        .run(id, json);

      this._metrics.writes++;
      this._recordLatency(this._metrics.writeLatencies, Date.now() - start);
    } catch (err) {
      this._metrics.errors++;
      throw err;
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    try {
      this._ensureTable(collection);
      const table = this._tableName(collection);
      this._getDb().prepare(`DELETE FROM "${table}" WHERE id = ?`).run(id);
      this._metrics.deletes++;
    } catch (err) {
      this._metrics.errors++;
      throw err;
    }
  }

  async list(collection: string, filter?: Filter): Promise<Document[]> {
    const start = Date.now();
    try {
      this._ensureTable(collection);
      const table = this._tableName(collection);
      const { clause, params } = this._buildWhere(filter);
      const orderBy = this._buildOrderBy(filter);
      const limitOffset = this._buildLimitOffset(filter);

      const sql = `SELECT data FROM "${table}"${clause}${orderBy}${limitOffset}`;
      const rows = this._getDb()
        .prepare(sql)
        .all(...params) as { data: string }[];
      const docs = rows.map((r) => JSON.parse(r.data) as Document);

      this._metrics.reads++;
      this._recordLatency(this._metrics.readLatencies, Date.now() - start);
      return docs;
    } catch {
      this._metrics.errors++;
      return [];
    }
  }

  async transaction(ops: Operation[]): Promise<void> {
    const db = this._getDb();
    const txn = db.transaction(() => {
      for (const op of ops) {
        if (op.type === 'write' && op.data) {
          this._ensureTable(op.collection);
          const table = this._tableName(op.collection);
          const json = JSON.stringify(op.data);
          db.prepare(
            `INSERT INTO "${table}" (id, data, updated_at) VALUES (?, ?, datetime('now'))
             ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`
          ).run(op.id, json);
          this._metrics.writes++;
        } else if (op.type === 'delete') {
          this._ensureTable(op.collection);
          const table = this._tableName(op.collection);
          db.prepare(`DELETE FROM "${table}" WHERE id = ?`).run(op.id);
          this._metrics.deletes++;
        }
      }
    });
    txn();
  }

  async query(collection: string, q: Query): Promise<Document[]> {
    let docs = await this.list(collection, q);

    if (q.text) {
      const term = q.text.toLowerCase();
      docs = docs.filter((doc) => JSON.stringify(doc).toLowerCase().includes(term));
    }

    return docs;
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const db = this._getDb();
      db.prepare('SELECT 1').get();
      return {
        status: 'healthy',
        provider: this.name,
        latencyMs: Date.now() - start,
        details: {
          dbPath: this._dbPath,
          journalMode: this._concurrency.journalMode,
          synchronous: this._concurrency.synchronous,
          busyTimeoutMs: this._concurrency.busyTimeoutMs,
          connectionModel: this._concurrency.connectionModel,
          pooling: this._concurrency.pooling,
        },
      };
    } catch {
      return {
        status: 'unhealthy',
        provider: this.name,
        latencyMs: Date.now() - start,
        details: { error: 'Database not accessible' },
      };
    }
  }

  metrics(): StorageMetrics {
    return { ...this._metrics };
  }

  // ── SQL builders ──────────────────────────────────────────────

  private _buildWhere(filter?: Filter): { clause: string; params: unknown[] } {
    if (!filter?.where || Object.keys(filter.where).length === 0) {
      return { clause: '', params: [] };
    }

    const conditions: string[] = [];
    const params: unknown[] = [];

    for (const [key, val] of Object.entries(filter.where)) {
      if (key === 'id') {
        conditions.push('id = ?');
        params.push(val);
      } else if (key === 'status') {
        conditions.push('status = ?');
        params.push(val);
      } else if (key === 'type') {
        conditions.push('type = ?');
        params.push(val);
      } else {
        // Generic JSON field extraction
        conditions.push(`json_extract(data, '$.${key}') = ?`);
        params.push(val);
      }
    }

    return { clause: ` WHERE ${conditions.join(' AND ')}`, params };
  }

  private _buildOrderBy(filter?: Filter): string {
    if (!filter?.orderBy) return '';
    const dir = filter.orderBy.direction === 'desc' ? 'DESC' : 'ASC';
    const field = filter.orderBy.field;
    if (field === 'id') return ` ORDER BY id ${dir}`;
    if (field === 'updated_at') return ` ORDER BY updated_at ${dir}`;
    return ` ORDER BY json_extract(data, '$.${field}') ${dir}`;
  }

  private _buildLimitOffset(filter?: Filter): string {
    let sql = '';
    if (filter?.limit != null) {
      sql += ` LIMIT ${Number(filter.limit)}`;
    } else if (filter?.offset) {
      // SQLite requires LIMIT before OFFSET; use -1 for unlimited
      sql += ' LIMIT -1';
    }
    if (filter?.offset) sql += ` OFFSET ${Number(filter.offset)}`;
    return sql;
  }
}
