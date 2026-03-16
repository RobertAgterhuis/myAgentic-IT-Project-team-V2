// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { createMetricsCollector } = require('../../src/webapp/metrics-collector');

function mockStore(files = {}) {
  const written = {};
  return {
    mkdirp: vi.fn(),
    writeFile: vi.fn((p, data) => {
      written[p] = data;
    }),
    readFile: vi.fn((p) => {
      if (files[p]) return files[p];
      throw new Error('Not found');
    }),
    exists: vi.fn((p) => !!files[p]),
    _written: written,
  };
}

describe('createMetricsCollector', () => {
  let collector;

  afterEach(() => {
    if (collector) collector.destroy();
  });

  it('records requests and increments counters', () => {
    const store = mockStore();
    collector = createMetricsCollector({ outputPath: '/tmp/metrics.json', store });
    collector.record('GET', '/api/health', 12, 200);
    collector.record('POST', '/api/data', 45, 201);
    collector.record('GET', '/api/fail', 100, 500);

    const snap = collector.getSnapshot();
    expect(snap.requestCount).toBe(3);
    expect(snap.errorCount).toBe(1);
    expect(snap.responseTimes).toEqual([12, 45, 100]);
    expect(snap.perEndpoint['GET /api/health'].count).toBe(1);
    expect(snap.perEndpoint['GET /api/fail'].count).toBe(1);
  });

  it('caps response times at maxSamples', () => {
    const store = mockStore();
    collector = createMetricsCollector({ outputPath: '/tmp/m.json', store, maxSamples: 3 });
    for (let i = 0; i < 5; i++) {
      collector.record('GET', '/api/x', i * 10, 200);
    }
    const snap = collector.getSnapshot();
    expect(snap.responseTimes.length).toBe(3);
    expect(snap.responseTimes).toEqual([20, 30, 40]);
  });

  it('flushes metrics to disk via store', () => {
    const store = mockStore();
    collector = createMetricsCollector({ outputPath: '/tmp/m.json', store });
    collector.record('GET', '/api/test', 5, 200);
    collector.flush();
    expect(store.writeFile).toHaveBeenCalled();
    const written = JSON.parse(store._written['/tmp/m.json']);
    expect(written.requestCount).toBe(1);
    expect(written.perEndpoint['GET /api/test'].count).toBe(1);
  });

  it('restores metrics from disk on creation', () => {
    const saved = JSON.stringify({
      requestCount: 100,
      errorCount: 5,
      fileOpsCount: 42,
      perEndpoint: { 'GET /api/x': { count: 10, times: [1, 2, 3] } },
    });
    const store = mockStore({ '/tmp/m.json': saved });
    collector = createMetricsCollector({ outputPath: '/tmp/m.json', store });
    const snap = collector.getSnapshot();
    expect(snap.requestCount).toBe(100);
    expect(snap.errorCount).toBe(5);
    expect(snap.fileOpsCount).toBe(42);
    expect(snap.perEndpoint['GET /api/x'].count).toBe(10);
  });

  it('handles missing file gracefully on load', () => {
    const store = mockStore();
    expect(() => {
      collector = createMetricsCollector({ outputPath: '/tmp/m.json', store });
    }).not.toThrow();
  });

  it('computes percentiles correctly', () => {
    const store = mockStore();
    collector = createMetricsCollector({ outputPath: '/tmp/m.json', store });
    const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    const p = collector.computePercentiles(times);
    expect(p.p50).toBe(50);
    expect(p.p95).toBe(100);
    expect(p.p99).toBe(100);
  });

  it('computePercentiles returns 0 for empty array', () => {
    const store = mockStore();
    collector = createMetricsCollector({ outputPath: '/tmp/m.json', store });
    const p = collector.computePercentiles([]);
    expect(p.p50).toBe(0);
    expect(p.p95).toBe(0);
    expect(p.p99).toBe(0);
  });

  it('incrementFileOps increments counter', () => {
    const store = mockStore();
    collector = createMetricsCollector({ outputPath: '/tmp/m.json', store });
    collector.incrementFileOps();
    collector.incrementFileOps();
    expect(collector.getSnapshot().fileOpsCount).toBe(2);
  });

  it('handles corrupt file gracefully on load', () => {
    const store = mockStore({ '/tmp/m.json': 'NOT JSON' });
    expect(() => {
      collector = createMetricsCollector({ outputPath: '/tmp/m.json', store });
    }).not.toThrow();
    expect(collector.getSnapshot().requestCount).toBe(0);
  });
});
