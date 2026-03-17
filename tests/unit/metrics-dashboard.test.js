// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';
const path = require('path');
const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { FileCache } = require('../../src/webapp/cache');
const createMetricsDashboardRoutes = require('../../src/webapp/routes/metrics-dashboard');

/* ── Test data ─────────────────────────────────────────────────── */

const BUSINESS_DOCS = path.resolve('test-docs');

const velocityLog = {
  sprints: [
    {
      sprint_id: 'SP-1',
      planned_points: 20,
      realized_points: 18,
      velocity_ratio: 0.9,
      implemented: 5,
      blocked: 1,
      scope_change_excluded_points: 2,
    },
    {
      sprint_id: 'SP-2',
      planned_points: 22,
      realized_points: 22,
      velocity_ratio: 1.0,
      implemented: 6,
      blocked: 0,
      scope_change_excluded_points: 0,
    },
    {
      sprint_id: 'SP-3',
      planned_points: 25,
      realized_points: 20,
      velocity_ratio: 0.8,
      implemented: 7,
      blocked: 2,
      scope_change_excluded_points: 3,
    },
    {
      sprint_id: 'SP-4',
      planned_points: 23,
      realized_points: 24,
      velocity_ratio: 1.04,
      implemented: 8,
      blocked: 0,
      scope_change_excluded_points: 1,
    },
  ],
};

const kpiSP1 = {
  sprint_id: 'SP-1',
  measured_on: '2026-01-15T12:00:00Z',
  summary: { on_track: 5, at_risk: 1, off_track: 0, insufficient_data: 0 },
  kpis: [{ id: 'K1', status: 'on_track' }],
};

const kpiSP4 = {
  sprint: 'SP-4',
  date: '2026-02-15',
  stories: [{ id: 'S1', status: 'done' }],
  tests: { total: 100, passed: 98, failed: 2 },
  quality: { regressions: 1, security_findings: 0 },
};

function buildFiles() {
  const files = {};
  const vel = path.join(BUSINESS_DOCS, 'retrospectives', 'velocity-log.json');
  files[vel] = JSON.stringify(velocityLog);
  // "metrics" format KPI (SP-1)
  files[path.join(BUSINESS_DOCS, 'metrics', 'sprint-SP-1-kpi.json')] = JSON.stringify(kpiSP1);
  // "phase5" format KPI (SP-4)
  files[path.join(BUSINESS_DOCS, 'phase-5', 'sprint-SP-4', 'sprint-SP-4-kpi.json')] =
    JSON.stringify(kpiSP4);
  return files;
}

/* ── Helpers ────────────────────────────────────────────────────── */

function fakeReq(urlPath) {
  return { url: urlPath || '/api/metrics/dashboard', headers: { host: 'localhost:3000' } };
}

function fakeRes() {
  let _status, _body;
  const _headers = {};
  return {
    setHeader(k, v) {
      _headers[k] = v;
    },
    writeHead(s, h) {
      _status = s;
      if (h) Object.assign(_headers, h);
    },
    end(data) {
      _body = data;
    },
    get status() {
      return _status;
    },
    get json() {
      return JSON.parse(_body);
    },
  };
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('metrics-dashboard route (FEAT-01)', () => {
  let routes, handler;

  beforeEach(() => {
    const store = new InMemoryStore(buildFiles());
    setStore(store);
    const cache = new FileCache();
    routes = createMetricsDashboardRoutes({ _cache: cache, BUSINESS_DOCS });
    handler = routes['GET /api/metrics/dashboard'];
  });

  it('returns 200 with all expected top-level keys', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    expect(res.status).toBe(200);
    const data = res.json;
    const expected = [
      'velocity',
      'burnup',
      'idealBurnup',
      'kpis',
      'qualityTrend',
      'estimation',
      'rollingAverages',
      'healthScorecard',
      'deltas',
      'forecast',
      'defectDensity',
      'scopeCreep',
      'estimationHistogram',
      'riskTrend',
      'heatmapData',
      'generated_at',
    ];
    expected.forEach((key) => expect(data).toHaveProperty(key));
  });

  /* FEAT-01-A: Velocity data */
  it('returns velocity with all sprints sorted', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const v = res.json.velocity;
    expect(v).toHaveLength(4);
    expect(v[0].sprint_id).toBe('SP-1');
    expect(v[3].sprint_id).toBe('SP-4');
    expect(v[0].planned_points).toBe(20);
    expect(v[0].realized_points).toBe(18);
  });

  /* FEAT-01-B: Burnup is cumulative */
  it('returns cumulative burnup', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const b = res.json.burnup;
    expect(b).toHaveLength(4);
    expect(b[0].cumulative).toBe(18);
    expect(b[1].cumulative).toBe(40);
    expect(b[3].cumulative).toBe(84);
  });

  /* FEAT-01-K: Ideal burnup for deviation bands */
  it('returns ideal burnup line', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const ib = res.json.idealBurnup;
    expect(ib).toHaveLength(4);
    expect(ib[0]).toHaveProperty('ideal');
    expect(ib[3].ideal).toBeCloseTo(84, 0); // total delivered / 4 sprints * 4
  });

  /* FEAT-01-C: Quality trend with tests_skipped */
  it('returns quality trend with tested sprints', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const qt = res.json.qualityTrend;
    expect(qt.length).toBeGreaterThan(0);
    const sp4 = qt.find((q) => q.sprint_id === 'SP-4');
    expect(sp4).toBeTruthy();
    expect(sp4.tests_total).toBe(100);
    expect(sp4.tests_passed).toBe(98);
    expect(sp4.tests_failed).toBe(2);
    expect(sp4.tests_skipped).toBe(0); // 100 - 98 - 2
  });

  /* FEAT-01-D: Estimation data */
  it('returns estimation with planned and realized', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const e = res.json.estimation;
    expect(e).toHaveLength(4);
    expect(e[0]).toHaveProperty('planned');
    expect(e[0]).toHaveProperty('realized');
    expect(e[0]).toHaveProperty('ratio');
  });

  /* FEAT-01-E: Health scorecard */
  it('returns health scorecard with RAG statuses', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const hs = res.json.healthScorecard;
    expect(hs).toHaveLength(4);
    const sp1 = hs.find((s) => s.sprint_id === 'SP-1');
    expect(sp1).toBeTruthy();
    expect(['green', 'amber', 'red', 'grey']).toContain(sp1.velocity);
    expect(['green', 'amber', 'red', 'grey']).toContain(sp1.quality);
    expect(['green', 'amber', 'red', 'grey']).toContain(sp1.kpis);
    expect(['green', 'amber', 'red', 'grey']).toContain(sp1.overall);
    // SP-1 has velocity_ratio 0.9 → green
    expect(sp1.velocity).toBe('green');
  });

  /* FEAT-01-F: Rolling averages */
  it('returns 3-sprint rolling averages', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const ra = res.json.rollingAverages;
    expect(ra).toHaveLength(4);
    // Third sprint: avg of SP-1, SP-2, SP-3  → (18+22+20)/3 = 20
    expect(ra[2].avg_realized).toBe(20);
    expect(ra[2].window).toBe(3);
  });

  /* FEAT-01-G: Scope creep */
  it('returns scope creep data', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const sc = res.json.scopeCreep;
    expect(sc).toHaveLength(4);
    expect(sc[0].scope_change_points).toBe(2);
    expect(sc[1].scope_change_points).toBe(0);
  });

  /* FEAT-01-I: Defect density */
  it('returns defect density per SP', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const dd = res.json.defectDensity;
    expect(dd).toHaveLength(4);
    const sp4 = dd.find((d) => d.sprint_id === 'SP-4');
    expect(sp4).toBeTruthy();
    expect(sp4.regressions).toBe(1);
    // defects_per_sp = (1 + 0) / 24 = 0.04
    expect(sp4.defects_per_sp).toBeCloseTo(0.04, 2);
  });

  /* FEAT-01-M: Heatmap data */
  it('returns heatmap data with metric cells', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const hm = res.json.heatmapData;
    expect(hm).toHaveLength(4);
    expect(hm[0]).toHaveProperty('velocity_ratio');
    expect(hm[0]).toHaveProperty('test_pass_rate');
    expect(hm[0]).toHaveProperty('regressions');
    expect(hm[0]).toHaveProperty('off_track_pct');
  });

  /* FEAT-01-O: Forecast */
  it('returns velocity forecast', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const f = res.json.forecast;
    expect(f).toHaveProperty('avg_velocity');
    expect(f).toHaveProperty('total_delivered');
    expect(f.total_delivered).toBe(84);
    expect(f.avg_velocity).toBeCloseTo(21, 0);
  });

  /* FEAT-01-P: Risk trend */
  it('returns risk trend with directions', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const rt = res.json.riskTrend;
    expect(rt.length).toBeGreaterThan(0);
    rt.forEach((r) => {
      expect(['improving', 'worsening', 'stable']).toContain(r.direction);
    });
  });

  /* FEAT-01-Q: Deltas */
  it('returns sprint-over-sprint deltas', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const d = res.json.deltas;
    expect(d).toHaveLength(4);
    expect(d[0].planned_delta).toBe(0);
    expect(d[0].realized_delta).toBe(0);
    // SP-2: realized 22 - SP-1 realized 18 = +4
    expect(d[1].realized_delta).toBe(4);
  });

  /* FEAT-01-R: Estimation histogram */
  it('returns estimation histogram buckets', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const h = res.json.estimationHistogram;
    expect(h).toHaveProperty('under');
    expect(h).toHaveProperty('on_target');
    expect(h).toHaveProperty('over');
    // SP-1: 0.9 < 0.95 → under; SP-2: 1.0 → on_target; SP-3: 0.8 → under; SP-4: 1.04 → on_target
    expect(h.under).toBe(2);
    expect(h.on_target).toBe(2);
    expect(h.over).toBe(0);
  });

  /* FEAT-01-S: generated_at timestamp */
  it('includes a generated_at ISO timestamp', async () => {
    const res = fakeRes();
    await handler(fakeReq(), res);
    const ts = res.json.generated_at;
    expect(ts).toBeTruthy();
    expect(new Date(ts).getTime()).not.toBeNaN();
  });

  /* FEAT-01-U: lastN filter */
  it('filters to last N sprints when lastN query param is set', async () => {
    const res = fakeRes();
    await handler(fakeReq('/api/metrics/dashboard?lastN=2'), res);
    const data = res.json;
    expect(data.velocity).toHaveLength(2);
    expect(data.velocity[0].sprint_id).toBe('SP-3');
    expect(data.velocity[1].sprint_id).toBe('SP-4');
    expect(data.burnup).toHaveLength(2);
  });

  it('returns all sprints when lastN is 0 or absent', async () => {
    const res = fakeRes();
    await handler(fakeReq('/api/metrics/dashboard?lastN=0'), res);
    expect(res.json.velocity).toHaveLength(4);
  });

  /* Edge case: empty velocity log */
  it('handles empty velocity log gracefully', async () => {
    const emptyFiles = {};
    // No velocity-log.json at all
    const store = new InMemoryStore(emptyFiles);
    setStore(store);
    const cache = new FileCache();
    const r = createMetricsDashboardRoutes({ _cache: cache, BUSINESS_DOCS });
    const h = r['GET /api/metrics/dashboard'];
    const res = fakeRes();
    await h(fakeReq(), res);
    expect(res.status).toBe(200);
    const data = res.json;
    expect(data.velocity).toHaveLength(0);
    expect(data.burnup).toHaveLength(0);
    expect(data.forecast.avg_velocity).toBe(0);
  });

  /* ── Storage metrics in dashboard (M23-007) ──────────────────── */

  it('includes storage metrics when getStorageProvider is available', async () => {
    const store = new InMemoryStore(buildFiles());
    setStore(store);
    const cache = new FileCache();
    const fakeProvider = {
      name: 'file',
      metrics() {
        return {
          reads: 100,
          writes: 50,
          deletes: 5,
          errors: 2,
          readLatencies: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          writeLatencies: [5, 10, 15, 20],
        };
      },
    };
    const r = createMetricsDashboardRoutes({
      _cache: cache,
      BUSINESS_DOCS,
      getStorageProvider: () => fakeProvider,
    });
    const h = r['GET /api/metrics/dashboard'];
    const res = fakeRes();
    await h(fakeReq(), res);
    expect(res.status).toBe(200);
    const data = res.json;
    expect(data.storage).toBeDefined();
    expect(data.storage.provider).toBe('file');
    expect(data.storage.operations).toEqual({ reads: 100, writes: 50, deletes: 5, errors: 2 });
    expect(data.storage.latency.read.p50).toBeGreaterThan(0);
    expect(data.storage.latency.read.p95).toBeGreaterThan(0);
    expect(data.storage.latency.read.samples).toBe(10);
    expect(data.storage.latency.write.p50).toBeGreaterThan(0);
    expect(data.storage.latency.write.p95).toBeGreaterThan(0);
    expect(data.storage.latency.write.samples).toBe(4);
  });

  it('omits storage key when getStorageProvider is not in ctx', async () => {
    const store = new InMemoryStore(buildFiles());
    setStore(store);
    const cache = new FileCache();
    const r = createMetricsDashboardRoutes({ _cache: cache, BUSINESS_DOCS });
    const h = r['GET /api/metrics/dashboard'];
    const res = fakeRes();
    await h(fakeReq(), res);
    expect(res.status).toBe(200);
    expect(res.json.storage).toBeUndefined();
  });

  it('omits storage key when getStorageProvider returns null', async () => {
    const store = new InMemoryStore(buildFiles());
    setStore(store);
    const cache = new FileCache();
    const r = createMetricsDashboardRoutes({
      _cache: cache,
      BUSINESS_DOCS,
      getStorageProvider: () => null,
    });
    const h = r['GET /api/metrics/dashboard'];
    const res = fakeRes();
    await h(fakeReq(), res);
    expect(res.status).toBe(200);
    expect(res.json.storage).toBeUndefined();
  });

  it('handles metrics() throwing gracefully', async () => {
    const store = new InMemoryStore(buildFiles());
    setStore(store);
    const cache = new FileCache();
    const fakeProvider = {
      name: 'broken',
      metrics() {
        throw new Error('db locked');
      },
    };
    const r = createMetricsDashboardRoutes({
      _cache: cache,
      BUSINESS_DOCS,
      getStorageProvider: () => fakeProvider,
    });
    const h = r['GET /api/metrics/dashboard'];
    const res = fakeRes();
    await h(fakeReq(), res);
    expect(res.status).toBe(200);
    const data = res.json;
    expect(data.storage).toBeDefined();
    expect(data.storage.provider).toBe('broken');
    expect(data.storage.error).toBe('metrics_unavailable');
  });
});
