// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Integration tests — no mocking (vitest v4 cannot intercept CJS require).

import path from 'path';
import os from 'os';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import createDriftRoutes from './drift.js';

/* ── Helpers ────────────────────────────────────────────────────── */

function fakeRes() {
  let _status, _body;
  const _headers = {};
  return {
    setHeader(k, v) { _headers[k] = v; },
    writeHead(s, h) { _status = s; if (h) Object.assign(_headers, h); },
    end(data) { _body = data; },
    get status() { return _status; },
    get json() { return JSON.parse(_body); },
    get headers() { return _headers; },
  };
}

let _tmpDirs = [];

function makeTmpProject(sessionState, extras = {}) {
  const tmpDir = path.join(os.tmpdir(), `drift-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  _tmpDirs.push(tmpDir);
  const sessionDir = path.join(tmpDir, 'docs', 'session');
  mkdirSync(sessionDir, { recursive: true });

  const sessionFile = path.join(sessionDir, 'session-state.json');
  if (sessionState !== null) {
    writeFileSync(sessionFile, JSON.stringify(sessionState));
  }

  if (extras.sprintPlan) {
    const planAbs = path.resolve(tmpDir, extras.sprintPlan.path);
    mkdirSync(path.dirname(planAbs), { recursive: true });
    writeFileSync(planAbs, extras.sprintPlan.content);
  }

  if (extras.syncReports) {
    for (const [sprintId, report] of Object.entries(extras.syncReports)) {
      const dir = report.dir === 'phase-5'
        ? path.join(tmpDir, 'docs', 'phase-5', `sprint-${sprintId}`)
        : path.join(tmpDir, 'docs', 'sprints', sprintId);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'github-sync-report.md'), report.content);
    }
  }

  const ctx = {
    SESSION_FILE: sessionFile,
    resolveSessionFile: () => sessionFile,
    PROJECT_ROOT: tmpDir,
    ...(extras.ctxOverrides || {}),
  };

  return { tmpDir, sessionFile, ctx };
}

function makeCtx(overrides = {}) {
  return {
    SESSION_FILE: '/nonexistent/docs/session/session-state.json',
    resolveSessionFile: overrides.resolveSessionFile || (() => '/nonexistent/docs/session/session-state.json'),
    PROJECT_ROOT: '/nonexistent',
    ...overrides,
  };
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('drift routes', () => {
  let routes, handler;

  beforeEach(() => {
    routes = createDriftRoutes(makeCtx());
    handler = routes['GET /api/drift'];
  });

  afterEach(() => {
    for (const d of _tmpDirs) {
      try { rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
    }
    _tmpDirs = [];
  });

  it('exports the GET /api/drift route', () => {
    expect(handler).toBeTypeOf('function');
  });

  it('returns empty drift report when no session state exists', () => {
    const res = fakeRes();
    handler({}, res);
    expect(res.status).toBe(200);
    expect(res.json.summary.total_drifts).toBe(0);
    expect(res.json.error).toBe('No session state found');
  });

  it('returns drift report when session state exists', () => {
    const sessionState = {
      sprint_backlog: {
        path: 'docs/sprint-plan.md',
        sprint_statuses: { 'SP-1': 'COMPLETE', 'SP-2': 'IN_PROGRESS' },
      },
    };

    const { ctx } = makeTmpProject(sessionState, {
      sprintPlan: { path: 'docs/sprint-plan.md', content: '# Sprint Plan' },
      syncReports: {
        'SP-1': { dir: 'sprints', content: '# Sync Report' },
      },
    });

    routes = createDriftRoutes(ctx);
    handler = routes['GET /api/drift'];
    const res = fakeRes();
    handler({}, res);

    expect(res.status).toBe(200);
    const body = res.json;
    expect(body).toHaveProperty('generated_at');
    expect(body).toHaveProperty('summary');
    expect(body).toHaveProperty('drifts');
    expect(body).toHaveProperty('in_sync');
    expect(body.error).toBeUndefined();
  });

  it('detects MISSING_SYNC_REPORT when sprint has no sync report', () => {
    const sessionState = {
      sprint_backlog: {
        sprint_statuses: { 'SP-1': 'DONE' },
      },
    };

    // No sync reports on disk
    const { ctx } = makeTmpProject(sessionState);
    routes = createDriftRoutes(ctx);
    handler = routes['GET /api/drift'];
    const res = fakeRes();
    handler({}, res);

    expect(res.status).toBe(200);
    const body = res.json;
    const missingSyncDrift = body.drifts.find(d => d.type === 'MISSING_SYNC_REPORT');
    expect(missingSyncDrift).toBeDefined();
  });

  it('handles resolveSessionFile returning a different file', () => {
    const sessionState = { sprint_backlog: { sprint_statuses: {} } };
    const { tmpDir } = makeTmpProject(sessionState);

    const altSessionDir = path.join(tmpDir, 'docs', 'session');
    const altSessionFile = path.join(altSessionDir, 'session-state-audit.json');
    writeFileSync(altSessionFile, JSON.stringify(sessionState));

    const ctx = {
      SESSION_FILE: altSessionFile,
      resolveSessionFile: () => altSessionFile,
      PROJECT_ROOT: tmpDir,
    };

    routes = createDriftRoutes(ctx);
    handler = routes['GET /api/drift'];
    const res = fakeRes();
    handler({}, res);
    expect(res.status).toBe(200);
    expect(res.json.error).toBeUndefined();
  });

  it('handles resolveSessionFile not being a function', () => {
    const ctx = makeCtx({ resolveSessionFile: undefined });
    routes = createDriftRoutes(ctx);
    handler = routes['GET /api/drift'];
    const res = fakeRes();
    handler({}, res);
    expect(res.status).toBe(200);
    expect(res.json.error).toBe('No session state found');
  });

  it('returns no-session error when session file is invalid JSON', () => {
    const { tmpDir, sessionFile } = makeTmpProject(null);
    writeFileSync(sessionFile, 'not-valid-json');

    const ctx = {
      SESSION_FILE: sessionFile,
      resolveSessionFile: () => sessionFile,
      PROJECT_ROOT: tmpDir,
    };

    routes = createDriftRoutes(ctx);
    handler = routes['GET /api/drift'];
    const res = fakeRes();
    handler({}, res);
    expect(res.status).toBe(200);
    expect(res.json.error).toBe('No session state found');
  });

  it('reads sync reports from both sprints and phase-5 dirs', () => {
    const sessionState = {
      sprint_backlog: {
        sprint_statuses: { 'SP-1': 'COMPLETE', 'SP-2': 'IN_PROGRESS' },
      },
    };

    const { ctx } = makeTmpProject(sessionState, {
      syncReports: {
        'SP-1': { dir: 'sprints', content: '# SP-1 report' },
        'SP-2': { dir: 'phase-5', content: '# SP-2 report' },
      },
    });

    routes = createDriftRoutes(ctx);
    handler = routes['GET /api/drift'];
    const res = fakeRes();
    handler({}, res);
    expect(res.status).toBe(200);
    expect(res.json.error).toBeUndefined();
    expect(res.json).toHaveProperty('summary');
  });

  it('handles missing sprint_statuses gracefully', () => {
    const sessionState = { mode: 'AUDIT' };
    const { ctx } = makeTmpProject(sessionState);

    routes = createDriftRoutes(ctx);
    handler = routes['GET /api/drift'];
    const res = fakeRes();
    handler({}, res);
    expect(res.status).toBe(200);
  });
});
