'use strict';

/**
 * SDLC Observability & DORA Metrics — Unit Tests
 *
 * Validates DORA metric computation, level classification,
 * full report generation, sprint velocity, and defect density.
 */

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
} = require('../../platform/sdlc/observability');

// ─── Enum Guards ─────────────────────────────────────────────

describe('DORA_LEVELS', () => {
  it('has 4 levels', () => {
    expect(Object.keys(DORA_LEVELS)).toHaveLength(4);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(DORA_LEVELS)).toBe(true);
  });
});

// ─── Lead Time ───────────────────────────────────────────────

describe('computeLeadTime', () => {
  it('returns 0 with no commits', () => {
    expect(
      computeLeadTime(
        [],
        [
          {
            id: 'd1',
            timestamp: '2025-01-02T00:00:00Z',
            environment: 'prod',
            release_version: '1.0',
            success: true,
            commit_ids: [],
          },
        ]
      )
    ).toBe(0);
  });

  it('returns 0 with no deployments', () => {
    expect(
      computeLeadTime(
        [{ id: 'c1', timestamp: '2025-01-01T00:00:00Z', author: 'dev', branch: 'main' }],
        []
      )
    ).toBe(0);
  });

  it('computes average hours from commit to deploy', () => {
    const commits = [
      { id: 'c1', timestamp: '2025-01-01T00:00:00Z', author: 'dev', branch: 'main' },
      { id: 'c2', timestamp: '2025-01-01T12:00:00Z', author: 'dev', branch: 'main' },
    ];
    const deployments = [
      {
        id: 'd1',
        timestamp: '2025-01-02T00:00:00Z',
        environment: 'prod',
        release_version: '1.0',
        success: true,
        commit_ids: ['c1', 'c2'],
      },
    ];
    // c1 → d1 = 24h, c2 → d1 = 12h, average = 18h
    expect(computeLeadTime(commits, deployments)).toBe(18);
  });

  it('ignores failed deployments', () => {
    const commits = [
      { id: 'c1', timestamp: '2025-01-01T00:00:00Z', author: 'dev', branch: 'main' },
    ];
    const deployments = [
      {
        id: 'd1',
        timestamp: '2025-01-02T00:00:00Z',
        environment: 'prod',
        release_version: '1.0',
        success: false,
        commit_ids: ['c1'],
      },
    ];
    expect(computeLeadTime(commits, deployments)).toBe(0);
  });

  it('ignores unknown commit ids and negative lead-time deltas', () => {
    const commits = [
      { id: 'c1', timestamp: '2025-01-03T00:00:00Z', author: 'dev', branch: 'main' },
    ];
    const deployments = [
      {
        id: 'd1',
        timestamp: '2025-01-02T00:00:00Z',
        environment: 'prod',
        release_version: '1.0',
        success: true,
        commit_ids: ['c1', 'missing-id'],
      },
    ];
    expect(computeLeadTime(commits, deployments)).toBe(0);
  });
});

// ─── Deployment Frequency ────────────────────────────────────

describe('computeDeploymentFrequency', () => {
  it('returns 0 for zero-length period', () => {
    expect(computeDeploymentFrequency([], '2025-01-01', '2025-01-01')).toBe(0);
  });

  it('computes successful deploys per day', () => {
    const deploys = [
      {
        id: 'd1',
        timestamp: '2025-01-02T00:00:00Z',
        environment: 'prod',
        release_version: '1.0',
        success: true,
        commit_ids: [],
      },
      {
        id: 'd2',
        timestamp: '2025-01-03T00:00:00Z',
        environment: 'prod',
        release_version: '1.1',
        success: true,
        commit_ids: [],
      },
      {
        id: 'd3',
        timestamp: '2025-01-04T00:00:00Z',
        environment: 'prod',
        release_version: '1.2',
        success: false,
        commit_ids: [],
      },
    ];
    // 2 successful in 7 days = 0.2857...
    const freq = computeDeploymentFrequency(deploys, '2025-01-01', '2025-01-08');
    expect(freq).toBeCloseTo(2 / 7, 4);
  });

  it('includes events exactly on period boundaries', () => {
    const deploys = [
      {
        id: 'd1',
        timestamp: '2025-01-01T00:00:00Z',
        environment: 'prod',
        release_version: '1.0',
        success: true,
        commit_ids: [],
      },
      {
        id: 'd2',
        timestamp: '2025-01-02T00:00:00Z',
        environment: 'prod',
        release_version: '1.1',
        success: true,
        commit_ids: [],
      },
    ];
    const freq = computeDeploymentFrequency(
      deploys,
      '2025-01-01T00:00:00Z',
      '2025-01-02T00:00:00Z'
    );
    expect(freq).toBe(2);
  });
});

// ─── Change Failure Rate ─────────────────────────────────────

describe('computeChangeFailureRate', () => {
  it('returns 0 with no successful deployments', () => {
    expect(computeChangeFailureRate([], [])).toBe(0);
  });

  it('computes percentage of deploys causing incidents', () => {
    const deploys = [
      {
        id: 'd1',
        timestamp: '2025-01-01T00:00:00Z',
        environment: 'prod',
        release_version: '1.0',
        success: true,
        commit_ids: [],
      },
      {
        id: 'd2',
        timestamp: '2025-01-02T00:00:00Z',
        environment: 'prod',
        release_version: '1.1',
        success: true,
        commit_ids: [],
      },
    ];
    const incidents = [
      {
        id: 'i1',
        opened_at: '2025-01-01T01:00:00Z',
        resolved_at: '2025-01-01T02:00:00Z',
        severity: 'HIGH',
        deployment_id: 'd1',
      },
    ];
    // 1 out of 2 = 50%
    expect(computeChangeFailureRate(deploys, incidents)).toBe(50);
  });

  it('counts each deployment once even if multiple incidents reference it', () => {
    const deploys = [
      {
        id: 'd1',
        timestamp: '2025-01-01T00:00:00Z',
        environment: 'prod',
        release_version: '1.0',
        success: true,
        commit_ids: [],
      },
      {
        id: 'd2',
        timestamp: '2025-01-02T00:00:00Z',
        environment: 'prod',
        release_version: '1.1',
        success: true,
        commit_ids: [],
      },
    ];
    const incidents = [
      {
        id: 'i1',
        opened_at: '2025-01-01T01:00:00Z',
        resolved_at: '2025-01-01T02:00:00Z',
        severity: 'HIGH',
        deployment_id: 'd1',
      },
      {
        id: 'i2',
        opened_at: '2025-01-01T03:00:00Z',
        resolved_at: '2025-01-01T04:00:00Z',
        severity: 'MEDIUM',
        deployment_id: 'd1',
      },
    ];

    expect(computeChangeFailureRate(deploys, incidents)).toBe(50);
  });
});

// ─── MTTR ────────────────────────────────────────────────────

describe('computeMTTR', () => {
  it('returns 0 with no resolved incidents', () => {
    expect(computeMTTR([])).toBe(0);
    expect(
      computeMTTR([
        {
          id: 'i1',
          opened_at: '2025-01-01T00:00:00Z',
          resolved_at: null,
          severity: 'HIGH',
          deployment_id: 'd1',
        },
      ])
    ).toBe(0);
  });

  it('computes average hours to resolution', () => {
    const incidents = [
      {
        id: 'i1',
        opened_at: '2025-01-01T00:00:00Z',
        resolved_at: '2025-01-01T02:00:00Z',
        severity: 'HIGH',
        deployment_id: 'd1',
      },
      {
        id: 'i2',
        opened_at: '2025-01-02T00:00:00Z',
        resolved_at: '2025-01-02T04:00:00Z',
        severity: 'MEDIUM',
        deployment_id: 'd2',
      },
    ];
    // (2 + 4) / 2 = 3 hours
    expect(computeMTTR(incidents)).toBe(3);
  });

  it('handles unresolved incidents by excluding them from MTTR', () => {
    const incidents = [
      {
        id: 'i1',
        opened_at: '2025-01-01T00:00:00Z',
        resolved_at: '2025-01-01T02:00:00Z',
        severity: 'HIGH',
        deployment_id: 'd1',
      },
      {
        id: 'i2',
        opened_at: '2025-01-01T00:00:00Z',
        resolved_at: null,
        severity: 'HIGH',
        deployment_id: 'd2',
      },
    ];
    expect(computeMTTR(incidents)).toBe(2);
  });
});

// ─── DORA Classification ─────────────────────────────────────

describe('DORA classification functions', () => {
  it('classifyLeadTime', () => {
    expect(classifyLeadTime(12)).toBe('ELITE'); // ≤ 24h
    expect(classifyLeadTime(100)).toBe('HIGH'); // ≤ 168h (1 week)
    expect(classifyLeadTime(500)).toBe('MEDIUM'); // ≤ 720h (1 month)
    expect(classifyLeadTime(1000)).toBe('LOW');
  });

  it('classifyDeploymentFrequency', () => {
    expect(classifyDeploymentFrequency(2)).toBe('ELITE'); // ≥ 1/day
    expect(classifyDeploymentFrequency(0.5)).toBe('HIGH'); // ≥ 1/week
    expect(classifyDeploymentFrequency(0.05)).toBe('MEDIUM'); // ≥ 1/month
    expect(classifyDeploymentFrequency(0.01)).toBe('LOW');
  });

  it('classifyChangeFailureRate', () => {
    expect(classifyChangeFailureRate(3)).toBe('ELITE'); // ≤ 5%
    expect(classifyChangeFailureRate(8)).toBe('HIGH'); // ≤ 10%
    expect(classifyChangeFailureRate(12)).toBe('MEDIUM'); // ≤ 15%
    expect(classifyChangeFailureRate(20)).toBe('LOW');
  });

  it('classifyMTTR', () => {
    expect(classifyMTTR(0.5)).toBe('ELITE'); // ≤ 1h
    expect(classifyMTTR(12)).toBe('HIGH'); // ≤ 24h
    expect(classifyMTTR(100)).toBe('MEDIUM'); // ≤ 168h
    expect(classifyMTTR(200)).toBe('LOW');
  });
});

// ─── Full DORA Report ────────────────────────────────────────

describe('computeDoraReport', () => {
  it('produces a complete report', () => {
    const commits = [
      { id: 'c1', timestamp: '2025-01-01T00:00:00Z', author: 'dev', branch: 'main' },
    ];
    const deployments = [
      {
        id: 'd1',
        timestamp: '2025-01-01T12:00:00Z',
        environment: 'prod',
        release_version: '1.0',
        success: true,
        commit_ids: ['c1'],
      },
    ];
    const incidents = [];

    const report = computeDoraReport(commits, deployments, incidents, '2025-01-01', '2025-01-08');
    expect(report.period_start).toBe('2025-01-01');
    expect(report.period_end).toBe('2025-01-08');
    expect(report.lead_time_hours).toBeGreaterThan(0);
    expect(report.deployment_frequency_per_day).toBeGreaterThan(0);
    expect(report.change_failure_rate_pct).toBe(0);
    expect(report.mttr_hours).toBe(0);
    expect(report.overall_level).toBeDefined();
    expect(['ELITE', 'HIGH', 'MEDIUM', 'LOW']).toContain(report.overall_level);
  });

  it('overall_level is worst of sub-levels', () => {
    // Force LOW deployment frequency by having 0 deploys
    const report = computeDoraReport([], [], [], '2025-01-01', '2025-01-08');
    // With no data, lead_time = 0 → ELITE, deploy_freq = 0 → LOW, CFR = 0 → ELITE, MTTR = 0 → ELITE
    // Worst = LOW
    expect(report.overall_level).toBe('LOW');
  });
});

// ─── Sprint Metrics ──────────────────────────────────────────

describe('Sprint metrics', () => {
  const sprints = [
    {
      sprint_id: 'SP-1',
      started_at: '2025-01-01',
      ended_at: '2025-01-14',
      planned_points: 30,
      completed_points: 25,
      tasks_completed: 10,
      tasks_carried_over: 2,
      defects_found: 3,
      defects_fixed: 2,
    },
    {
      sprint_id: 'SP-2',
      started_at: '2025-01-15',
      ended_at: '2025-01-28',
      planned_points: 30,
      completed_points: 28,
      tasks_completed: 12,
      tasks_carried_over: 1,
      defects_found: 1,
      defects_fixed: 1,
    },
    {
      sprint_id: 'SP-3',
      started_at: '2025-01-29',
      ended_at: '2025-02-11',
      planned_points: 35,
      completed_points: 32,
      tasks_completed: 14,
      tasks_carried_over: 0,
      defects_found: 2,
      defects_fixed: 2,
    },
  ];

  it('computeVelocityTrend returns completed points per sprint', () => {
    const trend = computeVelocityTrend(sprints);
    expect(trend).toEqual([25, 28, 32]);
  });

  it('computeDefectDensity returns defects per task ratio', () => {
    // total tasks = 36, total defects = 6, density = 6/36 ≈ 0.17
    const density = computeDefectDensity(sprints);
    expect(density).toBeCloseTo(0.17, 2);
  });

  it('computeDefectDensity returns 0 with no tasks', () => {
    expect(computeDefectDensity([])).toBe(0);
  });
});
