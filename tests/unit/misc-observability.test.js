// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { registerObservabilityRoutes } = require('../../src/webapp/routes/misc-observability');

function createFakeApp() {
  const routes = new Map();
  const add = (method) => (route, optsOrHandler, maybeHandler) => {
    const handler = typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler;
    routes.set(`${method} ${route}`, handler);
  };
  return {
    routes,
    get: add('GET'),
    post: add('POST'),
  };
}

function createReply() {
  const raw = {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    writeHead(code, headers) {
      this.statusCode = code;
      this.headers = headers;
    },
    write(chunk) {
      this.body = (this.body || '') + chunk;
    },
    end(body) {
      if (body !== undefined) this.body = body;
    },
  };

  return {
    raw,
    payload: undefined,
    statusCode: 200,
    hijacked: false,
    code(c) {
      this.statusCode = c;
      return this;
    },
    send(body) {
      this.payload = body;
      return this;
    },
    hijack() {
      this.hijacked = true;
    },
  };
}

describe('registerObservabilityRoutes', () => {
  it('registers events and metrics endpoints', () => {
    const app = createFakeApp();
    registerObservabilityRoutes({
      app,
      sseManager: { size: 0, addClient: () => {} },
      metrics: {
        startedAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        responseTimes: [],
        fileOpsCount: 0,
        perEndpoint: {},
      },
      cache: {},
      computePercentiles: () => ({ p50: 0, p95: 0, p99: 0 }),
      flushMetrics: () => {},
    });

    expect(app.routes.has('GET /api/events')).toBe(true);
    expect(app.routes.has('GET /api/metrics')).toBe(true);
    expect(app.routes.has('POST /api/metrics/flush')).toBe(true);
  });

  it('returns metrics payload shape', async () => {
    const app = createFakeApp();
    registerObservabilityRoutes({
      app,
      sseManager: { size: 2, addClient: () => {} },
      metrics: {
        startedAt: Date.now() - 5000,
        requestCount: 10,
        errorCount: 1,
        responseTimes: [10, 20, 30],
        fileOpsCount: 4,
        perEndpoint: { 'GET /api/health': { count: 2, times: [4, 8] } },
      },
      cache: { stats: () => ({ hits: 3, misses: 1 }) },
      computePercentiles: () => ({ p50: 10, p95: 20, p99: 30 }),
      flushMetrics: () => {},
    });

    const handler = app.routes.get('GET /api/metrics');
    const reply = createReply();
    await handler({}, reply);

    expect(reply.payload.request_count).toBe(10);
    expect(reply.payload.error_count).toBe(1);
    expect(reply.payload.sse_connections).toBe(2);
    expect(reply.payload.per_endpoint['GET /api/health'].count).toBe(2);
  });

  it('returns 503 when SSE client limit is reached', async () => {
    const app = createFakeApp();
    registerObservabilityRoutes({
      app,
      sseManager: { size: 50, addClient: () => {} },
      metrics: {
        startedAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        responseTimes: [],
        fileOpsCount: 0,
        perEndpoint: {},
      },
      cache: {},
      computePercentiles: () => ({ p50: 0, p95: 0, p99: 0 }),
      flushMetrics: () => {},
    });

    const handler = app.routes.get('GET /api/events');
    const reply = createReply();
    await handler({ raw: {} }, reply);

    expect(reply.statusCode).toBe(503);
    expect(reply.payload.code).toBe('INTERNAL_ERROR');
  });

  it('opens SSE stream and hijacks reply when under limit', async () => {
    const app = createFakeApp();
    const addClient = vi.fn();
    registerObservabilityRoutes({
      app,
      sseManager: { size: 1, addClient },
      metrics: {
        startedAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        responseTimes: [],
        fileOpsCount: 0,
        perEndpoint: {},
      },
      cache: {},
      computePercentiles: () => ({ p50: 0, p95: 0, p99: 0 }),
      flushMetrics: () => {},
    });

    const handler = app.routes.get('GET /api/events');
    const reply = createReply();
    await handler({ raw: { id: 'req-1' } }, reply);

    expect(reply.raw.statusCode).toBe(200);
    expect(reply.raw.headers['Content-Type']).toBe('text/event-stream');
    expect(reply.raw.body).toContain('event: connected');
    expect(addClient).toHaveBeenCalledTimes(1);
    expect(reply.hijacked).toBe(true);
  });

  it('flushes metrics via POST endpoint', async () => {
    const app = createFakeApp();
    const flushMetrics = vi.fn();
    registerObservabilityRoutes({
      app,
      sseManager: { size: 0, addClient: () => {} },
      metrics: {
        startedAt: Date.now(),
        requestCount: 0,
        errorCount: 0,
        responseTimes: [],
        fileOpsCount: 0,
        perEndpoint: {},
      },
      cache: {},
      computePercentiles: () => ({ p50: 0, p95: 0, p99: 0 }),
      flushMetrics,
    });

    const handler =
      app.routes.get('POST /api/metrics/flush') || app.routes.get('POST /api/metrics/flush');
    const reply = createReply();
    await handler({}, reply);

    expect(flushMetrics).toHaveBeenCalledTimes(1);
    expect(reply.payload.ok).toBe(true);
    expect(typeof reply.payload.flushed_at).toBe('string');
  });

  it('handles empty metrics and missing cache stats', async () => {
    const app = createFakeApp();
    registerObservabilityRoutes({
      app,
      sseManager: { size: 0, addClient: () => {} },
      metrics: {
        startedAt: Date.now() - 1000,
        requestCount: 0,
        errorCount: 0,
        responseTimes: [],
        fileOpsCount: 0,
        perEndpoint: {},
      },
      cache: {},
      computePercentiles: () => ({ p50: 0, p95: 0, p99: 0 }),
      flushMetrics: () => {},
    });

    const handler = app.routes.get('GET /api/metrics');
    const reply = createReply();
    await handler({}, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.error_rate).toBe(0);
    expect(reply.payload.cache_hit_ratio).toBe(0);
    expect(reply.payload.per_endpoint).toEqual({});
  });
});
