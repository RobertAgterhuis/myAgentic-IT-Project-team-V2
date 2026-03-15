// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'fs';
import path from 'path';

/* ── Store Interface (SP-R2-002-001) ──────────────────────────── *
 * Defines the contract for all data access. FileStore is the
 * default implementation; InMemoryStore is provided for testing.
 * DEC-R2-006: file-based storage only — abstraction for testability.
 * ─────────────────────────────────────────────────────────────── */

/* ── Backup constants (SP-R2-006-006) ─────────────────────────── */

export const BACKUPS_DIR_NAME = '.backups';
export const MAX_BACKUPS_PER_FILE = 10;

/* ── FileStore ────────────────────────────────────────────────── */

export class FileStore {
  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  readFile(filePath: string, encoding?: string): string {
    return fs.readFileSync(filePath, (encoding || 'utf8') as BufferEncoding);
  }

  /**
   * Snapshot-on-write: before overwriting, copy the previous version to
   * `.backups/<basename>/<timestamp>`. Retains the last MAX_BACKUPS_PER_FILE
   * snapshots per file (oldest pruned). Complies with G-OPS-AUDIT-03.
   */
  _createBackup(filePath: string): void {
    if (!fs.existsSync(filePath)) return;
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const bkDir = path.join(dir, BACKUPS_DIR_NAME, base);
    if (!fs.existsSync(bkDir)) fs.mkdirSync(bkDir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bkPath = path.join(bkDir, stamp);
    fs.copyFileSync(filePath, bkPath);

    // Prune oldest beyond limit
    const files = fs.readdirSync(bkDir).sort();
    while (files.length > MAX_BACKUPS_PER_FILE) {
      const oldest = files.shift()!;
      try {
        fs.unlinkSync(path.join(bkDir, oldest));
      } catch {
        /* ignore cleanup errors */
      }
    }
  }

  writeFile(filePath: string, data: string, encoding?: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // SP-R2-006-006: backup previous version before overwrite
    this._createBackup(filePath);
    // Atomic write: temp-file-then-rename (IMPL-CONSTRAINT-007)
    const tmpPath = filePath + '.tmp.' + process.pid + '.' + Date.now();
    try {
      fs.writeFileSync(tmpPath, data, (encoding || 'utf8') as BufferEncoding);
      fs.renameSync(tmpPath, filePath);
    } catch (err: unknown) {
      // Clean up temp file on failure
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* ignore cleanup errors */
      }
      const message = err instanceof Error ? err.message : String(err);
      throw Object.assign(new Error(`File write failed (${path.basename(filePath)}): ${message}`), {
        status: 500,
      });
    }
  }

  readdir(
    dirPath: string,
    options?: { withFileTypes?: boolean }
  ): Array<string | { name: string; isFile(): boolean; isDirectory(): boolean }> {
    if (options?.withFileTypes) {
      return fs.readdirSync(dirPath, { withFileTypes: true });
    }
    return fs.readdirSync(dirPath);
  }

  mkdirp(dirPath: string): void {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  }

  stat(filePath: string): fs.Stats {
    return fs.statSync(filePath);
  }

  mtime(filePath: string): number {
    try {
      return fs.statSync(filePath).mtimeMs;
    } catch {
      return 0;
    }
  }
}

/* ── InMemoryStore helpers ─────────────────────────────────────── */

function collectDirEntries(
  keys: IterableIterator<string> | Set<string>,
  resolved: string,
  seen: Set<string>,
  entries: Array<string | { name: string; isFile(): boolean; isDirectory(): boolean }>,
  options: { withFileTypes?: boolean } | undefined,
  isDirFn: (key: string, res: string) => boolean
): void {
  const prefix1 = resolved + path.sep;
  const prefix2 = resolved + '/';
  for (const key of keys) {
    if (key.startsWith(prefix1) || key.startsWith(prefix2)) {
      const name = key.slice(resolved.length + 1).split(/[\\/]/)[0];
      if (!seen.has(name)) {
        seen.add(name);
        const isDir = isDirFn(key, resolved);
        if (options && options.withFileTypes) {
          entries.push({ name, isFile: () => !isDir, isDirectory: () => isDir });
        } else {
          entries.push(name);
        }
      }
    }
  }
}

/* ── InMemoryStore (for testing) ──────────────────────────────── */

interface FileEntry {
  data: string;
  mtime: number;
}

interface BackupEntry {
  timestamp: string;
  data: string;
}

export class InMemoryStore {
  _files: Map<string, FileEntry>;
  _dirs: Set<string>;
  _backups: Map<string, BackupEntry[]>;

  constructor(initialFiles?: Record<string, string>) {
    this._files = new Map();
    this._dirs = new Set();
    this._backups = new Map();
    if (initialFiles) {
      for (const [filePath, data] of Object.entries(initialFiles)) {
        this._files.set(path.resolve(filePath), { data, mtime: Date.now() });
        this._ensureParentDirs(filePath);
      }
    }
  }

  _ensureParentDirs(filePath: string): void {
    let dir = path.dirname(path.resolve(filePath));
    while (dir && dir !== path.dirname(dir)) {
      this._dirs.add(dir);
      dir = path.dirname(dir);
    }
  }

  exists(filePath: string): boolean {
    const resolved = path.resolve(filePath);
    return this._files.has(resolved) || this._dirs.has(resolved);
  }

  readFile(filePath: string, _encoding?: string): string {
    const resolved = path.resolve(filePath);
    const entry = this._files.get(resolved);
    if (!entry) {
      const err: NodeJS.ErrnoException = new Error(`ENOENT: no such file: ${filePath}`);
      err.code = 'ENOENT';
      throw err;
    }
    return entry.data;
  }

  writeFile(filePath: string, data: string, _encoding?: string): void {
    const resolved = path.resolve(filePath);
    this._ensureParentDirs(filePath);
    // SP-R2-006-006: snapshot-on-write backup (mirrors FileStore)
    const existing = this._files.get(resolved);
    if (existing) {
      const bkList = this._backups.get(resolved) || [];
      bkList.push({ timestamp: new Date().toISOString(), data: existing.data });
      while (bkList.length > MAX_BACKUPS_PER_FILE) bkList.shift();
      this._backups.set(resolved, bkList);
    }
    this._files.set(resolved, { data, mtime: Date.now() });
  }

  readdir(
    dirPath: string,
    options?: { withFileTypes?: boolean }
  ): Array<string | { name: string; isFile(): boolean; isDirectory(): boolean }> {
    const resolved = path.resolve(dirPath);
    const entries: Array<string | { name: string; isFile(): boolean; isDirectory(): boolean }> = [];
    const seen = new Set<string>();
    collectDirEntries(
      this._files.keys(),
      resolved,
      seen,
      entries,
      options,
      (key, res) => key.slice(res.length + 1).split(/[\\/]/).length > 1
    );
    collectDirEntries(this._dirs, resolved, seen, entries, options, () => true);
    return entries;
  }

  mkdirp(dirPath: string): void {
    let dir = path.resolve(dirPath);
    while (dir && dir !== path.dirname(dir)) {
      this._dirs.add(dir);
      dir = path.dirname(dir);
    }
  }

  stat(filePath: string): { mtimeMs: number; isFile: () => boolean; isDirectory: () => boolean } {
    const resolved = path.resolve(filePath);
    const entry = this._files.get(resolved);
    if (entry) {
      return { mtimeMs: entry.mtime, isFile: () => true, isDirectory: () => false };
    }
    if (this._dirs.has(resolved)) {
      return { mtimeMs: Date.now(), isFile: () => false, isDirectory: () => true };
    }
    const err: NodeJS.ErrnoException = new Error(`ENOENT: no such file: ${filePath}`);
    err.code = 'ENOENT';
    throw err;
  }

  mtime(filePath: string): number {
    const resolved = path.resolve(filePath);
    const entry = this._files.get(resolved);
    return entry ? entry.mtime : 0;
  }
}

/* ── Singleton + injection ────────────────────────────────────── */

let _defaultStore: FileStore | InMemoryStore = new FileStore();

export function getStore(): FileStore | InMemoryStore {
  return _defaultStore;
}

export function setStore(store: FileStore | InMemoryStore): void {
  _defaultStore = store;
}
