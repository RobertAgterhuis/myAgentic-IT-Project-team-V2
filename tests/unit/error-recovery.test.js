'use strict';

/**
 * Error Recovery & Long-Running Support — Unit Tests (M5)
 *
 * Covers:
 * - Error classification (TRANSIENT / RECOVERABLE / FATAL)
 * - Exponential backoff timing
 * - Retry cap → FATAL escalation
 * - RECOVERABLE → degraded result
 * - --single-step processes exactly one state
 * - Clean pause writes checkpoint
 * - Degradation log entries
 */

const { Dispatcher, ErrorSeverity } = require('../../platform/engine/dispatcher');
const { addDegradationEntry } = require('../../platform/engine/state-persistence');
const { parseArgs, executeCommand } = require('../../platform/engine/cli');

// ─── Test Helpers ────────────────────────────────────────────

function createMockStore(files = {}) {
  return {
    exists: (fp) => fp in files,
    read: (fp) => files[fp] || '',
    readFile: (fp) => files[fp] || '',
    write: (fp, content) => {
      files[fp] = content;
    },
    writeFile: (fp, content) => {
      files[fp] = content;
    },
    mkdirp: () => {},
    _files: files,
  };
}

// ─────────────────────────────────────────────────────────────
// Error Classification
// ─────────────────────────────────────────────────────────────
describe('Error Classification (M5 #360)', () => {
  it('classifies TIMEOUT as TRANSIENT', () => {
    expect(Dispatcher.classifyError({ message: 'TIMEOUT' })).toBe(ErrorSeverity.TRANSIENT);
  });

  it('classifies network errors as TRANSIENT', () => {
    expect(Dispatcher.classifyError({ message: 'ECONNRESET' })).toBe(ErrorSeverity.TRANSIENT);
    expect(Dispatcher.classifyError({ message: 'ECONNREFUSED' })).toBe(ErrorSeverity.TRANSIENT);
    expect(Dispatcher.classifyError({ message: 'ETIMEDOUT' })).toBe(ErrorSeverity.TRANSIENT);
    expect(Dispatcher.classifyError({ message: 'network error' })).toBe(ErrorSeverity.TRANSIENT);
  });

  it('classifies rate limit / 429 / 503 as TRANSIENT', () => {
    expect(Dispatcher.classifyError({ message: 'rate limit exceeded' })).toBe(
      ErrorSeverity.TRANSIENT
    );
    expect(Dispatcher.classifyError({ message: 'HTTP 429 Too Many Requests' })).toBe(
      ErrorSeverity.TRANSIENT
    );
    expect(Dispatcher.classifyError({ message: 'HTTP 503 Service Unavailable' })).toBe(
      ErrorSeverity.TRANSIENT
    );
  });

  it('classifies authentication failures as FATAL', () => {
    expect(Dispatcher.classifyError({ message: 'authentication failed' })).toBe(
      ErrorSeverity.FATAL
    );
    expect(Dispatcher.classifyError({ message: 'authorization failure' })).toBe(
      ErrorSeverity.FATAL
    );
    expect(Dispatcher.classifyError({ message: 'HTTP 401 Unauthorized' })).toBe(
      ErrorSeverity.FATAL
    );
    expect(Dispatcher.classifyError({ message: 'HTTP 403 Forbidden' })).toBe(ErrorSeverity.FATAL);
  });

  it('classifies state corruption as FATAL', () => {
    expect(Dispatcher.classifyError({ message: 'state corrupted' })).toBe(ErrorSeverity.FATAL);
    expect(Dispatcher.classifyError({ message: 'contract violation: missing field' })).toBe(
      ErrorSeverity.FATAL
    );
  });

  it('classifies unknown errors as RECOVERABLE', () => {
    expect(Dispatcher.classifyError({ message: 'Something unexpected' })).toBe(
      ErrorSeverity.RECOVERABLE
    );
    expect(Dispatcher.classifyError({ message: '' })).toBe(ErrorSeverity.RECOVERABLE);
  });
});

// ─────────────────────────────────────────────────────────────
// Exponential Backoff
// ─────────────────────────────────────────────────────────────
describe('Exponential Backoff (M5 #361)', () => {
  it('retries transient errors with exponential backoff timing', async () => {
    const delays = [];
    let callCount = 0;
    const store = createMockStore();
    const dispatcher = new Dispatcher({
      store,
      config: { maxTransientRetries: 3, backoffBaseMs: 100, backoffCapMs: 5000 },
      invoker: async () => {
        callCount++;
        throw new Error('ECONNRESET');
      },
    });
    // Override _delay to capture timing
    dispatcher._delay = (ms) => {
      delays.push(ms);
      return Promise.resolve();
    };

    const result = await dispatcher.invoke({ id: '01', name: 'Test Agent' }, 'PHASE_1', {});

    expect(result.success).toBe(false);
    expect(result.severity).toBe(ErrorSeverity.FATAL); // escalated after retries
    expect(callCount).toBe(4); // 1 initial + 3 retries
    // Backoff: 100*2^0=100, 100*2^1=200, 100*2^2=400
    expect(delays).toEqual([100, 200, 400]);
  });

  it('caps backoff delay at backoffCapMs', async () => {
    const delays = [];
    const store = createMockStore();
    const dispatcher = new Dispatcher({
      store,
      config: { maxTransientRetries: 3, backoffBaseMs: 1000, backoffCapMs: 2000 },
      invoker: async () => {
        throw new Error('TIMEOUT');
      },
    });
    dispatcher._delay = (ms) => {
      delays.push(ms);
      return Promise.resolve();
    };

    await dispatcher.invoke({ id: '01', name: 'Test' }, 'PHASE_1', {});

    // 1000*2^0=1000, 1000*2^1=2000, 1000*2^2=4000→capped at 2000
    expect(delays).toEqual([1000, 2000, 2000]);
  });

  it('retry cap triggers FATAL escalation', async () => {
    const store = createMockStore();
    const dispatcher = new Dispatcher({
      store,
      config: { maxTransientRetries: 3, backoffBaseMs: 1, backoffCapMs: 10 },
      invoker: async () => {
        throw new Error('ECONNREFUSED');
      },
    });
    dispatcher._delay = () => Promise.resolve();

    const result = await dispatcher.invoke({ id: '01', name: 'Test' }, 'PHASE_1', {});

    expect(result.success).toBe(false);
    expect(result.severity).toBe(ErrorSeverity.FATAL);
  });
});

// ─────────────────────────────────────────────────────────────
// RECOVERABLE → Degraded State
// ─────────────────────────────────────────────────────────────
describe('Recoverable Errors → Degraded (M5 #360/#362)', () => {
  it('recoverable errors return degraded flag', async () => {
    const store = createMockStore();
    const dispatcher = new Dispatcher({
      store,
      config: { maxTransientRetries: 3, backoffBaseMs: 1, backoffCapMs: 10 },
      invoker: async () => {
        throw new Error('Something unexpected happened');
      },
    });

    const result = await dispatcher.invoke({ id: '01', name: 'Test' }, 'PHASE_1', {});

    expect(result.success).toBe(false);
    expect(result.severity).toBe(ErrorSeverity.RECOVERABLE);
    expect(result.degraded).toBe(true);
  });

  it('FATAL errors do not produce degraded flag', async () => {
    const store = createMockStore();
    const dispatcher = new Dispatcher({
      store,
      config: { maxTransientRetries: 3, backoffBaseMs: 1, backoffCapMs: 10 },
      invoker: async () => {
        throw new Error('authentication failed');
      },
    });

    const result = await dispatcher.invoke({ id: '01', name: 'Test' }, 'PHASE_1', {});

    expect(result.success).toBe(false);
    expect(result.severity).toBe(ErrorSeverity.FATAL);
    expect(result.degraded).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// Degradation Log in Session State
// ─────────────────────────────────────────────────────────────
describe('Degradation Log (M5 #362)', () => {
  it('adds degradation entry to session state', () => {
    const files = {};
    const store = createMockStore(files);

    addDegradationEntry(
      store,
      { component: 'Agent-01', reason: 'Non-critical agent failed' },
      '/tmp/session.json'
    );

    const state = JSON.parse(files['/tmp/session.json']);
    expect(state.degradation_log).toHaveLength(1);
    expect(state.degradation_log[0].component).toBe('Agent-01');
    expect(state.degradation_log[0].reason).toBe('Non-critical agent failed');
    expect(state.degradation_log[0].timestamp).toBeDefined();
  });

  it('appends multiple degradation entries', () => {
    const files = {};
    const store = createMockStore(files);

    addDegradationEntry(store, { component: 'Agent-01', reason: 'First' }, '/tmp/session.json');
    addDegradationEntry(
      store,
      { component: 'Agent-02', reason: 'Second', state: 'PHASE_2' },
      '/tmp/session.json'
    );

    const state = JSON.parse(files['/tmp/session.json']);
    expect(state.degradation_log).toHaveLength(2);
    expect(state.degradation_log[1].state).toBe('PHASE_2');
  });

  it('preserves existing session state fields', () => {
    const files = {
      '/tmp/session.json': JSON.stringify({ status: 'PHASE_1', mode: 'CREATE' }),
    };
    const store = createMockStore(files);

    addDegradationEntry(store, { component: 'Agent-01', reason: 'Test' }, '/tmp/session.json');

    const state = JSON.parse(files['/tmp/session.json']);
    expect(state.status).toBe('PHASE_1');
    expect(state.mode).toBe('CREATE');
    expect(state.degradation_log).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────
// --single-step CLI flag
// ─────────────────────────────────────────────────────────────
describe('--single-step CLI flag (M5 #363)', () => {
  it('parses --single-step flag', () => {
    const parsed = parseArgs(['create', 'myproject', '--single-step']);
    expect(parsed.singleStep).toBe(true);
    expect(parsed.command).toBe('CREATE');
    expect(parsed.project).toBe('myproject');
  });

  it('--single-step processes one transition via executeCommand', () => {
    let advanceCalled = 0;
    const mockEngine = {
      reset: () => {},
      advance: () => {
        advanceCalled++;
        return { from: 'IDLE', to: 'ONBOARDING', timestamp: new Date().toISOString() };
      },
      status: () => ({ state: 'ONBOARDING', mode: 'CREATE' }),
    };
    const output = [];
    const parsed = parseArgs(['create', 'myproject', '--single-step']);
    const result = executeCommand(mockEngine, parsed, { write: (m) => output.push(m) });

    expect(result.ok).toBe(true);
    expect(result.singleStep).toBe(true);
    expect(advanceCalled).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// Clean Pause with Checkpoint
// ─────────────────────────────────────────────────────────────
describe('Clean Pause / Checkpoint (M5 #363)', () => {
  it('parses --checkpoint flag', () => {
    const parsed = parseArgs(['stop', '--checkpoint']);
    expect(parsed.checkpoint).toBe(true);
    expect(parsed.command).toBe('_STOP');
  });

  it('stop --checkpoint calls pauseAtCheckpoint', () => {
    let pauseCalled = false;
    const mockEngine = {
      stop: () => ({ state: 'ERROR', mode: 'CREATE' }),
      pauseAtCheckpoint: () => {
        pauseCalled = true;
        return { state: 'PHASE_1', mode: 'CREATE' };
      },
      status: () => ({ state: 'PHASE_1', mode: 'CREATE' }),
    };
    const output = [];
    const parsed = parseArgs(['stop', '--checkpoint']);
    executeCommand(mockEngine, parsed, { write: (m) => output.push(m) });

    expect(pauseCalled).toBe(true);
    const responseData = JSON.parse(output[0]);
    expect(responseData.checkpoint).toBe(true);
  });

  it('stop without --checkpoint calls regular stop', () => {
    let stopCalled = false;
    const mockEngine = {
      stop: () => {
        stopCalled = true;
        return { state: 'ERROR', mode: 'CREATE' };
      },
      pauseAtCheckpoint: () => ({ state: 'PHASE_1' }),
      status: () => ({}),
    };
    const output = [];
    const parsed = parseArgs(['stop']);
    executeCommand(mockEngine, parsed, { write: (m) => output.push(m) });

    expect(stopCalled).toBe(true);
  });
});
