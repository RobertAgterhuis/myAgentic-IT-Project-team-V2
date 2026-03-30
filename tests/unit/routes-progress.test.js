'use strict';

const path = require('path');
const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { FileCache } = require('../../src/webapp/cache');
const { registerRoutes } = require('../../src/webapp/routes/progress');
const { createTestableRoutes } = require('../helpers/fastify-test-adapter.js');

function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(k, v) {
      res.headers[k] = v;
    },
    writeHead(code, hdrs) {
      res.statusCode = code;
      if (hdrs) Object.assign(res.headers, hdrs);
    },
    end(data) {
      res.body = data || '';
    },
  };
  return res;
}

function createReq(url = '/api/progress') {
  return {
    url,
    method: 'GET',
    headers: { host: 'localhost:3000' },
  };
}

describe('routes/progress', () => {
  const projectRoot = '/project';
  const businessDocs = path.join(projectRoot, 'BusinessDocs');
  const sessionDir = path.join(businessDocs, 'session');
  const sessionFile = path.join(sessionDir, 'session-state.json');

  it('returns inactive progress with empty phases when no session exists', async () => {
    const store = new InMemoryStore({});
    setStore(store);

    const ctx = {
      PROJECT_ROOT: projectRoot,
      BUSINESS_DOCS: businessDocs,
      SESSION_DIR: sessionDir,
      SESSION_FILE: sessionFile,
      _cache: new FileCache(store),
      _audit: { read: () => [] },
      _getLatestCommand: () => ({ command: 'CREATE', project: 'NoSessionProject' }),
      safeWriteSync(filePath, data) {
        store.writeFile(filePath, data);
      },
    };

    const routes = createTestableRoutes(registerRoutes, ctx);
    const res = createRes();
    await routes['GET /api/progress'](createReq(), res);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.active).toBe(false);
    expect(body.session).toBeNull();
    expect(Array.isArray(body.phases)).toBe(true);
    expect(body.phases).toHaveLength(7);
    expect(body.command).toMatchObject({ command: 'CREATE', project: 'NoSessionProject' });
  });

  it('returns active progress with session summary, computed phases, and sprint info', async () => {
    const session = {
      session_id: 'sess-42',
      cycle_type: 'COMBO_AUDIT',
      execution_mode: 'HYBRID',
      status: 'RUNNING',
      current_phase: 'PHASE-2',
      current_agent: '05-software-architect',
      completed_phases: ['ONBOARDING', 'PHASE-1'],
      completed_agents: ['25-onboarding-agent', '01-business-analyst'],
      phase_outputs: {
        onboarding: 'BusinessDocs/onboarding/onboarding-output.md',
        'phase-1': { '01': 'BusinessDocs/phase-1/01-business-analyst.md' },
      },
      sprint_backlog: {
        total_sprints: 2,
        sprint_statuses: { 'SP-1': 'DONE', 'SP-2': 'IN_PROGRESS' },
      },
      blockers: [{ id: 'B-1' }],
      open_human_escalations: [
        { id: 'E-1', status: 'OPEN' },
        { id: 'E-2', status: 'RESOLVED' },
      ],
      initiated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      last_updated: new Date().toISOString(),
    };

    const store = new InMemoryStore({
      [sessionFile]: JSON.stringify(session),
    });
    setStore(store);

    const ctx = {
      PROJECT_ROOT: projectRoot,
      BUSINESS_DOCS: businessDocs,
      SESSION_DIR: sessionDir,
      SESSION_FILE: sessionFile,
      _cache: new FileCache(store),
      _audit: { read: () => [] },
      _getLatestCommand: () => ({ command: 'AUDIT', project: 'ActiveProject' }),
      safeWriteSync(filePath, data) {
        store.writeFile(filePath, data);
      },
    };

    const routes = createTestableRoutes(registerRoutes, ctx);
    const res = createRes();
    await routes['GET /api/progress'](createReq(), res);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);

    expect(body.active).toBe(true);
    expect(body.session).toMatchObject({
      session_id: 'sess-42',
      current_phase: 'PHASE-2',
      execution_mode: 'HYBRID',
    });
    expect(body.phases).toHaveLength(7);
    expect(body.sprints).toEqual({
      total: 2,
      statuses: { 'SP-1': 'DONE', 'SP-2': 'IN_PROGRESS' },
    });
    expect(body.command).toMatchObject({ command: 'AUDIT', project: 'ActiveProject' });
  });
});
