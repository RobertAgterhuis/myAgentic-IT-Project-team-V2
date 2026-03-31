// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { registerRoutes } from '../../src/webapp/routes/agents';
import { createTestableRoutes } from '../helpers/fastify-test-adapter.js';
import { sessionTracker } from '../../src/webapp/session-tracker';

/* ── Mock ctx ─────────────────────────────────────────────── */

function createCtx() {
  return {};
}

const routes = createTestableRoutes(registerRoutes, createCtx());

/* ── Helpers ──────────────────────────────────────────────── */

function createReq(url, method = 'GET') {
  return {
    url,
    method,
    headers: { host: 'localhost:3001', 'content-type': 'application/json' },
  };
}

function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, val) {
      res.headers[key] = val;
    },
    writeHead(code, hdrs) {
      res.statusCode = code;
      if (hdrs) Object.assign(res.headers, hdrs);
    },
    end(data) {
      res.body = data || '';
    },
  };
  return res;
}

function parsed(res) {
  return JSON.parse(res.body);
}

/* ── Tests ────────────────────────────────────────────────── */

describe('agents routes', () => {
  it('exports expected route keys', () => {
    expect(routes).toHaveProperty('GET /api/agents');
    expect(routes).toHaveProperty('GET /api/agents/:id');
  });

  describe('GET /api/agents', () => {
    it('returns list of agents', async () => {
      const res = createRes();
      await routes['GET /api/agents'](createReq('/api/agents'), res);
      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.agents)).toBe(true);
      expect(typeof body.count).toBe('number');
    });
  });

  describe('GET /api/agents/:id', () => {
    it('returns 404 for non-existent agent', async () => {
      const res = createRes();
      await routes['GET /api/agents/:id'](createReq('/api/agents/non-existent-agent'), res);
      expect(res.statusCode).toBe(404);
      const body = parsed(res);
      expect(body.code).toBe('NOT_FOUND');
    });

    it('returns agent detail when found', async () => {
      const session = sessionTracker.startSession('AgentProj', 'CREATE');
      sessionTracker.startAgent(
        session.id,
        '05-software-architect',
        'Software Architect',
        'PHASE-2',
        'Architecture review'
      );
      const res = createRes();
      await routes['GET /api/agents/:id'](createReq('/api/agents/05-software-architect'), res);
      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.ok).toBe(true);
      expect(body.agent).toBeDefined();
    });
  });
});
