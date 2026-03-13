// Copyright (c) 2026 Robert Agterhuis. MIT License.

import { parseBody } from '../middleware.js';
import createOrchestratorRoutes from './orchestrator.js';

/* ── Mock modules ─────────────────────────────────────────────── */

const mockEngine = vi.hoisted(() => ({
  status: vi.fn(() => ({ state: 'IDLE', mode: 'AUDIT' })),
  advance: vi.fn(() => ({ from: 'IDLE', to: 'PHASE_1' })),
  error: vi.fn(),
  recover: vi.fn(() => 'IDLE'),
  reset: vi.fn(() => ({ state: 'IDLE', mode: 'CREATE' })),
  validateGate: vi.fn(() => ({
    verdict: 'APPROVED',
    summary: { phase: 'PHASE_1', totalViolations: 0 },
  })),
  sprintGate: vi.fn(() => ({
    verdict: 'READY',
    summary: { sprintId: 'SP-1' },
  })),
}));

vi.mock('../store', () => ({
  getStore: vi.fn(() => ({})),
}));

vi.mock('../orchestrator/engine', () => ({
  createEngine: vi.fn(() => mockEngine),
}));

vi.mock('../middleware', () => ({
  structuredLog: vi.fn(),
  json: vi.fn((res, status, data) => {
    const body = JSON.stringify(data);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(body);
  }),
  parseBody: vi.fn(),
  _setSecurityHeaders: vi.fn(),
}));

vi.mock('../utils/errors', () => ({
  errorResponse: vi.fn((code, detail) => ({ error: detail, code })),
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
  };
}

function fakeReq() {
  return { headers: { 'content-type': 'application/json', host: 'localhost:3000' } };
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('orchestrator routes', () => {
  let routes;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEngine.status.mockReturnValue({ state: 'IDLE', mode: 'AUDIT' });
    mockEngine.advance.mockReturnValue({ from: 'IDLE', to: 'PHASE_1' });
    mockEngine.recover.mockReturnValue('IDLE');
    mockEngine.reset.mockReturnValue({ state: 'IDLE', mode: 'CREATE' });
    mockEngine.validateGate.mockReturnValue({
      verdict: 'APPROVED',
      summary: { phase: 'PHASE_1', totalViolations: 0 },
    });
    mockEngine.sprintGate.mockReturnValue({
      verdict: 'READY',
      summary: { sprintId: 'SP-1' },
    });

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
    it('returns engine status', () => {
      const res = fakeRes();
      routes['GET /api/orchestrator/status'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.state).toBe('IDLE');
    });

    it('returns 500 when engine throws', () => {
      mockEngine.status.mockImplementation(() => { throw new Error('boom'); });
      const res = fakeRes();
      routes['GET /api/orchestrator/status'](fakeReq(), res);
      expect(res.status).toBe(500);
    });
  });

  /* ── POST /advance ───────────────────────────────────────────── */

  describe('POST /advance', () => {
    it('advances engine state', async () => {
      parseBody.mockResolvedValue({});
      const res = fakeRes();
      await routes['POST /api/orchestrator/advance'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.transition).toEqual({ from: 'IDLE', to: 'PHASE_1' });
    });

    it('passes gateResult when provided', async () => {
      parseBody.mockResolvedValue({ gateResult: 'PASS' });
      const res = fakeRes();
      await routes['POST /api/orchestrator/advance'](fakeReq(), res);
      expect(mockEngine.advance).toHaveBeenCalledWith('PASS');
    });

    it('returns 400 when engine.advance throws', async () => {
      parseBody.mockResolvedValue({});
      mockEngine.advance.mockImplementation(() => { throw new Error('cannot advance'); });
      const res = fakeRes();
      await routes['POST /api/orchestrator/advance'](fakeReq(), res);
      expect(res.status).toBe(400);
    });
  });

  /* ── POST /error ─────────────────────────────────────────────── */

  describe('POST /error', () => {
    it('sets engine to error state with reason', async () => {
      parseBody.mockResolvedValue({ reason: 'something broke' });
      const res = fakeRes();
      await routes['POST /api/orchestrator/error'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(mockEngine.error).toHaveBeenCalledWith('something broke');
    });

    it('returns 400 when reason is missing', async () => {
      parseBody.mockResolvedValue({});
      const res = fakeRes();
      await routes['POST /api/orchestrator/error'](fakeReq(), res);
      expect(res.status).toBe(400);
    });

    it('truncates reason to 2000 chars', async () => {
      parseBody.mockResolvedValue({ reason: 'x'.repeat(3000) });
      const res = fakeRes();
      await routes['POST /api/orchestrator/error'](fakeReq(), res);
      expect(mockEngine.error).toHaveBeenCalled();
      expect(mockEngine.error.mock.calls[0][0].length).toBe(2000);
    });
  });

  /* ── POST /recover ───────────────────────────────────────────── */

  describe('POST /recover', () => {
    it('recovers engine from error', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/recover'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
    });

    it('returns 400 when recover fails', async () => {
      mockEngine.recover.mockImplementation(() => { throw new Error('cannot recover'); });
      const res = fakeRes();
      await routes['POST /api/orchestrator/recover'](fakeReq(), res);
      expect(res.status).toBe(400);
    });
  });

  /* ── POST /reset ─────────────────────────────────────────────── */

  describe('POST /reset', () => {
    it('resets engine with new mode', async () => {
      parseBody.mockResolvedValue({ mode: 'CREATE' });
      const res = fakeRes();
      await routes['POST /api/orchestrator/reset'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
    });

    it('returns 400 when mode is missing', async () => {
      parseBody.mockResolvedValue({});
      const res = fakeRes();
      await routes['POST /api/orchestrator/reset'](fakeReq(), res);
      expect(res.status).toBe(400);
    });

    it('passes phases array when provided', async () => {
      parseBody.mockResolvedValue({ mode: 'CREATE', phases: ['PHASE_1', 'PHASE_2'] });
      const res = fakeRes();
      await routes['POST /api/orchestrator/reset'](fakeReq(), res);
      expect(mockEngine.reset).toHaveBeenCalled();
    });
  });

  /* ── POST /validate-gate ─────────────────────────────────────── */

  describe('POST /validate-gate', () => {
    it('validates gate with deliverables', async () => {
      parseBody.mockResolvedValue({ deliverables: ['file1.md', 'file2.md'] });
      const res = fakeRes();
      await routes['POST /api/orchestrator/validate-gate'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.verdict).toBe('APPROVED');
    });

    it('returns 400 when deliverables is missing', async () => {
      parseBody.mockResolvedValue({});
      const res = fakeRes();
      await routes['POST /api/orchestrator/validate-gate'](fakeReq(), res);
      expect(res.status).toBe(400);
    });

    it('returns 400 when deliverables is empty array', async () => {
      parseBody.mockResolvedValue({ deliverables: [] });
      const res = fakeRes();
      await routes['POST /api/orchestrator/validate-gate'](fakeReq(), res);
      expect(res.status).toBe(400);
    });

    it('handles REJECTED verdict', async () => {
      mockEngine.validateGate.mockReturnValue({
        verdict: 'REJECTED',
        summary: { phase: 'PHASE_2', totalViolations: 3 },
      });
      parseBody.mockResolvedValue({ deliverables: ['file1.md'] });
      const res = fakeRes();
      await routes['POST /api/orchestrator/validate-gate'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.verdict).toBe('REJECTED');
    });
  });

  /* ── POST /command ───────────────────────────────────────────── */

  describe('POST /command', () => {
    it('accepts valid CREATE command', async () => {
      parseBody.mockResolvedValue({ command: 'CREATE' });
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.ok).toBe(true);
      expect(res.json.command).toBe('CREATE');
    });

    it('normalizes command to uppercase with underscores', async () => {
      parseBody.mockResolvedValue({ command: 'create-business' });
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.command).toBe('CREATE_BUSINESS');
    });

    it('returns 400 for missing command', async () => {
      parseBody.mockResolvedValue({});
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq(), res);
      expect(res.status).toBe(400);
    });

    it('returns 400 for unknown command', async () => {
      parseBody.mockResolvedValue({ command: 'INVALID' });
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq(), res);
      expect(res.status).toBe(400);
      expect(res.json.code).toBe('INVALID_COMMAND');
    });

    it('accepts all valid commands', async () => {
      const commands = ['CREATE', 'AUDIT', 'FEATURE', 'SCOPE_CHANGE', 'HOTFIX', 'REEVALUATE',
        'CREATE_BUSINESS', 'CREATE_TECH', 'CREATE_UX', 'CREATE_MARKETING'];
      for (const command of commands) {
        vi.clearAllMocks();
        mockEngine.status.mockReturnValue({ state: 'IDLE', mode: command });
        mockEngine.reset.mockReturnValue({ state: 'IDLE', mode: command });
        parseBody.mockResolvedValue({ command });
        routes = createOrchestratorRoutes({ sseNotify: vi.fn() });
        const res = fakeRes();
        await routes['POST /api/orchestrator/command'](fakeReq(), res);
        expect(res.status).toBe(200);
      }
    });

    it('defaults platform to copilot', async () => {
      parseBody.mockResolvedValue({ command: 'AUDIT' });
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq(), res);
      expect(res.json.platform).toBe('copilot');
    });

    it('accepts valid platforms', async () => {
      for (const platform of ['copilot', 'claude', 'codex']) {
        parseBody.mockResolvedValue({ command: 'AUDIT', platform });
        const res = fakeRes();
        await routes['POST /api/orchestrator/command'](fakeReq(), res);
        expect(res.status).toBe(200);
        expect(res.json.platform).toBe(platform);
      }
    });

    it('returns 400 for invalid platform', async () => {
      parseBody.mockResolvedValue({ command: 'AUDIT', platform: 'gpt5' });
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq(), res);
      expect(res.status).toBe(400);
      expect(res.json.code).toBe('INVALID_PLATFORM');
    });

    it('skips reset when resume is true', async () => {
      parseBody.mockResolvedValue({ command: 'AUDIT', resume: true });
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq(), res);
      expect(res.status).toBe(200);
      expect(res.json.resume).toBe(true);
      expect(mockEngine.reset).not.toHaveBeenCalled();
    });

    it('truncates project name to 200 chars', async () => {
      parseBody.mockResolvedValue({ command: 'CREATE', project: 'x'.repeat(300) });
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq(), res);
      expect(res.json.project.length).toBe(200);
    });
  });

  /* ── POST /sprint-gate ──────────────────────────────────────── */

  describe('POST /sprint-gate', () => {
    it('validates sprint gate', async () => {
      parseBody.mockResolvedValue({ sprintId: 'SP-1', stories: [] });
      const res = fakeRes();
      await routes['POST /api/orchestrator/sprint-gate'](fakeReq(), res);
      expect(res.status).toBe(200);
    });

    it('returns 400 when sprintId is missing', async () => {
      parseBody.mockResolvedValue({});
      const res = fakeRes();
      await routes['POST /api/orchestrator/sprint-gate'](fakeReq(), res);
      expect(res.status).toBe(400);
    });

    it('passes sprint data to engine', async () => {
      parseBody.mockResolvedValue({
        sprintId: 'SP-3',
        stories: [{ id: 'S1' }],
        plannedItems: 5,
        paths: { docs: '/docs' },
      });
      const res = fakeRes();
      await routes['POST /api/orchestrator/sprint-gate'](fakeReq(), res);
      expect(mockEngine.sprintGate).toHaveBeenCalledWith(expect.objectContaining({
        sprintId: 'SP-3',
        stories: [{ id: 'S1' }],
        plannedItems: 5,
      }));
    });
  });
});
