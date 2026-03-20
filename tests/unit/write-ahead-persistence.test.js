'use strict';

/**
 * Write-Ahead Persistence — Unit Tests (M1: Write-Ahead Persistence)
 *
 * Covers:
 * - saveTransitionIntent writes IN_PROGRESS marker
 * - saveTransitionComplete writes COMPLETE and clears target
 * - Engine advance() produces COMPLETE after success
 * - transition_status preserved during SM auto-persist merge
 * - status() includes transitionStatus
 * - Resume with IN_PROGRESS is detectable
 * - Write-ahead on fresh (no existing file) works
 */

const path = require('path');
const fs = require('fs');
const {
  saveTransitionIntent,
  saveTransitionComplete,
} = require('../../platform/engine/state-persistence');
const { createEngine } = require('../../platform/engine/engine');

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

const FLOWS_PATH = path.join(__dirname, '..', '..', 'platform', 'engine', 'flows.yaml');
const FLOWS_CONTENT = fs.readFileSync(FLOWS_PATH, 'utf-8');

function storeWithFlows(extraFiles = {}) {
  return createMockStore({ [FLOWS_PATH]: FLOWS_CONTENT, ...extraFiles });
}

// ─────────────────────────────────────────────────────────────
// saveTransitionIntent
// ─────────────────────────────────────────────────────────────
describe('saveTransitionIntent', () => {
  it('writes IN_PROGRESS marker to session state', () => {
    const store = createMockStore({});
    saveTransitionIntent(store, 'ONBOARDING', '/test/session.json');

    const persisted = JSON.parse(store._files['/test/session.json']);
    expect(persisted.transition_status).toBe('IN_PROGRESS');
    expect(persisted.transition_target).toBe('ONBOARDING');
    expect(persisted.transition_started_at).toBeDefined();
  });

  it('preserves existing fields in session state', () => {
    const existing = {
      status: 'IDLE',
      mode: 'CREATE',
      project_name: 'TEST',
    };
    const store = createMockStore({ '/test/session.json': JSON.stringify(existing) });
    saveTransitionIntent(store, 'ONBOARDING', '/test/session.json');

    const persisted = JSON.parse(store._files['/test/session.json']);
    expect(persisted.status).toBe('IDLE');
    expect(persisted.project_name).toBe('TEST');
    expect(persisted.transition_status).toBe('IN_PROGRESS');
    expect(persisted.transition_target).toBe('ONBOARDING');
  });

  it('works on fresh file (no existing session)', () => {
    const store = createMockStore({});
    saveTransitionIntent(store, 'PHASE_1', '/new/session.json');

    const persisted = JSON.parse(store._files['/new/session.json']);
    expect(persisted.transition_status).toBe('IN_PROGRESS');
    expect(persisted.transition_target).toBe('PHASE_1');
  });

  it('handles corrupted existing file gracefully', () => {
    const store = createMockStore({ '/test/session.json': 'not json' });
    saveTransitionIntent(store, 'PHASE_2', '/test/session.json');

    const persisted = JSON.parse(store._files['/test/session.json']);
    expect(persisted.transition_status).toBe('IN_PROGRESS');
    expect(persisted.transition_target).toBe('PHASE_2');
  });
});

// ─────────────────────────────────────────────────────────────
// saveTransitionComplete
// ─────────────────────────────────────────────────────────────
describe('saveTransitionComplete', () => {
  it('writes COMPLETE and clears target/started_at', () => {
    const existing = {
      status: 'ONBOARDING',
      transition_status: 'IN_PROGRESS',
      transition_target: 'ONBOARDING',
      transition_started_at: '2026-03-15T10:00:00Z',
    };
    const store = createMockStore({ '/test/session.json': JSON.stringify(existing) });
    saveTransitionComplete(store, '/test/session.json');

    const persisted = JSON.parse(store._files['/test/session.json']);
    expect(persisted.transition_status).toBe('COMPLETE');
    expect(persisted.transition_target).toBeUndefined();
    expect(persisted.transition_started_at).toBeUndefined();
    expect(persisted.status).toBe('ONBOARDING');
  });

  it('works when no existing file', () => {
    const store = createMockStore({});
    saveTransitionComplete(store, '/test/session.json');

    const persisted = JSON.parse(store._files['/test/session.json']);
    expect(persisted.transition_status).toBe('COMPLETE');
  });

  it('handles corrupted existing file gracefully', () => {
    const store = createMockStore({ '/test/session.json': 'not json' });
    saveTransitionComplete(store, '/test/session.json');

    const persisted = JSON.parse(store._files['/test/session.json']);
    expect(persisted.transition_status).toBe('COMPLETE');
    expect(persisted.transition_target).toBeUndefined();
    expect(persisted.transition_started_at).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// Engine integration — write-ahead during advance()
// ─────────────────────────────────────────────────────────────
describe('Engine write-ahead — advance()', () => {
  it('session state has transition_status: COMPLETE after successful advance', () => {
    const sessionPath = '/test/session.json';
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });

    engine.advance(); // IDLE → ONBOARDING

    const persisted = JSON.parse(store._files[sessionPath]);
    expect(persisted.status).toBe('ONBOARDING');
    expect(persisted.transition_status).toBe('COMPLETE');
  });

  it('status() includes transitionStatus', () => {
    const sessionPath = '/test/session.json';
    const store = storeWithFlows();
    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });

    // Before any advance, transitionStatus is null
    expect(engine.status().transitionStatus).toBeNull();

    engine.advance(); // IDLE → ONBOARDING

    // After advance, transitionStatus is COMPLETE
    expect(engine.status().transitionStatus).toBe('COMPLETE');
  });

  it('write-ahead intent is written before SM transition', () => {
    const sessionPath = '/test/session.json';
    const store = storeWithFlows();
    const writes = [];

    // Track writes to capture intermediate states
    const originalWrite = store.writeFile.bind(store);
    store.writeFile = (fp, data) => {
      if (fp === sessionPath) {
        writes.push(JSON.parse(data));
      }
      originalWrite(fp, data);
    };

    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });
    engine.advance(); // IDLE → ONBOARDING

    // First write should be the intent (IN_PROGRESS)
    expect(writes.length).toBeGreaterThanOrEqual(2);
    const intentWrite = writes.find(
      (w) => w.transition_status === 'IN_PROGRESS' && w.transition_target === 'ONBOARDING'
    );
    expect(intentWrite).toBeDefined();

    // Last write should be COMPLETE
    const lastWrite = writes[writes.length - 1];
    expect(lastWrite.transition_status).toBe('COMPLETE');
  });

  it('transition_status preserved through SM auto-persist merge', () => {
    const sessionPath = '/test/session.json';
    const store = storeWithFlows();
    const writes = [];

    const originalWrite = store.writeFile.bind(store);
    store.writeFile = (fp, data) => {
      if (fp === sessionPath) {
        writes.push(JSON.parse(data));
      }
      originalWrite(fp, data);
    };

    const engine = createEngine({ store, flowsPath: FLOWS_PATH, sessionPath });
    engine.advance();

    // The auto-persist write (middle write) should preserve transition_status
    // from the intent write
    const autoPersistedWrites = writes.filter(
      (w) => w.status === 'ONBOARDING' && w.transition_status === 'IN_PROGRESS'
    );
    expect(autoPersistedWrites.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────
// Engine integration — resume with IN_PROGRESS
// ─────────────────────────────────────────────────────────────
describe('Engine write-ahead — crash recovery', () => {
  it('detects IN_PROGRESS on resume', () => {
    const sessionPath = '/test/session.json';
    const sessionState = {
      status: 'PHASE_2',
      mode: 'CREATE',
      transition_status: 'IN_PROGRESS',
      transition_target: 'PHASE_2',
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

    // Engine resumes at PHASE_2
    expect(engine.status().state).toBe('PHASE_2');
    // transitionStatus reflects the IN_PROGRESS from disk
    expect(engine.status().transitionStatus).toBe('IN_PROGRESS');
  });

  it('COMPLETE status on resume means clean state', () => {
    const sessionPath = '/test/session.json';
    const sessionState = {
      status: 'PHASE_2',
      mode: 'CREATE',
      transition_status: 'COMPLETE',
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
    expect(engine.status().transitionStatus).toBe('COMPLETE');
  });

  it('ignores corrupt transition_status marker on resume', () => {
    const sessionPath = '/test/session.json';
    const sessionState = {
      status: 'PHASE_2',
      mode: 'CREATE',
      transition_status: 'CORRUPTED_MARKER',
      transition_target: 'PHASE_3',
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
    expect(engine.status().transitionStatus).toBeNull();
  });
});
