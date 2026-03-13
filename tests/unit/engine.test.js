'use strict';

/**
 * Orchestrator Engine — Unit Tests (FEAT-05-A integration)
 *
 * Covers:
 * - createEngine: initialization with flow loading + crash recovery
 * - advance/error/recover/reset: full engine lifecycle
 * - SSE event forwarding
 * - Auto-persistence on transitions
 */

const path = require('path');
const fs = require('fs');
const { createEngine } = require('../../src/webapp/orchestrator/engine');

// ─── Test Helpers ────────────────────────────────────────────

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

// Load the real flows.yaml for tests
const FLOWS_PATH = path.join(__dirname, '..', '..', 'src', 'webapp', 'orchestrator', 'flows.yaml');
const FLOWS_CONTENT = fs.readFileSync(FLOWS_PATH, 'utf-8');

function storeWithFlows(extraFiles = {}) {
  return createMockStore({ [FLOWS_PATH]: FLOWS_CONTENT, ...extraFiles });
}

// ─────────────────────────────────────────────────────────────
// Engine initialization
// ─────────────────────────────────────────────────────────────
describe('createEngine — initialization', () => {
  it('creates engine with default CREATE mode', () => {
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH });

    expect(engine.status().state).toBe('IDLE');
    expect(engine.status().mode).toBe('CREATE');
  });

  it('throws when store is missing', () => {
    expect(() => createEngine({})).toThrow('Engine requires a store');
  });

  it('loads flows.yaml and exposes flow definition', () => {
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH });

    expect(engine.flows.states).toHaveLength(15);
    expect(engine.flows.modes).toHaveProperty('CREATE');
  });
});

// ─────────────────────────────────────────────────────────────
// Crash recovery (AC-7)
// ─────────────────────────────────────────────────────────────
describe('createEngine — crash recovery', () => {
  it('resumes from persisted session state', () => {
    const sessionPath = '/test/session.json';
    const sessionState = {
      status: 'PHASE_2',
      mode: 'CREATE',
      state_history: [
        { from: 'IDLE', to: 'ONBOARDING', timestamp: '2026-01-01T00:00:00Z' },
        { from: 'ONBOARDING', to: 'PHASE_1', timestamp: '2026-01-01T00:01:00Z' },
        { from: 'PHASE_1', to: 'CRITIC_1', timestamp: '2026-01-01T00:02:00Z' },
        { from: 'CRITIC_1', to: 'PHASE_2', timestamp: '2026-01-01T00:03:00Z' },
      ],
    };
    const store = storeWithFlows({
      [sessionPath]: JSON.stringify(sessionState),
    });

    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });
    expect(engine.status().state).toBe('PHASE_2');
    expect(engine.status().mode).toBe('CREATE');
  });

  it('starts at IDLE when session file is missing', () => {
    const store = storeWithFlows();
    const engine = createEngine({
      store,
      flowsPath: FLOWS_PATH,
      sessionPath: '/nonexistent.json',
    });
    expect(engine.status().state).toBe('IDLE');
  });

  it('starts at IDLE when session file is corrupted', () => {
    const sessionPath = '/test/bad.json';
    const store = storeWithFlows({ [sessionPath]: 'not json' });
    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });
    expect(engine.status().state).toBe('IDLE');
  });
});

// ─────────────────────────────────────────────────────────────
// Advance / transitions
// ─────────────────────────────────────────────────────────────
describe('createEngine — advance', () => {
  it('advances through the full CREATE flow', () => {
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH });

    const t1 = engine.advance();
    expect(t1.from).toBe('IDLE');
    expect(t1.to).toBe('ONBOARDING');
    expect(engine.status().state).toBe('ONBOARDING');

    const t2 = engine.advance();
    expect(t2.to).toBe('PHASE_1');
  });

  it('passes gate result through critic states', () => {
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH });

    // Advance to CRITIC_1
    engine.advance(); // IDLE → ONBOARDING
    engine.advance(); // ONBOARDING → PHASE_1
    engine.advance(); // PHASE_1 → CRITIC_1
    expect(engine.status().state).toBe('CRITIC_1');

    // Pass the gate
    const result = engine.advance({ verdict: 'APPROVED' });
    expect(result.to).toBe('PHASE_2');
  });

  it('rejects failed gate', () => {
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH });

    engine.advance(); // IDLE → ONBOARDING
    engine.advance(); // ONBOARDING → PHASE_1
    engine.advance(); // PHASE_1 → CRITIC_1

    expect(() => engine.advance({ verdict: 'REJECTED', reason: 'not ready' })).toThrow(
      'Gate failed'
    );
  });
});

// ─────────────────────────────────────────────────────────────
// Error and recovery
// ─────────────────────────────────────────────────────────────
describe('createEngine — error/recover', () => {
  it('enters ERROR state and recovers', () => {
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH });

    engine.advance(); // IDLE → ONBOARDING
    engine.error('test failure');
    expect(engine.status().state).toBe('ERROR');

    const recovered = engine.recover();
    expect(recovered).toBe('ONBOARDING');
    expect(engine.status().state).toBe('ONBOARDING');
  });
});

// ─────────────────────────────────────────────────────────────
// SSE event forwarding (AC-6)
// ─────────────────────────────────────────────────────────────
describe('createEngine — SSE events', () => {
  it('forwards transition events to sseNotify', () => {
    const events = [];
    const sseNotify = (type, data) => events.push({ type, data });

    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sseNotify });

    engine.advance(); // IDLE → ONBOARDING

    const transitionEvents = events.filter((e) => e.type === 'orchestrator:transition');
    expect(transitionEvents.length).toBeGreaterThanOrEqual(1);
    expect(transitionEvents[0].data.from).toBe('IDLE');
    expect(transitionEvents[0].data.to).toBe('ONBOARDING');
  });

  it('forwards error events to sseNotify', () => {
    const events = [];
    const sseNotify = (type, data) => events.push({ type, data });

    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sseNotify });

    engine.advance(); // IDLE → ONBOARDING
    engine.error('test error');

    const errorEvents = events.filter((e) => e.type === 'orchestrator:error');
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);
    expect(errorEvents[0].data.reason).toBe('test error');
  });

  it('sends state_saved event after persist', () => {
    const events = [];
    const sseNotify = (type, data) => events.push({ type, data });
    const sessionPath = '/test/session.json';

    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sseNotify, sessionPath });

    engine.advance(); // IDLE → ONBOARDING

    const savedEvents = events.filter((e) => e.type === 'orchestrator:state_saved');
    expect(savedEvents.length).toBeGreaterThanOrEqual(1);
    expect(savedEvents[0].data.status).toBe('ONBOARDING');
  });
});

// ─────────────────────────────────────────────────────────────
// Auto-persistence (AC-1 + AC-7)
// ─────────────────────────────────────────────────────────────
describe('createEngine — auto-persistence', () => {
  it('persists state to session file on advance', () => {
    const sessionPath = '/test/session.json';
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });

    engine.advance(); // IDLE → ONBOARDING

    const persisted = JSON.parse(store._files[sessionPath]);
    expect(persisted.status).toBe('ONBOARDING');
    expect(persisted.mode).toBe('CREATE');
  });

  it('persists state on error', () => {
    const sessionPath = '/test/session.json';
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });

    engine.advance(); // IDLE → ONBOARDING
    engine.error('oops');

    const persisted = JSON.parse(store._files[sessionPath]);
    expect(persisted.status).toBe('ERROR');
  });

  it('merges with existing session state fields', () => {
    const sessionPath = '/test/session.json';
    const existing = {
      schema_version: '1.0',
      project_name: 'TEST',
      status: 'IDLE',
      mode: 'CREATE',
      scope: ['BUSINESS', 'TECH'],
    };
    const store = storeWithFlows({ [sessionPath]: JSON.stringify(existing) });
    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });

    engine.advance(); // IDLE → ONBOARDING

    const persisted = JSON.parse(store._files[sessionPath]);
    expect(persisted.status).toBe('ONBOARDING');
    expect(persisted.project_name).toBe('TEST');
    expect(persisted.scope).toEqual(['BUSINESS', 'TECH']);
  });
});

// ─────────────────────────────────────────────────────────────
// Reset
// ─────────────────────────────────────────────────────────────
describe('createEngine — reset', () => {
  it('resets to a new mode', () => {
    const sessionPath = '/test/session.json';
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });

    engine.advance(); // IDLE → ONBOARDING
    engine.advance(); // ONBOARDING → PHASE_1

    const result = engine.reset('CREATE_TECH');
    expect(result.state).toBe('IDLE');
  });

  it('resets with custom phases for combination run', () => {
    const sessionPath = '/test/session.json';
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });

    const result = engine.reset('CREATE', ['PHASE_2', 'PHASE_3']);
    expect(result.state).toBe('IDLE');
  });
});
