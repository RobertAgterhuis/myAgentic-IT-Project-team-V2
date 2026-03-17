// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Agents API routes — GET /api/agents/*
 *
 * Endpoints:
 *   GET  /api/agents      — List all agents with current status
 *   GET  /api/agents/:id  — Agent detail (prompt summary, outputs, history)
 *
 * @module routes/agents
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { sessionTracker } from '../session-tracker';

export async function registerRoutes(app: FastifyInstance, _ctx: ServerContext): Promise<void> {
  // ── GET /api/agents ──────────────────────────────────────

  app.get(
    '/api/agents',
    { schema: { tags: ['agents'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const agents = sessionTracker.listAgents();
      return reply.send({ ok: true, count: agents.length, agents });
    }
  );

  // ── GET /api/agents/:id ──────────────────────────────────

  app.get<{ Params: { id: string } }>(
    '/api/agents/:id',
    { schema: { tags: ['agents'] } },
    async (request, reply) => {
      const id = decodeURIComponent(request.params.id);
      if (!id) {
        return reply.code(400).send(errorResponse('MISSING_ID', 'Agent ID is required'));
      }
      const agent = sessionTracker.getAgent(id);
      if (!agent) {
        return reply.code(404).send(errorResponse('NOT_FOUND', `Agent not found: ${id}`));
      }
      return reply.send({ ok: true, agent });
    }
  );
}
