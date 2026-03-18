// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Sessions API routes — GET /api/sessions/*
 *
 * Endpoints:
 *   GET  /api/sessions              — List all sessions
 *   GET  /api/sessions/:id          — Session detail
 *   GET  /api/sessions/:id/timeline — Event timeline for a session
 *
 * @module routes/sessions
 */

import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import { errorResponse } from '../utils/errors';
import { sessionTracker } from '../session-tracker';
import * as RS from '../route-schemas';

export async function registerRoutes(app: FastifyInstance, _ctx: ServerContext): Promise<void> {
  // ── GET /api/sessions ────────────────────────────────────

  app.get(
    '/api/sessions',
    { schema: { tags: ['sessions'] } },
    async (_request, reply: FastifyReply) => {
      const sessions = sessionTracker.listSessions();
      return reply.send({ ok: true, count: sessions.length, sessions });
    }
  );

  // ── GET /api/sessions/:id ────────────────────────────────

  app.get<{ Params: { id: string } }>(
    '/api/sessions/:id',
    { schema: RS.sessionDetail },
    async (request, reply: FastifyReply) => {
      const id = decodeURIComponent(request.params.id);
      if (!id) {
        return reply.code(400).send(errorResponse('MISSING_ID', 'Session ID is required'));
      }
      const session = sessionTracker.getSession(id);
      if (!session) {
        return reply.code(404).send(errorResponse('NOT_FOUND', `Session not found: ${id}`));
      }
      const agents = sessionTracker.listAgentsBySession(id);
      const timeline = sessionTracker.getTimeline(id);
      return reply.send({ ok: true, session, agents, timeline });
    }
  );

  // ── GET /api/sessions/:id/timeline ───────────────────────

  app.get<{ Params: { id: string } }>(
    '/api/sessions/:id/timeline',
    { schema: RS.sessionDetail },
    async (request, reply: FastifyReply) => {
      const id = decodeURIComponent(request.params.id);
      if (!id) {
        return reply.code(400).send(errorResponse('MISSING_ID', 'Session ID is required'));
      }
      const session = sessionTracker.getSession(id);
      if (!session) {
        return reply.code(404).send(errorResponse('NOT_FOUND', `Session not found: ${id}`));
      }
      const timeline = sessionTracker.getTimeline(id);
      return reply.send({ ok: true, session_id: id, count: timeline.length, timeline });
    }
  );
}
