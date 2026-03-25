// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * RagStore — persists collection metadata + chunk metadata in SQLite and
 * embedding vectors in LanceDB (Apache Arrow columnar vector store).
 *
 * SQLite schema: rag_collections, rag_chunks  (see RAG_MIGRATIONS)
 * LanceDB table: rag_<collectionId>           (one table per collection)
 *
 * @module services/rag/rag-store
 */

import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import * as lancedb from '@lancedb/lancedb';
import type { Connection } from '@lancedb/lancedb';
import {
  applySqliteConcurrencyPragmas,
  resolveSqliteConcurrencyConfig,
} from '../../../../platform/engine/sqlite-concurrency';

import { RAG_MIGRATIONS, type RagCollection, type RagChunk, type QueryResult } from './types.js';
import { RAG_INCREMENTAL_MIGRATION, type FileIndexEntry } from './types.js';

/* ── score helper ─────────────────────────────────────────────── */

/** Convert L2 distance → similarity score in (0, 1]. */
function distanceToScore(distance: number): number {
  return 1 / (1 + distance);
}

/* ── RagStore ─────────────────────────────────────────────────── */

export type VectorStoreStrategy = 'single-table' | 'writer-sharded';

export interface RagStoreOptions {
  vectorStrategy?: VectorStoreStrategy;
  writerId?: string;
}

export class RagStore {
  private readonly db: DatabaseType;
  private readonly lanceUri: string;
  private readonly vectorStrategy: VectorStoreStrategy;
  private readonly writerId: string;
  private lance: Connection | null = null;

  /**
   * @param dbPath   Path to the SQLite database file (use `:memory:` for tests).
   * @param lanceUri Directory path where LanceDB stores its files.
   */
  constructor(dbPath: string, lanceUri: string, options: RagStoreOptions = {}) {
    this.db = new Database(dbPath);
    applySqliteConcurrencyPragmas(this.db, resolveSqliteConcurrencyConfig());
    this.lanceUri = lanceUri;
    this.vectorStrategy =
      options.vectorStrategy === 'writer-sharded' ? 'writer-sharded' : 'single-table';
    this.writerId = this._sanitizeIdentifier(options.writerId || 'default');
    this._runMigrations();
  }

  /* ── internal helpers ─────────────────────────────────────────── */

  private _runMigrations(): void {
    this.db.exec(RAG_MIGRATIONS.createCollections);
    this.db.exec(RAG_MIGRATIONS.createChunks);
    this.db.exec(RAG_INCREMENTAL_MIGRATION);
  }

  private async _db(): Promise<Connection> {
    if (!this.lance) {
      this.lance = await lancedb.connect(this.lanceUri);
    }
    return this.lance;
  }

  private _sanitizeIdentifier(value: string): string {
    const normalized = value.replace(/[^a-z0-9]/gi, '_').replace(/^_+|_+$/g, '');
    return normalized || 'default';
  }

  private _tablePrefix(collectionId: string): string {
    return `rag_${this._sanitizeIdentifier(collectionId)}`;
  }

  /** Sanitise a collection id to a safe LanceDB table name. */
  private _tableName(collectionId: string): string {
    const prefix = this._tablePrefix(collectionId);
    if (this.vectorStrategy === 'single-table') {
      return prefix;
    }
    return `${prefix}__${this.writerId}`;
  }

  private async _vectorTableNames(collectionId: string, lance: Connection): Promise<string[]> {
    const existing = await lance.tableNames();
    const prefix = this._tablePrefix(collectionId);

    if (this.vectorStrategy === 'single-table') {
      return existing.includes(prefix) ? [prefix] : [];
    }

    return existing.filter(
      (tableName) => tableName === prefix || tableName.startsWith(`${prefix}__`)
    );
  }

  private async _deleteHashesFromTables(
    lance: Connection,
    tableNames: string[],
    sourceHashes: string[]
  ): Promise<void> {
    if (tableNames.length === 0 || sourceHashes.length === 0) return;

    const hashList = sourceHashes.map((hash) => `'${hash.replace(/'/g, "''")}'`).join(',');
    await Promise.all(
      tableNames.map(async (tableName) => {
        const table = await lance.openTable(tableName);
        await table.delete(`chunk_hash IN (${hashList})`);
      })
    );
  }

  /* ── public API ───────────────────────────────────────────────── */

  /**
   * Register or update a collection record in SQLite.
   * Idempotent — re-running with the same `name` updates the description.
   */
  ensureCollection(collection: RagCollection): void {
    this.db
      .prepare(
        `INSERT INTO rag_collections (id, name, description, created_at)
         VALUES (@id, @name, @description, @created_at)
         ON CONFLICT(name) DO UPDATE SET description = excluded.description`
      )
      .run(collection);
  }

  /**
   * Upsert chunks into SQLite (metadata) and LanceDB (vectors).
   * Chunks without an `embedding` are stored only in SQLite.
   */
  async upsert(collectionId: string, chunks: RagChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    /* ── SQLite upsert ───────────────────────────────────────────── */
    const insertChunk = this.db.prepare(`
      INSERT INTO rag_chunks
        (id, collection_id, source_path, chunk_text, start_line, chunk_hash)
      VALUES
        (@id, @collection_id, @source_path, @chunk_text, @start_line, @chunk_hash)
      ON CONFLICT(collection_id, chunk_hash) DO UPDATE SET
        source_path = excluded.source_path,
        chunk_text  = excluded.chunk_text,
        start_line  = excluded.start_line
    `);

    const doUpsert = this.db.transaction((rows: RagChunk[]) => {
      for (const c of rows) {
        insertChunk.run({
          id: c.id ?? randomUUID(),
          collection_id: c.collection_id,
          source_path: c.source_path,
          chunk_text: c.chunk_text,
          start_line: c.start_line ?? null,
          chunk_hash: c.chunk_hash,
        });
      }
    });
    doUpsert(chunks);

    /* ── LanceDB upsert ──────────────────────────────────────────── */
    const withVectors = chunks.filter((c) => Array.isArray(c.embedding) && c.embedding.length > 0);
    if (withVectors.length === 0) return;

    const lance = await this._db();
    const tableName = this._tableName(collectionId);
    const rows = withVectors.map((c) => ({
      id: c.id ?? c.chunk_hash,
      chunk_hash: c.chunk_hash,
      vector: c.embedding as number[],
    }));

    const vectorTables = await this._vectorTableNames(collectionId, lance);
    await this._deleteHashesFromTables(
      lance,
      vectorTables,
      rows.map((row) => row.chunk_hash)
    );

    const existing = await lance.tableNames();
    if (existing.includes(tableName)) {
      const table = await lance.openTable(tableName);
      await table.add(rows);
    } else {
      await lance.createTable(tableName, rows);
    }
  }

  /**
   * Query a collection for the top-K chunks most similar to `queryVector`.
   *
   * @param collectionId  Collection to search.
   * @param queryVector   Embedding of the query.
   * @param topK          Maximum number of results.
   * @param threshold     Minimum similarity score (0–1). Defaults to 0.
   */
  async query(
    collectionId: string,
    queryVector: number[],
    topK: number,
    threshold = 0
  ): Promise<QueryResult[]> {
    const lance = await this._db();
    const tableNames = await this._vectorTableNames(collectionId, lance);
    if (tableNames.length === 0) return [];

    const rawResultBatches = await Promise.all(
      tableNames.map(async (tableName) => {
        const table = await lance.openTable(tableName);
        return table.search(queryVector).limit(topK).toArray();
      })
    );

    const getChunk = this.db.prepare<[string, string], RagChunk>(
      'SELECT id, collection_id, source_path, chunk_text, start_line, chunk_hash FROM rag_chunks WHERE chunk_hash = ? AND collection_id = ?'
    );

    const bestByHash = new Map<string, number>();
    for (const rawResults of rawResultBatches) {
      for (const result of rawResults) {
        const chunkHash = String(result.chunk_hash || '');
        if (!chunkHash) continue;

        const score = distanceToScore(result._distance ?? 0);
        if (score < threshold) continue;

        const current = bestByHash.get(chunkHash);
        if (current === undefined || score > current) {
          bestByHash.set(chunkHash, score);
        }
      }
    }

    const results: QueryResult[] = [];
    for (const [chunkHash, score] of bestByHash.entries()) {
      const chunkRow = getChunk.get(chunkHash, collectionId);
      if (!chunkRow) continue;
      results.push({ chunk: chunkRow, score });
    }

    return results.sort((left, right) => right.score - left.score).slice(0, topK);
  }

  /**
   * Remove chunks by their hashes from both SQLite and LanceDB.
   */
  async delete(collectionId: string, sourceHashes: string[]): Promise<void> {
    if (sourceHashes.length === 0) return;

    const placeholders = sourceHashes.map(() => '?').join(',');
    this.db
      .prepare(`DELETE FROM rag_chunks WHERE collection_id = ? AND chunk_hash IN (${placeholders})`)
      .run(collectionId, ...sourceHashes);

    /* LanceDB vector cleanup */
    const lance = await this._db();
    const tableNames = await this._vectorTableNames(collectionId, lance);
    await this._deleteHashesFromTables(lance, tableNames, sourceHashes);
  }

  /** Return all registered collections ordered by creation time. */
  listCollections(): RagCollection[] {
    return this.db
      .prepare(
        'SELECT id, name, description, created_at FROM rag_collections ORDER BY created_at ASC'
      )
      .all() as RagCollection[];
  }

  close(): void {
    this.db.close();
    this.lance = null;
  }

  /* ── File-level index helpers (RAG-1.2.3) ─────────────────── */

  /** Return the stored file hash for a given source path, or null. */
  getFileHash(collectionId: string, sourcePath: string): string | null {
    const row = this.db
      .prepare<
        [string, string],
        { file_hash: string }
      >('SELECT file_hash FROM rag_file_index WHERE collection_id = ? AND source_path = ?')
      .get(collectionId, sourcePath);
    return row?.file_hash ?? null;
  }

  /** Upsert a file hash (called after successfully indexing a file). */
  setFileHash(collectionId: string, sourcePath: string, fileHash: string): void {
    this.db
      .prepare(
        `INSERT INTO rag_file_index (collection_id, source_path, file_hash, indexed_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(collection_id, source_path) DO UPDATE SET
           file_hash  = excluded.file_hash,
           indexed_at = excluded.indexed_at`
      )
      .run(collectionId, sourcePath, fileHash, new Date().toISOString());
  }

  /** Remove all chunks and the file-index entry for a source path. */
  deleteFile(collectionId: string, sourcePath: string): void {
    this.db
      .prepare('DELETE FROM rag_chunks WHERE collection_id = ? AND source_path = ?')
      .run(collectionId, sourcePath);
    this.db
      .prepare('DELETE FROM rag_file_index WHERE collection_id = ? AND source_path = ?')
      .run(collectionId, sourcePath);
  }

  /** List all source paths that have been indexed for a collection. */
  listIndexedFiles(collectionId: string): string[] {
    return (
      this.db
        .prepare<
          [string],
          FileIndexEntry
        >('SELECT source_path FROM rag_file_index WHERE collection_id = ?')
        .all(collectionId) as FileIndexEntry[]
    ).map((r) => r.source_path);
  }

  /** Return indexed file count and most recent index timestamp for a collection. */
  getCollectionFreshnessStats(collectionId: string): {
    indexedFiles: number;
    lastIndexedAt: string | null;
  } {
    const row = this.db
      .prepare<
        [string],
        {
          indexed_files: number;
          last_indexed_at: string | null;
        }
      >(
        `SELECT
           COUNT(*) AS indexed_files,
           MAX(indexed_at) AS last_indexed_at
         FROM rag_file_index
         WHERE collection_id = ?`
      )
      .get(collectionId);

    return {
      indexedFiles: Number(row?.indexed_files || 0),
      lastIndexedAt: row?.last_indexed_at || null,
    };
  }
}
