'use strict';

/**
 * State Persistence — Unit Tests (FEAT-05-A / AC-1, AC-7)
 *
 * Covers:
 * - loadSessionState: disk read + parse + validation
 * - saveSessionState: merge + write
 * - createAutoPersist: auto-save on transition/error
 */

const _path = require('path');
const {
  _DEFAULT_SESSION_FILE,
  loadSessionState,
  saveSessionState,
  createAutoPersist,
  saveRunHistory,
  loadRunHistory,
} = require('../../platform/engine/state-persistence');

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
    // Expose for assertions
    _files,
  };
}

// ─────────────────────────────────────────────────────────────
// loadSessionState
// ─────────────────────────────────────────────────────────────
describe('loadSessionState', () => {
  it('returns null when file does not exist', () => {
    const store = createMockStore({});
    expect(loadSessionState(store, '/no/file.json')).toBeNull();
  });

  it('returns null when file is invalid JSON', () => {
    const store = createMockStore({ '/bad.json': 'not json' });
    expect(loadSessionState(store, '/bad.json')).toBeNull();
  });

  it('returns null when status field is missing', () => {
    const store = createMockStore({ '/no-status.json': '{"mode":"CREATE"}' });
    expect(loadSessionState(store, '/no-status.json')).toBeNull();
  });

  it('loads a valid session state', () => {
    const state = {
      status: 'PHASE_2',
      mode: 'CREATE',
      state_history: [{ from: 'PHASE_1', to: 'PHASE_2', timestamp: '2026-01-01T00:00:00Z' }],
    };
    const store = createMockStore({ '/session.json': JSON.stringify(state) });
    const result = loadSessionState(store, '/session.json');
    expect(result).toEqual(state);
  });

  it('uses default path when not specified', () => {
    const store = createMockStore({});
    // Should not throw, just return null
    expect(loadSessionState(store)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// saveSessionState
// ─────────────────────────────────────────────────────────────
describe('saveSessionState', () => {
  it('writes serialized state to disk', () => {
    const store = createMockStore({});
    const serialized = {
      status: 'PHASE_1',
      mode: 'CREATE',
      state_history: [],
      gate_results: {},
      last_updated: '2026-01-01T00:00:00Z',
    };
    saveSessionState(store, serialized, '/test/session.json');

    const written = JSON.parse(store._files['/test/session.json']);
    expect(written.status).toBe('PHASE_1');
    expect(written.mode).toBe('CREATE');
  });

  it('merges with existing non-engine fields', () => {
    const existing = {
      schema_version: '1.0',
      session_id: 'test-session',
      project_name: 'TEST',
      status: 'IDLE',
      mode: 'CREATE',
      phase_outputs: { onboarding: 'some-file.md' },
    };
    const store = createMockStore({ '/s.json': JSON.stringify(existing) });

    saveSessionState(
      store,
      {
        status: 'PHASE_1',
        mode: 'CREATE',
        state_history: [{ from: 'IDLE', to: 'PHASE_1' }],
        gate_results: {},
        last_updated: '2026-01-01T00:00:00Z',
      },
      '/s.json'
    );

    const written = JSON.parse(store._files['/s.json']);
    expect(written.status).toBe('PHASE_1');
    expect(written.project_name).toBe('TEST');
    expect(written.phase_outputs.onboarding).toBe('some-file.md');
    expect(written.state_history).toHaveLength(1);
  });

  it('handles corrupted existing file gracefully', () => {
    const store = createMockStore({ '/bad.json': 'not json{{{' });
    const serialized = {
      status: 'IDLE',
      mode: 'CREATE',
      state_history: [],
      gate_results: {},
      last_updated: '2026-01-01T00:00:00Z',
    };
    // Should not throw
    saveSessionState(store, serialized, '/bad.json');
    const written = JSON.parse(store._files['/bad.json']);
    expect(written.status).toBe('IDLE');
  });
});

// ─────────────────────────────────────────────────────────────
// createAutoPersist
// ─────────────────────────────────────────────────────────────
describe('createAutoPersist', () => {
  it('persists on transition callback', () => {
    const store = createMockStore({});
    const mockMachine = {
      serialize: () => ({
        status: 'PHASE_1',
        mode: 'CREATE',
        state_history: [],
        gate_results: {},
        last_updated: '2026-01-01T00:00:00Z',
      }),
    };

    const callbacks = createAutoPersist(store, () => mockMachine, '/auto.json');
    callbacks.onTransition({ event: 'transition', from: 'IDLE', to: 'PHASE_1' });

    const written = JSON.parse(store._files['/auto.json']);
    expect(written.status).toBe('PHASE_1');
  });

  it('persists on error callback', () => {
    const store = createMockStore({});
    const mockMachine = {
      serialize: () => ({
        status: 'ERROR',
        mode: 'CREATE',
        state_history: [],
        gate_results: {},
        last_updated: '2026-01-01T00:00:00Z',
      }),
    };

    const callbacks = createAutoPersist(store, () => mockMachine, '/auto.json');
    callbacks.onError({ event: 'error', reason: 'test' });

    const written = JSON.parse(store._files['/auto.json']);
    expect(written.status).toBe('ERROR');
  });

  it('calls onPersist callback after saving', () => {
    const store = createMockStore({});
    const persisted = [];
    const mockMachine = {
      serialize: () => ({
        status: 'PHASE_1',
        mode: 'CREATE',
        state_history: [],
        gate_results: {},
        last_updated: 'ts',
      }),
    };

    const callbacks = createAutoPersist(
      store,
      () => mockMachine,
      '/auto.json',
      (s) => persisted.push(s)
    );
    callbacks.onTransition({});
    expect(persisted).toHaveLength(1);
    expect(persisted[0].status).toBe('PHASE_1');
  });

  it('does nothing when getStateMachine returns null', () => {
    const store = createMockStore({});
    const callbacks = createAutoPersist(store, () => null, '/auto.json');
    // Should not throw
    callbacks.onTransition({});
    expect(store._files['/auto.json']).toBeUndefined();
  });
});

// ─── saveRunHistory ──────────────────────────────────────────

describe('saveRunHistory', () => {
  it('creates a new history file with one entry', () => {
    const store = createMockStore({});
    const entry = { mode: 'CREATE', status: 'COMPLETED', started_at: 't1', ended_at: 't2' };
    saveRunHistory(store, entry, '/hist.json');
    const data = JSON.parse(store._files['/hist.json']);
    expect(data).toHaveLength(1);
    expect(data[0].mode).toBe('CREATE');
  });

  it('appends to existing history', () => {
    const store = createMockStore({
      '/hist.json': JSON.stringify([{ mode: 'AUDIT', status: 'COMPLETED' }]),
    });
    saveRunHistory(store, { mode: 'CREATE', status: 'STOPPED' }, '/hist.json');
    const data = JSON.parse(store._files['/hist.json']);
    expect(data).toHaveLength(2);
    expect(data[1].status).toBe('STOPPED');
  });

  it('caps history at 50 entries (FIFO)', () => {
    const existing = Array.from({ length: 50 }, (_, i) => ({ id: i }));
    const store = createMockStore({ '/hist.json': JSON.stringify(existing) });
    saveRunHistory(store, { id: 50 }, '/hist.json');
    const data = JSON.parse(store._files['/hist.json']);
    expect(data).toHaveLength(50);
    expect(data[0].id).toBe(1); // oldest dropped
    expect(data[49].id).toBe(50);
  });

  it('recovers from corrupt JSON in existing file', () => {
    const store = createMockStore({ '/hist.json': '{bad' });
    saveRunHistory(store, { mode: 'CREATE' }, '/hist.json');
    const data = JSON.parse(store._files['/hist.json']);
    expect(data).toHaveLength(1);
  });

  it('recovers when existing file is not an array', () => {
    const store = createMockStore({ '/hist.json': JSON.stringify({ notArray: true }) });
    saveRunHistory(store, { mode: 'CREATE' }, '/hist.json');
    const data = JSON.parse(store._files['/hist.json']);
    expect(data).toHaveLength(1);
  });
});

// ─── loadRunHistory ──────────────────────────────────────────

describe('loadRunHistory', () => {
  it('returns empty array when file does not exist', () => {
    const store = createMockStore({});
    expect(loadRunHistory(store, '/hist.json')).toEqual([]);
  });

  it('loads valid history', () => {
    const runs = [{ mode: 'CREATE' }, { mode: 'AUDIT' }];
    const store = createMockStore({ '/hist.json': JSON.stringify(runs) });
    expect(loadRunHistory(store, '/hist.json')).toHaveLength(2);
  });

  it('returns empty array for corrupt JSON', () => {
    const store = createMockStore({ '/hist.json': 'invalid' });
    expect(loadRunHistory(store, '/hist.json')).toEqual([]);
  });

  it('returns empty array when file contains non-array', () => {
    const store = createMockStore({ '/hist.json': JSON.stringify({ obj: true }) });
    expect(loadRunHistory(store, '/hist.json')).toEqual([]);
  });
});
