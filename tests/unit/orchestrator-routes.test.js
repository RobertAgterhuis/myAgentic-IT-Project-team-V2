'use strict';

/**
 * Orchestrator Route Handlers — Unit Tests (FEAT-05-A API integration)
 *
 * Covers:
 * - GET  /api/orchestrator/status
 * - POST /api/orchestrator/advance
 * - POST /api/orchestrator/error
 * - POST /api/orchestrator/recover
 * - POST /api/orchestrator/reset
 *
 * NOTE: These tests exercise the orchestrator engine directly through
 * the engine module (not through HTTP routes) to avoid the complexity
 * of mocking Node.js HTTP streams. Route-level integration is verified
 * by smoke/integration tests.
 */

const path = require('path');
const fs = require('fs');
const { createEngine } = require('../../platform/engine/engine');
const { listTemplates } = require('../../platform/engine/template-loader');

// ─── Test Helpers ────────────────────────────────────────────

const FLOWS_PATH = path.join(__dirname, '..', '..', 'platform', 'engine', 'flows.yaml');
const FLOWS_CONTENT = fs.readFileSync(FLOWS_PATH, 'utf-8');

function createMockStore(files = {}) {
  const _files = { ...files };
  return {
    exists: (fp) => fp in _files,
    readFile: (fp) => {
      if (!(fp in _files)) throw new Error(`File not found: ${fp}`);
      return _files[fp];
    },
    writeFile: (fp, data) => {
      _files[fp] = data;
    },
    mkdirp: () => {},
    _files,
  };
}

function freshEngine(extraFiles = {}) {
  const sessionPath = '/test/route-session.json';
  const store = createMockStore({ [FLOWS_PATH]: FLOWS_CONTENT, ...extraFiles });
  const events = [];
  const sseNotify = (type, data) => events.push({ type, data });
  const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath, sseNotify });
  return { engine, store, events, sessionPath };
}

// ─────────────────────────────────────────────────────────────
// Route-equivalent handler tests (via engine API)
// ─────────────────────────────────────────────────────────────
describe('orchestrator routes — engine API', () => {
  describe('GET /api/orchestrator/status equivalent', () => {
    it('returns current engine status at IDLE', () => {
      const { engine } = freshEngine();
      const status = engine.status();
      expect(status.state).toBe('IDLE');
      expect(status.mode).toBe('CREATE');
      expect(status.nextState).toBe('ONBOARDING');
    });
  });

  describe('POST /api/orchestrator/advance equivalent', () => {
    it('advances the state machine', () => {
      const { engine } = freshEngine();
      const result = engine.advance();
      expect(result.from).toBe('IDLE');
      expect(result.to).toBe('ONBOARDING');
      expect(engine.status().state).toBe('ONBOARDING');
    });

    it('advances with gate result at critic state', () => {
      const { engine } = freshEngine();
      engine.advance(); // IDLE → ONBOARDING
      engine.advance(); // ONBOARDING → PHASE_1
      engine.advance(); // PHASE_1 → CRITIC_1

      const result = engine.advance({ verdict: 'APPROVED' });
      expect(result.from).toBe('CRITIC_1');
      expect(result.to).toBe('PHASE_2');
    });

    it('throws when no valid transition from COMPLETED', () => {
      const { engine } = freshEngine();
      // Walk to COMPLETED
      for (let i = 0; i < 13; i++) {
        engine.advance();
      }
      expect(engine.status().state).toBe('COMPLETED');
      expect(() => engine.advance()).toThrow('No valid transition');
    });
  });

  describe('POST /api/orchestrator/error equivalent', () => {
    it('forces ERROR state', () => {
      const { engine } = freshEngine();
      engine.advance(); // IDLE → ONBOARDING
      engine.error('test failure');
      expect(engine.status().state).toBe('ERROR');
    });
  });

  describe('POST /api/orchestrator/recover equivalent', () => {
    it('recovers from ERROR state', () => {
      const { engine } = freshEngine();
      engine.advance(); // IDLE → ONBOARDING
      engine.error('test');
      expect(engine.status().state).toBe('ERROR');

      const recovered = engine.recover();
      expect(recovered).toBe('ONBOARDING');
      expect(engine.status().state).toBe('ONBOARDING');
    });

    it('throws when not in ERROR state', () => {
      const { engine } = freshEngine();
      expect(() => engine.recover()).toThrow('Can only recover from ERROR state');
    });
  });

  describe('POST /api/orchestrator/reset equivalent', () => {
    it('resets to a new mode', () => {
      const { engine } = freshEngine();
      engine.advance(); // IDLE → ONBOARDING

      const result = engine.reset('CREATE_TECH');
      expect(result.state).toBe('IDLE');
    });

    it('persists the reset state', () => {
      const { engine, store, sessionPath } = freshEngine();
      engine.advance(); // IDLE → ONBOARDING
      engine.reset('AUDIT');

      const persisted = JSON.parse(store._files[sessionPath]);
      expect(persisted.status).toBe('IDLE');
      expect(persisted.mode).toBe('AUDIT');
    });

    it('emits reset SSE event', () => {
      const { engine, events } = freshEngine();
      engine.reset('CREATE_UX');
      const resetEvents = events.filter((e) => e.type === 'orchestrator:reset');
      expect(resetEvents.length).toBeGreaterThanOrEqual(1);
      expect(resetEvents[0].data.mode).toBe('CREATE_UX');
    });
  });

  describe('full lifecycle', () => {
    it('walks CREATE cycle: IDLE → ONBOARDING → ... → COMPLETED with persistence and SSE', () => {
      const { engine, store, events, sessionPath } = freshEngine();

      // Walk the full CREATE cycle (13 transitions)
      const transitions = [];
      for (let i = 0; i < 13; i++) {
        transitions.push(engine.advance());
      }

      expect(engine.status().state).toBe('COMPLETED');
      expect(transitions[0]).toMatchObject({ from: 'IDLE', to: 'ONBOARDING' });
      expect(transitions[12]).toMatchObject({ from: 'PHASE_5_EXECUTING', to: 'COMPLETED' });

      // Verify persistence
      const persisted = JSON.parse(store._files[sessionPath]);
      expect(persisted.status).toBe('COMPLETED');

      // Verify SSE events were emitted
      const transEvents = events.filter((e) => e.type === 'orchestrator:transition');
      expect(transEvents.length).toBe(13);
      const savedEvents = events.filter((e) => e.type === 'orchestrator:state_saved');
      expect(savedEvents.length).toBe(13);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// S6 — Template selection UX
// ─────────────────────────────────────────────────────────────
describe('orchestrator routes — template selection (S6)', () => {
  describe('listTemplates integration', () => {
    it('returns an array of template metadata', () => {
      const templates = listTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThanOrEqual(1);
      const sdlc = templates.find((t) => t.name === 'sdlc');
      const ops = templates.find((t) => t.name === 'ops-command-center');
      expect(sdlc).toBeDefined();
      expect(sdlc.valid).toBe(true);
      expect(ops).toBeDefined();
      expect(ops.valid).toBe(true);
      expect(sdlc.displayName).toBeTruthy();
      expect(sdlc.version).toBeTruthy();
    });
  });

  describe('engine with template selection', () => {
    it('creates engine with sdlc template', () => {
      const { engine } = freshEngineWithTemplate('sdlc');
      const st = engine.status();
      expect(st.state).toBe('IDLE');
      expect(st.templateName).toBe('sdlc');
    });

    it('engine reset preserves template context', () => {
      const { engine } = freshEngineWithTemplate('sdlc');
      engine.advance(); // IDLE → ONBOARDING
      const result = engine.reset('AUDIT');
      expect(result.state).toBe('IDLE');
      expect(result.mode).toBe('AUDIT');
    });

    it('creates engine with ops-command-center template and template-specific mode', () => {
      const { engine } = freshEngineWithTemplate('ops-command-center');
      const result = engine.reset('TRIAGE');
      expect(result.state).toBe('IDLE');
      expect(result.mode).toBe('TRIAGE');
      expect(engine.status().templateName).toBe('ops-command-center');
    });

    it('engine without explicit template loads default sdlc', () => {
      const store = createMockStore({ [FLOWS_PATH]: FLOWS_CONTENT });
      const engine = createEngine({ store, flowsPath: FLOWS_PATH });
      const st = engine.status();
      expect(st.state).toBe('IDLE');
      expect(st.templateName).toBe('sdlc');
    });
  });
});

function freshEngineWithTemplate(templateName) {
  const sessionPath = '/test/route-session.json';
  const store = createMockStore({ [FLOWS_PATH]: FLOWS_CONTENT });
  const events = [];
  const sseNotify = (type, data) => events.push({ type, data });
  const engine = createEngine({
    store,
    flowsPath: FLOWS_PATH,
    sessionPath,
    sseNotify,
    templateName,
  });
  return { engine, store, events, sessionPath };
}
