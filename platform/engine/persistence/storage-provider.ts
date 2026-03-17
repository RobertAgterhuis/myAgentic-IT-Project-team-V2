// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── StorageProvider Interface (M23-001) ──────────────────────── *
 * Pluggable persistence abstraction for the SDLC platform.       *
 * Implementations: FileStorageProvider (default), SQLiteProvider. *
 * Collections map to domain concepts: sessions, decisions,       *
 * questionnaires, commands, artifacts, audit-events, metrics.    *
 * ─────────────────────────────────────────────────────────────── */

/** A stored document — arbitrary JSON-serializable data with an id. */
export interface Document {
  id: string;
  [key: string]: unknown;
}

/** Filter for list operations. */
export interface Filter {
  /** Match field values exactly. */
  where?: Record<string, unknown>;
  /** Maximum number of results. */
  limit?: number;
  /** Number of results to skip. */
  offset?: number;
  /** Sort field and direction. */
  orderBy?: { field: string; direction: 'asc' | 'desc' };
}

/** Query extends Filter with text search. */
export interface Query extends Filter {
  /** Full-text search term (provider-specific behavior). */
  text?: string;
}

/** A single write operation for transaction batches. */
export interface Operation {
  type: 'write' | 'delete';
  collection: string;
  id: string;
  /** Required for 'write' operations. */
  data?: Document;
}

/** Health status returned by the provider. */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  provider: string;
  /** Latency of a simple read check in milliseconds. */
  latencyMs: number;
  details?: Record<string, unknown>;
}

/** Storage operation metrics for observability. */
export interface StorageMetrics {
  reads: number;
  writes: number;
  deletes: number;
  errors: number;
  /** Read latency samples in ms (most recent, capped). */
  readLatencies: number[];
  /** Write latency samples in ms (most recent, capped). */
  writeLatencies: number[];
}

/**
 * StorageProvider — the pluggable persistence interface.
 *
 * All methods are async to support both file-based and database-backed
 * implementations without forcing callers to know the underlying store.
 */
export interface StorageProvider {
  /** Human-readable provider name (e.g. "file", "sqlite"). */
  readonly name: string;

  // ── Document operations ──────────────────────────────────────

  /** Read a single document by collection + id. Returns null if missing. */
  read(collection: string, id: string): Promise<Document | null>;

  /** Write (create or update) a document. */
  write(collection: string, id: string, data: Document): Promise<void>;

  /** Delete a document. No-op if it doesn't exist. */
  delete(collection: string, id: string): Promise<void>;

  /** List documents in a collection, optionally filtered. */
  list(collection: string, filter?: Filter): Promise<Document[]>;

  // ── Batch / atomic operations ────────────────────────────────

  /** Execute multiple operations atomically (all-or-nothing where supported). */
  transaction(ops: Operation[]): Promise<void>;

  // ── Query ────────────────────────────────────────────────────

  /** Query documents with filtering + optional text search. */
  query(collection: string, query: Query): Promise<Document[]>;

  // ── Lifecycle ────────────────────────────────────────────────

  /** Initialize the provider (create dirs, open DB, run migrations). */
  initialize(): Promise<void>;

  /** Gracefully close the provider (flush, close connections). */
  close(): Promise<void>;

  /** Health check for observability. */
  health(): Promise<HealthStatus>;

  /** Cumulative operation metrics. */
  metrics(): StorageMetrics;
}
