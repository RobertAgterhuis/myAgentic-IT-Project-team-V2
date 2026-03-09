'use strict';
/* SP-6: Observability tests — Health endpoint (TECH-07) + Metrics persistence (TECH-05).
 * Uses InMemoryStore to avoid filesystem side effects. */

const http = require('http');
const path = require('path');
const { InMemoryStore, setStore } = require('../../webapp/store');
const {
  server, _cache, _metrics, flushMetrics, loadMetrics, METRICS_FILE,
  recordMetric,
} = require('../../webapp/server');

const WEBAPP_DIR    = path.resolve(__dirname, '../../webapp');
const PROJECT_ROOT  = path.resolve(WEBAPP_DIR, '..', '..');
const BUSINESS_DOCS = path.join(PROJECT_ROOT, 'BusinessDocs');
const GITHUB_DOCS   = path.join(PROJECT_ROOT, '.github', 'docs');
const SESSION_DIR   = path.join(GITHUB_DOCS, 'session');
const SESSION_FILE  = path.join(SESSION_DIR, 'session-state.json');
const DECISIONS_FILE = path.join(GITHUB_DOCS, 'decisions.md');
const HELP_DIR       = path.join(PROJECT_ROOT, '.github', 'help');
const PKG_PATH       = path.resolve(WEBAPP_DIR, '..', 'package.json');

let baseUrl;

function req(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: {} };
    if (body !== undefined) {
      const data = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const r = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let json;
        try { json = JSON.parse(text); } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

const SESSION_STATE = {
  session_id: 'test-session', cycle_type: 'FULL_CREATE', status: 'IN_PROGRESS',
  current_phase: 'PHASE-2', current_agent: '05-software-architect',
  initiated_at: '2025-01-01T00:00:00Z', last_updated: '2025-01-02T00:00:00Z',
  completed_phases: ['ONBOARDING', 'PHASE-1'], completed_agents: ['25-onboarding-agent'],
  phase_outputs: {}, sprint_backlog: { total_sprints: 3, sprint_statuses: { 'SP-1': 'DONE' } },
};

const DECISIONS_MD = `# Decisions & Open Questions\n\n---\n\n## Open Questions\n\n| ID | Priority | Scope | Question | Your answer | Date |\n|----|-----------|-------|-------|---------------|-------|\n\n---\n\n## Decided Items\n\n### Operational Decisions\n\n| ID | Priority | Scope | Decision | Notes | Date |\n|----|-----------|-------|-----------|-------------|-------|\n\n---\n\n## Deferred & Expired\n\n| ID | Status | Scope | Subject | Reason | Date |\n|----|--------|-------|---------|--------|------|\n\n---\n\n## Audit Trail\n`;

function seedStore() {
  const helpPath = path.join(HELP_DIR, 'getting-started.md');
  return new InMemoryStore({
    [SESSION_FILE]: JSON.stringify(SESSION_STATE),
    [DECISIONS_FILE]: DECISIONS_MD,
    [helpPath]: '# Getting Started\n\nWelcome.',
    [PKG_PATH]: JSON.stringify({ name: 'test-app', version: '1.0.0' }),
  });
}

beforeAll(async () => {
  await new Promise((resolve) => {
    if (server.listening) return resolve();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
  if (!baseUrl) {
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  }
});

afterAll(async () => {
  // Don't close shared server — other test files may use it
});

beforeEach(() => {
  setStore(seedStore());
  _cache.invalidateAll();
});

afterEach(() => {
  setStore(new InMemoryStore());
});

/* ══════════════════════════════════════════════════════════════════
   TECH-07 — /health endpoint
   ══════════════════════════════════════════════════════════════════ */

describe('TECH-07: GET /health', () => {
  it('returns 200 with status ok', async () => {
    const r = await req('GET', '/health');
    expect(r.status).toBe(200);
    expect(r.json.status).toBe('ok');
  });

  it('includes version field', async () => {
    const r = await req('GET', '/health');
    expect(r.json).toHaveProperty('version');
    expect(typeof r.json.version).toBe('string');
    expect(r.json.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('includes uptime as non-negative number', async () => {
    const r = await req('GET', '/health');
    expect(typeof r.json.uptime).toBe('number');
    expect(r.json.uptime).toBeGreaterThanOrEqual(0);
  });

  it('includes store_status', async () => {
    const r = await req('GET', '/health');
    expect(r.json).toHaveProperty('store_status');
    expect(['ok', 'degraded']).toContain(r.json.store_status);
  });

  it('responds within 100ms', async () => {
    const start = Date.now();
    await req('GET', '/health');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});

describe('TECH-07: GET /api/health', () => {
  it('returns 200 with full health payload', async () => {
    const r = await req('GET', '/api/health');
    expect(r.status).toBe(200);
    expect(r.json.status).toBe('ok');
    expect(r.json).toHaveProperty('version');
    expect(r.json).toHaveProperty('uptime');
    expect(r.json).toHaveProperty('store_status');
    expect(r.json).toHaveProperty('sse_connections');
    expect(r.json).toHaveProperty('timestamp');
  });

  it('version matches package.json', async () => {
    const r = await req('GET', '/api/health');
    expect(r.json.version).toBe('1.0.0');
  });

  it('timestamp is valid ISO string', async () => {
    const r = await req('GET', '/api/health');
    const d = new Date(r.json.timestamp);
    expect(d.toISOString()).toBe(r.json.timestamp);
  });

  it('store_status is ok with functional store', async () => {
    const r = await req('GET', '/api/health');
    expect(r.json.store_status).toBe('ok');
  });

  it('responds within 100ms', async () => {
    const start = Date.now();
    await req('GET', '/api/health');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});

/* ══════════════════════════════════════════════════════════════════
   TECH-05 — Persistent metrics + structured logging
   ══════════════════════════════════════════════════════════════════ */

describe('TECH-05: flushMetrics()', () => {
  it('writes metrics file to disk', () => {
    const store = seedStore();
    setStore(store);
    _metrics.requestCount = 42;
    _metrics.errorCount = 3;
    _metrics.fileOpsCount = 7;
    flushMetrics();
    expect(store.exists(METRICS_FILE)).toBe(true);
    const data = JSON.parse(store.readFile(METRICS_FILE));
    expect(data.requestCount).toBe(42);
    expect(data.errorCount).toBe(3);
    expect(data.fileOpsCount).toBe(7);
    expect(data).toHaveProperty('flushed_at');
  });

  it('persists per-endpoint data', () => {
    const store = seedStore();
    setStore(store);
    _metrics.perEndpoint['GET /api/test'] = { count: 5, times: [10, 20, 30] };
    flushMetrics();
    const data = JSON.parse(store.readFile(METRICS_FILE));
    expect(data.perEndpoint['GET /api/test']).toBeDefined();
    expect(data.perEndpoint['GET /api/test'].count).toBe(5);
    expect(data.perEndpoint['GET /api/test'].times).toEqual([10, 20, 30]);
  });

  it('persists responseTimes (capped at METRICS_MAX_SAMPLES)', () => {
    const store = seedStore();
    setStore(store);
    _metrics.responseTimes = Array.from({ length: 1500 }, (_, i) => i);
    flushMetrics();
    const data = JSON.parse(store.readFile(METRICS_FILE));
    expect(data.responseTimes.length).toBeLessThanOrEqual(1000);
  });

  it('does not throw if store.mkdirp fails', () => {
    // Use a store that doesn't have the metrics dir
    const store = new InMemoryStore();
    setStore(store);
    // Should not throw — flushMetrics has try/catch
    expect(() => flushMetrics()).not.toThrow();
  });
});

describe('TECH-05: loadMetrics()', () => {
  it('restores counters from persisted file', () => {
    const store = seedStore();
    const saved = {
      requestCount: 100,
      errorCount: 10,
      fileOpsCount: 25,
      perEndpoint: { 'POST /api/save': { count: 50, times: [5, 10] } },
    };
    store.writeFile(METRICS_FILE, JSON.stringify(saved));
    setStore(store);

    // Reset in-memory metrics
    _metrics.requestCount = 0;
    _metrics.errorCount = 0;
    _metrics.fileOpsCount = 0;
    _metrics.perEndpoint = {};

    loadMetrics();

    expect(_metrics.requestCount).toBe(100);
    expect(_metrics.errorCount).toBe(10);
    expect(_metrics.fileOpsCount).toBe(25);
    expect(_metrics.perEndpoint['POST /api/save'].count).toBe(50);
  });

  it('handles missing metrics file gracefully', () => {
    setStore(new InMemoryStore());
    _metrics.requestCount = 5;
    loadMetrics(); // Should not throw, should not reset
    expect(_metrics.requestCount).toBe(5);
  });

  it('handles corrupted metrics file gracefully', () => {
    const store = seedStore();
    store.writeFile(METRICS_FILE, '{invalid json!!!');
    setStore(store);
    _metrics.requestCount = 5;
    loadMetrics(); // Should not throw
    expect(_metrics.requestCount).toBe(5); // Unchanged
  });

  it('caps restored perEndpoint times at METRICS_MAX_SAMPLES', () => {
    const store = seedStore();
    const bigTimes = Array.from({ length: 2000 }, (_, i) => i);
    store.writeFile(METRICS_FILE, JSON.stringify({
      requestCount: 1,
      perEndpoint: { 'GET /test': { count: 2000, times: bigTimes } },
    }));
    setStore(store);
    _metrics.perEndpoint = {};
    loadMetrics();
    expect(_metrics.perEndpoint['GET /test'].times.length).toBeLessThanOrEqual(1000);
  });
});

describe('TECH-05: POST /api/metrics/flush', () => {
  it('triggers flush and returns ok', async () => {
    const store = seedStore();
    setStore(store);
    _cache.invalidateAll();
    const r = await req('POST', '/api/metrics/flush');
    expect(r.status).toBe(200);
    expect(r.json.ok).toBe(true);
    expect(r.json).toHaveProperty('flushed_at');
    // Verify file was actually written
    expect(store.exists(METRICS_FILE)).toBe(true);
  });
});

describe('TECH-05: Metrics survive restart (round-trip)', () => {
  it('flush then load preserves all counters', () => {
    const store = seedStore();
    setStore(store);

    // Set known values
    _metrics.requestCount = 999;
    _metrics.errorCount = 42;
    _metrics.fileOpsCount = 77;
    _metrics.perEndpoint = {
      'GET /api/health': { count: 100, times: [1, 2, 3] },
    };
    _metrics.responseTimes = [10, 20, 30, 40, 50];

    // Flush to disk
    flushMetrics();

    // Reset in-memory (simulates restart)
    _metrics.requestCount = 0;
    _metrics.errorCount = 0;
    _metrics.fileOpsCount = 0;
    _metrics.perEndpoint = {};
    _metrics.responseTimes = [];

    // Load from disk
    loadMetrics();

    expect(_metrics.requestCount).toBe(999);
    expect(_metrics.errorCount).toBe(42);
    expect(_metrics.fileOpsCount).toBe(77);
    expect(_metrics.perEndpoint['GET /api/health'].count).toBe(100);
  });
});

describe('TECH-05: Structured logging format', () => {
  it('structuredLog exists and is callable', () => {
    const { structuredLog } = require('../../webapp/server');
    expect(typeof structuredLog).toBe('function');
  });

  it('request timing is captured in metrics via recordMetric', () => {
    const before = _metrics.requestCount;
    recordMetric('GET', '/api/observability-test', 15, 200);
    expect(_metrics.requestCount).toBe(before + 1);
    expect(_metrics.perEndpoint['GET /api/observability-test']).toBeDefined();
    expect(_metrics.perEndpoint['GET /api/observability-test'].times).toContain(15);
  });
});

describe('TECH-05: GET /api/metrics includes all required fields', () => {
  it('response contains all metric fields', async () => {
    // Generate traffic first
    await req('GET', '/api/health');
    await req('GET', '/api/health');
    const r = await req('GET', '/api/metrics');
    expect(r.status).toBe(200);
    expect(r.json).toHaveProperty('uptime_seconds');
    expect(r.json).toHaveProperty('request_count');
    expect(r.json).toHaveProperty('error_count');
    expect(r.json).toHaveProperty('error_rate');
    expect(r.json).toHaveProperty('response_time_p50');
    expect(r.json).toHaveProperty('response_time_p95');
    expect(r.json).toHaveProperty('response_time_p99');
    expect(r.json).toHaveProperty('sse_connections');
    expect(r.json).toHaveProperty('file_ops_count');
    expect(r.json).toHaveProperty('cache_hit_ratio');
    expect(r.json).toHaveProperty('per_endpoint');
    expect(typeof r.json.per_endpoint).toBe('object');
  });
});
