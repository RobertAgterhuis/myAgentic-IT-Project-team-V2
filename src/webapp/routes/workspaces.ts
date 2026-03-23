// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Workspace API routes — /api/workspaces/* (M25-006)
 *
 * Endpoints:
 *   GET    /api/workspaces                          — List workspaces
 *   POST   /api/workspaces                          — Create workspace
 *   GET    /api/workspaces/:id                      — Workspace detail + projects
 *   PUT    /api/workspaces/:id                      — Update workspace
 *   DELETE /api/workspaces/:id                      — Delete workspace
 *   POST   /api/workspaces/:id/repositories         — Add repository
 *   DELETE /api/workspaces/:id/repositories/:repoId — Remove repository
 *   GET    /api/workspaces/:id/projects              — List projects
 *   POST   /api/workspaces/:id/projects              — Create project
 *
 * @module routes/workspaces
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import fs from 'node:fs';
import path from 'node:path';
import type { StorageProvider } from '../../../platform/engine/persistence';
import { PersistentQueue } from '../../../platform/engine/jobs';
import {
  WorkspaceManager,
  WorkspaceNotFoundError,
  ProjectNotFoundError,
  RepositoryNotFoundError,
  DuplicateError,
  ValidationError,
} from '../../../platform/engine/workspace';
import * as RS from '../route-schemas';
import { resolveWorkspaceScopedCollectionId } from '../services/rag-grounding-service';

interface WorkspaceCtx {
  getStorageProvider?: () => StorageProvider | null;
  STORAGE_PROVIDER?: StorageProvider | null;
}

function getManager(ctx: WorkspaceCtx): WorkspaceManager | null {
  const provider = ctx.getStorageProvider
    ? ctx.getStorageProvider()
    : (ctx.STORAGE_PROVIDER ?? null);
  if (!provider) return null;
  return new WorkspaceManager(provider);
}

function handleDomainError(err: unknown, reply: FastifyReply): FastifyReply {
  if (
    err instanceof WorkspaceNotFoundError ||
    err instanceof ProjectNotFoundError ||
    err instanceof RepositoryNotFoundError
  ) {
    return reply.code(404).send(errorResponse('NOT_FOUND', (err as Error).message));
  }
  if (err instanceof DuplicateError) {
    return reply.code(409).send(errorResponse('DUPLICATE', (err as Error).message));
  }
  if (err instanceof ValidationError) {
    return reply.code(400).send(errorResponse('VALIDATION', (err as Error).message));
  }
  const message = err instanceof Error ? err.message : String(err);
  return reply.code(500).send(errorResponse('INTERNAL', message));
}

function getQueue(ctx: ServerContext): PersistentQueue | null {
  const provider = ctx.getStorageProvider();
  if (!provider) return null;
  return new PersistentQueue(provider);
}

function resolveRepositoryPath(
  projectRoot: string,
  repo: { provider?: string; url?: string }
): string | null {
  if (repo.provider !== 'local') return null;
  const raw = String(repo.url || '').trim();
  if (!raw) return null;

  const abs = path.isAbsolute(raw) ? raw : path.resolve(projectRoot, raw);
  const rel = path.relative(projectRoot, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  if (!fs.existsSync(abs)) return null;
  return abs;
}

function enqueueWorkspaceCodebaseIndex(
  ctx: ServerContext,
  workspaceId: string,
  indexPath: string,
  trigger: 'workspace_created' | 'repository_added'
): void {
  const queue = getQueue(ctx);
  const indexer = ctx._ragIndexer;
  const store = ctx._ragStore;
  if (!queue || !indexer || !store) return;

  const collectionId = resolveWorkspaceScopedCollectionId(workspaceId, 'codebase');

  void queue
    .enqueue({
      type: 'artifact-registration',
      payload: {
        operation: 'workspace-rag-index',
        trigger,
        workspaceId,
        collection: collectionId,
        path: path.relative(ctx.PROJECT_ROOT, indexPath).replace(/\\/g, '/'),
      },
      priority: 50,
      retryCount: 0,
      maxRetries: 1,
    })
    .then((job) => {
      setImmediate(() => {
        void (async () => {
          try {
            store.ensureCollection({
              id: collectionId,
              name: collectionId,
              description: `Workspace-scoped codebase index for ${workspaceId}`,
              created_at: new Date().toISOString(),
            });

            const stat = fs.statSync(indexPath);
            const result = stat.isDirectory()
              ? await indexer.syncDirectory(collectionId, indexPath, { incremental: true })
              : await indexer.indexFile(collectionId, indexPath);

            await queue.complete(job.id, {
              workspace_id: workspaceId,
              collection: collectionId,
              files_processed: result.filesProcessed,
              chunks_indexed: result.chunksInserted,
              files_skipped: result.filesSkipped,
              trigger,
            });

            ctx.sseNotify('rag_index_completed', {
              type: 'rag_index_completed',
              job_id: job.id,
              collection: collectionId,
              workspace_id: workspaceId,
              trigger,
              chunks_indexed: result.chunksInserted,
              files_skipped: result.filesSkipped,
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            await queue.fail(job.id, { message, severity: 'error' });
            ctx.sseNotify('rag_index_failed', {
              type: 'rag_index_failed',
              job_id: job.id,
              collection: collectionId,
              workspace_id: workspaceId,
              trigger,
              error: message,
              timestamp: new Date().toISOString(),
            });
          }
        })();
      });
    })
    .catch(() => {
      /* best effort only */
    });
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const wCtx = ctx as unknown as WorkspaceCtx;

  // ── GET /api/workspaces ──────────────────────────────────

  app.get('/api/workspaces', { schema: { tags: ['workspaces'] } }, async (_request, reply) => {
    const mgr = getManager(wCtx);
    if (!mgr)
      return reply.code(503).send(errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
    try {
      const workspaces = await mgr.listWorkspaces();
      return reply.send({ ok: true, count: workspaces.length, workspaces });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ── POST /api/workspaces ─────────────────────────────────

  app.post('/api/workspaces', { schema: RS.workspaceCreate }, async (request, reply) => {
    const mgr = getManager(wCtx);
    if (!mgr)
      return reply.code(503).send(errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
    try {
      const body = request.body as { id?: string; name?: string; owner?: string };
      const workspace = await mgr.createWorkspace({
        id: String(body.id),
        name: String(body.name),
        owner: String(body.owner),
      });

      const defaultCodebasePath = path.join(ctx.PROJECT_ROOT, 'src');
      if (fs.existsSync(defaultCodebasePath)) {
        enqueueWorkspaceCodebaseIndex(ctx, workspace.id, defaultCodebasePath, 'workspace_created');
      }

      return reply.code(201).send({ ok: true, workspace });
    } catch (err) {
      return handleDomainError(err, reply);
    }
  });

  // ── GET /api/workspaces/:id ──────────────────────────────

  app.get<{ Params: { id: string } }>(
    '/api/workspaces/:id',
    { schema: { tags: ['workspaces'] } },
    async (request, reply) => {
      const mgr = getManager(wCtx);
      if (!mgr)
        return reply.code(503).send(errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
      const id = decodeURIComponent(request.params.id);
      if (!id) return reply.code(400).send(errorResponse('MISSING_ID', 'Workspace ID required'));
      try {
        const workspace = await mgr.getWorkspace(id);
        const projects = await mgr.listProjects(id);
        return reply.send({ ok: true, workspace, projects });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    }
  );

  // ── PUT /api/workspaces/:id ──────────────────────────────

  app.put<{ Params: { id: string } }>(
    '/api/workspaces/:id',
    { schema: RS.workspaceUpdate },
    async (request, reply) => {
      const mgr = getManager(wCtx);
      if (!mgr)
        return reply.code(503).send(errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
      const id = decodeURIComponent(request.params.id);
      if (!id) return reply.code(400).send(errorResponse('MISSING_ID', 'Workspace ID required'));
      try {
        const body = request.body as { name?: string; owner?: string };
        const workspace = await mgr.updateWorkspace(id, body);
        return reply.send({ ok: true, workspace });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    }
  );

  // ── DELETE /api/workspaces/:id ───────────────────────────

  app.delete<{ Params: { id: string } }>(
    '/api/workspaces/:id',
    {
      schema: {
        tags: ['workspaces'],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const mgr = getManager(wCtx);
      if (!mgr)
        return reply.code(503).send(errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
      const id = decodeURIComponent(request.params.id);
      if (!id) return reply.code(400).send(errorResponse('MISSING_ID', 'Workspace ID required'));
      try {
        await mgr.deleteWorkspace(id);
        return reply.send({ ok: true, deleted: id });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    }
  );

  // ── POST /api/workspaces/:id/repositories ────────────────

  app.post<{ Params: { id: string } }>(
    '/api/workspaces/:id/repositories',
    { schema: RS.workspaceAddRepository },
    async (request, reply) => {
      const mgr = getManager(wCtx);
      if (!mgr)
        return reply.code(503).send(errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
      const workspaceId = decodeURIComponent(request.params.id);
      if (!workspaceId)
        return reply.code(400).send(errorResponse('MISSING_ID', 'Workspace ID required'));
      try {
        const body = request.body as {
          id?: string;
          name?: string;
          provider?: string;
          url?: string;
          defaultBranch?: string;
          tags?: string[];
        };
        const workspace = await mgr.addRepository(workspaceId, {
          id: String(body.id),
          name: String(body.name),
          provider: body.provider as 'github' | 'azure-devops' | 'gitlab' | 'local',
          url: String(body.url),
          defaultBranch: String(body.defaultBranch),
          tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
        });

        const addedRepo = workspace.repositories.find((r) => r.id === String(body.id));
        const repoPath = resolveRepositoryPath(ctx.PROJECT_ROOT, {
          provider: addedRepo?.provider,
          url: addedRepo?.url,
        });
        if (repoPath) {
          enqueueWorkspaceCodebaseIndex(ctx, workspaceId, repoPath, 'repository_added');
        }

        return reply.code(201).send({
          ok: true,
          repository_count: workspace.repositories.length,
          rag_indexing: repoPath ? 'queued' : 'skipped',
        });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    }
  );

  // ── DELETE /api/workspaces/:id/repositories/:repoId ──────

  app.delete<{ Params: { id: string; repoId: string } }>(
    '/api/workspaces/:id/repositories/:repoId',
    { schema: { tags: ['workspaces'] } },
    async (request, reply) => {
      const mgr = getManager(wCtx);
      if (!mgr)
        return reply.code(503).send(errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
      const workspaceId = decodeURIComponent(request.params.id);
      const repoId = decodeURIComponent(request.params.repoId);
      if (!workspaceId || !repoId) {
        return reply
          .code(400)
          .send(errorResponse('MISSING_ID', 'Workspace ID and Repository ID required'));
      }
      try {
        await mgr.removeRepository(workspaceId, repoId);
        return reply.send({ ok: true, removed: repoId });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    }
  );

  // ── GET /api/workspaces/:id/projects ─────────────────────

  app.get<{ Params: { id: string } }>(
    '/api/workspaces/:id/projects',
    { schema: { tags: ['workspaces'] } },
    async (request, reply) => {
      const mgr = getManager(wCtx);
      if (!mgr)
        return reply.code(503).send(errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
      const workspaceId = decodeURIComponent(request.params.id);
      if (!workspaceId)
        return reply.code(400).send(errorResponse('MISSING_ID', 'Workspace ID required'));
      try {
        const projects = await mgr.listProjects(workspaceId);
        return reply.send({ ok: true, count: projects.length, projects });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    }
  );

  // ── POST /api/workspaces/:id/projects ────────────────────

  app.post<{ Params: { id: string } }>(
    '/api/workspaces/:id/projects',
    { schema: RS.workspaceCreateProject },
    async (request, reply) => {
      const mgr = getManager(wCtx);
      if (!mgr)
        return reply.code(503).send(errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
      const workspaceId = decodeURIComponent(request.params.id);
      if (!workspaceId)
        return reply.code(400).send(errorResponse('MISSING_ID', 'Workspace ID required'));
      try {
        const body = request.body as { id?: string; name?: string; repositories?: string[] };
        const project = await mgr.createProject({
          id: String(body.id),
          workspaceId,
          name: String(body.name),
          repositories: Array.isArray(body.repositories)
            ? body.repositories.map(String)
            : undefined,
        });
        return reply.code(201).send({ ok: true, project });
      } catch (err) {
        return handleDomainError(err, reply);
      }
    }
  );
}
