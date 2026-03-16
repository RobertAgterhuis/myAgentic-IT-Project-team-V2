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
 * @param {object} _ctx - Shared server context (unused; tracker is a singleton)
 * @returns {object} Route map { 'METHOD /path': handler }
 */

import http from 'http';
import { json } from '../middleware';
import { errorResponse } from '../utils/errors';
import { sessionTracker } from '../session-tracker';

function extractSessionId(req: http.IncomingMessage): string {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);
  // Pattern: /api/sessions/:id  →  parts = ['api', 'sessions', ':id']
  return parts.length >= 3 ? decodeURIComponent(parts[2]) : '';
}

export = function createSessionRoutes(
  _ctx: Record<string, unknown>
): Record<string, (req: http.IncomingMessage, res: http.ServerResponse) => void> {
  // ── GET /api/sessions ────────────────────────────────────

  function handleList(_req: http.IncomingMessage, res: http.ServerResponse) {
    const sessions = sessionTracker.listSessions();
    return json(res, 200, { ok: true, count: sessions.length, sessions });
  }

  // ── GET /api/sessions/:id ────────────────────────────────

  function handleDetail(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = extractSessionId(req);
    if (!id) {
      return json(res, 400, errorResponse('MISSING_ID', 'Session ID is required'));
    }

    const session = sessionTracker.getSession(id);
    if (!session) {
      return json(res, 404, errorResponse('NOT_FOUND', `Session not found: ${id}`));
    }

    const agents = sessionTracker.listAgentsBySession(id);
    const timeline = sessionTracker.getTimeline(id);

    return json(res, 200, {
      ok: true,
      session,
      agents,
      timeline,
    });
  }

  // ── GET /api/sessions/:id/timeline ───────────────────────

  function handleTimeline(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = extractSessionId(req);
    if (!id) {
      return json(res, 400, errorResponse('MISSING_ID', 'Session ID is required'));
    }

    const session = sessionTracker.getSession(id);
    if (!session) {
      return json(res, 404, errorResponse('NOT_FOUND', `Session not found: ${id}`));
    }

    const timeline = sessionTracker.getTimeline(id);
    return json(res, 200, { ok: true, session_id: id, count: timeline.length, timeline });
  }

  // ── Route table ──────────────────────────────────────────

  return {
    'GET /api/sessions': handleList,
    'GET /api/sessions/:id': handleDetail,
    'GET /api/sessions/:id/timeline': handleTimeline,
  };
};
