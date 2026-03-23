// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * RagIndexer — walks the file system, chunks documents, embeds them, and
 * persists everything to a RagStore collection.
 *
 * @module services/rag/rag-indexer
 */

import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'crypto';

import type { RagStore } from './rag-store.js';
import type { EmbeddingProvider } from './embedding-provider.js';
import type { TextChunker } from './text-chunker.js';
import type { RagChunk } from './types.js';

/* ── Helpers ──────────────────────────────────────────────────── */

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Walk `dir` recursively and yield absolute file paths. */
function* walkDir(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

/* ── RagIndexer ───────────────────────────────────────────────── */

export type IndexStats = {
  filesProcessed: number;
  chunksInserted: number;
  filesSkipped: number;
};

export type IndexOptions = {
  /**
   * Optional predicate to filter which files are indexed.
   * Receives an absolute path; return true to include.
   * Defaults to: include .md, .txt, .ts, .js files.
   */
  fileFilter?: (filePath: string) => boolean;
};

export type SyncOptions = IndexOptions & {
  /**
   * When true (default), skip files whose content hash has not changed since
   * the last indexing run. Set false to force a full re-embed.
   */
  incremental?: boolean;
};

const DEFAULT_FILTER = (p: string): boolean =>
  ['.md', '.txt', '.ts', '.js', '.json'].some((ext) => p.endsWith(ext));

export class RagIndexer {
  constructor(
    private readonly store: RagStore,
    private readonly embedder: EmbeddingProvider,
    private readonly chunker: TextChunker
  ) {}

  /**
   * Index all matching files under `dirPath` into `collectionId`.
   */
  async indexDirectory(
    collectionId: string,
    dirPath: string,
    opts: IndexOptions = {}
  ): Promise<IndexStats> {
    const filePaths = [...walkDir(dirPath)];
    return this.indexFiles(collectionId, filePaths, opts);
  }

  /**
   * Index a single file into `collectionId`.
   */
  async indexFile(collectionId: string, filePath: string): Promise<IndexStats> {
    return this.indexFiles(collectionId, [filePath]);
  }

  /**
   * Index an explicit list of file paths into `collectionId`.
   */
  async indexFiles(
    collectionId: string,
    filePaths: string[],
    opts: IndexOptions = {}
  ): Promise<IndexStats> {
    const filter = opts.fileFilter ?? DEFAULT_FILTER;
    const stats: IndexStats = { filesProcessed: 0, chunksInserted: 0, filesSkipped: 0 };

    for (const filePath of filePaths) {
      if (!filter(filePath)) {
        stats.filesSkipped++;
        continue;
      }

      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        stats.filesSkipped++;
        continue;
      }

      const segments = this.chunker.chunk(content, filePath);
      if (segments.length === 0) {
        stats.filesSkipped++;
        continue;
      }

      const chunks: RagChunk[] = await Promise.all(
        segments.map(async (seg) => {
          const embedding = await this.embedder.embedText(seg.text);
          return {
            id: randomUUID(),
            collection_id: collectionId,
            source_path: filePath,
            chunk_text: seg.text,
            embedding,
            start_line: seg.startLine,
            chunk_hash: sha256(`${filePath}::${seg.startLine}::${seg.text}`),
          };
        })
      );

      await this.store.upsert(collectionId, chunks);
      stats.chunksInserted += chunks.length;
      stats.filesProcessed++;
    }

    return stats;
  }

  /**
   * Incrementally sync a directory: index changed files and remove chunks
   * for files that no longer exist on disk.
   *
   * - Files whose SHA-256 content hash is unchanged are skipped (0 re-embeds).
   * - Modified files are fully re-indexed (old chunks replaced).
   * - Files present in the DB but absent from the directory are pruned.
   */
  async syncDirectory(
    collectionId: string,
    dirPath: string,
    opts: SyncOptions = {}
  ): Promise<IndexStats> {
    const incremental = opts.incremental ?? true;
    const filter = opts.fileFilter ?? DEFAULT_FILTER;
    const stats: IndexStats = { filesProcessed: 0, chunksInserted: 0, filesSkipped: 0 };

    const diskFiles = new Set([...walkDir(dirPath)].filter(filter));

    /* ── Prune deleted files ──────────────────────────────────── */
    const indexedFiles = this.store.listIndexedFiles(collectionId);
    for (const indexed of indexedFiles) {
      if (!diskFiles.has(indexed)) {
        this.store.deleteFile(collectionId, indexed);
      }
    }

    /* ── Index / skip changed files ───────────────────────────── */
    for (const filePath of diskFiles) {
      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        stats.filesSkipped++;
        continue;
      }

      const fileHash = sha256(content);

      if (incremental) {
        const stored = this.store.getFileHash(collectionId, filePath);
        if (stored === fileHash) {
          /* Content unchanged — skip entirely (zero re-embeds). */
          stats.filesSkipped++;
          continue;
        }
        /* Changed or new file — remove stale chunks before re-indexing. */
        if (stored !== null) {
          this.store.deleteFile(collectionId, filePath);
        }
      }

      const segments = this.chunker.chunk(content, filePath);
      if (segments.length === 0) {
        stats.filesSkipped++;
        continue;
      }

      const chunks: RagChunk[] = await Promise.all(
        segments.map(async (seg) => {
          const embedding = await this.embedder.embedText(seg.text);
          return {
            id: randomUUID(),
            collection_id: collectionId,
            source_path: filePath,
            chunk_text: seg.text,
            embedding,
            start_line: seg.startLine,
            chunk_hash: sha256(`${filePath}::${seg.startLine}::${seg.text}`),
          };
        })
      );

      await this.store.upsert(collectionId, chunks);
      this.store.setFileHash(collectionId, filePath, fileHash);
      stats.filesProcessed++;
      stats.chunksInserted += chunks.length;
    }

    return stats;
  }
}
