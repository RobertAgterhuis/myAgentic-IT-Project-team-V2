// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * RAG (Retrieval-Augmented Generation) domain types and schema migrations.
 *
 * SQLite tables store document metadata. Embedding vectors live in LanceDB.
 *
 * @module services/rag/types
 */

/* ── Domain interfaces ────────────────────────────────────────── */

/** A named collection of indexed documents. */
export interface RagCollection {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

/** A single text chunk extracted from a source document. */
export interface RagChunk {
  id: string;
  collection_id: string;
  source_path: string;
  chunk_text: string;
  /** Populated after embedding retrieval — not persisted in SQLite. */
  embedding?: number[] | null;
  start_line: number | null;
  chunk_hash: string;
}

/** A retrieved chunk paired with its similarity score. */
export interface QueryResult {
  chunk: RagChunk;
  score: number;
}

/** Tracks the SHA-256 hash of a fully-indexed source file. */
export interface FileIndexEntry {
  collection_id: string;
  source_path: string;
  file_hash: string;
  indexed_at: string;
}

/* ── Schema migration SQL ─────────────────────────────────────── */

/**
 * Inline migration statements executed by RagStore on startup.
 * Follows the same pattern as AuthManager in auth.ts — idempotent DDL.
 */
export const RAG_MIGRATIONS = {
  createCollections: `
    CREATE TABLE IF NOT EXISTS rag_collections (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL,
      UNIQUE (name)
    )
  `,
  createChunks: `
    CREATE TABLE IF NOT EXISTS rag_chunks (
      id             TEXT PRIMARY KEY,
      collection_id  TEXT NOT NULL
                       REFERENCES rag_collections(id) ON DELETE CASCADE,
      source_path    TEXT NOT NULL,
      chunk_text     TEXT NOT NULL,
      start_line     INTEGER,
      chunk_hash     TEXT NOT NULL,
      UNIQUE (collection_id, chunk_hash)
    )
  `,
} as const;

/** Migration for the file-level deduplication index (RAG-1.2.3). */
export const RAG_INCREMENTAL_MIGRATION = `
  CREATE TABLE IF NOT EXISTS rag_file_index (
    collection_id  TEXT NOT NULL,
    source_path    TEXT NOT NULL,
    file_hash      TEXT NOT NULL,
    indexed_at     TEXT NOT NULL,
    PRIMARY KEY (collection_id, source_path)
  )
`;
