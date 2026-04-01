/* M30-007: Observability integration tests via Fastify inject().
 * Replaces observability.test.js (raw HTTP) with framework-native testing.
 * Tests Health endpoint (TECH-07) + Metrics persistence (TECH-05). */

const path = require('path');
const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { createTestApp, paths } = require('../helpers/create-test-app');

const { SESSION_FILE, DECISIONS_FILE, HELP_DIR, METRICS_FILE, PROJECT_ROOT } = paths;
const PKG_PATH = path.join(PROJECT_ROOT, 'package.json');

let app;

/* ── Fixtures ─────────────────────────────────────────────────── */

const SESSION_STATE = {
  session_id: 'test-session',
  cycle_type: 'FULL_CREATE',
  status: 'IN_PROGRESS',
  current_phase: 'PHASE-2',
  current_agent: '05-software-architect',
  initiated_at: '2025-01-01T00:00:00Z',
  last_updated: '2025-01-02T00:00:00Z',
  completed_phases: ['ONBOARDING', 'PHASE-1'],
  completed_agents: ['25-onboarding-agent'],
  phase_outputs: {},
  sprint_backlog: { total_sprints: 3, sprint_statuses: { 'SP-1': 'DONE' } },
};

const DECISIONS_MD = `# Decisions & Open Questions\n\n---\n\n## Open Questions\n\n| ID | Priority | Scope | Question | Your answer | Date |\n|----|-----------|-------|-------|---------------|-------|\n\n---\n\n## Decided Items\n\n### Operational Decisions\n\n| ID | Priority | Scope | Decision | Notes | Date |\n|----|-----------|-------|-----------|-------------|-------|\n\n---\n\n## Deferred & Expired\n\n| ID | Status | Scope | Subject | Reason | Date |\n|----|--------|-------|---------|--------|------|\n\n---\n\n## Audit Trail\n`;

function seedFiles() {
  const helpPath = path.join(HELP_DIR, 'getting-started.md');
  return {
    [SESSION_FILE]: JSON.stringify(SESSION_STATE),
    [DECISIONS_FILE]: DECISIONS_MD,
    [helpPath]: '# Getting Started\n\nWelcome.',
    [PKG_PATH]: JSON.stringify({ name: 'test-app', version: '1.0.0' }),
  };
}

/* ── Lifecycle ────────────────────────────────────────────────── */

beforeAll(async () => {
  app = await createTestApp(seedFiles());
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  setStore(new InMemoryStore(seedFiles()));
  app._cache.invalidateAll();
});

afterEach(() => {
  setStore(new InMemoryStore());
});

/* ── Helper ───────────────────────────────────────────────────── */

function inject(method, url, payload) {
  const opts = { method, url };
  if (payload !== undefined) {
    opts.payload = payload;
    opts.headers = { 'content-type': 'application/json' };
  }
  return app.inject(opts);
}

/* ══════════════════════════════════════════════════════════════════
   TECH-07 — /health endpoint
   ══════════════════════════════════════════════════════════════════ */

describe('TECH-07: GET /health', () => {
  it('returns 200 with status ok', async () => {
    const r = await inject('GET', '/health');
    expect(r.statusCode).toBe(200);
    expect(r.json().status).toBe('ok');
  });

  it('includes version field', async () => {
    const r = await inject('GET', '/health');
    expect(r.json()).toHaveProperty('version');
    expect(typeof r.json().version).toBe('string');
    expect(r.json().version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('includes uptime as non-negative number', async () => {
    const r = await inject('GET', '/health');
    expect(typeof r.json().uptime).toBe('number');
    expect(r.json().uptime).toBeGreaterThanOrEqual(0);
  });

  it('includes store_status', async () => {
    const r = await inject('GET', '/health');
    expect(r.json()).toHaveProperty('store_status');
    expect(['ok', 'degraded']).toContain(r.json().store_status);
  });
});

describe('TECH-07: GET /api/health', () => {
  it('returns 200 with full health payload', async () => {
    const r = await inject('GET', '/api/health');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('store_status');
    expect(body).toHaveProperty('sse_connections');
    expect(body).toHaveProperty('timestamp');
  });

  it('version matches seeded package.json', async () => {
    const r = await inject('GET', '/api/health');
    expect(r.json().version).toBe('1.0.0');
  });

  it('timestamp is valid ISO string', async () => {
    const r = await inject('GET', '/api/health');
    const d = new Date(r.json().timestamp);
    expect(d.toISOString()).toBe(r.json().timestamp);
  });

  it('store_status is ok with functional store', async () => {
    const r = await inject('GET', '/api/health');
    expect(r.json().store_status).toBe('ok');
  });
});

/* ══════════════════════════════════════════════════════════════════
   TECH-05 — Persistent metrics + structured logging
   ══════════════════════════════════════════════════════════════════ */

describe('TECH-05: metricsCollector flush()', () => {
  it('writes metrics file to disk', () => {
    const store = new InMemoryStore(seedFiles());
    setStore(store);
    app._metrics.requestCount = 42;
    app._metrics.errorCount = 3;
    app._metrics.fileOpsCount = 7;
    app._metricsCollector.flush();
    expect(store.exists(METRICS_FILE)).toBe(true);
    const data = JSON.parse(store.readFile(METRICS_FILE));
    expect(data.requestCount).toBe(42);
    expect(data.errorCount).toBe(3);
    expect(data.fileOpsCount).toBe(7);
    expect(data).toHaveProperty('flushed_at');
  });

  it('persists per-endpoint data', () => {
    const store = new InMemoryStore(seedFiles());
    setStore(store);
    app._metrics.perEndpoint['GET /api/test'] = { count: 5, times: [10, 20, 30] };
    app._metricsCollector.flush();
    const data = JSON.parse(store.readFile(METRICS_FILE));
    expect(data.perEndpoint['GET /api/test']).toBeDefined();
    expect(data.perEndpoint['GET /api/test'].count).toBe(5);
    expect(data.perEndpoint['GET /api/test'].times).toEqual([10, 20, 30]);
  });

  it('persists responseTimes (capped at METRICS_MAX_SAMPLES)', () => {
    const store = new InMemoryStore(seedFiles());
    setStore(store);
    app._metrics.responseTimes = Array.from({ length: 1500 }, (_, i) => i);
    app._metricsCollector.flush();
    const data = JSON.parse(store.readFile(METRICS_FILE));
    expect(data.responseTimes.length).toBeLessThanOrEqual(1000);
  });

  it('does not throw if store.mkdirp fails', () => {
    setStore(new InMemoryStore());
    expect(() => app._metricsCollector.flush()).not.toThrow();
  });
});

describe('TECH-05: metricsCollector load()', () => {
  it('restores counters from persisted file', () => {
    const store = new InMemoryStore(seedFiles());
    const saved = {
      requestCount: 100,
      errorCount: 10,
      fileOpsCount: 25,
      perEndpoint: { 'POST /api/save': { count: 50, times: [5, 10] } },
    };
    store.writeFile(METRICS_FILE, JSON.stringify(saved));
    setStore(store);

    app._metrics.requestCount = 0;
    app._metrics.errorCount = 0;
    app._metrics.fileOpsCount = 0;
    app._metrics.perEndpoint = {};

    app._metricsCollector.load();

    expect(app._metrics.requestCount).toBe(100);
    expect(app._metrics.errorCount).toBe(10);
    expect(app._metrics.fileOpsCount).toBe(25);
    expect(app._metrics.perEndpoint['POST /api/save'].count).toBe(50);
  });

  it('handles missing metrics file gracefully', () => {
    setStore(new InMemoryStore());
    app._metrics.requestCount = 5;
    app._metricsCollector.load();
    expect(app._metrics.requestCount).toBe(5);
  });

  it('handles corrupted metrics file gracefully', () => {
    const store = new InMemoryStore(seedFiles());
    store.writeFile(METRICS_FILE, '{invalid json!!!');
    setStore(store);
    app._metrics.requestCount = 5;
    app._metricsCollector.load();
    expect(app._metrics.requestCount).toBe(5);
  });

  it('caps restored perEndpoint times at METRICS_MAX_SAMPLES', () => {
    const store = new InMemoryStore(seedFiles());
    const bigTimes = Array.from({ length: 2000 }, (_, i) => i);
    store.writeFile(
      METRICS_FILE,
      JSON.stringify({
        requestCount: 1,
        perEndpoint: { 'GET /test': { count: 2000, times: bigTimes } },
      })
    );
    setStore(store);
    app._metrics.perEndpoint = {};
    app._metricsCollector.load();
    expect(app._metrics.perEndpoint['GET /test'].times.length).toBeLessThanOrEqual(1000);
  });
});

describe('TECH-05: POST /api/metrics/flush', () => {
  it('triggers flush and returns ok', async () => {
    const store = new InMemoryStore(seedFiles());
    setStore(store);
    app._cache.invalidateAll();
    const r = await inject('POST', '/api/metrics/flush');
    expect(r.statusCode).toBe(200);
    expect(r.json().ok).toBe(true);
    expect(r.json()).toHaveProperty('flushed_at');
    expect(store.exists(METRICS_FILE)).toBe(true);
  });
});

describe('TECH-05: Metrics survive restart (round-trip)', () => {
  it('flush then load preserves all counters', () => {
    const store = new InMemoryStore(seedFiles());
    setStore(store);

    app._metrics.requestCount = 999;
    app._metrics.errorCount = 42;
    app._metrics.fileOpsCount = 77;
    app._metrics.perEndpoint = {
      'GET /api/health': { count: 100, times: [1, 2, 3] },
    };
    app._metrics.responseTimes = [10, 20, 30, 40, 50];

    app._metricsCollector.flush();

    app._metrics.requestCount = 0;
    app._metrics.errorCount = 0;
    app._metrics.fileOpsCount = 0;
    app._metrics.perEndpoint = {};
    app._metrics.responseTimes = [];

    app._metricsCollector.load();

    expect(app._metrics.requestCount).toBe(999);
    expect(app._metrics.errorCount).toBe(42);
    expect(app._metrics.fileOpsCount).toBe(77);
    expect(app._metrics.perEndpoint['GET /api/health'].count).toBe(100);
  });
});

describe('TECH-05: Structured logging format', () => {
  it('structuredLog exists and is callable', () => {
    const { structuredLog } = require('../../src/webapp/middleware');
    expect(typeof structuredLog).toBe('function');
  });

  it('request timing is captured in metrics via recordMetric', () => {
    const before = app._metrics.requestCount;
    app._ctx.recordMetric('GET', '/api/observability-test', 15, 200);
    expect(app._metrics.requestCount).toBe(before + 1);
    expect(app._metrics.perEndpoint['GET /api/observability-test']).toBeDefined();
    expect(app._metrics.perEndpoint['GET /api/observability-test'].times).toContain(15);
  });
});

describe('TECH-05: GET /api/metrics includes all required fields', () => {
  it('response contains all metric fields', async () => {
    await inject('GET', '/api/health');
    await inject('GET', '/api/health');
    const r = await inject('GET', '/api/metrics');
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body).toHaveProperty('uptime_seconds');
    expect(body).toHaveProperty('request_count');
    expect(body).toHaveProperty('error_count');
    expect(body).toHaveProperty('error_rate');
    expect(body).toHaveProperty('response_time_p50');
    expect(body).toHaveProperty('response_time_p95');
    expect(body).toHaveProperty('response_time_p99');
    expect(body).toHaveProperty('sse_connections');
    expect(body).toHaveProperty('file_ops_count');
    expect(body).toHaveProperty('cache_hit_ratio');
    expect(body).toHaveProperty('per_endpoint');
    expect(typeof body.per_endpoint).toBe('object');
  });
});
