// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'path';
import fs from 'fs';

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

  constructor({ logDir, filename, maxSizeBytes }: AuditOptions = { logDir: '' }) {
    this._logDir = logDir;
    this._filename = filename || DEFAULT_AUDIT_FILENAME;
    this._maxSizeBytes = maxSizeBytes || DEFAULT_MAX_SIZE_BYTES;
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
}
