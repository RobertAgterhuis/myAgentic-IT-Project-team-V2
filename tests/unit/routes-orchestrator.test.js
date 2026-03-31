// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Integration tests — uses real engine, store, middleware (no vi.mock).

import { Readable } from 'stream';
import * as fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from '../../src/webapp/routes/orchestrator.js';
import { sessionTracker } from '../../src/webapp/session-tracker.js';
import { GovernanceService, toServiceContext } from '../../src/webapp/services/index.js';
import { createTestableRoutes } from '../helpers/fastify-test-adapter.js';

const createOrchestratorRoutes = (ctx) => createTestableRoutes(registerRoutes, ctx);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.resolve(
  __dirname,
  '..',
  '..',
  'BusinessDocs',
  'session',
  'session-state.json'
);
const HUMAN_OVERRIDE_FILE = path.resolve(
  __dirname,
  '..',
  '..',
  'BusinessDocs',
  'session',
  'human-override-events.json'
);
const GOVERNANCE_STATE_FILE = path.resolve(
  __dirname,
  '..',
  '..',
  'BusinessDocs',
  'session',
  'governance-state.json'
);
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
  let sseNotify;
  let originalSession;
  let originalHumanOverride;
  let originalGovernanceState;
  let routeCtx;

  beforeAll(() => {
    originalSession = fs.existsSync(SESSION_FILE) ? fs.readFileSync(SESSION_FILE, 'utf8') : null;
    originalHumanOverride = fs.existsSync(HUMAN_OVERRIDE_FILE)
      ? fs.readFileSync(HUMAN_OVERRIDE_FILE, 'utf8')
      : null;
    originalGovernanceState = fs.existsSync(GOVERNANCE_STATE_FILE)
      ? fs.readFileSync(GOVERNANCE_STATE_FILE, 'utf8')
      : null;
  });

  afterAll(() => {
    if (originalSession !== null) {
      fs.writeFileSync(SESSION_FILE, originalSession);
    }
    if (originalHumanOverride !== null) {
      fs.writeFileSync(HUMAN_OVERRIDE_FILE, originalHumanOverride);
    } else {
      fs.rmSync(HUMAN_OVERRIDE_FILE, { force: true });
    }
    if (originalGovernanceState !== null) {
      fs.writeFileSync(GOVERNANCE_STATE_FILE, originalGovernanceState);
    } else {
      fs.rmSync(GOVERNANCE_STATE_FILE, { force: true });
    }
  });

  beforeEach(() => {
    sessionTracker.reset();
    // Ensure the session directory exists (may not in CI)
    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    // Write clean IDLE state so each test starts fresh
    fs.writeFileSync(SESSION_FILE, IDLE_STATE);
    fs.rmSync(HUMAN_OVERRIDE_FILE, { force: true });
    fs.rmSync(GOVERNANCE_STATE_FILE, { force: true });
    sseNotify = vi.fn();
    routeCtx = {
      sseNotify,
      PROJECT_ROOT: path.resolve(__dirname, '..', '..'),
      SESSION_DIR: path.dirname(SESSION_FILE),
    };
    routes = createTestableRoutes(registerRoutes, routeCtx);
  });

  it('exports all 10 route handlers', () => {
    expect(routes['GET /api/orchestrator/status']).toBeTypeOf('function');
    expect(routes['GET /api/orchestrator/templates']).toBeTypeOf('function');
    expect(routes['GET /api/orchestrator/active-pack']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/active-pack']).toBeTypeOf('function');
    expect(routes['GET /api/orchestrator/run-history']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/advance']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/error']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/recover']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/reset']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/pause']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/override']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/resume']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/stop']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/validate-gate']).toBeTypeOf('function');
    expect(routes['GET /api/orchestrator/gate-diagnostics/:sessionId']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/command']).toBeTypeOf('function');
    expect(routes['POST /api/orchestrator/sprint-gate']).toBeTypeOf('function');
  });

  describe('GET /gate-diagnostics/:sessionId', () => {
    it('returns 404 for unknown session timeline', async () => {
      const res = fakeRes();
      await routes['GET /api/orchestrator/gate-diagnostics/:sessionId'](
        { headers: { host: 'localhost:3000' }, params: { sessionId: 'missing-session' } },
        res
      );
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
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
      expect(res.body.human_override).toBeDefined();
      expect(res.body.human_override.paused).toBe(false);
    });
  });

  describe('active pack switching', () => {
    it('returns active pack metadata', async () => {
      const res = fakeRes();
      await routes['GET /api/orchestrator/active-pack'](fakeGetReq(), res);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.active_template).toBe('string');
      expect(Array.isArray(res.body.templates)).toBe(true);
    });

    it('switches active pack and accepts pack-specific command without template override', async () => {
      const switchRes = fakeRes();
      await routes['POST /api/orchestrator/active-pack'](
        fakeReq({ template: 'ops-command-center' }),
        switchRes
      );
      expect(switchRes.status).toBe(200);
      expect(switchRes.body.active_template).toBe('ops-command-center');

      const commandRes = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq({ command: 'TRIAGE' }), commandRes);
      expect(commandRes.status).toBe(200);
      expect(commandRes.body.command).toBe('TRIAGE');
      expect(commandRes.body.status.mode).toBe('TRIAGE');
    });

    it('switches back to sdlc and accepts sdlc command without template override', async () => {
      const switchToOps = fakeRes();
      await routes['POST /api/orchestrator/active-pack'](
        fakeReq({ template: 'ops-command-center' }),
        switchToOps
      );
      expect(switchToOps.status).toBe(200);

      const switchToSdlc = fakeRes();
      await routes['POST /api/orchestrator/active-pack'](
        fakeReq({ template: 'sdlc' }),
        switchToSdlc
      );
      expect(switchToSdlc.status).toBe(200);
      expect(switchToSdlc.body.active_template).toBe('sdlc');

      const commandRes = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq({ command: 'AUDIT' }), commandRes);
      expect(commandRes.status).toBe(200);
      expect(commandRes.body.command).toBe('AUDIT');
      expect(commandRes.body.status.mode).toBe('AUDIT');
    });

    it('returns 404 when switching to unknown template', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/active-pack'](
        fakeReq({ template: 'unknown-pack' }),
        res
      );
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /onboarding-diagnostics', () => {
    it('returns runtime profile continuity diagnostics', async () => {
      const res = fakeRes();
      await routes['GET /api/orchestrator/onboarding-diagnostics'](fakeGetReq(), res);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.profile).toBeTypeOf('string');
      expect(res.body.predecessorContractContinuity).toBeDefined();
      expect(res.body.predecessorContractContinuity).toHaveProperty('mode');
      expect(res.body.predecessorContractContinuity).toHaveProperty('source');
      expect(['env', 'profile-default']).toContain(res.body.predecessorContractContinuity.source);
    });
  });

  /* ── POST /pause, /override, /resume ─────────────────────── */

  describe('POST /pause|/override|/resume', () => {
    it('pauses orchestrator and blocks advance until resume', async () => {
      const pauseRes = fakeRes();
      await routes['POST /api/orchestrator/pause'](
        fakeReq({ rationale: 'Need human validation', requested_by: 'qa-user' }),
        pauseRes
      );
      expect(pauseRes.status).toBe(200);
      expect(pauseRes.body.paused).toBe(true);

      const blockedAdvance = fakeRes();
      await routes['POST /api/orchestrator/advance'](fakeReq({}), blockedAdvance);
      expect(blockedAdvance.status).toBe(409);
      expect(blockedAdvance.body.code).toBe('ORCHESTRATOR_PAUSED');

      const resumeRes = fakeRes();
      await routes['POST /api/orchestrator/resume'](
        fakeReq({ rationale: 'Approved to continue', requested_by: 'qa-user' }),
        resumeRes
      );
      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.resumed).toBe(true);

      const advanceRes = fakeRes();
      await routes['POST /api/orchestrator/advance'](fakeReq({}), advanceRes);
      expect(advanceRes.status).toBe(200);
    });

    it('applies override reset and keeps paused until resume', async () => {
      const overrideRes = fakeRes();
      await routes['POST /api/orchestrator/override'](
        fakeReq({ rationale: 'Switch to tech-only subplan', mode: 'CREATE_TECH' }),
        overrideRes
      );
      expect(overrideRes.status).toBe(200);
      expect(overrideRes.body.paused).toBe(true);
      expect(overrideRes.body.status.mode).toBe('CREATE_TECH');

      const statusRes = fakeRes();
      routes['GET /api/orchestrator/status'](fakeGetReq(), statusRes);
      expect(statusRes.body.human_override.paused).toBe(true);
      expect(statusRes.body.human_override.last_event.type).toBe('override');
    });

    it('persists override events and restores paused state after route re-init', async () => {
      const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrator-override-'));
      try {
        const ctx = { sseNotify: vi.fn(), PROJECT_ROOT: tempRoot };
        const firstRoutes = createTestableRoutes(registerRoutes, ctx);

        const pauseRes = fakeRes();
        await firstRoutes['POST /api/orchestrator/pause'](
          fakeReq({ rationale: 'Persistent pause check', requested_by: 'qa-user' }),
          pauseRes
        );
        expect(pauseRes.status).toBe(200);

        const eventsPath = path.join(
          tempRoot,
          'BusinessDocs',
          'session',
          'human-override-events.json'
        );
        expect(fs.existsSync(eventsPath)).toBe(true);
        const persisted = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
        expect(Array.isArray(persisted)).toBe(true);
        expect(persisted.length).toBe(1);
        expect(persisted[0].type).toBe('pause');

        const secondRoutes = createTestableRoutes(registerRoutes, ctx);
        const statusRes = fakeRes();
        secondRoutes['GET /api/orchestrator/status'](fakeGetReq(), statusRes);
        expect(statusRes.status).toBe(200);
        expect(statusRes.body.human_override.paused).toBe(true);
        expect(statusRes.body.human_override.last_event.type).toBe('pause');
      } finally {
        fs.rmSync(tempRoot, { recursive: true, force: true });
      }
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

    it('blocks advance in production profile when approvals are pending', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        const governanceService = new GovernanceService(toServiceContext(routeCtx));
        governanceService.requestToolExecutionApproval({
          entityId: 'orchestrator:advance:test',
          requestedBy: 'qa-user',
        });

        const res = fakeRes();
        await routes['POST /api/orchestrator/advance'](fakeReq({}), res);

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('REVIEW_GATE_BLOCKED');
        expect(res.body.pending_approvals).toBeGreaterThan(0);

        const blockedEvent = sseNotify.mock.calls.find(
          ([type, payload]) =>
            type === 'orchestrator_transition_blocked' && payload.reason === 'pending_approvals'
        );
        expect(blockedEvent).toBeDefined();
      } finally {
        if (originalNodeEnv === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = originalNodeEnv;
        }
      }
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

    it('starts all Phase 1 agents in session tracking and SSE when entering PHASE_1', async () => {
      await routes['POST /api/orchestrator/advance'](fakeReq({}), fakeRes());

      const res = fakeRes();
      await routes['POST /api/orchestrator/advance'](fakeReq({}), res);

      expect(res.status).toBe(200);
      expect(res.body.transition.to).toBe('PHASE_1');

      const [session] = sessionTracker.listSessions();
      expect(session).toBeDefined();
      expect(session.current_agent).toBe('01-business-analyst');
      expect(session.current_agents).toEqual([
        '01-business-analyst',
        '02-domain-expert',
        '03-sales-strategist',
        '04-financial-analyst',
        '34-product-manager',
      ]);

      const agents = sessionTracker.listAgentsBySession(session.id);
      expect(agents).toHaveLength(6);
      const phase1Agents = agents.filter((agent) => agent.phase === 'PHASE-1');
      expect(phase1Agents).toHaveLength(5);
      expect(phase1Agents.every((agent) => agent.status === 'running')).toBe(true);
      expect(phase1Agents.map((agent) => agent.name)).toEqual([
        'Business Analyst',
        'Domain Expert',
        'Sales Strategist',
        'Financial Analyst',
        'Product Manager',
      ]);

      const parallelStarts = sseNotify.mock.calls.filter(
        ([type, payload]) => type === 'agent_start' && payload.parallel_group === true
      );
      expect(parallelStarts).toHaveLength(5);
      expect(parallelStarts[0][1].parallel_group_id).toBe('phase_1');
      expect(parallelStarts[0][1].parallel_group_state).toBe('PHASE_1');
      expect(parallelStarts[0][1].parallel_group_size).toBe(5);
      expect(parallelStarts[0][1].parallel_group_agents).toEqual([
        '01-business-analyst',
        '02-domain-expert',
        '03-sales-strategist',
        '04-financial-analyst',
        '34-product-manager',
      ]);
    });

    it('completes all Phase 1 agents when advancing from PHASE_1 to CRITIC_1', async () => {
      await routes['POST /api/orchestrator/advance'](fakeReq({}), fakeRes());
      await routes['POST /api/orchestrator/advance'](fakeReq({}), fakeRes());

      const res = fakeRes();
      await routes['POST /api/orchestrator/advance'](fakeReq({}), res);

      expect(res.status).toBe(200);
      expect(res.body.transition.to).toBe('CRITIC_1');

      const [session] = sessionTracker.listSessions();
      expect(session.current_agent).toBe('18-critic-agent');
      expect(session.current_agents).toEqual(['18-critic-agent']);

      const agents = sessionTracker.listAgentsBySession(session.id);
      const phase1AgentIds = [
        '01-business-analyst',
        '02-domain-expert',
        '03-sales-strategist',
        '04-financial-analyst',
        '34-product-manager',
      ];
      const phase1Agents = agents.filter((agent) => phase1AgentIds.includes(agent.id));
      expect(phase1Agents).toHaveLength(5);
      expect(phase1Agents.every((agent) => agent.status === 'completed')).toBe(true);
      expect(agents.find((agent) => agent.id === '18-critic-agent')?.status).toBe('running');

      const parallelCompletes = sseNotify.mock.calls.filter(
        ([type, payload]) => type === 'agent_complete' && payload.parallel_group === true
      );
      expect(parallelCompletes).toHaveLength(5);
      expect(parallelCompletes[0][1].parallel_group_size).toBe(5);

      const stateEvent = sseNotify.mock.calls.find(
        ([type, payload]) => type === 'orchestrator_state' && payload.to === 'CRITIC_1'
      );
      expect(stateEvent[1].parallel_group).toBeNull();
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

    // Note: missing reason is now caught by Fastify JSON Schema validation
    // before the handler runs. See route-schemas.test.js for schema-level tests.
    // The handler no longer performs manual reason checks.
    it('handles missing reason at handler level (schema validates upstream)', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/error'](fakeReq({}), res);
      // Without schema gating, handler proceeds — 200 or 500 depending on engine state
      expect([200, 500]).toContain(res.status);
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

    // Note: missing mode is now caught by Fastify JSON Schema validation
    // before the handler runs. See route-schemas.test.js for schema-level tests.
    it('handles missing mode at handler level (schema validates upstream)', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/reset'](fakeReq({}), res);
      // Without schema gating, handler proceeds with mode="undefined" string
      expect([200, 500]).toContain(res.status);
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
    }, 15000);

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

    it('accepts CONTINUE as a metadata-driven resume command', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](fakeReq({ command: 'CONTINUE' }), res);
      expect(res.status).toBe(200);
      expect(res.body.command).toBe('CONTINUE');
      expect(res.body.resume).toBe(true);
    });

    it('rejects non-mode metadata commands when resume is false', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](
        fakeReq({ command: 'REFRESH ONBOARDING' }),
        res
      );
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not executable as a fresh orchestrator mode/i);
    });

    it('accepts template-specific command modes for non-SDLC reference packs', async () => {
      const res = fakeRes();
      await routes['POST /api/orchestrator/command'](
        fakeReq({ command: 'TRIAGE', template: 'ops-command-center' }),
        res
      );
      expect(res.status).toBe(200);
      expect(res.body.command).toBe('TRIAGE');
      expect(res.body.status.mode).toBe('TRIAGE');
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

  /* ── POST /stop ─────────────────────────────────────────────── */

  describe('POST /stop', () => {
    it('stops the engine and returns stopped status', async () => {
      // Advance to ONBOARDING first
      await routes['POST /api/orchestrator/advance'](fakeReq({}), fakeRes());
      const res = fakeRes();
      await routes['POST /api/orchestrator/stop'](fakeGetReq(), res);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.stopped).toBe(true);
      expect(res.body.status.state).toBe('ERROR');
    });
  });

  /* ── GET /run-history ────────────────────────────────────────── */

  describe('GET /run-history', () => {
    it('returns runs array with ok flag', () => {
      const res = fakeRes();
      routes['GET /api/orchestrator/run-history'](fakeGetReq(), res);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.runs)).toBe(true);
    });
  });

  /* ── Status includes elapsed time ───────────────────────────── */

  describe('GET /status (enhanced)', () => {
    it('includes elapsedMs and phaseMetadata', () => {
      const res = fakeRes();
      routes['GET /api/orchestrator/status'](fakeGetReq(), res);
      expect(res.status).toBe(200);
      expect(typeof res.body.elapsedMs).toBe('number');
      expect(Array.isArray(res.body.phaseMetadata)).toBe(true);
    });
  });
});
