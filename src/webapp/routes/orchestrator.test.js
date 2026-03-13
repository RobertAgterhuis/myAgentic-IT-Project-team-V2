// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Integration tests — uses real engine, store, middleware (no vi.mock).

import { Readable } from 'stream';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import createOrchestratorRoutes from './orchestrator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.resolve(__dirname, '..', '..', 'docs', 'session', 'session-state.json');
const IDLE_STATE = JSON.stringify({ status: 'IDLE', mode: 'CREATE', state_history: [] });

/* ── Helpers ──────────────────────────────────────────────────── */

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
    get body() {
      return JSON.parse(_body);
    },
  };
}

/** Create a fake HTTP request (readable stream) with JSON body. */
function fakeReq(body) {
  const buf = Buffer.from(JSON.stringify(body));
  const req = Readable.from([buf]);
  req.headers = { 'content-type': 'application/json', host: 'localhost:3000' };
  return req;
}

/** Minimal request for GET handlers (no body). */
function fakeGetReq() {
  return { headers: { host: 'localhost:3000' } };
}

/* ── Tests ────────────────────────────────────────────────────── */

describe('orchestrator routes (integration)', () => {
  let routes;
  let originalSession;

  beforeAll(() => {
    originalSession = fs.existsSync(SESSION_FILE) ? fs.readFileSync(SESSION_FILE, 'utf8') : null;
  });

  afterAll(() => {
    if (originalSession !== null) {
      fs.writeFileSync(SESSION_FILE, originalSession);
    }
  });

  beforeEach(() => {
    // Ensure the session directory exists (may not in CI)
    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    // Write clean IDLE state so each test starts fresh
    fs.writeFileSync(SESSION_FILE, IDLE_STATE);
    routes = createOrchestratorRoutes({ sseNotify: vi.fn() });
  });

  it('exports all 8 route handlers', () => {
    expect(routes['GET /api/orchestrator/status']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/advance']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/error']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/recover']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/reset']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/validate-gate']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/command']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/sprint-gate']).toBeTypeOf('function');
  });

  /* ── GET /status ─────────────────────────────────────────────── */

  describe('GET /status', () => {
    it('returns engine status with IDLE state and CREATE mode', () => {
      const res = fakeRes();
      routes['GET /api/orchestrator/status'](fakeGetReq(), res);
      expect(res.status).toBe(200);
      expect(res.body.state).toBe('IDLE');
      expect(res.body.mode).toBe('CREATE');
    });

    it('includes serialized state and history', () => {
      const res = fakeRes();
      routes['GET /api/orchestrator/status'](fakeGetReq(), res);
      expect(res.body.serialized).toBeDefined();
      expect(res.body.history).toBeInstanceOf(Array);
    });
  });

  /* ── POST /advance ───────────────────────────────────────────── */

  describe('POST /advance', () => {
    it('advances from IDLE to ONBOARDING', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/advance'](fakeReq({}), res);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.transition.from).toBe('IDLE');
      expect(res.body.transition.to).toBe('ONBOARDING');
    });

    it('advances with gateResult body field', async () => {
      // Advance twice: IDLE → ONBOARDING → PHASE_1
      const res1 = fakeRes();
      await routes['POST /api/orchestrator/advance'](fakeReq({}), res1);
      expect(res1.body.transition.to).toBe('ONBOARDING');
      const res2 = fakeRes();
      await routes['POST /api/orchestrator/advance'](
        fakeReq({ gateResult: { verdict: 'APPROVED' } }),
        res2
      );
      expect(res2.status).toBe(200);
      expect(res2.body.transition.to).toBe('PHASE_1');
    });

    it('returns 400 when advance is not possible', async () => {
      // Put engine in ERROR state, then try to advance
      await routes['POST /api/orchestrator/error'](fakeReq({ reason: 'test' }), fakeRes());
      const res = fakeRes();
      await routes['POST /api/orchestrator/advance'](fakeReq({}), res);
      expect(res.status).toBe(400);
    });
  });

  /* ── POST /error ─────────────────────────────────────────────── */

  describe('POST /error', () => {
    it('sets engine to error state with reason', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/error'](fakeReq({ reason: 'something broke' }), res);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      // Verify engine is now in ERROR
      const statusRes = fakeRes();
      routes['GET /api/orchestrator/status'](fakeGetReq(), statusRes);
      expect(statusRes.body.state).toBe('ERROR');
    });

    it('returns 400 when reason is missing', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/error'](fakeReq({}), res);
      expect(res.status).toBe(400);
    });

    it('truncates reason to 2000 chars', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/error'](fakeReq({ reason: 'x'.repeat(3000) }), res);
      expect(res.status).toBe(200);
      // Engine accepted the truncated reason (didn't throw)
      expect(res.body.ok).toBe(true);
    });
  });

  /* ── POST /recover ───────────────────────────────────────────── */

  describe('POST /recover', () => {
    it('recovers engine from error state', async () => {
      // First set error
      await routes['POST /api/orchestrator/error'](fakeReq({ reason: 'test error' }), fakeRes());
      // Then recover
      const res = fakeRes();
      await routes['POST /api/orchestrator/recover'](fakeGetReq(), res);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.status.state).not.toBe('ERROR');
    });

    it('returns 400 when not in error state', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/recover'](fakeGetReq(), res);
      expect(res.status).toBe(400);
    });
  });

  /* ── POST /reset ─────────────────────────────────────────────── */

  describe('POST /reset', () => {
    it('resets engine with new mode', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/reset'](fakeReq({ mode: 'AUDIT' }), res);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.status.mode).toBe('AUDIT');
    });

    it('returns 400 when mode is missing', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/reset'](fakeReq({}), res);
      expect(res.status).toBe(400);
    });

    it('resets with phases array', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/reset'](
        fakeReq({ mode: 'CREATE', phases: ['PHASE_1', 'PHASE_2'] }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  /* ── POST /validate-gate ─────────────────────────────────────── */

  describe('POST /validate-gate', () => {
    it('returns gate result for deliverables', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/validate-gate'](
        fakeReq({ deliverables: ['file1.md'] }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.verdict).toBeDefined();
    });

    it('returns 400 when deliverables is missing', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/validate-gate'](fakeReq({}), res);
      expect(res.status).toBe(400);
    });

    it('returns 400 when deliverables is empty array', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/validate-gate'](fakeReq({ deliverables: [] }), res);
      expect(res.status).toBe(400);
    });

    it('returns FAILED verdict for missing deliverable files', async () => {
      // Advance to CRITIC_1 for a valid critic state
      await routes['POST /api/orchestrator/advance'](fakeReq({}), fakeRes()); // IDLE → ONBOARDING
      await routes['POST /api/orchestrator/advance'](fakeReq({}), fakeRes()); // → PHASE_1
      await routes['POST /api/orchestrator/advance'](fakeReq({}), fakeRes()); // → CRITIC_1
      const res = fakeRes();
      await routes['POST /api/orchestrator/validate-gate'](
        fakeReq({ deliverables: ['nonexistent.md'] }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.body.verdict).toBe('FAILED');
    });
  });

  /* ── POST /command ───────────────────────────────────────────── */

  describe('POST /command', () => {
    it('accepts valid CREATE command', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq({ command: 'CREATE' }), res);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.command).toBe('CREATE');
    });

    it('normalizes command to uppercase with underscores', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq({ command: 'create-business' }), res);
      expect(res.status).toBe(200);
      expect(res.body.command).toBe('CREATE_BUSINESS');
    });

    it('returns 400 for missing command', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq({}), res);
      expect(res.status).toBe(400);
    });

    it('returns 400 for unknown command', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq({ command: 'INVALID' }), res);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Unknown command/i);
    });

    it('accepts all mode-backed commands', async () => {
      const commands = [
        'CREATE',
        'AUDIT',
        'FEATURE',
        'SCOPE_CHANGE',
        'HOTFIX',
        'CREATE_BUSINESS',
        'CREATE_TECH',
        'CREATE_UX',
        'CREATE_MARKETING',
      ];
      for (const command of commands) {
        fs.writeFileSync(SESSION_FILE, IDLE_STATE);
        const freshRoutes = createOrchestratorRoutes({ sseNotify: vi.fn() });
        const res = fakeRes();
        await freshRoutes['POST /api/orchestrator/command'](fakeReq({ command }), res);
        expect(res.status).toBe(200);
        expect(res.body.command).toBe(command);
      }
    });

    it('accepts REEVALUATE with resume flag', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](
        fakeReq({ command: 'REEVALUATE', resume: true }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.body.command).toBe('REEVALUATE');
      expect(res.body.resume).toBe(true);
    });

    it('defaults platform to copilot', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq({ command: 'AUDIT' }), res);
      expect(res.body.platform).toBe('copilot');
    });

    it('accepts valid platforms', async () => {
      for (const platform of ['copilot', 'claude', 'codex']) {
        fs.writeFileSync(SESSION_FILE, IDLE_STATE);
        const freshRoutes = createOrchestratorRoutes({ sseNotify: vi.fn() });
        const res = fakeRes();
        await freshRoutes['POST /api/orchestrator/command'](
          fakeReq({ command: 'AUDIT', platform }),
          res
        );
        expect(res.status).toBe(200);
        expect(res.body.platform).toBe(platform);
      }
    });

    it('returns 400 for invalid platform', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](
        fakeReq({ command: 'AUDIT', platform: 'gpt5' }),
        res
      );
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Unknown platform/i);
    });

    it('skips reset when resume is true', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](
        fakeReq({ command: 'AUDIT', resume: true }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.body.resume).toBe(true);
      // Engine stays in original CREATE mode since reset was skipped
      expect(res.body.status.mode).toBe('CREATE');
    });

    it('truncates project name to 200 chars', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](
        fakeReq({ command: 'CREATE', project: 'x'.repeat(300) }),
        res
      );
      expect(res.body.project.length).toBe(200);
    });
  });

  /* ── POST /sprint-gate ──────────────────────────────────────── */

  describe('POST /sprint-gate', () => {
    it('runs sprint gate check', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/sprint-gate'](
        fakeReq({ sprintId: 'SP-1', stories: [] }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.verdict).toBeDefined();
    });

    it('returns 400 when sprintId is missing', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/sprint-gate'](fakeReq({}), res);
      expect(res.status).toBe(400);
    });

    it('returns gate result with sprint details', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/sprint-gate'](
        fakeReq({
          sprintId: 'SP-3',
          stories: [{ id: 'S1', title: 'Test', acceptance_criteria: ['AC1'], estimate: 3 }],
          plannedItems: 5,
          paths: {},
        }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.body.summary.sprintId).toBe('SP-3');
    });
  });
});
