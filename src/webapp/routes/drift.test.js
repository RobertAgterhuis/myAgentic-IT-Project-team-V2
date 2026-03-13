// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'path';
import * as fs from 'fs';
import { detectDrift } from '../drift-detector.js';
import createDriftRoutes from './drift.js';

/* ── Mocks ──────────────────────────────────────────────────────── */

vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => '{}'),
}));

vi.mock('../drift-detector', () => ({
  detectDrift: vi.fn(() => ({
    generated_at: '2026-01-01T00:00:00Z',
    summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
    drifts: [],
    in_sync: { sprints: [], stories: 0 },
  })),
}));

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

function makeCtx(overrides = {}) {
  return {
    SESSION_FILE: '/project/docs/session/session-state.json',
    resolveSessionFile: overrides.resolveSessionFile || (() => '/project/docs/session/session-state.json'),
    PROJECT_ROOT: '/project',
    ...overrides,
  };
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('drift routes', () => {
  let routes, handler;

  beforeEach(() => {
    vi.clearAllMocks();
    routes = createDriftRoutes(makeCtx());
    handler = routes['GET /api/drift'];
  });

  it('exports the GET /api/drift route', () => {
    expect(handler).toBeTypeOf('function');
  });

  it('returns empty drift report when no session state exists', () => {
    fs.existsSync.mockReturnValue(false);
    const res = fakeRes();
    handler({}, res);
    expect(res.status).toBe(200);
    expect(res.json.summary.total_drifts).toBe(0);
    expect(res.json.error).toBe('No session state found');
  });

  it('calls detectDrift with session state and sync reports', () => {
    const sessionState = {
      sprint_statuses: { 'SP-1': 'COMPLETE', 'SP-2': 'IN_PROGRESS' },
      sprint_backlog: { path: 'docs/sprint-plan.md' },
    };

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((fp) => {
      if (fp.includes('session-state')) return JSON.stringify(sessionState);
      if (fp.includes('sprint-plan')) return '# Sprint Plan';
      if (fp.includes('github-sync-report')) return '# Sync Report';
      return '{}';
    });

    const res = fakeRes();
    handler({}, res);

    expect(detectDrift).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('returns drift results from detectDrift', () => {
    const sessionState = {
      sprint_statuses: { 'SP-1': 'COMPLETE' },
      sprint_backlog: { path: 'docs/plan.md' },
    };

    const driftReport = {
      generated_at: '2026-01-15T00:00:00Z',
      summary: { total_drifts: 2, critical: 1, warning: 1, info: 0 },
      drifts: [
        { severity: 'critical', sprint: 'SP-1', message: 'Status mismatch' },
        { severity: 'warning', sprint: 'SP-1', message: 'Story count differs' },
      ],
      in_sync: { sprints: [], stories: 0 },
    };

    detectDrift.mockReturnValue(driftReport);
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((fp) => {
      if (fp.includes('session-state')) return JSON.stringify(sessionState);
      return '';
    });

    const res = fakeRes();
    handler({}, res);
    expect(res.status).toBe(200);
    expect(res.json.summary.total_drifts).toBe(2);
    expect(res.json.summary.critical).toBe(1);
  });

  it('handles resolveSessionFile returning a different file', () => {
    const ctx = makeCtx({
      resolveSessionFile: () => '/project/docs/session/session-state-audit.json',
    });
    routes = createDriftRoutes(ctx);
    handler = routes['GET /api/drift'];

    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({
      sprint_statuses: {},
    }));

    const res = fakeRes();
    handler({}, res);
    expect(res.status).toBe(200);
  });

  it('handles resolveSessionFile not being a function', () => {
    const ctx = makeCtx({ resolveSessionFile: undefined });
    routes = createDriftRoutes(ctx);
    handler = routes['GET /api/drift'];

    // SESSION_FILE doesn't exist
    fs.existsSync.mockReturnValue(false);
    const res = fakeRes();
    handler({}, res);
    expect(res.status).toBe(200);
    expect(res.json.error).toBe('No session state found');
  });

  it('handles session state file existing but parse error', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation(() => { throw new Error('read fail'); });

    const res = fakeRes();
    handler({}, res);
    expect(res.status).toBe(200);
    expect(res.json.error).toBe('No session state found');
  });

  it('reads sync reports from both sprint dirs', () => {
    const sessionState = {
      sprint_statuses: { 'SP-1': 'COMPLETE', 'SP-2': 'IN_PROGRESS' },
    };

    fs.existsSync.mockImplementation((fp) => {
      if (fp.includes('session-state')) return true;
      if (fp.includes('sprints') && fp.includes('SP-1')) return true;
      if (fp.includes('phase-5') && fp.includes('SP-2')) return true;
      return false;
    });

    fs.readFileSync.mockImplementation((fp) => {
      if (fp.includes('session-state')) return JSON.stringify(sessionState);
      return '# report';
    });

    const res = fakeRes();
    handler({}, res);
    expect(detectDrift).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it('handles missing sprint_statuses gracefully', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ mode: 'AUDIT' }));

    const res = fakeRes();
    handler({}, res);
    expect(res.status).toBe(200);
  });
});
