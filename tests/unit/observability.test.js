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
  createMetricsStore,
  appendMetric,
  queryMetric,
  serializeMetricsStore,
  recordAgentPerformance,
  computeAgentStats,
  computeVelocityTrendEntry,
  recordSprintBoundary,
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
    let store = createMetricsStore();
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
    });
    expect(store.metrics['agent_duration_ms'].data_points).toHaveLength(1);
    expect(store.metrics['agent_success'].data_points[0].value).toBe(1);
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
