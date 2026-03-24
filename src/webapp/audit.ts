// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

/* ── Mutation Audit Trail (SP-R2-007-005 / GR-DATA-004) ───────── *
 * Append-only JSON Lines log of all data mutations.
 * Every create/update/delete operation is recorded with timestamp,
 * entity type, entity ID, operation, user, and summary.
 * File rotation when log exceeds configurable size.
 * ─────────────────────────────────────────────────────────────── */

export const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const DEFAULT_AUDIT_FILENAME = 'audit-log.jsonl';

interface AuditOptions {
  logDir: string;
  filename?: string;
  maxSizeBytes?: number;
  sqlitePath?: string;
}

interface AuditLogEntry {
  operation: string;
  entityType: string;
  entityId?: string | null;
  user?: string;
  summary?: string | null;
}

export class AuditTrail {
  _logDir: string;
  _filename: string;
  _maxSizeBytes: number;
  _sqlitePath: string;

  constructor({ logDir, filename, maxSizeBytes, sqlitePath }: AuditOptions = { logDir: '' }) {
    this._logDir = logDir;
    this._filename = filename || DEFAULT_AUDIT_FILENAME;
    this._maxSizeBytes = maxSizeBytes || DEFAULT_MAX_SIZE_BYTES;
    this._sqlitePath = sqlitePath || path.join(this._logDir, 'audit-log.db');
    this._initializeSqlite();
  }

  get logPath(): string {
    return path.join(this._logDir, this._filename);
  }

  _ensureDir(): void {
    if (!fs.existsSync(this._logDir)) {
      fs.mkdirSync(this._logDir, { recursive: true });
    }
  }

  _rotateIfNeeded(): void {
    try {
      const stat = fs.statSync(this.logPath);
      if (stat.size >= this._maxSizeBytes) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotated = path.join(
          this._logDir,
          this._filename.replace('.jsonl', `.${stamp}.jsonl`)
        );
        fs.renameSync(this.logPath, rotated);
      }
    } catch {
      // File doesn't exist yet — no rotation needed
    }
  }

  _initializeSqlite(): void {
    try {
      this._ensureDir();
      const db = new Database(this._sqlitePath);
      try {
        db.exec(`
          CREATE TABLE IF NOT EXISTS audit_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            operation TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            user TEXT NOT NULL,
            summary TEXT,
            record_hash TEXT NOT NULL
          );

          CREATE TRIGGER IF NOT EXISTS audit_events_no_update
          BEFORE UPDATE ON audit_events
          BEGIN
            SELECT RAISE(ABORT, 'audit_events is append-only');
          END;

          CREATE TRIGGER IF NOT EXISTS audit_events_no_delete
          BEFORE DELETE ON audit_events
          BEGIN
            SELECT RAISE(ABORT, 'audit_events is append-only');
          END;
        `);
      } finally {
        db.close();
      }
    } catch {
      // Keep JSONL logging available even when sqlite is unavailable.
    }
  }

  _appendSqlite(record: {
    timestamp: string;
    operation: string;
    entity_type: string;
    entity_id: string | null;
    user: string;
    summary: string | null;
  }): void {
    try {
      const db = new Database(this._sqlitePath);
      try {
        const previous = db
          .prepare('SELECT record_hash FROM audit_events ORDER BY id DESC LIMIT 1')
          .get() as { record_hash: string } | undefined;

        const base = {
          previous_hash: previous?.record_hash || null,
          timestamp: record.timestamp,
          operation: record.operation,
          entity_type: record.entity_type,
          entity_id: record.entity_id,
          user: record.user,
          summary: record.summary,
        };
        const recordHash = Buffer.from(JSON.stringify(base)).toString('base64');

        db.prepare(
          `INSERT INTO audit_events (
            timestamp,
            operation,
            entity_type,
            entity_id,
            user,
            summary,
            record_hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          record.timestamp,
          record.operation,
          record.entity_type,
          record.entity_id,
          record.user,
          record.summary,
          recordHash
        );
      } finally {
        db.close();
      }
    } catch {
      // SQLite append failures should not block JSONL audit writes.
    }
  }

  log(entry: AuditLogEntry): void {
    this._ensureDir();
    this._rotateIfNeeded();

    const record = {
      timestamp: new Date().toISOString(),
      operation: entry.operation,
      entity_type: entry.entityType,
      entity_id: entry.entityId || null,
      user: entry.user || 'system',
      summary: entry.summary || null,
    };

    fs.appendFileSync(this.logPath, JSON.stringify(record) + '\n', 'utf8');
    this._appendSqlite(record);
  }

  read(limit = 50): object[] {
    if (!fs.existsSync(this.logPath)) return [];
    const content = fs.readFileSync(this.logPath, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries: object[] = [];
    const start = Math.max(0, lines.length - limit);
    for (let i = start; i < lines.length; i++) {
      try {
        entries.push(JSON.parse(lines[i]));
      } catch {
        /* skip malformed */
      }
    }
    return entries;
  }

  count(): number {
    if (!fs.existsSync(this.logPath)) return 0;
    const content = fs.readFileSync(this.logPath, 'utf8');
    return content.trim().split('\n').filter(Boolean).length;
  }

  /**
   * Log a governance check event (M4: Governance Mode + Advisory Logging).
   *
   * @param entry - Governance-specific audit entry
   */
  logGovernanceCheck(entry: {
    criticState: string;
    mode: string;
    user: string;
    policiesEvaluated: number;
    unsatisfiedCount: number;
    verdict: string;
  }): void {
    this.log({
      operation: 'GOVERNANCE_CHECK',
      entityType: 'gate',
      entityId: entry.criticState,
      user: entry.user,
      summary: `mode=${entry.mode} policies=${entry.policiesEvaluated} unsatisfied=${entry.unsatisfiedCount} verdict=${entry.verdict}`,
    });
  }

  /**
   * Log an API key authentication event (M1#658: M2M API security).
   * Tracks all API key authentication attempts (success / failed / blocked).
   *
   * @param entry - API key auth event details
   */
  logApiKeyAuth(entry: {
    success: boolean;
    apiKeyId: string; // Hashed/masked identifier
    method: string; // HTTP method
    route: string; // API endpoint
    reason?: string; // Why blocked/failed (if applicable)
    clientIp?: string;
    userAgent?: string;
  }): void {
    const operation = entry.success ? 'API_KEY_AUTH_SUCCESS' : 'API_KEY_AUTH_FAILED';
    const summary = [
      `method=${entry.method}`,
      `route=${entry.route}`,
      entry.reason ? `reason=${entry.reason}` : '',
      entry.clientIp ? `ip=${entry.clientIp}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    this.log({
      operation,
      entityType: 'auth_event',
      entityId: entry.apiKeyId,
      user: 'api-client',
      summary,
    });
  }

  /**
   * Log OAuth authentication event.
   * Tracks successful and failed OAuth attempts, MFA events.
   */
  logOAuthAuth(entry: {
    success: boolean;
    userId?: string;
    provider: string; // 'github', etc.
    reason?: string; // Why failed (if applicable)
    clientIp?: string;
  }): void {
    const operation = entry.success ? 'OAUTH_AUTH_SUCCESS' : 'OAUTH_AUTH_FAILED';
    const summary = [
      `provider=${entry.provider}`,
      entry.reason ? `reason=${entry.reason}` : '',
      entry.clientIp ? `ip=${entry.clientIp}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    this.log({
      operation,
      entityType: 'auth_event',
      entityId: entry.userId || null,
      user: entry.userId || 'unknown',
      summary,
    });
  }
}
