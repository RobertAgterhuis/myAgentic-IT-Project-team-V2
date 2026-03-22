// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'fs';
import path from 'path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { PersistentQueue } from '../../../platform/engine/jobs';
import type { StorageProvider } from '../../../platform/engine/persistence';
import * as RS from '../route-schemas';

function ensureAdmin(request: FastifyRequest, reply: FastifyReply, ctx: ServerContext): boolean {
  if (!ctx._authMiddleware) return true;

  const user = (request.raw as FastifyRequest['raw'] & { user?: { role?: string } }).user;
  if (!user) {
    reply.code(401).send(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return false;
  }

  const role = user.role || 'viewer';
  if (role !== 'admin') {
    reply.code(403).send(errorResponse('FORBIDDEN', 'Admin role required'));
    return false;
  }

  return true;
}

function ensureOperatorOrAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  ctx: ServerContext
): boolean {
  if (!ctx._authMiddleware) return true;

  const user = (request.raw as FastifyRequest['raw'] & { user?: { role?: string } }).user;
  if (!user) {
    reply.code(401).send(errorResponse('UNAUTHORIZED', 'Authentication required'));
    return false;
  }

  const role = user.role || 'viewer';
  if (role !== 'operator' && role !== 'admin') {
    reply.code(403).send(errorResponse('FORBIDDEN', 'Operator or admin role required'));
    return false;
  }

  return true;
}

function isValidCollectionName(name: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(name);
}

function resolveSafePath(projectRoot: string, inputPath: string): string | null {
  const resolved = path.resolve(projectRoot, inputPath);
  const normalizedRoot = path.resolve(projectRoot);
  const rel = path.relative(normalizedRoot, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return resolved;
}

function getQueue(ctx: ServerContext): PersistentQueue {
  const storageProvider = ctx.getStorageProvider() as StorageProvider | null;
  if (!storageProvider) throw new Error('StorageProvider not initialised');
  return new PersistentQueue(storageProvider);
}

async function runIndexJob(
  ctx: ServerContext,
  collection: string,
  paths: string[],
  jobId: string
): Promise<void> {
  const queue = getQueue(ctx);

  const indexer = ctx._ragIndexer;
  const store = ctx._ragStore;
  if (!indexer || !store) throw new Error('RAG services not initialised');

  const started = Date.now();
  let chunksIndexed = 0;
  let filesSkipped = 0;

  store.ensureCollection({
    id: collection,
    name: collection,
    description: '',
    created_at: new Date().toISOString(),
  });

  for (const p of paths) {
    const abs = resolveSafePath(ctx.PROJECT_ROOT, p);
    if (!abs) throw new Error(`Invalid path outside project root: ${p}`);

    if (!fs.existsSync(abs)) continue;

    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      const stats = await indexer.syncDirectory(collection, abs, { incremental: true });
      chunksIndexed += stats.chunksInserted;
      filesSkipped += stats.filesSkipped;
    } else if (stat.isFile()) {
      const stats = await indexer.indexFile(collection, abs);
      chunksIndexed += stats.chunksInserted;
      filesSkipped += stats.filesSkipped;
    }
  }

  const durationMs = Date.now() - started;

  await queue.complete(jobId, {
    collection,
    chunks_indexed: chunksIndexed,
    files_skipped: filesSkipped,
    duration_ms: durationMs,
  });

  ctx.sseNotify('rag_index_completed', {
    type: 'rag_index_completed',
    job_id: jobId,
    collection,
    chunks_indexed: chunksIndexed,
    files_skipped: filesSkipped,
    duration_ms: durationMs,
    timestamp: new Date().toISOString(),
  });
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  app.post<{ Body: { collection: string; paths: string[] } }>(
    '/api/v1/rag/index',
    { schema: RS.ragIndexStart },
    async (request, reply) => {
      if (!ensureAdmin(request, reply, ctx)) return;

      try {
        const body = request.body;
        const collection = String(body.collection || '').trim();
        const inputPaths = Array.isArray(body.paths)
          ? body.paths.map((v) => String(v).trim()).filter(Boolean)
          : [];

        if (!isValidCollectionName(collection)) {
          return reply
            .code(400)
            .send(errorResponse('INVALID_INPUT', 'Invalid collection name format'));
        }

        if (inputPaths.length === 0) {
          return reply
            .code(400)
            .send(errorResponse('INVALID_INPUT', 'At least one path is required'));
        }

        const queue = getQueue(ctx);
        const job = await queue.enqueue({
          type: 'artifact-registration',
          payload: {
            operation: 'rag-index',
            collection,
            paths: inputPaths,
          },
          priority: 50,
          retryCount: 0,
          maxRetries: 1,
        });

        setImmediate(() => {
          void runIndexJob(ctx, collection, inputPaths, job.id).catch(async (err) => {
            const message = err instanceof Error ? err.message : String(err);
            try {
              await queue.fail(job.id, { message, severity: 'fatal' });
            } catch {
              // noop: best-effort state update
            }

            ctx.sseNotify('rag_index_failed', {
              type: 'rag_index_failed',
              job_id: job.id,
              collection,
              error: message,
              timestamp: new Date().toISOString(),
            });
          });
        });

        return reply.send({ ok: true, jobId: job.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.code(500).send(errorResponse('JOB_CREATE_ERROR', message));
      }
    }
  );

  app.post<{ Body: { collection: string; query: string; topK?: number; threshold?: number } }>(
    '/api/v1/rag/query',
    { schema: RS.ragQuery },
    async (request, reply) => {
      if (!ensureOperatorOrAdmin(request, reply, ctx)) return;

      try {
        const store = ctx._ragStore;
        const embeddingProvider = ctx._embeddingProvider;
        if (!store || !embeddingProvider)
          return reply
            .code(500)
            .send(errorResponse('INTERNAL_ERROR', 'RAG services not initialised'));

        const body = request.body;
        const collection = String(body.collection || '').trim();
        const queryText = String(body.query || '').trim();
        const topK = Number.isFinite(body.topK) ? Number(body.topK) : 5;
        const threshold = Number.isFinite(body.threshold) ? Number(body.threshold) : 0;

        if (!isValidCollectionName(collection)) {
          return reply
            .code(400)
            .send(errorResponse('INVALID_INPUT', 'Invalid collection name format'));
        }

        if (!queryText) {
          return reply.code(400).send(errorResponse('INVALID_INPUT', 'Query is required'));
        }

        if (topK < 1 || topK > 50) {
          return reply
            .code(400)
            .send(errorResponse('INVALID_INPUT', 'topK must be between 1 and 50'));
        }

        if (threshold < 0 || threshold > 1) {
          return reply
            .code(400)
            .send(errorResponse('INVALID_INPUT', 'threshold must be between 0 and 1'));
        }

        const queryVector = await embeddingProvider.embedText(queryText);
        const results = await store.query(collection, queryVector, topK, threshold);

        return reply.send({
          ok: true,
          chunks: results.map((r) => ({
            text: r.chunk.chunk_text,
            source_path: path.isAbsolute(r.chunk.source_path)
              ? path.relative(ctx.PROJECT_ROOT, r.chunk.source_path).replace(/\\/g, '/')
              : r.chunk.source_path,
            start_line: Number.isFinite(r.chunk.start_line) ? r.chunk.start_line : null,
            collection,
            score: r.score,
            metadata: {
              start_line: r.chunk.start_line,
              collection,
            },
          })),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return reply.code(500).send(errorResponse('RAG_QUERY_ERROR', message));
      }
    }
  );
}
