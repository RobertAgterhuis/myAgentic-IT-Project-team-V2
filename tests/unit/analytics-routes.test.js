'use strict';

/**
 * Analytics API Routes — Unit Tests (M7 / Issue #375)
 *
 * Tests the 4 analytics endpoints:
 *   GET /api/v1/analytics/trends
 *   GET /api/v1/analytics/agents
 *   GET /api/v1/analytics/metrics
 *   GET /api/v1/analytics/metrics/:name
 */

const path = require('path');
const { InMemoryStore, setStore, getStore } = require('../../src/webapp/store');
const createAnalyticsRoutes = require('../../src/webapp/routes/analytics');
const {
  createMetricsStore,
  ensureMetric,
  appendMetric,
  serializeMetricsStore,
  recordAgentPerformance,
} = require('../../platform/sdlc/observability');

// ─── Helpers ─────────────────────────────────────────────────

function createReq(url, method = 'GET') {
  return {
    url,
    method,
    headers: { host: 'localhost:3001' },
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
    write(data) {
      res.body += data;
    },
  };
  return res;
}

// ─── Tests ───────────────────────────────────────────────────

describe('Analytics API routes (M7 #375)', () => {
  let routes;

  beforeEach(() => {
    const store = new InMemoryStore();
    setStore(store);
    routes = createAnalyticsRoutes({ PROJECT_ROOT: '' });
  });

  // ── GET /api/v1/analytics/trends ─────────────

  describe('GET /api/v1/analytics/trends', () => {
    it('returns 200 with empty data when no metrics exist', () => {
      const handler = routes['GET /api/v1/analytics/trends'];
      expect(handler).toBeDefined();

      const res = createRes();
      handler(createReq('/api/v1/analytics/trends'), res);

      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.velocity).toEqual([]);
    });

    it('returns velocity trends from sprint history', () => {
      const velocityLog = JSON.stringify({
        sprints: [
          { sprint_id: 'SP-1', date: '2025-01-15', planned_items: 10, completed_items: 8 },
          { sprint_id: 'SP-2', date: '2025-02-01', planned_items: 12, completed_items: 11 },
        ],
      });

      const st = getStore();
      st.writeFile(path.resolve('BusinessDocs/retrospectives/velocity-log.json'), velocityLog);

      const handler = routes['GET /api/v1/analytics/trends'];
      const res = createRes();
      handler(createReq('/api/v1/analytics/trends'), res);

      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.data.velocity).toHaveLength(2);
      expect(body.data.velocity[0].sprint_id).toBe('SP-1');
    });
  });

  // ── GET /api/v1/analytics/agents ─────────────

  describe('GET /api/v1/analytics/agents', () => {
    it('returns 200 with empty data when no agent metrics exist', () => {
      const handler = routes['GET /api/v1/analytics/agents'];
      const res = createRes();
      handler(createReq('/api/v1/analytics/agents'), res);

      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('returns agent stats when metrics exist', () => {
      const metricsStore = createMetricsStore();
      recordAgentPerformance(metricsStore, {
        agent_id: 'BA-01',
        agent_name: 'Business Analyst',
        state: 'P1',
        started_at: '',
        ended_at: '',
        duration_ms: 5000,
        success: true,
        attempt: 1,
      });

      const st = getStore();
      st.writeFile(
        path.resolve('BusinessDocs/metrics/time-series-metrics.json'),
        serializeMetricsStore(metricsStore)
      );

      const handler = routes['GET /api/v1/analytics/agents'];
      const res = createRes();
      handler(createReq('/api/v1/analytics/agents'), res);

      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.count).toBe(1);
      expect(body.data[0].agent_id).toBe('BA-01');
    });
  });

  // ── GET /api/v1/analytics/metrics ────────────

  describe('GET /api/v1/analytics/metrics', () => {
    it('returns 200 with empty metrics list', () => {
      const handler = routes['GET /api/v1/analytics/metrics'];
      const res = createRes();
      handler(createReq('/api/v1/analytics/metrics'), res);

      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.data).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('lists all metric series with summary', () => {
      const metricsStore = createMetricsStore();
      appendMetric(metricsStore, 'cpu', 'pct', 80);
      appendMetric(metricsStore, 'cpu', 'pct', 95);
      appendMetric(metricsStore, 'mem', 'mb', 1024);

      const st = getStore();
      st.writeFile(
        path.resolve('BusinessDocs/metrics/time-series-metrics.json'),
        serializeMetricsStore(metricsStore)
      );

      const handler = routes['GET /api/v1/analytics/metrics'];
      const res = createRes();
      handler(createReq('/api/v1/analytics/metrics'), res);

      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.count).toBe(2);
      const cpuMetric = body.data.find((m) => m.name === 'cpu');
      expect(cpuMetric.data_points_count).toBe(2);
      expect(cpuMetric.unit).toBe('pct');
    });
  });

  // ── GET /api/v1/analytics/metrics/:name ──────

  describe('GET /api/v1/analytics/metrics/:name', () => {
    it('returns 404 for non-existent metric', () => {
      const metricsStore = createMetricsStore();
      appendMetric(metricsStore, 'other', 'x', 1);

      const st = getStore();
      st.writeFile(
        path.resolve('BusinessDocs/metrics/time-series-metrics.json'),
        serializeMetricsStore(metricsStore)
      );

      const handler = routes['GET /api/v1/analytics/metrics/:name'];
      const res = createRes();
      handler(createReq('/api/v1/analytics/metrics/nonexistent'), res);

      expect(res.statusCode).toBe(404);
    });

    it('returns data points for an existing metric', () => {
      const metricsStore = createMetricsStore();
      const m = ensureMetric(metricsStore, 'latency', 'ms');
      m.data_points = [
        { timestamp: '2025-01-01T00:00:00Z', value: 100 },
        { timestamp: '2025-01-02T00:00:00Z', value: 200 },
      ];

      const st = getStore();
      st.writeFile(
        path.resolve('BusinessDocs/metrics/time-series-metrics.json'),
        serializeMetricsStore(metricsStore)
      );

      const handler = routes['GET /api/v1/analytics/metrics/:name'];
      const res = createRes();
      handler(createReq('/api/v1/analytics/metrics/latency'), res);

      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.data.name).toBe('latency');
      expect(body.data.data_points).toHaveLength(2);
      expect(body.data.total_count).toBe(2);
    });

    it('filters by from and to query params', () => {
      const metricsStore = createMetricsStore();
      const m = ensureMetric(metricsStore, 'latency', 'ms');
      m.data_points = [
        { timestamp: '2025-01-01T00:00:00Z', value: 100 },
        { timestamp: '2025-01-02T00:00:00Z', value: 200 },
        { timestamp: '2025-01-03T00:00:00Z', value: 300 },
      ];

      const st = getStore();
      st.writeFile(
        path.resolve('BusinessDocs/metrics/time-series-metrics.json'),
        serializeMetricsStore(metricsStore)
      );

      const handler = routes['GET /api/v1/analytics/metrics/:name'];
      const res = createRes();
      handler(
        createReq(
          '/api/v1/analytics/metrics/latency?from=2025-01-02T00:00:00Z&to=2025-01-02T23:59:59Z'
        ),
        res
      );

      const body = JSON.parse(res.body);
      expect(body.ok).toBe(true);
      expect(body.data.filtered_count).toBe(1);
      expect(body.data.data_points[0].value).toBe(200);
    });
  });
});
