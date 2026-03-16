// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const {
  DORA_LEVELS,
  computeLeadTime,
  computeDeploymentFrequency,
  computeChangeFailureRate,
  computeMTTR,
  classifyLeadTime,
  classifyDeploymentFrequency,
  classifyChangeFailureRate,
  classifyMTTR,
  computeDoraReport,
  computeVelocityTrend,
  computeDefectDensity,
  createMetricsStore,
  ensureMetric,
  appendMetric,
  queryMetric,
  serializeMetricsStore,
  deserializeMetricsStore,
  recordAgentPerformance,
  computeAgentStats,
  computeVelocityTrendEntry,
  recordSprintBoundary,
} = require('../../platform/sdlc/observability');

/* ── helpers ─────────────────────────────────────────────── */

function makeCommit(id, timestamp) {
  return { id, timestamp, author: 'dev', branch: 'main' };
}

function makeDeploy(id, timestamp, success, commitIds) {
  return {
    id,
    timestamp,
    environment: 'prod',
    release_version: '1.0',
    success,
    commit_ids: commitIds,
  };
}

function makeIncident(id, openedAt, resolvedAt, deploymentId) {
  return {
    id,
    opened_at: openedAt,
    resolved_at: resolvedAt,
    severity: 'HIGH',
    deployment_id: deploymentId,
  };
}

function makeSprint(id, planned, completed, defects = 0) {
  return {
    sprint_id: id,
    started_at: '2026-01-01T00:00:00Z',
    ended_at: '2026-01-14T00:00:00Z',
    planned_points: planned,
    completed_points: completed,
    tasks_completed: completed,
    tasks_carried_over: planned - completed,
    defects_found: defects,
    defects_fixed: defects,
  };
}

function makeAgentRecord(agentId, durationMs, success) {
  return {
    agent_id: agentId,
    agent_name: `Agent-${agentId}`,
    state: 'COMPLETED',
    started_at: '2026-01-01T00:00:00Z',
    ended_at: '2026-01-01T00:01:00Z',
    duration_ms: durationMs,
    success,
    attempt: 1,
  };
}

/* ── DORA Levels ─────────────────────────────────────────── */

describe('DORA_LEVELS', () => {
  it('has all four levels frozen', () => {
    expect(DORA_LEVELS.ELITE).toBe('ELITE');
    expect(DORA_LEVELS.HIGH).toBe('HIGH');
    expect(DORA_LEVELS.MEDIUM).toBe('MEDIUM');
    expect(DORA_LEVELS.LOW).toBe('LOW');
    expect(Object.isFrozen(DORA_LEVELS)).toBe(true);
  });
});

/* ── computeLeadTime ─────────────────────────────────────── */

describe('computeLeadTime', () => {
  it('returns 0 for empty commits', () => {
    expect(computeLeadTime([], [makeDeploy('d1', '2026-01-02T00:00:00Z', true, ['c1'])])).toBe(0);
  });

  it('returns 0 for empty deployments', () => {
    expect(computeLeadTime([makeCommit('c1', '2026-01-01T00:00:00Z')], [])).toBe(0);
  });

  it('computes lead time from commit to deploy', () => {
    const commits = [makeCommit('c1', '2026-01-01T00:00:00Z')];
    const deploys = [makeDeploy('d1', '2026-01-01T12:00:00Z', true, ['c1'])];
    expect(computeLeadTime(commits, deploys)).toBe(12);
  });

  it('skips failed deployments', () => {
    const commits = [makeCommit('c1', '2026-01-01T00:00:00Z')];
    const deploys = [makeDeploy('d1', '2026-01-01T12:00:00Z', false, ['c1'])];
    expect(computeLeadTime(commits, deploys)).toBe(0);
  });

  it('averages multiple commit lead times', () => {
    const commits = [
      makeCommit('c1', '2026-01-01T00:00:00Z'),
      makeCommit('c2', '2026-01-01T06:00:00Z'),
    ];
    const deploys = [makeDeploy('d1', '2026-01-01T12:00:00Z', true, ['c1', 'c2'])];
    // c1=12h, c2=6h => avg=9h
    expect(computeLeadTime(commits, deploys)).toBe(9);
  });

  it('ignores unknown commit ids in deploy', () => {
    const commits = [makeCommit('c1', '2026-01-01T00:00:00Z')];
    const deploys = [makeDeploy('d1', '2026-01-01T12:00:00Z', true, ['c1', 'c999'])];
    expect(computeLeadTime(commits, deploys)).toBe(12);
  });
});

/* ── computeDeploymentFrequency ──────────────────────────── */

describe('computeDeploymentFrequency', () => {
  it('returns 0 when period is zero or negative days', () => {
    const deploys = [makeDeploy('d1', '2026-01-01T12:00:00Z', true, [])];
    expect(computeDeploymentFrequency(deploys, '2026-01-02', '2026-01-01')).toBe(0);
  });

  it('counts successful deploys per day', () => {
    const deploys = [
      makeDeploy('d1', '2026-01-02T12:00:00Z', true, []),
      makeDeploy('d2', '2026-01-03T12:00:00Z', true, []),
      makeDeploy('d3', '2026-01-04T12:00:00Z', false, []),
    ];
    // 2 successful in 7 days
    const freq = computeDeploymentFrequency(deploys, '2026-01-01', '2026-01-08');
    expect(freq).toBeCloseTo(2 / 7, 4);
  });

  it('excludes deploys outside period', () => {
    const deploys = [
      makeDeploy('d1', '2025-12-31T12:00:00Z', true, []),
      makeDeploy('d2', '2026-01-05T12:00:00Z', true, []),
    ];
    const freq = computeDeploymentFrequency(deploys, '2026-01-01', '2026-01-04');
    expect(freq).toBe(0);
  });
});

/* ── computeChangeFailureRate ────────────────────────────── */

describe('computeChangeFailureRate', () => {
  it('returns 0 for no successful deploys', () => {
    const deploys = [makeDeploy('d1', '2026-01-01T00:00:00Z', false, [])];
    expect(computeChangeFailureRate(deploys, [])).toBe(0);
  });

  it('computes percentage of deploys with incidents', () => {
    const deploys = [
      makeDeploy('d1', '2026-01-01T00:00:00Z', true, []),
      makeDeploy('d2', '2026-01-02T00:00:00Z', true, []),
    ];
    const incidents = [makeIncident('i1', '2026-01-01T01:00:00Z', '2026-01-01T02:00:00Z', 'd1')];
    expect(computeChangeFailureRate(deploys, incidents)).toBe(50);
  });
});

/* ── computeMTTR ─────────────────────────────────────────── */

describe('computeMTTR', () => {
  it('returns 0 for no incidents', () => {
    expect(computeMTTR([])).toBe(0);
  });

  it('returns 0 when no incidents are resolved', () => {
    const incidents = [makeIncident('i1', '2026-01-01T00:00:00Z', null, 'd1')];
    expect(computeMTTR(incidents)).toBe(0);
  });

  it('computes average recovery time', () => {
    const incidents = [
      makeIncident('i1', '2026-01-01T00:00:00Z', '2026-01-01T02:00:00Z', 'd1'),
      makeIncident('i2', '2026-01-02T00:00:00Z', '2026-01-02T04:00:00Z', 'd2'),
    ];
    expect(computeMTTR(incidents)).toBe(3); // (2+4)/2
  });
});

/* ── DORA classification functions ───────────────────────── */

describe('classifyLeadTime', () => {
  it('ELITE for ≤24h', () => expect(classifyLeadTime(24)).toBe('ELITE'));
  it('HIGH for ≤168h', () => expect(classifyLeadTime(168)).toBe('HIGH'));
  it('MEDIUM for ≤720h', () => expect(classifyLeadTime(720)).toBe('MEDIUM'));
  it('LOW for >720h', () => expect(classifyLeadTime(721)).toBe('LOW'));
});

describe('classifyDeploymentFrequency', () => {
  it('ELITE for ≥1/day', () => expect(classifyDeploymentFrequency(1)).toBe('ELITE'));
  it('HIGH for ≥1/week', () => expect(classifyDeploymentFrequency(1 / 7)).toBe('HIGH'));
  it('MEDIUM for ≥1/month', () => expect(classifyDeploymentFrequency(1 / 30)).toBe('MEDIUM'));
  it('LOW for <1/month', () => expect(classifyDeploymentFrequency(1 / 31)).toBe('LOW'));
});

describe('classifyChangeFailureRate', () => {
  it('ELITE for ≤5%', () => expect(classifyChangeFailureRate(5)).toBe('ELITE'));
  it('HIGH for ≤10%', () => expect(classifyChangeFailureRate(10)).toBe('HIGH'));
  it('MEDIUM for ≤15%', () => expect(classifyChangeFailureRate(15)).toBe('MEDIUM'));
  it('LOW for >15%', () => expect(classifyChangeFailureRate(16)).toBe('LOW'));
});

describe('classifyMTTR', () => {
  it('ELITE for ≤1h', () => expect(classifyMTTR(1)).toBe('ELITE'));
  it('HIGH for ≤24h', () => expect(classifyMTTR(24)).toBe('HIGH'));
  it('MEDIUM for ≤168h', () => expect(classifyMTTR(168)).toBe('MEDIUM'));
  it('LOW for >168h', () => expect(classifyMTTR(169)).toBe('LOW'));
});

/* ── computeDoraReport ───────────────────────────────────── */

describe('computeDoraReport', () => {
  it('produces a full DORA report', () => {
    const commits = [makeCommit('c1', '2026-01-01T00:00:00Z')];
    const deploys = [makeDeploy('d1', '2026-01-01T12:00:00Z', true, ['c1'])];
    const incidents = [];
    const report = computeDoraReport(commits, deploys, incidents, '2026-01-01', '2026-01-08');
    expect(report.period_start).toBe('2026-01-01');
    expect(report.period_end).toBe('2026-01-08');
    expect(report.lead_time_hours).toBe(12);
    expect(typeof report.deployment_frequency_per_day).toBe('number');
    expect(report.change_failure_rate_pct).toBe(0);
    expect(report.mttr_hours).toBe(0);
    expect(report.overall_level).toBeDefined();
  });

  it('uses worst DORA level as overall', () => {
    // One long lead time but everything else elite → overall should be LOW
    const commits = [makeCommit('c1', '2025-01-01T00:00:00Z')];
    const deploys = [makeDeploy('d1', '2026-01-01T00:00:00Z', true, ['c1'])];
    const report = computeDoraReport(commits, deploys, [], '2025-12-01', '2026-01-02');
    expect(report.overall_level).toBe('LOW');
  });
});

/* ── computeVelocityTrend / computeDefectDensity ─────────── */

describe('computeVelocityTrend', () => {
  it('returns completed points per sprint', () => {
    const sprints = [makeSprint('SP-1', 20, 18), makeSprint('SP-2', 20, 15)];
    expect(computeVelocityTrend(sprints)).toEqual([18, 15]);
  });

  it('returns empty for no sprints', () => {
    expect(computeVelocityTrend([])).toEqual([]);
  });
});

describe('computeDefectDensity', () => {
  it('computes defects per task', () => {
    const sprints = [makeSprint('SP-1', 20, 10, 2), makeSprint('SP-2', 20, 10, 3)];
    expect(computeDefectDensity(sprints)).toBe(0.25); // 5/20
  });

  it('returns 0 for no tasks', () => {
    const sprints = [makeSprint('SP-1', 0, 0, 0)];
    expect(computeDefectDensity(sprints)).toBe(0);
  });
});

/* ── MetricsStore (time-series) ──────────────────────────── */

describe('createMetricsStore', () => {
  it('creates empty store with timestamp', () => {
    const store = createMetricsStore();
    expect(store.metrics).toEqual({});
    expect(store.last_updated).toBeDefined();
  });
});

describe('ensureMetric', () => {
  it('creates new metric if not present', () => {
    const store = createMetricsStore();
    const metric = ensureMetric(store, 'cpu', 'percent');
    expect(metric.name).toBe('cpu');
    expect(metric.unit).toBe('percent');
    expect(metric.data_points).toEqual([]);
  });

  it('returns existing metric without overwriting', () => {
    const store = createMetricsStore();
    const m1 = ensureMetric(store, 'cpu', 'percent');
    m1.data_points.push({ timestamp: 'T', value: 42 });
    const m2 = ensureMetric(store, 'cpu', 'percent');
    expect(m2.data_points.length).toBe(1);
  });
});

describe('appendMetric', () => {
  it('appends data point to new metric', () => {
    const store = createMetricsStore();
    appendMetric(store, 'mem', 'MB', 512);
    expect(store.metrics.mem.data_points.length).toBe(1);
    expect(store.metrics.mem.data_points[0].value).toBe(512);
  });

  it('appends with labels', () => {
    const store = createMetricsStore();
    appendMetric(store, 'req', 'count', 1, { path: '/api' });
    expect(store.metrics.req.data_points[0].labels).toEqual({ path: '/api' });
  });

  it('returns updated store for chaining', () => {
    const store = createMetricsStore();
    const result = appendMetric(store, 'x', 'y', 1);
    expect(result).toBe(store);
  });
});

describe('queryMetric', () => {
  it('returns empty for unknown metric', () => {
    const store = createMetricsStore();
    expect(queryMetric(store, 'nope')).toEqual([]);
  });

  it('returns all when no time bounds', () => {
    const store = createMetricsStore();
    store.metrics.cpu = {
      name: 'cpu',
      unit: '%',
      data_points: [
        { timestamp: '2026-01-01T00:00:00Z', value: 10 },
        { timestamp: '2026-01-02T00:00:00Z', value: 20 },
      ],
    };
    expect(queryMetric(store, 'cpu').length).toBe(2);
  });

  it('filters by from bound', () => {
    const store = createMetricsStore();
    store.metrics.cpu = {
      name: 'cpu',
      unit: '%',
      data_points: [
        { timestamp: '2026-01-01T00:00:00Z', value: 10 },
        { timestamp: '2026-01-02T00:00:00Z', value: 20 },
      ],
    };
    const result = queryMetric(store, 'cpu', '2026-01-01T12:00:00Z');
    expect(result.length).toBe(1);
    expect(result[0].value).toBe(20);
  });

  it('filters by to bound', () => {
    const store = createMetricsStore();
    store.metrics.cpu = {
      name: 'cpu',
      unit: '%',
      data_points: [
        { timestamp: '2026-01-01T00:00:00Z', value: 10 },
        { timestamp: '2026-01-02T00:00:00Z', value: 20 },
      ],
    };
    const result = queryMetric(store, 'cpu', undefined, '2026-01-01T12:00:00Z');
    expect(result.length).toBe(1);
    expect(result[0].value).toBe(10);
  });

  it('filters by both bounds', () => {
    const store = createMetricsStore();
    store.metrics.cpu = {
      name: 'cpu',
      unit: '%',
      data_points: [
        { timestamp: '2026-01-01T00:00:00Z', value: 10 },
        { timestamp: '2026-01-02T00:00:00Z', value: 20 },
        { timestamp: '2026-01-03T00:00:00Z', value: 30 },
      ],
    };
    const result = queryMetric(store, 'cpu', '2026-01-01T12:00:00Z', '2026-01-02T12:00:00Z');
    expect(result.length).toBe(1);
    expect(result[0].value).toBe(20);
  });
});

describe('serializeMetricsStore / deserializeMetricsStore', () => {
  it('round-trips through JSON', () => {
    const store = createMetricsStore();
    appendMetric(store, 'x', 'y', 42);
    const json = serializeMetricsStore(store);
    const restored = deserializeMetricsStore(json);
    expect(restored.metrics.x.data_points[0].value).toBe(42);
  });

  it('deserialize returns empty store for invalid JSON', () => {
    const store = deserializeMetricsStore('not json');
    expect(store.metrics).toEqual({});
  });

  it('deserialize returns empty store for missing fields', () => {
    const store = deserializeMetricsStore('{"foo":"bar"}');
    expect(store.metrics).toEqual({});
  });
});

/* ── Agent Performance ───────────────────────────────────── */

describe('recordAgentPerformance', () => {
  it('records duration and success metrics', () => {
    const store = createMetricsStore();
    recordAgentPerformance(store, makeAgentRecord('a1', 100, true));
    expect(store.metrics.agent_duration_ms.data_points.length).toBe(1);
    expect(store.metrics.agent_success.data_points.length).toBe(1);
    expect(store.metrics.agent_success.data_points[0].value).toBe(1);
  });

  it('records failure as 0', () => {
    const store = createMetricsStore();
    recordAgentPerformance(store, makeAgentRecord('a1', 200, false));
    expect(store.metrics.agent_success.data_points[0].value).toBe(0);
  });
});

describe('computeAgentStats', () => {
  it('returns empty for store without agent metrics', () => {
    const store = createMetricsStore();
    expect(computeAgentStats(store)).toEqual([]);
  });

  it('computes stats for single agent', () => {
    const store = createMetricsStore();
    recordAgentPerformance(store, makeAgentRecord('a1', 100, true));
    recordAgentPerformance(store, makeAgentRecord('a1', 200, true));
    recordAgentPerformance(store, makeAgentRecord('a1', 500, false));
    const stats = computeAgentStats(store);
    expect(stats.length).toBe(1);
    expect(stats[0].agent_id).toBe('a1');
    expect(stats[0].total_invocations).toBe(3);
    expect(stats[0].successful).toBe(2);
    expect(stats[0].failed).toBe(1);
    expect(stats[0].success_rate_pct).toBeCloseTo(66.67, 1);
    expect(stats[0].avg_duration_ms).toBeCloseTo(267, 0);
    expect(stats[0].min_duration_ms).toBe(100);
    expect(stats[0].max_duration_ms).toBe(500);
  });

  it('sorts by agent_id', () => {
    const store = createMetricsStore();
    recordAgentPerformance(store, makeAgentRecord('b1', 100, true));
    recordAgentPerformance(store, makeAgentRecord('a1', 200, true));
    const stats = computeAgentStats(store);
    expect(stats[0].agent_id).toBe('a1');
    expect(stats[1].agent_id).toBe('b1');
  });
});

/* ── Velocity Trend Entries ──────────────────────────────── */

describe('computeVelocityTrendEntry', () => {
  it('returns empty for no sprints', () => {
    expect(computeVelocityTrendEntry([])).toEqual([]);
  });

  it('computes entries with trailing average', () => {
    const sprints = [
      makeSprint('SP-1', 20, 18),
      makeSprint('SP-2', 20, 16),
      makeSprint('SP-3', 20, 20),
    ];
    const entries = computeVelocityTrendEntry(sprints, 2);
    expect(entries.length).toBe(3);
    // SP-1: window=[18], avg=18
    expect(entries[0].trailing_avg_velocity).toBe(18);
    // SP-2: window=[18,16], avg=17
    expect(entries[1].trailing_avg_velocity).toBe(17);
    // SP-3: window=[16,20], avg=18
    expect(entries[2].trailing_avg_velocity).toBe(18);
    // velocity_ratio for SP-1: 18/20=0.9
    expect(entries[0].velocity_ratio).toBe(0.9);
  });

  it('handles zero planned points', () => {
    const sprints = [makeSprint('SP-1', 0, 0)];
    const entries = computeVelocityTrendEntry(sprints);
    expect(entries[0].velocity_ratio).toBe(0);
  });
});

/* ── recordSprintBoundary ────────────────────────────────── */

describe('recordSprintBoundary', () => {
  it('records sprint metrics without DORA', () => {
    const store = createMetricsStore();
    const sprint = makeSprint('SP-1', 20, 18, 2);
    recordSprintBoundary(store, sprint);
    expect(store.metrics.sprint_planned_points.data_points.length).toBe(1);
    expect(store.metrics.sprint_completed_points.data_points.length).toBe(1);
    expect(store.metrics.sprint_velocity_ratio.data_points.length).toBe(1);
    expect(store.metrics.sprint_defects_found.data_points.length).toBe(1);
    expect(store.metrics.sprint_carry_over.data_points.length).toBe(1);
    expect(store.metrics.dora_lead_time_hours).toBeUndefined();
  });

  it('records DORA metrics when report provided', () => {
    const store = createMetricsStore();
    const sprint = makeSprint('SP-1', 20, 18);
    const dora = {
      period_start: '2026-01-01',
      period_end: '2026-01-14',
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
    recordSprintBoundary(store, sprint, dora);
    expect(store.metrics.dora_lead_time_hours.data_points.length).toBe(1);
    expect(store.metrics.dora_deploy_frequency.data_points.length).toBe(1);
    expect(store.metrics.dora_change_failure_rate.data_points.length).toBe(1);
    expect(store.metrics.dora_mttr_hours.data_points.length).toBe(1);
  });

  it('handles zero planned points without error', () => {
    const store = createMetricsStore();
    const sprint = makeSprint('SP-1', 0, 0);
    recordSprintBoundary(store, sprint);
    expect(store.metrics.sprint_velocity_ratio.data_points[0].value).toBe(0);
  });
});
