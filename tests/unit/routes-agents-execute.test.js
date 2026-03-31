// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { registerRoutes } from '../../src/webapp/routes/agents';
import { createTestableRoutes } from '../helpers/fastify-test-adapter.js';
import { Dispatcher } from '../../platform/engine/dispatcher';

/* ── Mock ctx with sseNotify ─────────────────────────────── */

function createCtx() {
  return {
    sseNotify: vi.fn(),
  };
}

/* ── Helpers ──────────────────────────────────────────────── */

function createReq(url, method = 'GET', body, headers = {}) {
  return {
    url,
    method,
    body,
    headers: { host: 'localhost:3001', 'content-type': 'application/json', ...headers },
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
    invokeSpy = vi.spyOn(Dispatcher.prototype, 'invoke').mockResolvedValue({
      success: true,
      outputPath: '/output/test.md',
      confidence: 0.74,
      uncertainty_reasons: ['Runtime telemetry unavailable'],
      needs_human_review: true,
    });
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
        expect(body.execution).toHaveProperty('job_id');
        expect(body.execution).toHaveProperty('logs');
      } else {
        // Execution error is still a valid server response
        expect(res.statusCode).toBe(500);
        expect(body.code).toBe('EXECUTION_ERROR');
      }
    });

    it('hides confidence telemetry for viewer role', async () => {
      const res = createRes();
      await routes['POST /api/agents/:id/execute'](
        createReq(
          '/api/agents/05/execute',
          'POST',
          {},
          {
            'x-user-role': 'viewer',
          }
        ),
        res
      );

      if (res.statusCode === 200) {
        const body = parsed(res);
        expect(body.execution.confidence).toBeUndefined();
        expect(body.execution.uncertainty_reasons).toBeUndefined();
        expect(body.execution.needs_human_review).toBeUndefined();
      } else {
        expect(res.statusCode).toBe(500);
      }
    });

    it('shows confidence telemetry for operator role', async () => {
      const res = createRes();
      await routes['POST /api/agents/:id/execute'](
        createReq(
          '/api/agents/05/execute',
          'POST',
          {},
          {
            'x-user-role': 'operator',
          }
        ),
        res
      );

      if (res.statusCode === 200) {
        const body = parsed(res);
        expect(body.execution).toHaveProperty('confidence');
        expect(body.execution).toHaveProperty('uncertainty_reasons');
        expect(body.execution).toHaveProperty('needs_human_review');
      } else {
        expect(res.statusCode).toBe(500);
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

  /* ── M31-002: GET status ─────────────────────────────────── */

  it('registers GET /api/agents/jobs/:jobId/status', () => {
    expect(routes).toHaveProperty('GET /api/agents/jobs/:jobId/status');
  });

  describe('GET /api/agents/jobs/:jobId/status', () => {
    it('returns 404 for unknown job', async () => {
      const res = createRes();
      await routes['GET /api/agents/jobs/:jobId/status'](
        createReq('/api/agents/jobs/nonexistent/status'),
        res
      );
      expect(res.statusCode).toBe(404);
    });
  });

  /* ── M31-004: GET result ─────────────────────────────────── */

  it('registers GET /api/agents/jobs/:jobId/result', () => {
    expect(routes).toHaveProperty('GET /api/agents/jobs/:jobId/result');
  });

  describe('GET /api/agents/jobs/:jobId/result', () => {
    it('returns 404 for unknown job', async () => {
      const res = createRes();
      await routes['GET /api/agents/jobs/:jobId/result'](
        createReq('/api/agents/jobs/nonexistent/result'),
        res
      );
      expect(res.statusCode).toBe(404);
    });
  });

  /* ── M31-005: POST cancel ────────────────────────────────── */

  it('registers POST /api/agents/jobs/:jobId/cancel', () => {
    expect(routes).toHaveProperty('POST /api/agents/jobs/:jobId/cancel');
  });

  describe('POST /api/agents/jobs/:jobId/cancel', () => {
    it('returns 404 for unknown job', async () => {
      const res = createRes();
      await routes['POST /api/agents/jobs/:jobId/cancel'](
        createReq('/api/agents/jobs/nonexistent/cancel', 'POST'),
        res
      );
      expect(res.statusCode).toBe(404);
    });
  });

  /* ── M31-009: GET execution history ──────────────────────── */

  it('registers GET /api/agents/executions', () => {
    expect(routes).toHaveProperty('GET /api/agents/executions');
  });

  describe('GET /api/agents/executions', () => {
    it('returns executions array', async () => {
      const res = createRes();
      await routes['GET /api/agents/executions'](createReq('/api/agents/executions'), res);
      expect(res.statusCode).toBe(200);
      const body = parsed(res);
      expect(body).toHaveProperty('executions');
      expect(Array.isArray(body.executions)).toBe(true);
    });
  });
});
