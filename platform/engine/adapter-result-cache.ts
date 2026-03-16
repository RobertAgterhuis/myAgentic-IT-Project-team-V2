// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Adapter Result Cache
 *
 * Idempotency cache that prevents duplicate side-effect operations during
 * engine resume/replay. When the engine crashes and restarts, adapter
 * operations that have already succeeded are served from cache instead
 * of being re-executed (preventing double branch creates, duplicate test
 * runs, etc.).
 *
 * Storage: write-ahead entries persisted to `BusinessDocs/session/adapter-cache.json`.
 * Cache key: `${adapter}:${operation}:${paramsHash}`
 *
 * @module engine/adapter-result-cache
 */

import { createHash } from 'node:crypto';

// ─── Types ──────────────────────────────────────────────────

export interface CacheEntry<T = unknown> {
  key: string;
  adapter: string;
  operation: string;
  params_hash: string;
  result: T;
  timestamp: string;
  ttl_ms: number;
}

export interface CacheStore {
  exists(path: string): boolean;
  readFile(path: string): string;
  writeFile(path: string, data: string): void;
  mkdirp(path: string): void;
}

export interface CacheOptions {
  /** File store abstraction */
  store: CacheStore;
  /** Path to the cache file (default: BusinessDocs/session/adapter-cache.json) */
  cachePath?: string;
  /** Default TTL in ms (default: 3600000 = 1 hour) */
  defaultTtl?: number;
}

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_CACHE_PATH = 'BusinessDocs/session/adapter-cache.json';
const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

// ─── Helpers ────────────────────────────────────────────────

function hashParams(params: Record<string, unknown>): string {
  const sorted = JSON.stringify(params, Object.keys(params).sort());
  return createHash('sha256').update(sorted).digest('hex').substring(0, 16);
}

function buildKey(adapter: string, operation: string, paramsHash: string): string {
  return `${adapter}:${operation}:${paramsHash}`;
}

// ─── AdapterResultCache ─────────────────────────────────────

export class AdapterResultCache {
  private _entries = new Map<string, CacheEntry>();
  private _store: CacheStore;
  private _cachePath: string;
  private _defaultTtl: number;

  constructor(options: CacheOptions) {
    this._store = options.store;
    this._cachePath = options.cachePath || DEFAULT_CACHE_PATH;
    this._defaultTtl = options.defaultTtl || DEFAULT_TTL;
    this._load();
  }

  /**
   * Look up a cached result. Returns undefined if not found or expired.
   */
  get<T = unknown>(
    adapter: string,
    operation: string,
    params: Record<string, unknown>
  ): T | undefined {
    const ph = hashParams(params);
    const key = buildKey(adapter, operation, ph);
    const entry = this._entries.get(key);
    if (!entry) return undefined;

    // Check TTL
    const age = Date.now() - new Date(entry.timestamp).getTime();
    if (age > entry.ttl_ms) {
      this._entries.delete(key);
      this._persist();
      return undefined;
    }

    return entry.result as T;
  }

  /**
   * Store a result in the cache and persist to disk.
   */
  set<T = unknown>(
    adapter: string,
    operation: string,
    params: Record<string, unknown>,
    result: T,
    ttl?: number
  ): void {
    const ph = hashParams(params);
    const key = buildKey(adapter, operation, ph);
    const entry: CacheEntry<T> = {
      key,
      adapter,
      operation,
      params_hash: ph,
      result,
      timestamp: new Date().toISOString(),
      ttl_ms: ttl ?? this._defaultTtl,
    };
    this._entries.set(key, entry as CacheEntry);
    this._persist();
  }

  /**
   * Check whether a result is cached (and not expired).
   */
  has(adapter: string, operation: string, params: Record<string, unknown>): boolean {
    return this.get(adapter, operation, params) !== undefined;
  }

  /**
   * Invalidate a specific cached result.
   */
  invalidate(adapter: string, operation: string, params: Record<string, unknown>): boolean {
    const ph = hashParams(params);
    const key = buildKey(adapter, operation, ph);
    const deleted = this._entries.delete(key);
    if (deleted) this._persist();
    return deleted;
  }

  /**
   * Invalidate all cached results for an adapter.
   */
  invalidateAdapter(adapter: string): number {
    let count = 0;
    for (const [key, entry] of this._entries) {
      if (entry.adapter === adapter) {
        this._entries.delete(key);
        count++;
      }
    }
    if (count > 0) this._persist();
    return count;
  }

  /**
   * Clear all cached results.
   */
  clear(): void {
    this._entries.clear();
    this._persist();
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; adapters: string[] } {
    const adapters = new Set<string>();
    for (const entry of this._entries.values()) {
      adapters.add(entry.adapter);
    }
    return { size: this._entries.size, adapters: [...adapters] };
  }

  // ─── Persistence ────────────────────────────────────────

  private _load(): void {
    try {
      if (this._store.exists(this._cachePath)) {
        const raw = this._store.readFile(this._cachePath);
        const data = JSON.parse(raw);
        if (Array.isArray(data.entries)) {
          for (const entry of data.entries) {
            // Skip expired entries on load
            const age = Date.now() - new Date(entry.timestamp).getTime();
            if (age <= entry.ttl_ms) {
              this._entries.set(entry.key, entry);
            }
          }
        }
      }
    } catch {
      // Cache corruption is non-fatal — start fresh
      this._entries.clear();
    }
  }

  private _persist(): void {
    try {
      const dir = this._cachePath.replace(/[/\\][^/\\]+$/, '');
      if (dir && !this._store.exists(dir)) {
        this._store.mkdirp(dir);
      }
      const data = {
        version: '1.0.0',
        updated_at: new Date().toISOString(),
        entries: Array.from(this._entries.values()),
      };
      this._store.writeFile(this._cachePath, JSON.stringify(data, null, 2));
    } catch {
      // Persistence failure is non-fatal — cache still works in-memory
    }
  }
}
