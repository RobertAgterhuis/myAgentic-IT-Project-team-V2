// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { mkdirSync, writeFileSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { registerRoutes } from '../../src/webapp/routes/dashboard.js';
import { createTestableRoutes } from '../helpers/fastify-test-adapter.js';

const createDashboardRoutes = (ctx) => createTestableRoutes(registerRoutes, ctx);

/* ── Helpers ────────────────────────────────────────────────────── */

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

function fakeReq() {
  return { url: '/api/dashboard/health', headers: { host: 'localhost:3000' } };
}

function makeCtx(overrides = {}) {
  return {
    PROJECT_ROOT: '/project',
    _metrics: {
      requestCount: 100,
      errorCount: 3,
      responseTimes: [50, 100, 150, 200],
      startedAt: Date.now(),
    },
    _audit: {
      read: (_limit) => overrides.auditEntries || [],
    },
    _cache: {},
    ...overrides,
  };
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('dashboard routes', () => {
  let routes;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_STARS;
    routes = createDashboardRoutes(makeCtx());
  });

  it('exports all 4 dashboard routes', () => {
    expect(routes['GET /api/dashboard/health']).toBeTypeOf('function');
    expect(routes['GET /api/dashboard/metrics']).toBeTypeOf('function');
    expect(routes['GET /api/dashboard/activity']).toBeTypeOf('function');
    expect(routes['GET /api/dashboard/stats']).toBeTypeOf('function');
  });

  /* ── Health ─────────────────────────────────────────────────── */

  describe('GET /api/dashboard/health', () => {
    it('returns 200 with health data', async () => {
      const res = fakeRes();
      await routes['GET /api/dashboard/health'](fakeReq(), res);
      expect(res.status).toBe(200);
      const body = res.json;
      expect(body.ok).toBe(true);
      expect(body.data).toHaveProperty('quality');
      expect(body.data).toHaveProperty('coverage');
      expect(body.data).toHaveProperty('builds');
      expect(body.data).toHaveProperty('deployment');
      expect(body.timestamp).toBeTruthy();
    });

    it('health data contains value and label for each metric', async () => {
      const res = fakeRes();
      await routes['GET /api/dashboard/health'](fakeReq(), res);
      const data = res.json.data;
      for (const key of ['quality', 'coverage', 'builds', 'deployment']) {
        expect(data[key]).toHaveProperty('value');
        expect(data[key]).toHaveProperty('label');
        expect(data[key]).toHaveProperty('status');
      }
    });
  });

  /* ── Metrics ─────────────────────────────────────────────────── */

  describe('GET /api/dashboard/metrics', () => {
    it('returns 200 with metrics from context', async () => {
      const res = fakeRes();
      await routes['GET /api/dashboard/metrics'](fakeReq(), res);
      expect(res.status).toBe(200);
      const body = res.json;
      expect(body.ok).toBe(true);
      expect(body.data).toHaveProperty('http_requests');
      expect(body.data).toHaveProperty('error_rate');
      expect(body.data).toHaveProperty('response_time');
    });

    it('computes error rate correctly', async () => {
      const res = fakeRes();
      await routes['GET /api/dashboard/metrics'](fakeReq(), res);
      const errorRate = res.json.data.error_rate;
      expect(errorRate.value).toBe('3.0%'); // 3/100 * 100
      expect(errorRate.status).toBe('good');
    });

    it('computes average response time', async () => {
      const res = fakeRes();
      await routes['GET /api/dashboard/metrics'](fakeReq(), res);
      const rt = res.json.data.response_time;
      expect(rt.value).toBe('125'); // (50+100+150+200)/4
      expect(rt.status).toBe('good');
    });

    it('handles missing _metrics gracefully', async () => {
      routes = createDashboardRoutes(makeCtx({ _metrics: undefined }));
      const res = fakeRes();
      await routes['GET /api/dashboard/metrics'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.data.http_requests.value).toBe('0');
      expect(res.json.data.error_rate.value).toBe('0.0%');
    });

    it('uses default response time when array is empty', async () => {
      routes = createDashboardRoutes(
        makeCtx({
          _metrics: { requestCount: 0, errorCount: 0, responseTimes: [], startedAt: Date.now() },
        })
      );
      const res = fakeRes();
      await routes['GET /api/dashboard/metrics'](fakeReq(), res);
      expect(res.json.data.response_time.value).toBe('142');
    });

    it('marks response time as warning when >= 200ms', async () => {
      routes = createDashboardRoutes(
        makeCtx({
          _metrics: { requestCount: 1, errorCount: 0, responseTimes: [300], startedAt: Date.now() },
        })
      );
      const res = fakeRes();
      await routes['GET /api/dashboard/metrics'](fakeReq(), res);
      expect(res.json.data.response_time.status).toBe('warning');
    });
  });

  /* ── Activity ───────────────────────────────────────────────── */

  describe('GET /api/dashboard/activity', () => {
    it('returns default activity when no audit entries exist', async () => {
      const res = fakeRes();
      await routes['GET /api/dashboard/activity'](fakeReq(), res);
      expect(res.status).toBe(200);
      const body = res.json;
      expect(body.ok).toBe(true);
      expect(body.data.length).toBe(1);
      expect(body.data[0].action).toContain('No audit events');
    });

    it('maps audit entries to activity items', async () => {
      const auditEntries = [
        {
          operation: 'create',
          entity_type: 'milestone',
          user: 'alice',
          summary: 'Added M1',
          entity_id: 'm1',
          timestamp: '2026-01-01T00:00:00Z',
        },
        {
          operation: 'update',
          entity_type: 'questionnaire',
          user: 'bob',
          summary: 'Updated Q1',
          entity_id: 'q1',
          timestamp: '2026-01-02T00:00:00Z',
        },
      ];
      routes = createDashboardRoutes(makeCtx({ auditEntries }));
      const res = fakeRes();
      await routes['GET /api/dashboard/activity'](fakeReq(), res);
      expect(res.status).toBe(200);
      const items = res.json.data;
      expect(items.length).toBe(2);
      // Entries are reversed (newest first)
      expect(items[0].user).toBe('bob');
      expect(items[0].action).toContain('Update');
      expect(items[1].type).toBe('milestone_created');
    });

    it('normalizes system/webapp users to null', async () => {
      const auditEntries = [
        {
          operation: 'create',
          entity_type: 'milestone',
          user: 'system',
          summary: 'auto',
          timestamp: '2026-01-01T00:00:00Z',
        },
        {
          operation: 'create',
          entity_type: 'milestone',
          user: 'webapp',
          summary: 'auto',
          timestamp: '2026-01-01T01:00:00Z',
        },
      ];
      routes = createDashboardRoutes(makeCtx({ auditEntries }));
      const res = fakeRes();
      await routes['GET /api/dashboard/activity'](fakeReq(), res);
      const items = res.json.data;
      expect(items[0].user).toBeNull();
      expect(items[1].user).toBeNull();
    });

    it('maps delete operations to deployment type', async () => {
      const auditEntries = [
        {
          operation: 'delete',
          entity_type: 'template',
          user: 'alice',
          summary: 'Removed T1',
          timestamp: '2026-01-01T00:00:00Z',
        },
      ];
      routes = createDashboardRoutes(makeCtx({ auditEntries }));
      const res = fakeRes();
      await routes['GET /api/dashboard/activity'](fakeReq(), res);
      expect(res.json.data[0].type).toBe('deployment');
    });

    it('limits activity to 12 items', async () => {
      const auditEntries = Array.from({ length: 20 }, (_, i) => ({
        operation: 'update',
        entity_type: 'milestone',
        user: `user${i}`,
        summary: `Change ${i}`,
        timestamp: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      }));
      routes = createDashboardRoutes(makeCtx({ auditEntries }));
      const res = fakeRes();
      await routes['GET /api/dashboard/activity'](fakeReq(), res);
      expect(res.json.data.length).toBe(12);
    });

    it('handles ctx without _audit', async () => {
      routes = createDashboardRoutes({ PROJECT_ROOT: '/project', _metrics: {} });
      const res = fakeRes();
      await routes['GET /api/dashboard/activity'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.data[0].action).toContain('No audit events');
    });
  });

  /* ── Stats ──────────────────────────────────────────────────── */

  describe('GET /api/dashboard/stats', () => {
    it('returns 200 with stats data', async () => {
      const res = fakeRes();
      await routes['GET /api/dashboard/stats'](fakeReq(), res);
      expect(res.status).toBe(200);
      const data = res.json.data;
      expect(data).toHaveProperty('active_files');
      expect(data).toHaveProperty('team_members');
      expect(data).toHaveProperty('sprint_progress');
      expect(data).toHaveProperty('github_stars');
    });

    it('counts git tracked files from real repo', async () => {
      routes = createDashboardRoutes(makeCtx({ PROJECT_ROOT: process.cwd() }));
      const res = fakeRes();
      await routes['GET /api/dashboard/stats'](fakeReq(), res);
      const count = parseInt(res.json.data.active_files.value, 10);
      expect(count).toBeGreaterThan(0);
    });

    it('computes sprint progress from milestones file', async () => {
      const tmpDir = path.join(os.tmpdir(), `dashboard-test-${Date.now()}`);
      mkdirSync(path.join(tmpDir, 'BusinessDocs'), { recursive: true });
      const milestones = [
        { name: 'M1', status: 'complete', archived: false },
        { name: 'M2', status: 'in progress', archived: false },
        { name: 'M3', status: 'complete', archived: false },
        { name: 'M-old', status: 'complete', archived: true },
      ];
      writeFileSync(
        path.join(tmpDir, 'BusinessDocs', 'milestones.json'),
        JSON.stringify(milestones)
      );

      routes = createDashboardRoutes(
        makeCtx({ PROJECT_ROOT: tmpDir, BUSINESS_DOCS: path.join(tmpDir, 'BusinessDocs') })
      );
      const res = fakeRes();
      await routes['GET /api/dashboard/stats'](fakeReq(), res);
      // 2 complete out of 3 active = 67%
      expect(res.json.data.sprint_progress.value).toBe('67%');
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns 0% when no milestones data exists', async () => {
      const res = fakeRes();
      await routes['GET /api/dashboard/stats'](fakeReq(), res);
      expect(res.json.data.sprint_progress.value).toBe('0%');
    });

    it('shows github stars from env var', async () => {
      process.env.GITHUB_STARS = '42';
      routes = createDashboardRoutes(makeCtx());
      const res = fakeRes();
      await routes['GET /api/dashboard/stats'](fakeReq(), res);
      expect(res.json.data.github_stars.value).toBe('42');
    });

    it('shows dash when GITHUB_STARS is not set', async () => {
      const res = fakeRes();
      await routes['GET /api/dashboard/stats'](fakeReq(), res);
      expect(res.json.data.github_stars.value).toBe('—');
    });

    it('counts unique contributors from real git history', async () => {
      routes = createDashboardRoutes(makeCtx({ PROJECT_ROOT: process.cwd() }));
      const res = fakeRes();
      await routes['GET /api/dashboard/stats'](fakeReq(), res);
      const teamCount = parseInt(res.json.data.team_members.value, 10);
      expect(teamCount).toBeGreaterThanOrEqual(1);
    });

    it('returns 0 files when project root does not exist', async () => {
      const res = fakeRes();
      await routes['GET /api/dashboard/stats'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.data.active_files.value).toBe('0');
    });

    it('returns 0% when milestones file is invalid JSON', async () => {
      const tmpDir = path.join(os.tmpdir(), `dashboard-test-${Date.now()}`);
      mkdirSync(path.join(tmpDir, 'BusinessDocs'), { recursive: true });
      writeFileSync(path.join(tmpDir, 'BusinessDocs', 'milestones.json'), 'not-json');

      routes = createDashboardRoutes(
        makeCtx({ PROJECT_ROOT: tmpDir, BUSINESS_DOCS: path.join(tmpDir, 'BusinessDocs') })
      );
      const res = fakeRes();
      await routes['GET /api/dashboard/stats'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.data.sprint_progress.value).toBe('0%');
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('handles milestones with null/undefined status', async () => {
      const tmpDir = path.join(os.tmpdir(), `dashboard-test-${Date.now()}`);
      mkdirSync(path.join(tmpDir, 'BusinessDocs'), { recursive: true });
      writeFileSync(
        path.join(tmpDir, 'BusinessDocs', 'milestones.json'),
        JSON.stringify([
          { name: 'M1', status: null, archived: false },
          { name: 'M2', archived: false },
        ])
      );
      routes = createDashboardRoutes(
        makeCtx({ PROJECT_ROOT: tmpDir, BUSINESS_DOCS: path.join(tmpDir, 'BusinessDocs') })
      );
      const res = fakeRes();
      await routes['GET /api/dashboard/stats'](fakeReq(), res);
      expect(res.json.data.sprint_progress.value).toBe('0%');
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('counts audit contributors when _audit is present', async () => {
      const tmpDir = path.join(os.tmpdir(), `dashboard-test-${Date.now()}`);
      mkdirSync(tmpDir, { recursive: true });
      routes = createDashboardRoutes(
        makeCtx({
          PROJECT_ROOT: tmpDir,
          auditEntries: [
            {
              user: 'alice',
              entity_type: 'milestone',
              operation: 'create',
              timestamp: new Date().toISOString(),
            },
            {
              user: 'bob',
              entity_type: 'milestone',
              operation: 'update',
              timestamp: new Date().toISOString(),
            },
            {
              user: 'webapp',
              entity_type: 'milestone',
              operation: 'create',
              timestamp: new Date().toISOString(),
            },
          ],
        })
      );
      const res = fakeRes();
      await routes['GET /api/dashboard/stats'](fakeReq(), res);
      expect(parseInt(res.json.data.team_members.value, 10)).toBeGreaterThanOrEqual(2);
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('shows GITHUB_STARS when env is non-numeric', async () => {
      process.env.GITHUB_STARS = 'not-a-number';
      routes = createDashboardRoutes(makeCtx());
      const res = fakeRes();
      await routes['GET /api/dashboard/stats'](fakeReq(), res);
      expect(res.json.data.github_stars.value).toBe('—');
    });
  });

  describe('GET /api/dashboard/metrics (edge cases)', () => {
    it('marks error rate as warning when >= 5%', async () => {
      routes = createDashboardRoutes(
        makeCtx({
          _metrics: {
            requestCount: 100,
            errorCount: 6,
            responseTimes: [50],
            startedAt: Date.now(),
          },
        })
      );
      const res = fakeRes();
      await routes['GET /api/dashboard/metrics'](fakeReq(), res);
      expect(res.json.data.error_rate.status).toBe('warning');
    });

    it('handles _metrics with responseTimes as non-array', async () => {
      routes = createDashboardRoutes(
        makeCtx({
          _metrics: { requestCount: 10, errorCount: 0, responseTimes: null, startedAt: Date.now() },
        })
      );
      const res = fakeRes();
      await routes['GET /api/dashboard/metrics'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.data.response_time.value).toBe('142');
    });
  });

  describe('GET /api/dashboard/activity (edge cases)', () => {
    it('maps audit entries with missing fields gracefully', async () => {
      routes = createDashboardRoutes(
        makeCtx({
          auditEntries: [
            { user: null, entity_type: null, operation: null, entity_id: null, summary: null },
          ],
        })
      );
      const res = fakeRes();
      await routes['GET /api/dashboard/activity'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.data.length).toBe(1);
      expect(res.json.data[0].user).toBeNull();
    });

    it('maps create operation to milestone_created type', async () => {
      routes = createDashboardRoutes(
        makeCtx({
          auditEntries: [
            {
              user: 'alice',
              entity_type: 'milestone',
              operation: 'create',
              entity_id: 'm-1',
              summary: 'Created M1',
              timestamp: new Date().toISOString(),
            },
          ],
        })
      );
      const res = fakeRes();
      await routes['GET /api/dashboard/activity'](fakeReq(), res);
      expect(res.json.data[0].type).toBe('milestone_created');
      expect(res.json.data[0].metadata).toEqual({ id: 'm-1' });
    });

    it('returns _audit.read non-array result as empty', async () => {
      routes = createDashboardRoutes(
        makeCtx({
          _audit: { read: () => 'not-an-array' },
        })
      );
      const res = fakeRes();
      await routes['GET /api/dashboard/activity'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.data[0].action).toContain('No audit events');
    });
  });
});
