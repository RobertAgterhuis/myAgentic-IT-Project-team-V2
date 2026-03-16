// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Artifact API routes — GET /api/v1/artifacts/*
 *
 * Endpoints:
 *   GET  /api/v1/artifacts            — List artifacts (optional ?stage=&type=&status= filters)
 *   GET  /api/v1/artifacts/:id        — Get single artifact
 *   GET  /api/v1/artifacts/:id/lineage — Get lineage graph for an artifact
 *   GET  /api/v1/artifacts/stats      — Aggregate stats
 *
 * @module routes/artifacts
 * @param {object} ctx - Shared server context (must have orchestrator engine)
 * @returns {object} Route map { 'METHOD /path': handler }
 */

import http from 'http';
import { json } from '../middleware';
import { errorResponse } from '../utils/errors';

function extractArtifactId(req: http.IncomingMessage): string {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);
  // Pattern: /api/v1/artifacts/:id  →  parts = ['api', 'v1', 'artifacts', ':id']
  return parts.length >= 4 ? decodeURIComponent(parts[3]) : '';
}

export = function createArtifactRoutes(
  ctx: Record<string, unknown>
): Record<string, (req: http.IncomingMessage, res: http.ServerResponse) => void> {
  /**
   * Lazy accessor for the artifact registry.
   * The engine (and its registry) may not exist until the first orchestrator request.
   */
  function getRegistry() {
    const getEngine = ctx._getEngine as
      | (() => {
          artifactRegistry?: {
            list: (filter?: Record<string, string>) => unknown[];
            get: (id: string) => unknown;
            getLineage: (id: string) => unknown;
            stats: () => unknown;
          };
        })
      | undefined;
    if (!getEngine) return null;
    const engine = getEngine();
    return engine?.artifactRegistry ?? null;
  }

  // ── GET /api/v1/artifacts ────────────────────────────────

  function handleList(req: http.IncomingMessage, res: http.ServerResponse) {
    const registry = getRegistry();
    if (!registry) {
      return json(
        res,
        503,
        errorResponse('REGISTRY_UNAVAILABLE', 'Artifact registry not initialized')
      );
    }

    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const filter: Record<string, string> = {};
    const stage = url.searchParams.get('stage');
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');
    if (stage) filter.stage = stage;
    if (type) filter.artifact_type = type;
    if (status) filter.status = status;

    const artifacts = registry.list(Object.keys(filter).length > 0 ? filter : undefined);
    return json(res, 200, { ok: true, count: artifacts.length, artifacts });
  }

  // ── GET /api/v1/artifacts/stats ──────────────────────────

  function handleStats(_req: http.IncomingMessage, res: http.ServerResponse) {
    const registry = getRegistry();
    if (!registry) {
      return json(
        res,
        503,
        errorResponse('REGISTRY_UNAVAILABLE', 'Artifact registry not initialized')
      );
    }
    return json(res, 200, { ok: true, stats: registry.stats() });
  }

  // ── GET /api/v1/artifacts/:id ────────────────────────────

  function handleGet(req: http.IncomingMessage, res: http.ServerResponse) {
    const registry = getRegistry();
    if (!registry) {
      return json(
        res,
        503,
        errorResponse('REGISTRY_UNAVAILABLE', 'Artifact registry not initialized')
      );
    }

    const id = extractArtifactId(req);
    if (!id) {
      return json(res, 400, errorResponse('MISSING_ID', 'Artifact ID is required'));
    }

    const artifact = registry.get(id);
    if (!artifact) {
      return json(res, 404, errorResponse('NOT_FOUND', `Artifact not found: ${id}`));
    }

    return json(res, 200, { ok: true, artifact });
  }

  // ── GET /api/v1/artifacts/:id/lineage ────────────────────

  function handleLineage(req: http.IncomingMessage, res: http.ServerResponse) {
    const registry = getRegistry();
    if (!registry) {
      return json(
        res,
        503,
        errorResponse('REGISTRY_UNAVAILABLE', 'Artifact registry not initialized')
      );
    }

    const id = extractArtifactId(req);
    if (!id) {
      return json(res, 400, errorResponse('MISSING_ID', 'Artifact ID is required'));
    }

    const artifact = registry.get(id);
    if (!artifact) {
      return json(res, 404, errorResponse('NOT_FOUND', `Artifact not found: ${id}`));
    }

    const lineage = registry.getLineage(id);
    return json(res, 200, { ok: true, artifact_id: id, lineage });
  }

  // ── Route table ──────────────────────────────────────────

  return {
    'GET /api/v1/artifacts': handleList,
    'GET /api/v1/artifacts/stats': handleStats,
    'GET /api/v1/artifacts/:id': handleGet,
    'GET /api/v1/artifacts/:id/lineage': handleLineage,
  };
};
