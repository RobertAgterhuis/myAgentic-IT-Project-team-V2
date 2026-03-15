// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { getStore } from './store';

/* ── File Cache with mtime invalidation (SP-R2-002-004) ──────── *
 * Reduces repeated file reads by caching content and checking
 * filesystem mtime for invalidation. Uses the Store abstraction.
 * ─────────────────────────────────────────────────────────────── */

interface CacheEntry {
  content: string;
  mtime: number;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class FileCache {
  _entries: Map<string, CacheEntry>;
  _hits: number;
  _misses: number;

  constructor() {
    this._entries = new Map();
    this._hits = 0;
    this._misses = 0;
  }

  read(filePath: string, encoding?: string): string {
    const store = getStore();
    const currentMtime = store.mtime(filePath);
    if (currentMtime > 0) {
      const cached = this._entries.get(filePath);
      if (cached && cached.mtime === currentMtime) {
        this._hits++;
        return cached.content;
      }
    }
    this._misses++;
    const content = store.readFile(filePath, encoding);
    if (currentMtime > 0) {
      this._entries.set(filePath, { content, mtime: currentMtime });
    }
    return content;
  }

  readJSON(
    filePath: string,
    validator?: (data: unknown) => ValidationResult
  ): { data: unknown; errors: string[] | null } {
    const raw = this.read(filePath);
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { data: null, errors: [`Invalid JSON: ${message}`] };
    }
    if (validator) {
      const result = validator(data);
      if (!result.valid) return { data, errors: result.errors || null };
    }
    return { data, errors: null };
  }

  invalidate(filePath: string): void {
    this._entries.delete(filePath);
  }

  invalidateAll(): void {
    this._entries.clear();
  }

  get size(): number {
    return this._entries.size;
  }

  stats(): { hits: number; misses: number } {
    return { hits: this._hits, misses: this._misses };
  }
}
