// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Agents API routes — GET /api/agents/*
 *
 * Endpoints:
 *   GET  /api/agents      — List all agents with current status
 *   GET  /api/agents/:id  — Agent detail (prompt summary, outputs, history)
 *
 * @module routes/agents
 * @param {object} _ctx - Shared server context
 * @returns {object} Route map { 'METHOD /path': handler }
 */

import http from 'http';
import { json } from '../middleware';
import { errorResponse } from '../utils/errors';
import { sessionTracker } from '../session-tracker';

function extractAgentId(req: http.IncomingMessage): string {
  const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);
  // Pattern: /api/agents/:id  →  parts = ['api', 'agents', ':id']
  return parts.length >= 3 ? decodeURIComponent(parts[2]) : '';
}

export = function createAgentRoutes(
  _ctx: Record<string, unknown>
): Record<string, (req: http.IncomingMessage, res: http.ServerResponse) => void> {
  // ── GET /api/agents ──────────────────────────────────────

  function handleList(_req: http.IncomingMessage, res: http.ServerResponse) {
    const agents = sessionTracker.listAgents();
    return json(res, 200, { ok: true, count: agents.length, agents });
  }

  // ── GET /api/agents/:id ──────────────────────────────────

  function handleDetail(req: http.IncomingMessage, res: http.ServerResponse) {
    const id = extractAgentId(req);
    if (!id) {
      return json(res, 400, errorResponse('MISSING_ID', 'Agent ID is required'));
    }

    const agent = sessionTracker.getAgent(id);
    if (!agent) {
      return json(res, 404, errorResponse('NOT_FOUND', `Agent not found: ${id}`));
    }

    return json(res, 200, { ok: true, agent });
  }

  // ── Route table ──────────────────────────────────────────

  return {
    'GET /api/agents': handleList,
    'GET /api/agents/:id': handleDetail,
  };
};
