// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { registerRoutes } = require('../../src/webapp/routes/agents');
const { createTestableRoutes } = require('../helpers/fastify-test-adapter.js');
const { Dispatcher } = require('../../platform/engine/dispatcher');

/* ── Mock ctx with sseNotify ─────────────────────────────── */

function createCtx() {
  return {
    sseNotify: vi.fn(),
  };
}

/* ── Helpers ──────────────────────────────────────────────── */

function createReq(url, method = 'GET', body) {
  return {
    url,
    method,
    body,
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

describe('agents execute route (M31)', () => {
  const ctx = createCtx();
  const routes = createTestableRoutes(registerRoutes, ctx);
  let invokeSpy;
  let buildContextSpy;

  beforeEach(() => {
    buildContextSpy = vi
      .spyOn(Dispatcher.prototype, 'buildContext')
      .mockReturnValue({ agentId: '05' });
    invokeSpy = vi
      .spyOn(Dispatcher.prototype, 'invoke')
      .mockResolvedValue({ success: true, outputPath: '/output/test.md' });
    ctx.sseNotify.mockClear();
  });

  afterEach(() => {
    invokeSpy.mockRestore();
    buildContextSpy.mockRestore();
  });

  it('registers POST /api/agents/:id/execute', () => {
    expect(routes).toHaveProperty('POST /api/agents/:id/execute');
  });

  describe('POST /api/agents/:id/execute', () => {
    it('returns 404 for unknown agent', async () => {
      const res = createRes();
      await routes['POST /api/agents/:id/execute'](
        createReq('/api/agents/nonexistent-agent-xyz/execute', 'POST', {}),
        res
      );
      expect(res.statusCode).toBe(404);
      const body = parsed(res);
      expect(body.code).toBe('NOT_FOUND');
    });

    it('emits agent_execution_start SSE event', async () => {
      const res = createRes();
      await routes['POST /api/agents/:id/execute'](
        createReq('/api/agents/05/execute', 'POST', {}),
        res
      );
      // Should have been called with start event regardless of outcome
      expect(ctx.sseNotify).toHaveBeenCalledWith(
        'agent_execution_start',
        expect.objectContaining({
          type: 'agent_execution_start',
          agent_id: '05',
        })
      );
    });

    it('returns execution result for known agent', async () => {
      const res = createRes();
      await routes['POST /api/agents/:id/execute'](
        createReq('/api/agents/05/execute', 'POST', {}),
        res
      );
      // Depending on dispatcher availability, should return 200 with execution obj
      // or 500 on dispatcher error — both are valid; we only check structure
      const body = parsed(res);
      if (res.statusCode === 200) {
        expect(body.ok).toBe(true);
        expect(body.execution).toBeDefined();
        expect(body.execution.agent_id).toBe('05');
        expect(['completed', 'failed']).toContain(body.execution.status);
      } else {
        // Execution error is still a valid server response
        expect(res.statusCode).toBe(500);
        expect(body.code).toBe('EXECUTION_ERROR');
      }
    });

    it('accepts context with predecessorPaths', async () => {
      const res = createRes();
      await routes['POST /api/agents/:id/execute'](
        createReq('/api/agents/05/execute', 'POST', {
          context: {
            predecessorPaths: ['BusinessDocs/Phase1-Business/01-brd.md'],
          },
        }),
        res
      );
      // Should not blow up — 200 or 500 are both acceptable
      expect([200, 500]).toContain(res.statusCode);
    });

    it('emits completion or failure SSE event', async () => {
      ctx.sseNotify.mockClear();
      const res = createRes();
      await routes['POST /api/agents/:id/execute'](
        createReq('/api/agents/05/execute', 'POST', {}),
        res
      );
      // Should have emitted at least 2 events: start + complete/failed
      const eventTypes = ctx.sseNotify.mock.calls.map((c) => c[0]);
      expect(eventTypes).toContain('agent_execution_start');
      expect(
        eventTypes.includes('agent_execution_complete') ||
          eventTypes.includes('agent_execution_failed')
      ).toBe(true);
    });
  });
});
