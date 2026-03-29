'use strict';

const {
  DORA_LEVELS,
  computeDeploymentFrequency,
  computeChangeFailureRate,
  computeMTTR,
  classifyLeadTime,
  classifyChangeFailureRate,
  classifyMTTR,
  computeDoraReport,
  computeDefectDensity,
  computeLeadTime,
  classifyDeploymentFrequency,
  computeVelocityTrend,
  createMetricsStore,
  appendMetric,
  queryMetric,
  serializeMetricsStore,
  deserializeMetricsStore,
  ensureMetric,
  recordAgentPerformance,
  computeAgentStats,
  computeVelocityTrendEntry,
  recordSprintBoundary,
  recordToolExecutionTrace,
  computeStageLatencyStats,
  computeToolLatencyStats,
} = require('../../platform/sdlc/observability');

// ── Test Data Factories ──────────────────────────────────────

function makeCommit(id, timestamp, branch = 'main') {
  return { id, timestamp, author: 'dev', branch };
}

function makeDeploy(id, timestamp, commitIds, success = true) {
  return {
    id,
    timestamp,
    environment: 'production',
    release_version: '1.0.0',
    success,
    commit_ids: commitIds,
  };
}

function makeIncident(id, openedAt, resolvedAt, deploymentId, severity = 'HIGH') {
  return {
    id,
    opened_at: openedAt,
    resolved_at: resolvedAt,
    severity,
    deployment_id: deploymentId,
  };
}

function makeSprint(id, opts = {}) {
  return {
    sprint_id: id,
    started_at: '2025-01-01T00:00:00Z',
    ended_at: '2025-01-14T00:00:00Z',
    planned_points: opts.planned ?? 20,
    completed_points: opts.completed ?? 18,
    tasks_completed: opts.tasks ?? 10,
    tasks_carried_over: opts.carried ?? 2,
    defects_found: opts.defects ?? 1,
    defects_fixed: opts.fixed ?? 1,
  };
}

// ── DORA Metric Computation ──────────────────────────────────

describe('DORA metric computation', () => {
  describe('computeDeploymentFrequency', () => {
    it('counts successful deploys per day in period', () => {
      const deploys = [
        makeDeploy('d1', '2025-01-02T12:00:00Z', ['c1']),
        makeDeploy('d2', '2025-01-05T12:00:00Z', ['c2']),
        makeDeploy('d3', '2025-01-08T12:00:00Z', ['c3'], false), // failed
      ];
      const freq = computeDeploymentFrequency(
        deploys,
        '2025-01-01T00:00:00Z',
        '2025-01-11T00:00:00Z'
      );
      expect(freq).toBeCloseTo(2 / 10, 2); // 2 successful in 10 days
    });

    it('returns 0 for zero-length period', () => {
      const deploys = [makeDeploy('d1', '2025-01-01T12:00:00Z', ['c1'])];
      expect(
        computeDeploymentFrequency(deploys, '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')
      ).toBe(0);
    });
  });

  describe('computeChangeFailureRate', () => {
    it('computes percentage of successful deploys that caused incidents', () => {
      const deploys = [
        makeDeploy('d1', '2025-01-01T12:00:00Z', ['c1']),
        makeDeploy('d2', '2025-01-02T12:00:00Z', ['c2']),
        makeDeploy('d3', '2025-01-03T12:00:00Z', ['c3']),
        makeDeploy('d4', '2025-01-04T12:00:00Z', ['c4'], false), // not counted
      ];
      const incidents = [makeIncident('i1', '2025-01-01T14:00:00Z', '2025-01-01T16:00:00Z', 'd1')];
      const rate = computeChangeFailureRate(deploys, incidents);
      expect(rate).toBeCloseTo(33.33, 1); // 1/3
    });

    it('returns 0 when no successful deployments', () => {
      const deploys = [makeDeploy('d1', '2025-01-01T12:00:00Z', ['c1'], false)];
      expect(computeChangeFailureRate(deploys, [])).toBe(0);
    });
  });

  describe('computeMTTR', () => {
    it('averages recovery time for resolved incidents', () => {
      const incidents = [
        makeIncident('i1', '2025-01-01T00:00:00Z', '2025-01-01T02:00:00Z', 'd1'), // 2h
        makeIncident('i2', '2025-01-02T00:00:00Z', '2025-01-02T06:00:00Z', 'd2'), // 6h
        makeIncident('i3', '2025-01-03T00:00:00Z', null, 'd3'), // unresolved
      ];
      expect(computeMTTR(incidents)).toBe(4); // (2+6)/2
    });

    it('returns 0 when no resolved incidents', () => {
      const incidents = [makeIncident('i1', '2025-01-01T00:00:00Z', null, 'd1')];
      expect(computeMTTR(incidents)).toBe(0);
    });
  });
});

// ── DORA Level Classification ────────────────────────────────

describe('DORA level classification', () => {
  describe('classifyLeadTime', () => {
    it('ELITE for ≤ 24h', () => expect(classifyLeadTime(12)).toBe(DORA_LEVELS.ELITE));
    it('HIGH for ≤ 168h', () => expect(classifyLeadTime(100)).toBe(DORA_LEVELS.HIGH));
    it('MEDIUM for ≤ 720h', () => expect(classifyLeadTime(500)).toBe(DORA_LEVELS.MEDIUM));
    it('LOW for > 720h', () => expect(classifyLeadTime(1000)).toBe(DORA_LEVELS.LOW));
  });

  describe('classifyChangeFailureRate', () => {
    it('ELITE for ≤ 5%', () => expect(classifyChangeFailureRate(3)).toBe(DORA_LEVELS.ELITE));
    it('HIGH for ≤ 10%', () => expect(classifyChangeFailureRate(8)).toBe(DORA_LEVELS.HIGH));
    it('MEDIUM for ≤ 15%', () => expect(classifyChangeFailureRate(12)).toBe(DORA_LEVELS.MEDIUM));
    it('LOW for > 15%', () => expect(classifyChangeFailureRate(20)).toBe(DORA_LEVELS.LOW));
  });

  describe('classifyMTTR', () => {
    it('ELITE for ≤ 1h', () => expect(classifyMTTR(0.5)).toBe(DORA_LEVELS.ELITE));
    it('HIGH for ≤ 24h', () => expect(classifyMTTR(12)).toBe(DORA_LEVELS.HIGH));
    it('MEDIUM for ≤ 168h', () => expect(classifyMTTR(100)).toBe(DORA_LEVELS.MEDIUM));
    it('LOW for > 168h', () => expect(classifyMTTR(200)).toBe(DORA_LEVELS.LOW));
  });
});

// ── Full DORA Report (exercises overallLevel too) ────────────

describe('computeDoraReport', () => {
  it('produces a complete report with all DORA metrics and levels', () => {
    const commits = [
      makeCommit('c1', '2025-01-01T00:00:00Z'),
      makeCommit('c2', '2025-01-03T00:00:00Z'),
    ];
    const deploys = [
      makeDeploy('d1', '2025-01-02T00:00:00Z', ['c1']),
      makeDeploy('d2', '2025-01-05T00:00:00Z', ['c2']),
    ];
    const incidents = [makeIncident('i1', '2025-01-02T01:00:00Z', '2025-01-02T02:00:00Z', 'd1')];
    const report = computeDoraReport(
      commits,
      deploys,
      incidents,
      '2025-01-01T00:00:00Z',
      '2025-01-08T00:00:00Z'
    );

    expect(report.period_start).toBe('2025-01-01T00:00:00Z');
    expect(report.period_end).toBe('2025-01-08T00:00:00Z');
    expect(report.lead_time_hours).toBeGreaterThanOrEqual(0);
    expect(report.deployment_frequency_per_day).toBeGreaterThan(0);
    expect(report.change_failure_rate_pct).toBeGreaterThan(0);
    expect(report.mttr_hours).toBeGreaterThan(0);
    expect(report.overall_level).toBeDefined();
    expect(Object.values(DORA_LEVELS)).toContain(report.overall_level);
  });
});

// ── Sprint Metrics ───────────────────────────────────────────

describe('sprint metrics', () => {
  describe('computeDefectDensity', () => {
    it('returns 0 for no tasks', () => {
      expect(computeDefectDensity([makeSprint('s1', { tasks: 0, defects: 0 })])).toBe(0);
    });
  });

  describe('computeVelocityTrendEntry', () => {
    it('computes velocity ratio and trailing average per sprint', () => {
      const sprints = [
        makeSprint('s1', { planned: 20, completed: 10 }),
        makeSprint('s2', { planned: 20, completed: 15 }),
        makeSprint('s3', { planned: 20, completed: 20 }),
      ];
      const entries = computeVelocityTrendEntry(sprints, 2);
      expect(entries).toHaveLength(3);
      expect(entries[0].velocity_ratio).toBeCloseTo(0.5, 2);
      expect(entries[2].velocity_ratio).toBe(1);
      // trailing avg for s3 with window 2: (15+20)/2 = 17.5
      expect(entries[2].trailing_avg_velocity).toBeCloseTo(17.5, 1);
    });
  });
});

// ── Metrics Store ────────────────────────────────────────────

describe('metrics store', () => {
  it('createMetricsStore returns empty store', () => {
    const store = createMetricsStore();
    expect(store.metrics).toEqual({});
    expect(store.last_updated).toBeDefined();
  });

  it('appendMetric adds data points', () => {
    let store = createMetricsStore();
    store = appendMetric(store, 'cpu', '%', 42);
    store = appendMetric(store, 'cpu', '%', 55, { host: 'a' });
    expect(store.metrics['cpu'].data_points).toHaveLength(2);
    expect(store.metrics['cpu'].data_points[1].value).toBe(55);
    expect(store.metrics['cpu'].data_points[1].labels).toEqual({ host: 'a' });
  });

  it('queryMetric filters by time range', () => {
    const store = createMetricsStore();
    store.metrics['m'] = {
      name: 'm',
      unit: 'ms',
      data_points: [
        { timestamp: '2025-01-01T00:00:00Z', value: 1 },
        { timestamp: '2025-01-05T00:00:00Z', value: 2 },
        { timestamp: '2025-01-10T00:00:00Z', value: 3 },
      ],
    };
    const result = queryMetric(store, 'm', '2025-01-02T00:00:00Z', '2025-01-06T00:00:00Z');
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(2);
  });

  it('queryMetric returns empty for unknown metric', () => {
    expect(queryMetric(createMetricsStore(), 'nope')).toEqual([]);
  });

  it('serializeMetricsStore produces valid JSON', () => {
    let store = createMetricsStore();
    store = appendMetric(store, 'x', 'count', 1);
    const json = serializeMetricsStore(store);
    const parsed = JSON.parse(json);
    expect(parsed.metrics.x.data_points).toHaveLength(1);
  });
});

// ── Agent Performance ────────────────────────────────────────

describe('agent performance tracking', () => {
  it('recordAgentPerformance stores duration and success metrics', () => {
    let store = createMetricsStore();
    store = recordAgentPerformance(store, {
      agent_id: 'a1',
      agent_name: 'TestAgent',
      state: 'plan',
      started_at: '2025-01-01T00:00:00Z',
      ended_at: '2025-01-01T00:01:00Z',
      duration_ms: 60000,
      success: true,
      attempt: 1,
      provider: 'openai',
      model: 'gpt-test',
      provider_status: 'success',
      finish_reason: 'stop',
      provider_latency_ms: 420,
      model_attempts: 2,
      model_retries: 1,
      prompt_tokens: 120,
      completion_tokens: 80,
      total_tokens: 200,
      contract_validation_passed: true,
    });
    expect(store.metrics['agent_duration_ms'].data_points).toHaveLength(1);
    expect(store.metrics['agent_success'].data_points[0].value).toBe(1);
    expect(store.metrics['agent_provider_latency_ms'].data_points[0].value).toBe(420);
    expect(store.metrics['agent_model_attempts'].data_points[0].value).toBe(2);
    expect(store.metrics['agent_model_retries'].data_points[0].value).toBe(1);
    expect(store.metrics['agent_total_tokens'].data_points[0].value).toBe(200);
    expect(store.metrics['agent_provider_status'].data_points[0].labels.provider_status).toBe(
      'success'
    );
  });

  it('computeAgentStats aggregates per agent', () => {
    let store = createMetricsStore();
    const records = [
      {
        agent_id: 'a1',
        agent_name: 'Alpha',
        state: 'run',
        started_at: '',
        ended_at: '',
        duration_ms: 100,
        success: true,
        attempt: 1,
        provider: 'openai',
        model: 'gpt-4.1',
        provider_latency_ms: 50,
        model_attempts: 1,
        model_retries: 0,
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
      {
        agent_id: 'a1',
        agent_name: 'Alpha',
        state: 'run',
        started_at: '',
        ended_at: '',
        duration_ms: 200,
        success: false,
        attempt: 2,
        provider: 'openai',
        model: 'gpt-4.1',
        provider_latency_ms: 70,
        model_attempts: 2,
        model_retries: 1,
        prompt_tokens: 20,
        completion_tokens: 15,
        total_tokens: 35,
      },
      {
        agent_id: 'a2',
        agent_name: 'Beta',
        state: 'run',
        started_at: '',
        ended_at: '',
        duration_ms: 50,
        success: true,
        attempt: 1,
        provider: 'copilot',
        model: 'gpt-4o-mini',
        provider_latency_ms: 30,
        model_attempts: 1,
        model_retries: 0,
        prompt_tokens: 8,
        completion_tokens: 4,
        total_tokens: 12,
      },
    ];
    for (const r of records) store = recordAgentPerformance(store, r);

    const stats = computeAgentStats(store);
    expect(stats).toHaveLength(2);
    const a1 = stats.find((s) => s.agent_id === 'a1');
    expect(a1.total_invocations).toBe(2);
    expect(a1.successful).toBe(1);
    expect(a1.failed).toBe(1);
    expect(a1.avg_duration_ms).toBe(150);
    expect(a1.total_tokens).toBe(50);
    expect(a1.avg_total_tokens).toBe(25);
    expect(a1.avg_provider_latency_ms).toBe(60);
    expect(a1.avg_model_attempts).toBe(1.5);
    expect(a1.avg_model_retries).toBe(0.5);
    expect(a1.providers).toEqual(['openai']);
    expect(a1.models).toEqual(['gpt-4.1']);
  });

  it('computeAgentStats returns empty for store without agent metrics', () => {
    expect(computeAgentStats(createMetricsStore())).toEqual([]);
  });
});

// ── Sprint Boundary Recording ────────────────────────────────

describe('recordSprintBoundary', () => {
  it('records sprint metrics and optional DORA data into the store', () => {
    let store = createMetricsStore();
    const sprint = makeSprint('s1', { planned: 20, completed: 15, defects: 3, carried: 2 });
    const doraReport = {
      period_start: '2025-01-01T00:00:00Z',
      period_end: '2025-01-14T00:00:00Z',
      lead_time_hours: 12,
      deployment_frequency_per_day: 0.5,
      change_failure_rate_pct: 5,
      mttr_hours: 2,
      lead_time_level: 'ELITE',
      deployment_frequency_level: 'HIGH',
      change_failure_rate_level: 'ELITE',
      mttr_level: 'HIGH',
      overall_level: 'HIGH',
    };

    store = recordSprintBoundary(store, sprint, doraReport);

    expect(store.metrics['sprint_planned_points'].data_points).toHaveLength(1);
    expect(store.metrics['sprint_completed_points'].data_points[0].value).toBe(15);
    expect(store.metrics['sprint_velocity_ratio'].data_points[0].value).toBe(0.75);
    expect(store.metrics['sprint_defects_found'].data_points[0].value).toBe(3);
    expect(store.metrics['dora_lead_time_hours'].data_points[0].value).toBe(12);
    expect(store.metrics['dora_mttr_hours'].data_points[0].value).toBe(2);
  });

  it('records sprint metrics without DORA report', () => {
    let store = createMetricsStore();
    const sprint = makeSprint('s2');
    store = recordSprintBoundary(store, sprint);
    expect(store.metrics['sprint_planned_points']).toBeDefined();
    expect(store.metrics['dora_lead_time_hours']).toBeUndefined();
  });
});

// ── computeLeadTime ──────────────────────────────────────────

describe('computeLeadTime', () => {
  it('returns average hours from commit to successful deploy', () => {
    const commits = [
      makeCommit('c1', '2025-01-01T00:00:00Z'),
      makeCommit('c2', '2025-01-02T00:00:00Z'),
    ];
    const deploys = [
      makeDeploy('d1', '2025-01-01T12:00:00Z', ['c1']), // 12 h lead
      makeDeploy('d2', '2025-01-03T00:00:00Z', ['c2']), // 24 h lead
    ];
    const lt = computeLeadTime(commits, deploys);
    expect(lt).toBeCloseTo(18, 1); // avg(12, 24) = 18
  });

  it('ignores failed deployments', () => {
    const commits = [makeCommit('c1', '2025-01-01T00:00:00Z')];
    const deploys = [makeDeploy('d1', '2025-01-01T06:00:00Z', ['c1'], false)];
    expect(computeLeadTime(commits, deploys)).toBe(0);
  });

  it('returns 0 when no commits', () => {
    const deploys = [makeDeploy('d1', '2025-01-01T12:00:00Z', ['c1'])];
    expect(computeLeadTime([], deploys)).toBe(0);
  });

  it('returns 0 when commit ids have no matching commits', () => {
    const commits = [makeCommit('c99', '2025-01-01T00:00:00Z')];
    const deploys = [makeDeploy('d1', '2025-01-01T12:00:00Z', ['c1'])];
    expect(computeLeadTime(commits, deploys)).toBe(0);
  });
});

// ── classifyDeploymentFrequency ──────────────────────────────

describe('classifyDeploymentFrequency', () => {
  it('returns ELITE for ≥1 deploy per day', () => {
    expect(classifyDeploymentFrequency(1)).toBe(DORA_LEVELS.ELITE);
    expect(classifyDeploymentFrequency(3)).toBe(DORA_LEVELS.ELITE);
  });

  it('returns HIGH for roughly weekly cadence', () => {
    expect(classifyDeploymentFrequency(1 / 7)).toBe(DORA_LEVELS.HIGH);
  });

  it('returns MEDIUM for roughly monthly cadence', () => {
    expect(classifyDeploymentFrequency(1 / 30)).toBe(DORA_LEVELS.MEDIUM);
  });

  it('returns LOW for less than monthly', () => {
    expect(classifyDeploymentFrequency(1 / 60)).toBe(DORA_LEVELS.LOW);
    expect(classifyDeploymentFrequency(0)).toBe(DORA_LEVELS.LOW);
  });
});

// ── computeVelocityTrend ─────────────────────────────────────

describe('computeVelocityTrend', () => {
  it('returns completed_points for each sprint in order', () => {
    const sprints = [
      makeSprint('s1', { completed: 10 }),
      makeSprint('s2', { completed: 14 }),
      makeSprint('s3', { completed: 12 }),
    ];
    expect(computeVelocityTrend(sprints)).toEqual([10, 14, 12]);
  });

  it('returns empty array for empty input', () => {
    expect(computeVelocityTrend([])).toEqual([]);
  });
});

// ── ensureMetric ─────────────────────────────────────────────

describe('ensureMetric', () => {
  it('creates a new metric series when absent', () => {
    const store = createMetricsStore();
    const metric = ensureMetric(store, 'my_metric', 'ms');
    expect(metric.name).toBe('my_metric');
    expect(metric.unit).toBe('ms');
    expect(metric.data_points).toHaveLength(0);
    expect(store.metrics['my_metric']).toBe(metric);
  });

  it('returns the existing metric series when already present', () => {
    const store = createMetricsStore();
    const m1 = ensureMetric(store, 'counter', 'count');
    const m2 = ensureMetric(store, 'counter', 'count');
    expect(m1).toBe(m2); // same object reference
  });
});

// ── deserializeMetricsStore ──────────────────────────────────

describe('deserializeMetricsStore', () => {
  it('round-trips a serialized store', () => {
    let store = createMetricsStore();
    store = appendMetric(store, 'rt_metric', 'ms', 42, { label: 'x' });
    const json = serializeMetricsStore(store);
    const restored = deserializeMetricsStore(json);
    expect(restored.metrics['rt_metric'].data_points[0].value).toBe(42);
    expect(restored.metrics['rt_metric'].data_points[0].labels).toEqual({ label: 'x' });
  });

  it('returns an empty store for invalid JSON', () => {
    const result = deserializeMetricsStore('not valid json!');
    expect(result.metrics).toEqual({});
  });

  it('returns an empty store when required fields are missing', () => {
    const result = deserializeMetricsStore(JSON.stringify({ foo: 'bar' }));
    expect(result.metrics).toEqual({});
  });
});

// ── recordToolExecutionTrace ─────────────────────────────────

describe('recordToolExecutionTrace', () => {
  it('appends duration and success data points', () => {
    let store = createMetricsStore();
    store = recordToolExecutionTrace(store, {
      agent_id: 'a1',
      agent_name: 'Agent One',
      state: 'PHASE_1',
      tool_id: 'tool.files.read',
      operation: 'read',
      duration_ms: 120,
      success: true,
    });
    expect(store.metrics['tool_execution_duration_ms'].data_points).toHaveLength(1);
    expect(store.metrics['tool_execution_duration_ms'].data_points[0].value).toBe(120);
    expect(store.metrics['tool_execution_success'].data_points[0].value).toBe(1);
  });

  it('records failure as success=0', () => {
    let store = createMetricsStore();
    store = recordToolExecutionTrace(store, {
      agent_id: 'a1',
      agent_name: 'Agent One',
      state: 'PHASE_2',
      tool_id: 'tool.files.write',
      operation: 'write',
      duration_ms: 50,
      success: false,
      error_code: 'PERMISSION_DENIED',
    });
    expect(store.metrics['tool_execution_success'].data_points[0].value).toBe(0);
    expect(store.metrics['tool_execution_success'].data_points[0].labels?.error_code).toBe(
      'PERMISSION_DENIED'
    );
  });
});

// ── computeStageLatencyStats ─────────────────────────────────

describe('computeStageLatencyStats', () => {
  it('returns empty array when store has no agent metrics', () => {
    const store = createMetricsStore();
    expect(computeStageLatencyStats(store)).toEqual([]);
  });

  it('computes p50/p95, failure rate grouped by state', () => {
    let store = createMetricsStore();
    const agentBase = {
      agent_id: 'a1',
      agent_name: 'A1',
      state: 'PHASE_1',
      started_at: '2025-01-01T00:00:00Z',
      ended_at: '2025-01-01T00:00:01Z',
      attempt: 1,
      provider: 'copilot',
    };
    // 3 successful invocations for PHASE_1
    for (const ms of [100, 200, 300]) {
      store = recordAgentPerformance(store, { ...agentBase, duration_ms: ms, success: true });
    }
    // 1 failed invocation for PHASE_1
    store = recordAgentPerformance(store, { ...agentBase, duration_ms: 50, success: false });

    const stats = computeStageLatencyStats(store);
    expect(stats).toHaveLength(1);
    const row = stats[0];
    expect(row.stage).toBe('PHASE_1');
    expect(row.total_invocations).toBe(4);
    expect(row.failure_rate_pct).toBeCloseTo(25, 1); // 1 of 4 failed
    expect(row.p50_duration_ms).toBeGreaterThan(0);
    expect(row.p95_duration_ms).toBeGreaterThanOrEqual(row.p50_duration_ms);
  });
});

// ── computeToolLatencyStats ──────────────────────────────────

describe('computeToolLatencyStats', () => {
  it('returns empty array when store has no tool execution metrics', () => {
    const store = createMetricsStore();
    expect(computeToolLatencyStats(store)).toEqual([]);
  });

  it('groups stats by tool_id + operation', () => {
    let store = createMetricsStore();
    const base = {
      agent_id: 'a1',
      agent_name: 'A1',
      state: 'PHASE_1',
      tool_id: 'tool.files.read',
      operation: 'read',
    };
    for (const ms of [80, 120, 100]) {
      store = recordToolExecutionTrace(store, { ...base, duration_ms: ms, success: true });
    }
    store = recordToolExecutionTrace(store, { ...base, duration_ms: 200, success: false });
    // A different tool
    store = recordToolExecutionTrace(store, {
      ...base,
      tool_id: 'tool.files.write',
      operation: 'write',
      duration_ms: 60,
      success: true,
    });

    const stats = computeToolLatencyStats(store);
    expect(stats.length).toBeGreaterThanOrEqual(2);
    const readRow = stats.find((s) => s.tool_id === 'tool.files.read' && s.operation === 'read');
    expect(readRow).toBeDefined();
    expect(readRow.total_invocations).toBe(4);
    expect(readRow.failure_rate_pct).toBeCloseTo(25, 1);
    const writeRow = stats.find((s) => s.tool_id === 'tool.files.write');
    expect(writeRow).toBeDefined();
    expect(writeRow.total_invocations).toBe(1);
  });
});
