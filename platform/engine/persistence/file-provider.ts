// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── FileStorageProvider (M23-002) ────────────────────────────── *
 * Wraps the existing FileStore behind the StorageProvider         *
 * interface.  Collections map to subdirectories under a           *
 * configurable base path.  Documents are stored as JSON files.    *
 * Preserves atomic write (temp-then-rename) and backup-on-write   *
 * semantics from the original FileStore.                          *
 * ─────────────────────────────────────────────────────────────── */

import fs from 'fs';
import path from 'path';
import type {
  StorageProvider,
  Document,
  Filter,
  Query,
  Operation,
  HealthStatus,
  StorageMetrics,
} from './storage-provider';

const BACKUPS_DIR = '.backups';
const MAX_BACKUPS = 10;
const MAX_LATENCY_SAMPLES = 200;

export interface FileStorageProviderOptions {
  /** Base directory for all collections (default: process.cwd()). */
  basePath?: string;
}

export class FileStorageProvider implements StorageProvider {
  readonly name = 'file';
  private _basePath: string;
  private _metrics: StorageMetrics = {
    reads: 0,
    writes: 0,
    deletes: 0,
    errors: 0,
    readLatencies: [],
    writeLatencies: [],
  };

  constructor(opts?: FileStorageProviderOptions) {
    this._basePath = opts?.basePath || process.cwd();
  }

  // ── Helpers ────────────────────────────────────────────────────

  private _collectionDir(collection: string): string {
    return path.join(this._basePath, collection);
  }

  private _docPath(collection: string, id: string): string {
    // Sanitize id to prevent path traversal
    const safeId = path.basename(id);
    return path.join(this._collectionDir(collection), `${safeId}.json`);
  }

  private _ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private _createBackup(filePath: string): void {
    if (!fs.existsSync(filePath)) return;
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const bkDir = path.join(dir, BACKUPS_DIR, base);
    if (!fs.existsSync(bkDir)) fs.mkdirSync(bkDir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(filePath, path.join(bkDir, stamp));

    // Prune oldest beyond limit
    const files = fs.readdirSync(bkDir).sort();
    while (files.length > MAX_BACKUPS) {
      const oldest = files.shift()!;
      try {
        fs.unlinkSync(path.join(bkDir, oldest));
      } catch {
        /* ignore cleanup errors */
      }
    }
  }

  private _atomicWrite(filePath: string, data: string): void {
    const dir = path.dirname(filePath);
    this._ensureDir(dir);
    this._createBackup(filePath);
    const tmpPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    try {
      fs.writeFileSync(tmpPath, data, 'utf8');
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* ignore cleanup */
      }
      throw err;
    }
  }

  private _recordLatency(arr: number[], ms: number): void {
    arr.push(ms);
    if (arr.length > MAX_LATENCY_SAMPLES) arr.shift();
  }

  // ── StorageProvider implementation ─────────────────────────────

  async initialize(): Promise<void> {
    this._ensureDir(this._basePath);
  }

  async close(): Promise<void> {
    // No resources to release for file-based storage.
  }

  async read(collection: string, id: string): Promise<Document | null> {
    const start = Date.now();
    try {
      const fp = this._docPath(collection, id);
      if (!fs.existsSync(fp)) return null;
      const raw = fs.readFileSync(fp, 'utf8');
      this._metrics.reads++;
      this._recordLatency(this._metrics.readLatencies, Date.now() - start);
      return JSON.parse(raw) as Document;
    } catch {
      this._metrics.errors++;
      return null;
    }
  }

  async write(collection: string, id: string, data: Document): Promise<void> {
    const start = Date.now();
    try {
      const fp = this._docPath(collection, id);
      this._atomicWrite(fp, JSON.stringify(data, null, 2));
      this._metrics.writes++;
      this._recordLatency(this._metrics.writeLatencies, Date.now() - start);
    } catch (err) {
      this._metrics.errors++;
      throw err;
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    try {
      const fp = this._docPath(collection, id);
      if (fs.existsSync(fp)) {
        this._createBackup(fp);
        fs.unlinkSync(fp);
      }
      this._metrics.deletes++;
    } catch (err) {
      this._metrics.errors++;
      throw err;
    }
  }

  async list(collection: string, filter?: Filter): Promise<Document[]> {
    const start = Date.now();
    try {
      const dir = this._collectionDir(collection);
      if (!fs.existsSync(dir)) return [];

      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
      let docs: Document[] = [];

      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(dir, file), 'utf8');
          docs.push(JSON.parse(raw) as Document);
        } catch {
          /* skip malformed files */
        }
      }

      docs = this._applyFilter(docs, filter);
      this._metrics.reads++;
      this._recordLatency(this._metrics.readLatencies, Date.now() - start);
      return docs;
    } catch {
      this._metrics.errors++;
      return [];
    }
  }

  async transaction(ops: Operation[]): Promise<void> {
    // File-based: execute sequentially. No true atomicity — best effort.
    // Back up all targets first for manual recovery if partial failure occurs.
    for (const op of ops) {
      if (op.type === 'write' && op.data) {
        await this.write(op.collection, op.id, op.data);
      } else if (op.type === 'delete') {
        await this.delete(op.collection, op.id);
      }
    }
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
      // Probe: can we read the base directory?
      fs.accessSync(this._basePath, fs.constants.R_OK | fs.constants.W_OK);
      return {
        status: 'healthy',
        provider: this.name,
        latencyMs: Date.now() - start,
      };
    } catch {
      return {
        status: 'unhealthy',
        provider: this.name,
        latencyMs: Date.now() - start,
        details: { error: 'Base path not accessible' },
      };
    }
  }

  metrics(): StorageMetrics {
    return { ...this._metrics };
  }

  // ── Filter logic ──────────────────────────────────────────────

  private _applyFilter(docs: Document[], filter?: Filter): Document[] {
    if (!filter) return docs;

    let result = docs;

    if (filter.where) {
      const entries = Object.entries(filter.where);
      result = result.filter((doc) => entries.every(([key, val]) => doc[key] === val));
    }

    if (filter.orderBy) {
      const { field, direction } = filter.orderBy;
      result.sort((a, b) => {
        const va = a[field];
        const vb = b[field];
        if (va === vb) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        const cmp = va < vb ? -1 : 1;
        return direction === 'desc' ? -cmp : cmp;
      });
    }

    if (filter.offset) {
      result = result.slice(filter.offset);
    }

    if (filter.limit != null) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }
}
