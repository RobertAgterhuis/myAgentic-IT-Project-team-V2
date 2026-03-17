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
import type { StorageProvider } from '../../../platform/engine/persistence';
import {
  WorkspaceManager,
  WorkspaceNotFoundError,
  ProjectNotFoundError,
  RepositoryNotFoundError,
  DuplicateError,
  ValidationError,
} from '../../../platform/engine/workspace';

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

  app.post('/api/workspaces', { schema: { tags: ['workspaces'] } }, async (request, reply) => {
    const mgr = getManager(wCtx);
    if (!mgr)
      return reply.code(503).send(errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
    try {
      const body = request.body as { id?: string; name?: string; owner?: string };
      if (!body.id || !body.name || !body.owner) {
        return reply
          .code(400)
          .send(errorResponse('VALIDATION', 'id, name, and owner are required'));
      }
      const workspace = await mgr.createWorkspace({
        id: String(body.id),
        name: String(body.name),
        owner: String(body.owner),
      });
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
    { schema: { tags: ['workspaces'] } },
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
    { schema: { tags: ['workspaces'] } },
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
    { schema: { tags: ['workspaces'] } },
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
        if (!body.id || !body.name || !body.provider || !body.url || !body.defaultBranch) {
          return reply
            .code(400)
            .send(
              errorResponse('VALIDATION', 'id, name, provider, url, defaultBranch are required')
            );
        }
        const workspace = await mgr.addRepository(workspaceId, {
          id: String(body.id),
          name: String(body.name),
          provider: body.provider as 'github' | 'azure-devops' | 'gitlab' | 'local',
          url: String(body.url),
          defaultBranch: String(body.defaultBranch),
          tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
        });
        return reply.code(201).send({ ok: true, repository_count: workspace.repositories.length });
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
    { schema: { tags: ['workspaces'] } },
    async (request, reply) => {
      const mgr = getManager(wCtx);
      if (!mgr)
        return reply.code(503).send(errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
      const workspaceId = decodeURIComponent(request.params.id);
      if (!workspaceId)
        return reply.code(400).send(errorResponse('MISSING_ID', 'Workspace ID required'));
      try {
        const body = request.body as { id?: string; name?: string; repositories?: string[] };
        if (!body.id || !body.name) {
          return reply.code(400).send(errorResponse('VALIDATION', 'id and name are required'));
        }
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
