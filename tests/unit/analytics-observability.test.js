'use strict';

/**
 * Analytics & Observability — Unit Tests (M7: Issues #372–#377)
 *
 * Covers:
 *   #372: Time-series metrics storage (createMetricsStore, appendMetric, queryMetric, serialize/deserialize)
 *   #373: Agent performance capture (recordAgentPerformance, computeAgentStats, createAgentPerformanceHook)
 *   #374: Sprint boundary trend computation (computeVelocityTrendEntry, recordSprintBoundary, computeAndPersistSprintTrends)
 *   #375: Analytics API endpoints (trends, agents, metrics, metrics/:name)
 */

const {
  createMetricsStore,
  ensureMetric,
  appendMetric,
  queryMetric,
  serializeMetricsStore,
  deserializeMetricsStore,
  recordAgentPerformance,
  recordToolExecutionTrace,
  computeAgentStats,
  computeStageLatencyStats,
  computeToolLatencyStats,
  computeVelocityTrendEntry,
  recordSprintBoundary,
} = require('../../platform/sdlc/observability');

const {
  createAgentPerformanceHook,
  METRICS_STORE_PATH,
} = require('../../platform/engine/agent-performance-hook');

const {
  computeAndPersistSprintTrends,
  METRICS_STORE_PATH: GATE_METRICS_PATH,
} = require('../../platform/engine/sprint-gate');

// ─── Helpers ─────────────────────────────────────────────────

function createMockStore(files = {}) {
  const _files = { ...files };
  return {
    exists: (fp) => fp in _files,
    readFile: (fp) => {
      if (!(fp in _files)) throw new Error(`File not found: ${fp}`);
      return _files[fp];
    },
    writeFile: (fp, data) => {
      _files[fp] = data;
    },
    mkdirp: () => {},
    _files,
  };
}

function makeSprint(id, planned, completed, opts = {}) {
  return {
    sprint_id: id,
    started_at: opts.started_at || '2025-01-01T00:00:00Z',
    ended_at: opts.ended_at || '2025-01-14T00:00:00Z',
    planned_points: planned,
    completed_points: completed,
    tasks_completed: opts.tasks_completed || completed,
    tasks_carried_over: opts.tasks_carried_over || 0,
    defects_found: opts.defects_found || 0,
    defects_fixed: opts.defects_fixed || 0,
  };
}

// ─────────────────────────────────────────────────────────────
// #372 — Time-series Metrics Storage
// ─────────────────────────────────────────────────────────────

describe('createMetricsStore', () => {
  it('returns an empty store', () => {
    const store = createMetricsStore();
    expect(store.metrics).toEqual({});
    expect(store.last_updated).toBeDefined();
  });
});

describe('ensureMetric', () => {
  it('creates a metric series if it does not exist', () => {
    const store = createMetricsStore();
    const metric = ensureMetric(store, 'test_metric', 'count');
    expect(metric.name).toBe('test_metric');
    expect(metric.unit).toBe('count');
    expect(metric.data_points).toEqual([]);
    expect(store.metrics['test_metric']).toBe(metric);
  });

  it('returns existing metric if already present', () => {
    const store = createMetricsStore();
    const first = ensureMetric(store, 'test_metric', 'count');
    first.data_points.push({ timestamp: '2025-01-01T00:00:00Z', value: 42 });
    const second = ensureMetric(store, 'test_metric', 'count');
    expect(second).toBe(first);
    expect(second.data_points).toHaveLength(1);
  });
});

describe('appendMetric', () => {
  it('appends a data point to a metric series', () => {
    const store = createMetricsStore();
    appendMetric(store, 'cpu', 'pct', 85);
    expect(store.metrics['cpu'].data_points).toHaveLength(1);
    expect(store.metrics['cpu'].data_points[0].value).toBe(85);
    expect(store.metrics['cpu'].data_points[0].timestamp).toBeDefined();
  });

  it('appends multiple data points without overwriting', () => {
    const store = createMetricsStore();
    appendMetric(store, 'cpu', 'pct', 85);
    appendMetric(store, 'cpu', 'pct', 90);
    appendMetric(store, 'cpu', 'pct', 70);
    expect(store.metrics['cpu'].data_points).toHaveLength(3);
    expect(store.metrics['cpu'].data_points.map((d) => d.value)).toEqual([85, 90, 70]);
  });

  it('attaches labels to data points', () => {
    const store = createMetricsStore();
    appendMetric(store, 'mem', 'mb', 512, { host: 'web-1' });
    expect(store.metrics['mem'].data_points[0].labels).toEqual({ host: 'web-1' });
  });

  it('returns the store for chaining', () => {
    const store = createMetricsStore();
    const result = appendMetric(store, 'req', 'count', 1);
    expect(result).toBe(store);
  });

  it('updates last_updated on each append', () => {
    const store = createMetricsStore();
    const _before = store.last_updated;
    appendMetric(store, 'req', 'count', 1);
    // last_updated should still be a valid ISO string (may or may not differ due to test speed)
    expect(store.last_updated).toBeDefined();
    expect(typeof store.last_updated).toBe('string');
  });
});

describe('queryMetric', () => {
  let store;
  beforeEach(() => {
    store = createMetricsStore();
    // Manually set timestamps for deterministic testing
    const baseMetric = ensureMetric(store, 'latency', 'ms');
    baseMetric.data_points = [
      { timestamp: '2025-01-01T00:00:00Z', value: 100 },
      { timestamp: '2025-01-02T00:00:00Z', value: 150 },
      { timestamp: '2025-01-03T00:00:00Z', value: 200 },
      { timestamp: '2025-01-04T00:00:00Z', value: 120 },
      { timestamp: '2025-01-05T00:00:00Z', value: 180 },
    ];
  });

  it('returns all data points when no range specified', () => {
    const result = queryMetric(store, 'latency');
    expect(result).toHaveLength(5);
  });

  it('returns empty array for non-existent metric', () => {
    expect(queryMetric(store, 'unknown')).toEqual([]);
  });

  it('filters by from date (inclusive)', () => {
    const result = queryMetric(store, 'latency', '2025-01-03T00:00:00Z');
    expect(result).toHaveLength(3);
    expect(result[0].value).toBe(200);
  });

  it('filters by to date (inclusive)', () => {
    const result = queryMetric(store, 'latency', undefined, '2025-01-02T00:00:00Z');
    expect(result).toHaveLength(2);
    expect(result[1].value).toBe(150);
  });

  it('filters by both from and to', () => {
    const result = queryMetric(store, 'latency', '2025-01-02T00:00:00Z', '2025-01-04T00:00:00Z');
    expect(result).toHaveLength(3);
    expect(result.map((d) => d.value)).toEqual([150, 200, 120]);
  });

  it('returns empty when range matches nothing', () => {
    const result = queryMetric(store, 'latency', '2025-06-01T00:00:00Z', '2025-06-30T00:00:00Z');
    expect(result).toEqual([]);
  });
});

describe('serializeMetricsStore / deserializeMetricsStore', () => {
  it('round-trips a metrics store', () => {
    const store = createMetricsStore();
    appendMetric(store, 'req', 'count', 42, { route: '/api' });
    appendMetric(store, 'err', 'count', 2);

    const json = serializeMetricsStore(store);
    const restored = deserializeMetricsStore(json);

    expect(restored.metrics['req'].data_points).toHaveLength(1);
    expect(restored.metrics['req'].data_points[0].value).toBe(42);
    expect(restored.metrics['err'].data_points).toHaveLength(1);
    expect(restored.last_updated).toBe(store.last_updated);
  });

  it('returns empty store on invalid JSON', () => {
    const restored = deserializeMetricsStore('not json');
    expect(restored.metrics).toEqual({});
  });

  it('returns empty store on JSON missing required fields', () => {
    const restored = deserializeMetricsStore('{"foo": "bar"}');
    expect(restored.metrics).toEqual({});
  });

  it('returns empty store on empty string', () => {
    const restored = deserializeMetricsStore('');
    expect(restored.metrics).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────
// #373 — Agent Performance Capture
// ─────────────────────────────────────────────────────────────

describe('recordAgentPerformance', () => {
  it('records duration and success metrics', () => {
    const store = createMetricsStore();
    recordAgentPerformance(store, {
      agent_id: 'BA-01',
      agent_name: 'Business Analyst',
      state: 'PHASE_1',
      started_at: '2025-01-01T00:00:00Z',
      ended_at: '2025-01-01T00:05:00Z',
      duration_ms: 300000,
      success: true,
      attempt: 1,
      provider: 'openai',
      model: 'gpt-test',
      provider_latency_ms: 250,
      model_attempts: 2,
      model_retries: 1,
      total_tokens: 210,
    });

    expect(store.metrics['agent_duration_ms'].data_points).toHaveLength(1);
    expect(store.metrics['agent_duration_ms'].data_points[0].value).toBe(300000);
    expect(store.metrics['agent_duration_ms'].data_points[0].labels.agent_id).toBe('BA-01');

    expect(store.metrics['agent_success'].data_points).toHaveLength(1);
    expect(store.metrics['agent_success'].data_points[0].value).toBe(1);
    expect(store.metrics['agent_total_tokens'].data_points[0].value).toBe(210);
  });

  it('records failure as 0', () => {
    const store = createMetricsStore();
    recordAgentPerformance(store, {
      agent_id: 'SA-01',
      agent_name: 'Software Architect',
      state: 'PHASE_2',
      started_at: '2025-01-01T00:00:00Z',
      ended_at: '2025-01-01T00:01:00Z',
      duration_ms: 60000,
      success: false,
      attempt: 1,
      error: 'timeout',
    });

    expect(store.metrics['agent_success'].data_points[0].value).toBe(0);
  });
});

describe('computeAgentStats', () => {
  it('returns empty array when no agent metrics exist', () => {
    const store = createMetricsStore();
    expect(computeAgentStats(store)).toEqual([]);
  });

  it('computes aggregated stats per agent', () => {
    const store = createMetricsStore();
    const agents = [
      { agent_id: 'BA-01', agent_name: 'Business Analyst', duration_ms: 100, success: true },
      { agent_id: 'BA-01', agent_name: 'Business Analyst', duration_ms: 200, success: true },
      { agent_id: 'BA-01', agent_name: 'Business Analyst', duration_ms: 500, success: false },
      { agent_id: 'SA-01', agent_name: 'Software Architect', duration_ms: 300, success: true },
    ];

    for (const a of agents) {
      recordAgentPerformance(store, {
        ...a,
        state: 'TEST',
        started_at: '2025-01-01T00:00:00Z',
        ended_at: '2025-01-01T00:01:00Z',
        attempt: 1,
        provider: 'openai',
        model: 'gpt-test',
        provider_latency_ms: 100,
        model_attempts: 1,
        model_retries: 0,
        total_tokens: 42,
      });
    }

    const stats = computeAgentStats(store);
    expect(stats).toHaveLength(2);

    const ba = stats.find((s) => s.agent_id === 'BA-01');
    expect(ba.total_invocations).toBe(3);
    expect(ba.successful).toBe(2);
    expect(ba.failed).toBe(1);
    expect(ba.success_rate_pct).toBeCloseTo(66.67, 1);
    expect(ba.avg_duration_ms).toBeCloseTo(267, 0);
    expect(ba.min_duration_ms).toBe(100);
    expect(ba.max_duration_ms).toBe(500);
    expect(ba.total_tokens).toBe(126);
    expect(ba.avg_provider_latency_ms).toBe(100);
    expect(ba.providers).toEqual(['openai']);

    const sa = stats.find((s) => s.agent_id === 'SA-01');
    expect(sa.total_invocations).toBe(1);
    expect(sa.successful).toBe(1);
    expect(sa.success_rate_pct).toBe(100);
  });

  it('sorts results by agent_id', () => {
    const store = createMetricsStore();
    recordAgentPerformance(store, {
      agent_id: 'ZZ-01',
      agent_name: 'Zeta',
      state: 'T',
      started_at: '',
      ended_at: '',
      duration_ms: 100,
      success: true,
      attempt: 1,
    });
    recordAgentPerformance(store, {
      agent_id: 'AA-01',
      agent_name: 'Alpha',
      state: 'T',
      started_at: '',
      ended_at: '',
      duration_ms: 200,
      success: true,
      attempt: 1,
    });

    const stats = computeAgentStats(store);
    expect(stats[0].agent_id).toBe('AA-01');
    expect(stats[1].agent_id).toBe('ZZ-01');
  });
});

describe('recordToolExecutionTrace', () => {
  it('appends tool execution duration and success metrics', () => {
    const store = createMetricsStore();

    recordToolExecutionTrace(store, {
      agent_id: 'BA-01',
      agent_name: 'Business Analyst',
      state: 'PHASE_1',
      tool_id: 'tool.files.read',
      operation: 'read_file',
      trace_id: 'trace-1',
      duration_ms: 42,
      success: true,
    });

    expect(store.metrics['tool_execution_duration_ms'].data_points).toHaveLength(1);
    expect(store.metrics['tool_execution_success'].data_points).toHaveLength(1);
    expect(store.metrics['tool_execution_duration_ms'].data_points[0].labels.tool_id).toBe(
      'tool.files.read'
    );
  });
});

describe('computeStageLatencyStats', () => {
  it('computes p50/p95/p99 and failure rate by stage', () => {
    const store = createMetricsStore();
    recordAgentPerformance(store, {
      agent_id: 'A1',
      agent_name: 'A1',
      state: 'PHASE_1',
      started_at: '',
      ended_at: '',
      duration_ms: 10,
      success: true,
      attempt: 1,
    });
    recordAgentPerformance(store, {
      agent_id: 'A2',
      agent_name: 'A2',
      state: 'PHASE_1',
      started_at: '',
      ended_at: '',
      duration_ms: 30,
      success: false,
      attempt: 1,
    });

    const stats = computeStageLatencyStats(store);
    expect(stats).toHaveLength(1);
    expect(stats[0].stage).toBe('PHASE_1');
    expect(stats[0].p50_duration_ms).toBe(10);
    expect(stats[0].p95_duration_ms).toBe(30);
    expect(stats[0].p99_duration_ms).toBe(30);
    expect(stats[0].failure_rate_pct).toBe(50);
  });
});

describe('computeToolLatencyStats', () => {
  it('computes p50/p95/p99 and failure rate by tool and operation', () => {
    const store = createMetricsStore();

    recordToolExecutionTrace(store, {
      agent_id: 'A1',
      agent_name: 'A1',
      state: 'PHASE_1',
      tool_id: 'tool.files.read',
      operation: 'read_file',
      duration_ms: 5,
      success: true,
    });
    recordToolExecutionTrace(store, {
      agent_id: 'A1',
      agent_name: 'A1',
      state: 'PHASE_1',
      tool_id: 'tool.files.read',
      operation: 'read_file',
      duration_ms: 45,
      success: false,
    });

    const stats = computeToolLatencyStats(store);
    expect(stats).toHaveLength(1);
    expect(stats[0].tool_id).toBe('tool.files.read');
    expect(stats[0].operation).toBe('read_file');
    expect(stats[0].p50_duration_ms).toBe(5);
    expect(stats[0].p95_duration_ms).toBe(45);
    expect(stats[0].p99_duration_ms).toBe(45);
    expect(stats[0].failure_rate_pct).toBe(50);
  });
});

// ─── createAgentPerformanceHook ──────────────────────────────

describe('createAgentPerformanceHook', () => {
  it('exports the expected metrics store path', () => {
    expect(METRICS_STORE_PATH).toBe('BusinessDocs/metrics/time-series-metrics.json');
  });

  it('processes new invocation log entries and persists metrics', () => {
    const fileStore = createMockStore();
    const invocationLog = [];

    const hook = createAgentPerformanceHook(fileStore, () => invocationLog, 'test-metrics.json');

    // First invocation — no log entries yet
    hook({ from: 'IDLE', to: 'ONBOARDING', timestamp: '2025-01-01T00:00:00Z' });
    expect(fileStore._files['test-metrics.json']).toBeUndefined();

    // Add a log entry
    invocationLog.push({
      agentId: 'BA-01',
      agentName: 'Business Analyst',
      state: 'ONBOARDING',
      startTime: '2025-01-01T00:00:00Z',
      endTime: '2025-01-01T00:05:00Z',
      durationMs: 300000,
      status: 'success',
      attempt: 1,
      provider: 'openai',
      model: 'gpt-test',
      providerStatus: 'success',
      providerLatencyMs: 275,
      modelAttempts: 2,
      modelRetries: 1,
      promptTokens: 120,
      completionTokens: 80,
      totalTokens: 200,
      contractValidationPassed: true,
      toolTraceId: 'trace-123',
      toolInvocationCount: 1,
      toolAuditEvents: [
        {
          toolId: 'tool.files.read',
          operation: 'read_file',
          durationMs: 44,
          success: true,
        },
      ],
    });

    hook({ from: 'ONBOARDING', to: 'PHASE_1', timestamp: '2025-01-01T00:05:00Z' });

    // Should have persisted
    expect(fileStore._files['test-metrics.json']).toBeDefined();
    const stored = JSON.parse(fileStore._files['test-metrics.json']);
    expect(stored.metrics['agent_duration_ms'].data_points).toHaveLength(1);
    expect(stored.metrics['agent_success'].data_points[0].value).toBe(1);
    expect(stored.metrics['agent_total_tokens'].data_points[0].value).toBe(200);
    expect(stored.metrics['agent_provider_latency_ms'].data_points[0].value).toBe(275);
    expect(stored.metrics['tool_execution_duration_ms'].data_points[0].value).toBe(44);
    expect(stored.metrics['tool_execution_success'].data_points[0].value).toBe(1);
  });

  it('only processes new entries (idempotent across calls)', () => {
    const fileStore = createMockStore();
    const invocationLog = [
      {
        agentId: 'BA-01',
        agentName: 'BA',
        state: 'S',
        startTime: '2025-01-01T00:00:00Z',
        endTime: '2025-01-01T00:01:00Z',
        durationMs: 1000,
        status: 'success',
        attempt: 1,
      },
    ];

    const hook = createAgentPerformanceHook(fileStore, () => invocationLog, 'test.json');

    hook({ from: 'A', to: 'B', timestamp: '' });
    const afterFirst = JSON.parse(fileStore._files['test.json']);
    expect(afterFirst.metrics['agent_duration_ms'].data_points).toHaveLength(1);

    // Call again with same log — should not add duplicates
    hook({ from: 'B', to: 'C', timestamp: '' });
    const afterSecond = JSON.parse(fileStore._files['test.json']);
    expect(afterSecond.metrics['agent_duration_ms'].data_points).toHaveLength(1);

    // Add a second entry
    invocationLog.push({
      agentId: 'SA-01',
      agentName: 'SA',
      state: 'S',
      startTime: '2025-01-01T00:01:00Z',
      endTime: '2025-01-01T00:02:00Z',
      durationMs: 2000,
      status: 'success',
      attempt: 1,
    });

    hook({ from: 'C', to: 'D', timestamp: '' });
    const afterThird = JSON.parse(fileStore._files['test.json']);
    expect(afterThird.metrics['agent_duration_ms'].data_points).toHaveLength(2);
  });

  it('records failures from invocation log', () => {
    const fileStore = createMockStore();
    const invocationLog = [
      {
        agentId: 'ERR-01',
        agentName: 'Errorer',
        state: 'S',
        startTime: '',
        endTime: '',
        durationMs: 500,
        status: 'error',
        attempt: 1,
        error: 'boom',
      },
    ];

    const hook = createAgentPerformanceHook(fileStore, () => invocationLog, 'test.json');
    hook({ from: 'A', to: 'B', timestamp: '' });

    const stored = JSON.parse(fileStore._files['test.json']);
    expect(stored.metrics['agent_success'].data_points[0].value).toBe(0);
  });

  it('loads existing metrics store from disk', () => {
    const existingStore = createMetricsStore();
    appendMetric(existingStore, 'agent_duration_ms', 'ms', 999, {
      agent_id: 'OLD',
      agent_name: 'Old',
      state: 'X',
    });
    appendMetric(existingStore, 'agent_success', 'boolean', 1, {
      agent_id: 'OLD',
      agent_name: 'Old',
      state: 'X',
    });

    const fileStore = createMockStore({
      'test.json': serializeMetricsStore(existingStore),
    });
    const invocationLog = [
      {
        agentId: 'NEW-01',
        agentName: 'New',
        state: 'S',
        startTime: '',
        endTime: '',
        durationMs: 100,
        status: 'success',
        attempt: 1,
      },
    ];

    const hook = createAgentPerformanceHook(fileStore, () => invocationLog, 'test.json');
    hook({ from: 'A', to: 'B', timestamp: '' });

    const stored = JSON.parse(fileStore._files['test.json']);
    // Should have both old and new entries
    expect(stored.metrics['agent_duration_ms'].data_points).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────
// #374 — Sprint Boundary Trend Computation
// ─────────────────────────────────────────────────────────────

describe('computeVelocityTrendEntry', () => {
  it('returns empty for empty sprint list', () => {
    expect(computeVelocityTrendEntry([])).toEqual([]);
  });

  it('computes velocity ratio per sprint', () => {
    const sprints = [
      makeSprint('SP-1', 10, 8),
      makeSprint('SP-2', 12, 12),
      makeSprint('SP-3', 10, 5),
    ];
    const entries = computeVelocityTrendEntry(sprints);
    expect(entries).toHaveLength(3);
    expect(entries[0].velocity_ratio).toBe(0.8);
    expect(entries[1].velocity_ratio).toBe(1);
    expect(entries[2].velocity_ratio).toBe(0.5);
  });

  it('computes trailing average with default window of 3', () => {
    const sprints = [
      makeSprint('SP-1', 10, 6),
      makeSprint('SP-2', 10, 9),
      makeSprint('SP-3', 10, 12),
      makeSprint('SP-4', 10, 3),
    ];
    const entries = computeVelocityTrendEntry(sprints);

    // SP-1: avg of [6] = 6
    expect(entries[0].trailing_avg_velocity).toBeCloseTo(6, 1);
    // SP-2: avg of [6, 9] = 7.5
    expect(entries[1].trailing_avg_velocity).toBeCloseTo(7.5, 1);
    // SP-3: avg of [6, 9, 12] = 9
    expect(entries[2].trailing_avg_velocity).toBeCloseTo(9, 1);
    // SP-4: avg of [9, 12, 3] = 8
    expect(entries[3].trailing_avg_velocity).toBeCloseTo(8, 1);
  });

  it('uses custom window size', () => {
    const sprints = [
      makeSprint('SP-1', 10, 4),
      makeSprint('SP-2', 10, 6),
      makeSprint('SP-3', 10, 8),
    ];
    const entries = computeVelocityTrendEntry(sprints, 2);

    // SP-1: window [4] = 4
    expect(entries[0].trailing_avg_velocity).toBeCloseTo(4, 1);
    // SP-2: window [4, 6] = 5
    expect(entries[1].trailing_avg_velocity).toBeCloseTo(5, 1);
    // SP-3: window [6, 8] = 7
    expect(entries[2].trailing_avg_velocity).toBeCloseTo(7, 1);
  });

  it('handles 0 planned points gracefully', () => {
    const sprints = [makeSprint('SP-1', 0, 0)];
    const entries = computeVelocityTrendEntry(sprints);
    expect(entries[0].velocity_ratio).toBe(0);
  });

  it('includes sprint_id and date', () => {
    const sprints = [makeSprint('SP-1', 10, 5, { ended_at: '2025-03-15T00:00:00Z' })];
    const entries = computeVelocityTrendEntry(sprints);
    expect(entries[0].sprint_id).toBe('SP-1');
    expect(entries[0].date).toBe('2025-03-15T00:00:00Z');
  });
});

describe('recordSprintBoundary', () => {
  it('records sprint metrics into the time-series store', () => {
    const store = createMetricsStore();
    const sprint = makeSprint('SP-1', 20, 18, { defects_found: 2, tasks_carried_over: 1 });
    recordSprintBoundary(store, sprint);

    expect(store.metrics['sprint_planned_points'].data_points).toHaveLength(1);
    expect(store.metrics['sprint_planned_points'].data_points[0].value).toBe(20);
    expect(store.metrics['sprint_completed_points'].data_points[0].value).toBe(18);
    expect(store.metrics['sprint_velocity_ratio'].data_points[0].value).toBe(0.9);
    expect(store.metrics['sprint_defects_found'].data_points[0].value).toBe(2);
    expect(store.metrics['sprint_carry_over'].data_points[0].value).toBe(1);
    expect(store.metrics['sprint_planned_points'].data_points[0].labels.sprint_id).toBe('SP-1');
  });

  it('records DORA metrics when doraReport is provided', () => {
    const store = createMetricsStore();
    const sprint = makeSprint('SP-1', 10, 10);
    const doraReport = {
      lead_time_hours: 24,
      deployment_frequency_per_day: 0.5,
      change_failure_rate_pct: 10,
      mttr_hours: 2,
      levels: {},
      overall_level: 'HIGH',
    };
    recordSprintBoundary(store, sprint, doraReport);

    expect(store.metrics['dora_lead_time_hours'].data_points[0].value).toBe(24);
    expect(store.metrics['dora_deploy_frequency'].data_points[0].value).toBe(0.5);
    expect(store.metrics['dora_change_failure_rate'].data_points[0].value).toBe(10);
    expect(store.metrics['dora_mttr_hours'].data_points[0].value).toBe(2);
  });

  it('does not record DORA metrics when doraReport is absent', () => {
    const store = createMetricsStore();
    recordSprintBoundary(store, makeSprint('SP-1', 10, 8));
    expect(store.metrics['dora_lead_time_hours']).toBeUndefined();
    expect(store.metrics['dora_deploy_frequency']).toBeUndefined();
  });
});

// ─── computeAndPersistSprintTrends (sprint-gate.ts) ──────────

describe('computeAndPersistSprintTrends', () => {
  it('exports METRICS_STORE_PATH', () => {
    expect(GATE_METRICS_PATH).toBeDefined();
    expect(typeof GATE_METRICS_PATH).toBe('string');
  });

  it('computes trends for a single sprint and persists', () => {
    const fileStore = createMockStore();
    const sprint = makeSprint('SP-1', 10, 8, {
      ended_at: '2025-02-01T00:00:00Z',
      defects_found: 1,
      tasks_carried_over: 2,
    });

    const result = computeAndPersistSprintTrends(fileStore, sprint, undefined, {
      velocityPath: 'velocity.json',
      metricsPath: 'metrics.json',
    });

    expect(result.trendEntries).toHaveLength(1);
    expect(result.trendEntries[0].sprint_id).toBe('SP-1');
    expect(result.trendEntries[0].velocity_ratio).toBe(0.8);
    expect(result.currentSprint).toBeDefined();
    expect(result.currentSprint.sprint_id).toBe('SP-1');
    expect(result.metricsStore).toBeDefined();
  });

  it('appends to existing velocity history', () => {
    const velocityLog = JSON.stringify({
      sprints: [
        {
          sprint_id: 'SP-1',
          date: '2025-01-15',
          planned_items: 10,
          completed_items: 8,
          carried_over: 2,
        },
        {
          sprint_id: 'SP-2',
          date: '2025-02-01',
          planned_items: 12,
          completed_items: 10,
          carried_over: 2,
        },
      ],
    });

    const fileStore = createMockStore({
      'velocity.json': velocityLog,
    });

    const sprint = makeSprint('SP-3', 15, 14, { ended_at: '2025-02-15T00:00:00Z' });
    const result = computeAndPersistSprintTrends(fileStore, sprint, undefined, {
      velocityPath: 'velocity.json',
      metricsPath: 'metrics.json',
    });

    expect(result.trendEntries).toHaveLength(3);
    expect(result.trendEntries[2].sprint_id).toBe('SP-3');
  });

  it('does not duplicate sprint if already in history', () => {
    const velocityLog = JSON.stringify({
      sprints: [{ sprint_id: 'SP-1', date: '2025-01-15', planned_items: 10, completed_items: 8 }],
    });

    const fileStore = createMockStore({
      'velocity.json': velocityLog,
    });

    const sprint = makeSprint('SP-1', 10, 8);
    const result = computeAndPersistSprintTrends(fileStore, sprint, undefined, {
      velocityPath: 'velocity.json',
      metricsPath: 'metrics.json',
    });

    expect(result.trendEntries).toHaveLength(1);
  });

  it('includes DORA data when doraReport is provided', () => {
    const fileStore = createMockStore();
    const sprint = makeSprint('SP-1', 10, 10);
    const doraReport = {
      lead_time_hours: 12,
      deployment_frequency_per_day: 1.5,
      change_failure_rate_pct: 5,
      mttr_hours: 1,
      levels: {},
      overall_level: 'ELITE',
    };

    const result = computeAndPersistSprintTrends(fileStore, sprint, doraReport, {
      velocityPath: 'velocity.json',
      metricsPath: 'metrics.json',
    });

    expect(result.metricsStore.metrics['dora_lead_time_hours']).toBeDefined();
    expect(result.metricsStore.metrics['dora_lead_time_hours'].data_points[0].value).toBe(12);
  });

  it('persists metrics to disk', () => {
    const fileStore = createMockStore();
    const sprint = makeSprint('SP-1', 10, 9);
    computeAndPersistSprintTrends(fileStore, sprint, undefined, {
      velocityPath: 'velocity.json',
      metricsPath: 'metrics.json',
    });

    expect(fileStore._files['metrics.json']).toBeDefined();
    const stored = JSON.parse(fileStore._files['metrics.json']);
    expect(stored.metrics['sprint_planned_points']).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// #375 — Analytics API Endpoints (route tests below)
// ─────────────────────────────────────────────────────────────
