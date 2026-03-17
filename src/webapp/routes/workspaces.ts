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

import http from 'http';
import { json, parseBody } from '../middleware';
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

function extractPathParts(req: http.IncomingMessage): string[] {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  return url.pathname.split('/').filter(Boolean);
}

function handleDomainError(err: unknown, res: http.ServerResponse): void {
  if (
    err instanceof WorkspaceNotFoundError ||
    err instanceof ProjectNotFoundError ||
    err instanceof RepositoryNotFoundError
  ) {
    return json(res, 404, errorResponse('NOT_FOUND', (err as Error).message));
  }
  if (err instanceof DuplicateError) {
    return json(res, 409, errorResponse('DUPLICATE', (err as Error).message));
  }
  if (err instanceof ValidationError) {
    return json(res, 400, errorResponse('VALIDATION', (err as Error).message));
  }
  const message = err instanceof Error ? err.message : String(err);
  return json(res, 500, errorResponse('INTERNAL', message));
}

export = function createWorkspaceRoutes(
  ctx: WorkspaceCtx
): Record<string, (req: http.IncomingMessage, res: http.ServerResponse) => void | Promise<void>> {
  // ── GET /api/workspaces ──────────────────────────────────

  async function handleListWorkspaces(_req: http.IncomingMessage, res: http.ServerResponse) {
    const mgr = getManager(ctx);
    if (!mgr) return json(res, 503, errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
    try {
      const workspaces = await mgr.listWorkspaces();
      return json(res, 200, { ok: true, count: workspaces.length, workspaces });
    } catch (err) {
      handleDomainError(err, res);
    }
  }

  // ── POST /api/workspaces ─────────────────────────────────

  async function handleCreateWorkspace(req: http.IncomingMessage, res: http.ServerResponse) {
    const mgr = getManager(ctx);
    if (!mgr) return json(res, 503, errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
    try {
      const body = (await parseBody(req)) as { id?: string; name?: string; owner?: string };
      if (!body.id || !body.name || !body.owner) {
        return json(res, 400, errorResponse('VALIDATION', 'id, name, and owner are required'));
      }
      const workspace = await mgr.createWorkspace({
        id: String(body.id),
        name: String(body.name),
        owner: String(body.owner),
      });
      return json(res, 201, { ok: true, workspace });
    } catch (err) {
      handleDomainError(err, res);
    }
  }

  // ── GET /api/workspaces/:id ──────────────────────────────

  async function handleGetWorkspace(req: http.IncomingMessage, res: http.ServerResponse) {
    const mgr = getManager(ctx);
    if (!mgr) return json(res, 503, errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
    const parts = extractPathParts(req);
    const id = decodeURIComponent(parts[2] || '');
    if (!id) return json(res, 400, errorResponse('MISSING_ID', 'Workspace ID required'));
    try {
      const workspace = await mgr.getWorkspace(id);
      const projects = await mgr.listProjects(id);
      return json(res, 200, { ok: true, workspace, projects });
    } catch (err) {
      handleDomainError(err, res);
    }
  }

  // ── PUT /api/workspaces/:id ──────────────────────────────

  async function handleUpdateWorkspace(req: http.IncomingMessage, res: http.ServerResponse) {
    const mgr = getManager(ctx);
    if (!mgr) return json(res, 503, errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
    const parts = extractPathParts(req);
    const id = decodeURIComponent(parts[2] || '');
    if (!id) return json(res, 400, errorResponse('MISSING_ID', 'Workspace ID required'));
    try {
      const body = (await parseBody(req)) as { name?: string; owner?: string };
      const workspace = await mgr.updateWorkspace(id, body);
      return json(res, 200, { ok: true, workspace });
    } catch (err) {
      handleDomainError(err, res);
    }
  }

  // ── DELETE /api/workspaces/:id ───────────────────────────

  async function handleDeleteWorkspace(req: http.IncomingMessage, res: http.ServerResponse) {
    const mgr = getManager(ctx);
    if (!mgr) return json(res, 503, errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
    const parts = extractPathParts(req);
    const id = decodeURIComponent(parts[2] || '');
    if (!id) return json(res, 400, errorResponse('MISSING_ID', 'Workspace ID required'));
    try {
      await mgr.deleteWorkspace(id);
      return json(res, 200, { ok: true, deleted: id });
    } catch (err) {
      handleDomainError(err, res);
    }
  }

  // ── POST /api/workspaces/:id/repositories ────────────────

  async function handleAddRepository(req: http.IncomingMessage, res: http.ServerResponse) {
    const mgr = getManager(ctx);
    if (!mgr) return json(res, 503, errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
    const parts = extractPathParts(req);
    const workspaceId = decodeURIComponent(parts[2] || '');
    if (!workspaceId) return json(res, 400, errorResponse('MISSING_ID', 'Workspace ID required'));
    try {
      const body = (await parseBody(req)) as {
        id?: string;
        name?: string;
        provider?: string;
        url?: string;
        defaultBranch?: string;
        tags?: string[];
      };
      if (!body.id || !body.name || !body.provider || !body.url || !body.defaultBranch) {
        return json(
          res,
          400,
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
      return json(res, 201, { ok: true, repository_count: workspace.repositories.length });
    } catch (err) {
      handleDomainError(err, res);
    }
  }

  // ── DELETE /api/workspaces/:id/repositories/:repoId ──────

  async function handleRemoveRepository(req: http.IncomingMessage, res: http.ServerResponse) {
    const mgr = getManager(ctx);
    if (!mgr) return json(res, 503, errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
    const parts = extractPathParts(req);
    const workspaceId = decodeURIComponent(parts[2] || '');
    const repoId = decodeURIComponent(parts[4] || '');
    if (!workspaceId || !repoId) {
      return json(res, 400, errorResponse('MISSING_ID', 'Workspace ID and Repository ID required'));
    }
    try {
      await mgr.removeRepository(workspaceId, repoId);
      return json(res, 200, { ok: true, removed: repoId });
    } catch (err) {
      handleDomainError(err, res);
    }
  }

  // ── GET /api/workspaces/:id/projects ─────────────────────

  async function handleListProjects(req: http.IncomingMessage, res: http.ServerResponse) {
    const mgr = getManager(ctx);
    if (!mgr) return json(res, 503, errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
    const parts = extractPathParts(req);
    const workspaceId = decodeURIComponent(parts[2] || '');
    if (!workspaceId) return json(res, 400, errorResponse('MISSING_ID', 'Workspace ID required'));
    try {
      const projects = await mgr.listProjects(workspaceId);
      return json(res, 200, { ok: true, count: projects.length, projects });
    } catch (err) {
      handleDomainError(err, res);
    }
  }

  // ── POST /api/workspaces/:id/projects ────────────────────

  async function handleCreateProject(req: http.IncomingMessage, res: http.ServerResponse) {
    const mgr = getManager(ctx);
    if (!mgr) return json(res, 503, errorResponse('UNAVAILABLE', 'StorageProvider not ready'));
    const parts = extractPathParts(req);
    const workspaceId = decodeURIComponent(parts[2] || '');
    if (!workspaceId) return json(res, 400, errorResponse('MISSING_ID', 'Workspace ID required'));
    try {
      const body = (await parseBody(req)) as {
        id?: string;
        name?: string;
        repositories?: string[];
      };
      if (!body.id || !body.name) {
        return json(res, 400, errorResponse('VALIDATION', 'id and name are required'));
      }
      const project = await mgr.createProject({
        id: String(body.id),
        workspaceId,
        name: String(body.name),
        repositories: Array.isArray(body.repositories) ? body.repositories.map(String) : undefined,
      });
      return json(res, 201, { ok: true, project });
    } catch (err) {
      handleDomainError(err, res);
    }
  }

  // ── Route table ──────────────────────────────────────────

  return {
    'GET /api/workspaces': handleListWorkspaces,
    'POST /api/workspaces': handleCreateWorkspace,
    'GET /api/workspaces/:id': handleGetWorkspace,
    'PUT /api/workspaces/:id': handleUpdateWorkspace,
    'DELETE /api/workspaces/:id': handleDeleteWorkspace,
    'POST /api/workspaces/:id/repositories': handleAddRepository,
    'DELETE /api/workspaces/:id/repositories/:repoId': handleRemoveRepository,
    'GET /api/workspaces/:id/projects': handleListProjects,
    'POST /api/workspaces/:id/projects': handleCreateProject,
  };
};
