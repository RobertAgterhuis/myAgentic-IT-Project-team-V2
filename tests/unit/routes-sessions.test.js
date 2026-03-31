// Copyright (c) 2026 Robert Agterhuis. MIT License.

import * as __req_0 from '../../src/webapp/routes/sessions';
const { registerRoutes } = __req_0;
import * as __req_1 from '../helpers/fastify-test-adapter.js';
const { createTestableRoutes } = __req_1;
import * as __req_2 from '../../src/webapp/session-tracker';
const { sessionTracker } = __req_2;

/* ── Mock ctx (unused by routes except for Fastify registration) ── */

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

describe('sessions routes', () => {
  it('exports expected route keys', () => {
    expect(routes).toHaveProperty('GET /api/sessions');
    expect(routes).toHaveProperty('GET /api/sessions/:id');
    expect(routes).toHaveProperty('GET /api/sessions/:id/timeline');
  });

  describe('GET /api/sessions', () => {
    it('returns list of sessions', async () => {
      const res = createRes();
      await routes['GET /api/sessions'](createReq('/api/sessions'), res);
      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.sessions)).toBe(true);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('returns 400 when session id is missing', async () => {
      const res = createRes();
      await routes['GET /api/sessions/:id'](
        {
          url: '/api/sessions/',
          method: 'GET',
          params: { id: '' },
          headers: { host: 'localhost:3001', 'content-type': 'application/json' },
        },
        res
      );
      expect(res.statusCode).toBe(400);
      const body = parsed(res);
      expect(body.error).toContain('Session ID is required');
    });

    it('returns 404 for non-existent session', async () => {
      const res = createRes();
      await routes['GET /api/sessions/:id'](createReq('/api/sessions/non-existent-id'), res);
      expect(res.statusCode).toBe(404);
      const body = parsed(res);
      expect(body.code).toBe('NOT_FOUND');
    });

    it('returns session detail when found', async () => {
      const session = sessionTracker.startSession('TestProj', 'CREATE');
      const res = createRes();
      await routes['GET /api/sessions/:id'](createReq(`/api/sessions/${session.id}`), res);
      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.ok).toBe(true);
      expect(body.session.id).toBe(session.id);
    });
  });

  describe('GET /api/sessions/:id/timeline', () => {
    it('returns 400 when timeline session id is missing', async () => {
      const res = createRes();
      await routes['GET /api/sessions/:id/timeline'](
        {
          url: '/api/sessions//timeline',
          method: 'GET',
          params: { id: '' },
          headers: { host: 'localhost:3001', 'content-type': 'application/json' },
        },
        res
      );
      expect(res.statusCode).toBe(400);
      const body = parsed(res);
      expect(body.error).toContain('Session ID is required');
    });

    it('returns 404 for non-existent session timeline', async () => {
      const res = createRes();
      await routes['GET /api/sessions/:id/timeline'](
        createReq('/api/sessions/non-existent-id/timeline'),
        res
      );
      expect(res.statusCode).toBe(404);
      const body = parsed(res);
      expect(body.code).toBe('NOT_FOUND');
    });

    it('returns timeline for existing session', async () => {
      const session = sessionTracker.startSession('TestProj2', 'AUDIT');
      const res = createRes();
      await routes['GET /api/sessions/:id/timeline'](
        createReq(`/api/sessions/${session.id}/timeline`),
        res
      );
      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body.ok).toBe(true);
      expect(body.session_id).toBe(session.id);
      expect(Array.isArray(body.timeline)).toBe(true);
    });
  });
});
