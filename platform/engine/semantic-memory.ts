// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Semantic Memory — Three-Tier Memory Abstraction (I-A4-001)
 *
 * Provides a structured memory store spanning three scopes:
 *
 *   run     — Transient. Scoped to a single agent invocation run.
 *             Cleared explicitly by the caller after each dispatch.
 *             No time-based retention; ephemeral by contract.
 *
 *   project — Medium-horizon. Persists across runs within a project.
 *             Default retention: 30 days. Evicted lazily on read/write.
 *
 *   org     — Long-horizon. Organization-level reusable knowledge.
 *             Default retention: 90 days. Highest signal-to-noise bar.
 *
 * Storage is pluggable via the injected `MemoryStorage` interface so
 * the class works with the existing StorageProvider, an in-memory map
 * for tests, or any custom backend.
 *
 * Acceptance criteria (I-A4-001):
 *   - Three tier scopes defined with distinct retention policies.
 *   - Entries carry TTL metadata and are evicted deterministically.
 *   - Tier byte-size is measurable (supports invocation payload metrics).
 *
 * @module engine/semantic-memory
 */

// ─── Tier definitions ────────────────────────────────────────

/** The three memory scopes. */
export type MemoryTier = 'run' | 'project' | 'org';

/** Retention policy per tier (TTL in milliseconds, 0 = no expiry). */
export const TIER_RETENTION_MS: Record<MemoryTier, number> = {
  run: 0, // transient — caller clears explicitly
  project: 30 * 24 * 60 * 60 * 1000, // 30 days
  org: 90 * 24 * 60 * 60 * 1000, // 90 days
};

// ─── Entry shape ─────────────────────────────────────────────

/** A single persisted memory entry. */
export interface MemoryEntry {
  /** Unique key within the tier. */
  key: string;
  /** Arbitrary string content (serialised JSON, markdown snippet, etc.). */
  content: string;
  /** Unix epoch ms when this entry was last written. */
  writtenAt: number;
  /** Optional topic tag for grouped retrieval. */
  topic?: string;
}

// ─── Storage abstraction ─────────────────────────────────────

/**
 * Minimal storage interface required by SemanticMemoryStore.
 * Decouples the memory implementation from the full StorageProvider.
 */
export interface MemoryStorage {
  /** Write (upsert) an entry. Keyed by tier + "/" + key. */
  set(collection: string, id: string, data: MemoryEntry): Promise<void> | void;
  /** Read a single entry. Returns null if absent. */
  get(collection: string, id: string): Promise<MemoryEntry | null> | MemoryEntry | null;
  /** List all entries in a collection. */
  list(collection: string): Promise<MemoryEntry[]> | MemoryEntry[];
  /** Delete a single entry. */
  delete(collection: string, id: string): Promise<void> | void;
}

// ─── In-memory default implementation ────────────────────────

/**
 * Lightweight in-process storage for `run`-tier memory and testing.
 * Not safe for multi-process deployments.
 */
export class InMemoryStorage implements MemoryStorage {
  private _store: Map<string, Map<string, MemoryEntry>> = new Map();

  private _col(collection: string): Map<string, MemoryEntry> {
    if (!this._store.has(collection)) this._store.set(collection, new Map());
    return this._store.get(collection)!;
  }

  set(collection: string, id: string, data: MemoryEntry): void {
    this._col(collection).set(id, { ...data });
  }

  get(collection: string, id: string): MemoryEntry | null {
    return this._col(collection).get(id) ?? null;
  }

  list(collection: string): MemoryEntry[] {
    return Array.from(this._col(collection).values());
  }

  delete(collection: string, id: string): void {
    this._col(collection).delete(id);
  }
}

// ─── Collection name helper ───────────────────────────────────

/** Maps a tier to a storage collection name. */
function collectionFor(tier: MemoryTier): string {
  return `semantic-memory-${tier}`;
}

// ─── SemanticMemoryStore ─────────────────────────────────────

/**
 * SemanticMemoryStore manages entries across all three memory tiers.
 *
 * Usage:
 *   const mem = new SemanticMemoryStore(storage);
 *   await mem.write('org', 'brand-guide', 'Use sentence case for headings.', { topic: 'brand' });
 *   const entry = await mem.read('org', 'brand-guide');
 *   const metrics = mem.metrics();
 */
export class SemanticMemoryStore {
  private _storage: MemoryStorage;

  constructor(storage: MemoryStorage = new InMemoryStorage()) {
    this._storage = storage;
  }

  // ── Write ────────────────────────────────────────────────────

  /**
   * Write (upsert) a memory entry.
   *
   * @param tier    - `run`, `project`, or `org`
   * @param key     - Unique key within the tier
   * @param content - String content to store
   * @param meta    - Optional { topic } metadata
   */
  async write(
    tier: MemoryTier,
    key: string,
    content: string,
    meta: { topic?: string } = {}
  ): Promise<void> {
    const entry: MemoryEntry = {
      key,
      content,
      writtenAt: Date.now(),
      ...(meta.topic ? { topic: meta.topic } : {}),
    };
    await Promise.resolve(this._storage.set(collectionFor(tier), key, entry));
  }

  // ── Read ─────────────────────────────────────────────────────

  /**
   * Read a memory entry by tier and key.
   * Returns null if absent or if the entry has exceeded its TTL.
   *
   * @param tier - `run`, `project`, or `org`
   * @param key  - Entry key
   * @param now  - Optional override for "current time" (ms). Defaults to Date.now().
   */
  async read(tier: MemoryTier, key: string, now: number = Date.now()): Promise<MemoryEntry | null> {
    const entry = await Promise.resolve(this._storage.get(collectionFor(tier), key));
    if (!entry) return null;
    if (this._isExpired(tier, entry, now)) {
      await Promise.resolve(this._storage.delete(collectionFor(tier), key));
      return null;
    }
    return entry;
  }

  // ── List ─────────────────────────────────────────────────────

  /**
   * List all non-expired entries in a tier.
   * Expired entries are lazily evicted during listing.
   *
   * Entries are returned sorted by key (ascending) for deterministic ordering.
   *
   * @param tier - `run`, `project`, or `org`
   * @param now  - Optional override for "current time" (ms)
   */
  async list(tier: MemoryTier, now: number = Date.now()): Promise<MemoryEntry[]> {
    const all = await Promise.resolve(this._storage.list(collectionFor(tier)));
    const live: MemoryEntry[] = [];
    for (const entry of all) {
      if (this._isExpired(tier, entry, now)) {
        await Promise.resolve(this._storage.delete(collectionFor(tier), entry.key));
      } else {
        live.push(entry);
      }
    }
    // Deterministic ordering: key ascending
    live.sort((a, b) => a.key.localeCompare(b.key));
    return live;
  }

  // ── Evict ────────────────────────────────────────────────────

  /**
   * Evict all expired entries in a tier.
   * Returns the number of entries removed.
   *
   * @param tier - `run`, `project`, or `org`
   * @param now  - Optional override for "current time" (ms)
   */
  async evict(tier: MemoryTier, now: number = Date.now()): Promise<number> {
    const all = await Promise.resolve(this._storage.list(collectionFor(tier)));
    let count = 0;
    for (const entry of all) {
      if (this._isExpired(tier, entry, now)) {
        await Promise.resolve(this._storage.delete(collectionFor(tier), entry.key));
        count++;
      }
    }
    return count;
  }

  // ── Clear ────────────────────────────────────────────────────

  /**
   * Clear all entries in a tier (primarily used for `run` tier cleanup
   * after each dispatch cycle).
   *
   * @param tier - `run`, `project`, or `org`
   */
  async clear(tier: MemoryTier): Promise<void> {
    const all = await Promise.resolve(this._storage.list(collectionFor(tier)));
    for (const entry of all) {
      await Promise.resolve(this._storage.delete(collectionFor(tier), entry.key));
    }
  }

  // ── Metrics ──────────────────────────────────────────────────

  /**
   * Compute tier-level size metrics.
   * Used to measure invocation payload impact (acceptance criterion).
   *
   * @param now - Optional override for "current time" (ms)
   * @returns Object with per-tier byte counts and entry counts.
   */
  async metrics(now: number = Date.now()): Promise<MemoryMetrics> {
    const tiers: MemoryTier[] = ['run', 'project', 'org'];
    const result: MemoryMetrics = {
      run: { entries: 0, bytes: 0 },
      project: { entries: 0, bytes: 0 },
      org: { entries: 0, bytes: 0 },
      totalBytes: 0,
    };

    for (const tier of tiers) {
      const entries = await this.list(tier, now);
      const bytes = entries.reduce((sum, e) => sum + byteLength(e.content), 0);
      result[tier] = { entries: entries.length, bytes };
      result.totalBytes += bytes;
    }

    return result;
  }

  // ── Private helpers ───────────────────────────────────────────

  private _isExpired(tier: MemoryTier, entry: MemoryEntry, now: number): boolean {
    const ttl = TIER_RETENTION_MS[tier];
    if (ttl === 0) return false; // run tier is never auto-expired
    return now - entry.writtenAt > ttl;
  }
}

// ─── Metrics type ─────────────────────────────────────────────

export interface TierMetrics {
  entries: number;
  bytes: number;
}

export interface MemoryMetrics {
  run: TierMetrics;
  project: TierMetrics;
  org: TierMetrics;
  totalBytes: number;
}

// ─── Utilities ────────────────────────────────────────────────

/** Count UTF-8 bytes for a string (accurate proxy for payload size). */
export function byteLength(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c < 0xd800 || c >= 0xe000) n += 3;
    else {
      // surrogate pair
      i++;
      n += 4;
    }
  }
  return n;
}
