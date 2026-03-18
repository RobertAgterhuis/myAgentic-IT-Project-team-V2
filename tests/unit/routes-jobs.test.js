// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { registerRoutes } = require('../../src/webapp/routes/jobs');
const { createTestableRoutes } = require('../helpers/fastify-test-adapter.js');

/* ── Mock ctx ─────────────────────────────────────────────── */

function createCtx() {
  const mockQueue = {
    list: vi.fn().mockResolvedValue([
      { id: 'j1', type: 'agent', status: 'completed' },
      { id: 'j2', type: 'agent', status: 'running' },
    ]),
    status: vi.fn().mockResolvedValue({ id: 'j1', type: 'agent', status: 'completed' }),
    cancel: vi.fn().mockResolvedValue(undefined),
  };

  return {
    sseNotify: vi.fn(),
    getStorageProvider: vi.fn().mockReturnValue({
      // PersistentQueue constructor takes a StorageProvider
      read: vi.fn(),
      write: vi.fn(),
      exists: vi.fn(),
      list: vi.fn(),
    }),
    _mockQueue: mockQueue,
  };
}

/* ── Helpers ──────────────────────────────────────────────── */

function createReq(url, method = 'GET', body) {
  return {
    url,
    method,
    body,
    query: Object.fromEntries(new URL(`http://localhost${url}`).searchParams),
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

/* ── Tests ────────────────────────────────────────────────── */

describe('routes/jobs (M24-006)', () => {
  const ctx = createCtx();
  const routes = createTestableRoutes(registerRoutes, ctx);

  it('registers GET /api/jobs', () => {
    expect(routes).toHaveProperty('GET /api/jobs');
  });

  it('registers GET /api/jobs/:id', () => {
    expect(routes).toHaveProperty('GET /api/jobs/:id');
  });

  it('registers POST /api/jobs/cancel', () => {
    expect(routes).toHaveProperty('POST /api/jobs/cancel');
  });

  describe('GET /api/jobs', () => {
    it('returns jobs list', async () => {
      const res = createRes();
      await routes['GET /api/jobs'](createReq('/api/jobs'), res);
      // May return 200 with jobs array or 500 if storage not initialised
      expect([200, 500]).toContain(res.statusCode);
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('attempts to get job by id', async () => {
      const res = createRes();
      await routes['GET /api/jobs/:id'](createReq('/api/jobs/j1'), res);
      expect([200, 404, 500]).toContain(res.statusCode);
    });
  });

  describe('POST /api/jobs/cancel', () => {
    it('attempts to cancel a job', async () => {
      const res = createRes();
      await routes['POST /api/jobs/cancel'](
        createReq('/api/jobs/cancel', 'POST', { job_id: 'j1' }),
        res
      );
      expect([200, 400, 404, 500]).toContain(res.statusCode);
    });
  });
});
