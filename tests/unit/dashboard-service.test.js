'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

async function loadDashboardService() {
  vi.resetModules();
  const mod = await import('../../src/webapp/services/dashboard-service.ts');
  return { DashboardService: mod.DashboardService };
}

describe('DashboardService', () => {
  let tempRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-service-'));
  });

  afterEach(() => {
    delete process.env.GITHUB_STARS;
    vi.restoreAllMocks();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('computes health status from repo artifacts and uptime metrics', async () => {
    const { DashboardService } = await loadDashboardService();
    const coverageDir = path.join(tempRoot, 'coverage');
    const distDir = path.join(tempRoot, 'src', 'webapp', 'ui', 'dist');
    fs.mkdirSync(coverageDir, { recursive: true });
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(
      path.join(coverageDir, 'coverage-summary.json'),
      JSON.stringify({ total: { statements: { pct: 82, covered: 82, total: 100 } } })
    );
    fs.writeFileSync(path.join(tempRoot, 'eslint.config.mjs'), 'export default [];');
    fs.writeFileSync(path.join(distDir, 'index.html'), '<html></html>');

    const service = new DashboardService({
      PROJECT_ROOT: tempRoot,
      _metrics: {
        startedAt: Date.now() - 5 * 60_000,
        requestCount: 0,
        errorCount: 0,
        responseTimes: [],
      },
    });

    const health = service.computeHealthStatus();

    expect(health.quality).toMatchObject({
      value: 'Configured',
      status: 'healthy',
      details: 'ESLint config present',
    });
    expect(health.coverage).toMatchObject({
      value: '82%',
      status: 'high',
      details: '82/100 statements covered',
    });
    expect(health.builds.value).toBe('✓ Built');
    expect(health.builds.status).toBe('healthy');
    expect(health.deployment).toMatchObject({ value: 'Running', status: 'stable' });
  });

  it('falls back cleanly when repo artifacts are missing', async () => {
    const { DashboardService } = await loadDashboardService();
    const service = new DashboardService({ PROJECT_ROOT: tempRoot });

    const health = service.computeHealthStatus();

    expect(health.quality).toMatchObject({
      value: 'N/A',
      status: 'unknown',
      details: 'ESLint not configured',
    });
    expect(health.coverage).toMatchObject({
      value: 'N/A',
      status: 'unknown',
      details: 'Run tests with --coverage to generate',
    });
    expect(health.builds).toMatchObject({
      value: 'Unknown',
      status: 'unknown',
      details: 'No build output found',
    });
    expect(health.deployment).toMatchObject({
      value: 'Offline',
      status: 'unknown',
      details: 'Server not started',
    });
  });

  it('reports medium coverage, alternate eslint config, and multi-hour uptime', async () => {
    const { DashboardService } = await loadDashboardService();
    const coverageDir = path.join(tempRoot, 'coverage');
    const distDir = path.join(tempRoot, 'src', 'webapp', 'ui', 'dist');
    fs.mkdirSync(coverageDir, { recursive: true });
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(
      path.join(coverageDir, 'coverage-summary.json'),
      '{"total":{"statements":{"pct":65,"covered":65,"total":100}}}'
    );
    fs.writeFileSync(path.join(tempRoot, '.eslintrc.json'), '{}');
    fs.writeFileSync(path.join(distDir, 'index.html'), '<html></html>');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    fs.utimesSync(path.join(distDir, 'index.html'), twoHoursAgo, twoHoursAgo);

    const service = new DashboardService({
      PROJECT_ROOT: tempRoot,
      _metrics: {
        startedAt: Date.now() - 125 * 60_000,
        requestCount: 0,
        errorCount: 0,
        responseTimes: [],
      },
    });

    const health = service.computeHealthStatus();

    expect(health.coverage).toMatchObject({ value: '65%', status: 'medium' });
    expect(health.quality).toMatchObject({ value: 'Configured', status: 'healthy' });
    expect(health.builds.details).toContain('Built 2h ago');
    expect(health.deployment.details).toContain('Up 2h 5m');
  });

  it('computes key metrics with defaults and warning thresholds', async () => {
    const { DashboardService } = await loadDashboardService();
    const service = new DashboardService({
      PROJECT_ROOT: tempRoot,
      _metrics: {
        startedAt: Date.now() - 1_000,
        requestCount: 20,
        errorCount: 2,
        responseTimes: [250, 150, 200],
      },
    });

    expect(service.computeKeyMetrics()).toEqual({
      http_requests: {
        value: '20',
        label: 'HTTP Requests',
        period: 'Last Hour',
      },
      error_rate: {
        value: '10.0%',
        label: 'Error Rate',
        period: 'Current',
        status: 'warning',
      },
      response_time: {
        value: '200',
        unit: 'ms',
        label: 'Avg Response Time',
        period: 'Current',
        status: 'warning',
      },
    });
  });

  it('maps audit entries into activity feed and filters system users', async () => {
    const { DashboardService } = await loadDashboardService();
    const service = new DashboardService({
      PROJECT_ROOT: tempRoot,
      _audit: {
        read: vi.fn(() => [
          {
            entity_type: 'milestone',
            operation: 'create',
            user: 'alice',
            summary: 'Created milestone',
            entity_id: 'M1',
            timestamp: '2026-03-19T10:00:00.000Z',
          },
          {
            entity_type: 'release-note',
            operation: 'delete',
            user: 'system',
            summary: 'Removed artifact',
            entity_id: 'R2',
            timestamp: '2026-03-19T11:00:00.000Z',
          },
          {
            user: undefined,
          },
          {
            entity_type: 'release-note',
            operation: 'create',
            user: 'webapp',
          },
        ]),
      },
    });

    const feed = service.computeActivityFeed();

    expect(feed).toHaveLength(4);
    expect(feed[0]).toMatchObject({
      type: 'milestone_created',
      user: null,
      action: 'Create Release Note',
      details: 'Changed Release Note',
    });
    expect(typeof feed[0].timestamp).toBe('string');
    expect(feed[0].metadata).toBeUndefined();
    expect(feed[1]).toMatchObject({
      type: 'commit',
      user: null,
      action: 'Update Record',
      details: 'Changed Record',
    });
    expect(feed[2]).toMatchObject({
      type: 'deployment',
      user: null,
      action: 'Delete Release Note',
      details: 'Removed artifact',
      metadata: { id: 'R2' },
    });
    expect(feed[3]).toMatchObject({
      type: 'milestone_created',
      user: 'alice',
      action: 'Create Milestone',
      details: 'Created milestone',
      metadata: { id: 'M1' },
    });
  });

  it('returns a fallback activity item when audit data is absent', async () => {
    const { DashboardService } = await loadDashboardService();
    const service = new DashboardService({ PROJECT_ROOT: tempRoot });

    const feed = service.computeActivityFeed();

    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({
      type: 'deployment',
      action: 'No audit events recorded yet',
    });
  });

  it('computes quick stats from git, milestones, audit users, and environment', async () => {
    const { DashboardService } = await loadDashboardService();
    const businessDocs = path.join(tempRoot, 'BusinessDocs');
    fs.mkdirSync(businessDocs, { recursive: true });
    fs.writeFileSync(
      path.join(businessDocs, 'milestones.json'),
      JSON.stringify([
        { id: 'M1', status: 'complete' },
        { id: 'M2', status: 'in_progress' },
        { id: 'M3', status: 'complete', archived: true },
      ])
    );
    process.env.GITHUB_STARS = '42';
    const execFileMock = vi
      .fn((command, args, options, callback) => callback(null, '', ''))
      .mockImplementationOnce((command, args, options, callback) =>
        callback(null, 'a.ts\nb.ts\n', '')
      )
      .mockImplementationOnce((command, args, options, callback) =>
        callback(null, 'Alice\nBob\nAlice\n', '')
      );

    const service = new DashboardService({
      PROJECT_ROOT: tempRoot,
      BUSINESS_DOCS: businessDocs,
      _execFile: execFileMock,
      _audit: {
        read: vi.fn(() => [{ user: 'webapp' }, { user: 'Carol' }]),
      },
    });

    const stats = await service.computeQuickStats();

    expect(stats).toEqual({
      active_files: {
        value: '2',
        label: 'Active Files',
        icon: '📄',
        details: 'Tracked by git ls-files',
      },
      team_members: {
        value: '2',
        label: 'Team Members',
        icon: '👥',
        details: 'Unique contributors (git + audit, last 180 days)',
      },
      sprint_progress: {
        value: '50%',
        label: 'Sprint Complete',
        icon: '🎯',
        details: '1 of 2 active milestones complete',
      },
      github_stars: {
        value: '42',
        label: 'GitHub Stars',
        icon: '⭐',
        details: 'From GITHUB_STARS environment variable',
      },
    });
  });

  it('caches git command results and falls back when git or stars are unavailable', async () => {
    const { DashboardService } = await loadDashboardService();
    const businessDocs = path.join(tempRoot, 'BusinessDocs');
    fs.mkdirSync(businessDocs, { recursive: true });
    fs.writeFileSync(path.join(businessDocs, 'milestones.json'), '[]');

    const execFileMock = vi
      .fn((command, args, options, callback) => callback(null, '', ''))
      .mockImplementationOnce((command, args, options, callback) =>
        callback(new Error('git unavailable'))
      )
      .mockImplementationOnce((command, args, options, callback) => callback(null, '', ''));

    const service = new DashboardService({
      PROJECT_ROOT: tempRoot,
      BUSINESS_DOCS: businessDocs,
      _execFile: execFileMock,
    });

    const first = await service.computeQuickStats();
    const second = await service.computeQuickStats();

    expect(execFileMock).toHaveBeenCalledTimes(3);
    expect(first.active_files.value).toBe('0');
    expect(first.team_members.value).toBe('1');
    expect(first.github_stars).toMatchObject({
      value: '—',
      details: 'Set GITHUB_STARS env var to display real stars',
    });
    expect(second.active_files.value).toBe('0');
    expect(second.team_members.value).toBe('1');
  });
});
