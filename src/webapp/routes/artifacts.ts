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

import type { FastifyInstance } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import * as RS from '../route-schemas';

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
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

  app.get<{ Querystring: { stage?: string; type?: string; status?: string } }>(
    '/api/v1/artifacts',
    { schema: RS.artifactsList },
    async (request, reply) => {
      const registry = getRegistry();
      if (!registry) {
        return reply
          .code(503)
          .send(errorResponse('REGISTRY_UNAVAILABLE', 'Artifact registry not initialized'));
      }

      const { stage, type, status } = request.query;
      const filter: Record<string, string> = {};
      if (stage) filter.stage = stage;
      if (type) filter.artifact_type = type;
      if (status) filter.status = status;

      const artifacts = registry.list(Object.keys(filter).length > 0 ? filter : undefined);
      return reply.send({ ok: true, count: artifacts.length, artifacts });
    }
  );

  // ── GET /api/v1/artifacts/stats ──────────────────────────

  app.get(
    '/api/v1/artifacts/stats',
    { schema: { tags: ['artifacts'] } },
    async (_request, reply) => {
      const registry = getRegistry();
      if (!registry) {
        return reply
          .code(503)
          .send(errorResponse('REGISTRY_UNAVAILABLE', 'Artifact registry not initialized'));
      }
      return reply.send({ ok: true, stats: registry.stats() });
    }
  );

  // ── GET /api/v1/artifacts/:id ────────────────────────────

  app.get<{ Params: { id: string } }>(
    '/api/v1/artifacts/:id',
    { schema: RS.artifactDetail },
    async (request, reply) => {
      const registry = getRegistry();
      if (!registry) {
        return reply
          .code(503)
          .send(errorResponse('REGISTRY_UNAVAILABLE', 'Artifact registry not initialized'));
      }

      const id = decodeURIComponent(request.params.id);
      if (!id) {
        return reply.code(400).send(errorResponse('MISSING_ID', 'Artifact ID is required'));
      }

      const artifact = registry.get(id);
      if (!artifact) {
        return reply.code(404).send(errorResponse('NOT_FOUND', `Artifact not found: ${id}`));
      }

      return reply.send({ ok: true, artifact });
    }
  );

  // ── GET /api/v1/artifacts/:id/lineage ────────────────────

  app.get<{ Params: { id: string } }>(
    '/api/v1/artifacts/:id/lineage',
    { schema: { tags: ['artifacts'] } },
    async (request, reply) => {
      const registry = getRegistry();
      if (!registry) {
        return reply
          .code(503)
          .send(errorResponse('REGISTRY_UNAVAILABLE', 'Artifact registry not initialized'));
      }

      const id = decodeURIComponent(request.params.id);
      if (!id) {
        return reply.code(400).send(errorResponse('MISSING_ID', 'Artifact ID is required'));
      }

      const artifact = registry.get(id);
      if (!artifact) {
        return reply.code(404).send(errorResponse('NOT_FOUND', `Artifact not found: ${id}`));
      }

      const lineage = registry.getLineage(id);
      return reply.send({ ok: true, artifact_id: id, lineage });
    }
  );
}
