'use strict';

/**
 * State Machine Engine — Unit Tests (FEAT-05-A / SP-5-ORCH-A)
 *
 * Covers:
 * - AC-1: State machine reads flow and manages current state
 * - AC-2: All states present (ONBOARDING → … → PHASE_5_SPRINT_N)
 * - AC-3: Transition guards (gate conditions)
 * - AC-4: Command variants (CREATE, AUDIT, FEATURE, SCOPE CHANGE, HOTFIX)
 * - AC-5: Partial/combination execution
 * - AC-6: Event-driven (emits events on state transitions)
 * - AC-7: Crash recovery (resumes from last committed state)
 * - AC-8: Unit tests for all transitions and edge cases
 */

const {
  STATES,
  EVENTS,
  MODE_CONFIGS,
  FLOW_SOURCE_ENV,
  LEGACY_FLOW_VERSION,
  VALID_STATES,
  StateMachine,
  buildTransitionMap,
  createStateMachine,
  createCombinationMachine,
  createHotfixMachine,
} = require('../../platform/engine/state-machine');

// ─────────────────────────────────────────────────────────────
// AC-2: State definitions
// ─────────────────────────────────────────────────────────────
describe('STATES — state definitions', () => {
  it('contains all required states', () => {
    const required = [
      'IDLE',
      'ONBOARDING',
      'PHASE_1',
      'CRITIC_1',
      'PHASE_2',
      'CRITIC_2',
      'PHASE_3',
      'CRITIC_3',
      'PHASE_4',
      'CRITIC_4',
      'SYNTHESIS',
      'SPRINT_GATE',
      'PHASE_5_EXECUTING',
      'COMPLETED',
      'ERROR',
    ];
    for (const s of required) {
      expect(STATES).toHaveProperty(s);
    }
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(STATES)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// AC-1: Full CREATE flow — transition table
// ─────────────────────────────────────────────────────────────
describe('buildTransitionMap — full flow', () => {
  const map = buildTransitionMap(['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4']);

  it('IDLE → ONBOARDING', () => {
    expect(map.get('IDLE')).toBe('ONBOARDING');
  });

  it('ONBOARDING → PHASE_1', () => {
    expect(map.get('ONBOARDING')).toBe('PHASE_1');
  });

  it('walks the full chain to COMPLETED', () => {
    let current = 'IDLE';
    const visited = [current];
    while (map.has(current)) {
      current = map.get(current);
      visited.push(current);
    }
    expect(visited[0]).toBe('IDLE');
    expect(visited[visited.length - 1]).toBe('COMPLETED');
    expect(visited.length).toBe(14); // 14 states in full flow
  });
});

// ─────────────────────────────────────────────────────────────
// AC-5: Partial/combination flows
// ─────────────────────────────────────────────────────────────
describe('buildTransitionMap — partial flows', () => {
  it('TECH-only flow skips PHASE_1, PHASE_3, PHASE_4', () => {
    const map = buildTransitionMap(['PHASE_2']);
    let current = 'IDLE';
    const visited = [current];
    while (map.has(current)) {
      current = map.get(current);
      visited.push(current);
    }
    expect(visited).not.toContain('PHASE_1');
    expect(visited).not.toContain('CRITIC_1');
    expect(visited).toContain('PHASE_2');
    expect(visited).toContain('CRITIC_2');
    expect(visited).not.toContain('PHASE_3');
    expect(visited).not.toContain('PHASE_4');
    expect(visited[visited.length - 1]).toBe('COMPLETED');
  });

  it('TECH + UX combo includes PHASE_2, CRITIC_2, PHASE_3, CRITIC_3', () => {
    const map = buildTransitionMap(['PHASE_2', 'PHASE_3']);
    let current = 'IDLE';
    const visited = [current];
    while (map.has(current)) {
      current = map.get(current);
      visited.push(current);
    }
    expect(visited).toContain('PHASE_2');
    expect(visited).toContain('CRITIC_2');
    expect(visited).toContain('PHASE_3');
    expect(visited).toContain('CRITIC_3');
    expect(visited).not.toContain('PHASE_1');
    expect(visited).not.toContain('PHASE_4');
  });
});

// ─────────────────────────────────────────────────────────────
// AC-1, AC-6: StateMachine — basic operation + events
// ─────────────────────────────────────────────────────────────
describe('StateMachine — full CREATE cycle', () => {
  let events;
  let sm;

  beforeEach(() => {
    events = [];
    sm = createStateMachine('CREATE', null, {
      onTransition: (e) => events.push(e),
      onError: (e) => events.push(e),
    });
  });

  it('starts in IDLE state', () => {
    expect(sm.state).toBe(STATES.IDLE);
  });

  it('reports correct mode', () => {
    expect(sm.mode).toBe('CREATE');
  });

  it('advance() moves to next state', () => {
    const result = sm.advance();
    expect(result.from).toBe('IDLE');
    expect(result.to).toBe('ONBOARDING');
    expect(sm.state).toBe('ONBOARDING');
  });

  it('emits TRANSITION event on advance', () => {
    sm.advance();
    expect(events.length).toBe(1);
    expect(events[0].event).toBe(EVENTS.TRANSITION);
    expect(events[0].from).toBe('IDLE');
    expect(events[0].to).toBe('ONBOARDING');
  });

  it('nextState returns the upcoming state', () => {
    expect(sm.nextState).toBe('ONBOARDING');
    sm.advance();
    expect(sm.nextState).toBe('PHASE_1');
  });

  it('can walk the entire flow to COMPLETED', () => {
    const visited = [];
    while (sm.nextState) {
      visited.push(sm.state);
      sm.advance();
    }
    visited.push(sm.state);
    expect(visited[0]).toBe('IDLE');
    expect(visited[visited.length - 1]).toBe('COMPLETED');
  });

  it('history tracks all transitions', () => {
    sm.advance(); // IDLE → ONBOARDING
    sm.advance(); // ONBOARDING → PHASE_1
    const history = sm.history;
    expect(history.length).toBe(2);
    expect(history[0].from).toBe('IDLE');
    expect(history[1].to).toBe('PHASE_1');
  });

  it('history returns a copy (not mutable reference)', () => {
    sm.advance();
    const h1 = sm.history;
    const h2 = sm.history;
    expect(h1).not.toBe(h2);
    expect(h1).toEqual(h2);
  });
});

// ─────────────────────────────────────────────────────────────
// AC-3: Transition guards (gate checks)
// ─────────────────────────────────────────────────────────────
describe('StateMachine — transition guards', () => {
  let sm;

  beforeEach(() => {
    sm = createStateMachine('CREATE');
  });

  it('canTransition returns true for valid next state', () => {
    expect(sm.canTransition('ONBOARDING')).toBe(true);
  });

  it('canTransition returns false for invalid state', () => {
    expect(sm.canTransition('PHASE_3')).toBe(false);
  });

  it('canTransition returns false when COMPLETED', () => {
    // Walk to COMPLETED
    while (sm.nextState) sm.advance();
    expect(sm.state).toBe('COMPLETED');
    expect(sm.canTransition('IDLE')).toBe(false);
  });

  it('canTransition returns false when in ERROR', () => {
    sm.error('test failure');
    expect(sm.canTransition('ONBOARDING')).toBe(false);
  });

  it('throws when advancing from COMPLETED', () => {
    while (sm.nextState) sm.advance();
    expect(() => sm.advance()).toThrow(/Pipeline is complete/);
  });

  it('gate failure at CRITIC prevents advance', () => {
    // Walk to CRITIC_1
    while (sm.state !== 'CRITIC_1') sm.advance();
    expect(sm.state).toBe('CRITIC_1');

    // Advance with failing gate
    expect(() => sm.advance({ verdict: 'REJECTED', reason: 'Missing deliverables' })).toThrow(
      /Gate failed at CRITIC_1/
    );
  });

  it('gate pass at CRITIC allows advance', () => {
    while (sm.state !== 'CRITIC_1') sm.advance();
    const result = sm.advance({ verdict: 'APPROVED' });
    expect(result.to).toBe('PHASE_2');
  });
});

// ─────────────────────────────────────────────────────────────
// AC-6: Event emission
// ─────────────────────────────────────────────────────────────
describe('StateMachine — event emission', () => {
  it('emits gate_passed event on successful gate', () => {
    const events = [];
    const sm = createStateMachine('CREATE', null, {
      onTransition: (e) => events.push(e),
    });
    while (sm.state !== 'CRITIC_1') sm.advance();
    sm.advance({ verdict: 'APPROVED' });

    const gatePassed = events.find((e) => e.event === EVENTS.GATE_PASSED);
    expect(gatePassed).toBeDefined();
    expect(gatePassed.state).toBe('CRITIC_1');
  });

  it('emits gate_failed event on failed gate', () => {
    const events = [];
    const sm = createStateMachine('CREATE', null, {
      onTransition: (e) => events.push(e),
      onError: (e) => events.push(e),
    });
    while (sm.state !== 'CRITIC_1') sm.advance();
    try {
      sm.advance({ verdict: 'REJECTED', reason: 'bad' });
    } catch {
      // expected
    }
    const gateFailed = events.find((e) => e.event === EVENTS.GATE_FAILED);
    expect(gateFailed).toBeDefined();
  });

  it('emits ERROR event on error()', () => {
    const errors = [];
    const sm = createStateMachine('CREATE', null, {
      onError: (e) => errors.push(e),
    });
    sm.advance();
    sm.error('agent crashed');
    expect(errors.length).toBe(1);
    expect(errors[0].reason).toBe('agent crashed');
  });
});

// ─────────────────────────────────────────────────────────────
// AC-7: Crash recovery
// ─────────────────────────────────────────────────────────────
describe('StateMachine — crash recovery', () => {
  it('recovers from serialized session state', () => {
    const events = [];
    const sessionState = {
      status: 'PHASE_2',
      state_history: [
        { from: 'IDLE', to: 'ONBOARDING', timestamp: '2026-01-01T00:00:00Z' },
        { from: 'ONBOARDING', to: 'PHASE_1', timestamp: '2026-01-01T01:00:00Z' },
        { from: 'PHASE_1', to: 'CRITIC_1', timestamp: '2026-01-01T02:00:00Z' },
        { from: 'CRITIC_1', to: 'PHASE_2', timestamp: '2026-01-01T03:00:00Z' },
      ],
    };
    const sm = createStateMachine('CREATE', sessionState, {
      onTransition: (e) => events.push(e),
    });

    expect(sm.state).toBe('PHASE_2');
    expect(sm.history.length).toBe(4);

    // Verify crash_recovery event was emitted
    const recovery = events.find((e) => e.event === EVENTS.CRASH_RECOVERY);
    expect(recovery).toBeDefined();
    expect(recovery.recoveredState).toBe('PHASE_2');
  });

  it('can continue from recovered state', () => {
    const sm = createStateMachine('CREATE', { status: 'PHASE_3' });
    expect(sm.state).toBe('PHASE_3');
    const result = sm.advance();
    expect(result.to).toBe('CRITIC_3');
  });

  it('recover() returns to last good state from ERROR', () => {
    const sm = createStateMachine('CREATE');
    sm.advance(); // IDLE → ONBOARDING
    sm.advance(); // ONBOARDING → PHASE_1
    sm.error('agent crashed');
    expect(sm.state).toBe('ERROR');

    const recovered = sm.recover();
    expect(recovered).toBe('PHASE_1');
    expect(sm.state).toBe('PHASE_1');
  });

  it('recover() throws if not in ERROR state', () => {
    const sm = createStateMachine('CREATE');
    expect(() => sm.recover()).toThrow(/Can only recover from ERROR state/);
  });

  it('recover() falls back to IDLE if no history', () => {
    const sm = new StateMachine({ mode: 'CREATE' });
    // Manually set to ERROR without history
    sm.error('immediate failure');
    // History has one entry: from IDLE to ERROR
    const recovered = sm.recover();
    expect(recovered).toBe('IDLE');
  });
});

// ─────────────────────────────────────────────────────────────
// ERROR state handling
// ─────────────────────────────────────────────────────────────
describe('StateMachine — error state', () => {
  it('error() sets state to ERROR', () => {
    const sm = createStateMachine('CREATE');
    sm.advance();
    sm.error('something broke');
    expect(sm.state).toBe('ERROR');
  });

  it('ERROR state records reason in history', () => {
    const sm = createStateMachine('CREATE');
    sm.advance();
    sm.error('agent timeout');
    const last = sm.history[sm.history.length - 1];
    expect(last.to).toBe('ERROR');
    expect(last.reason).toBe('agent timeout');
  });

  it('cannot advance from ERROR', () => {
    const sm = createStateMachine('CREATE');
    sm.advance();
    sm.error('broke');
    expect(() => sm.advance()).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// Serialization
// ─────────────────────────────────────────────────────────────
describe('StateMachine — serialize()', () => {
  it('produces a JSON-serializable object', () => {
    const sm = createStateMachine('CREATE');
    sm.advance();
    sm.advance();
    const data = sm.serialize();
    expect(data.status).toBe('PHASE_1');
    expect(data.mode).toBe('CREATE');
    expect(data.state_history.length).toBe(2);
    expect(typeof data.last_updated).toBe('string');

    // Ensure it round-trips through JSON
    const json = JSON.stringify(data);
    const parsed = JSON.parse(json);
    expect(parsed.status).toBe('PHASE_1');
  });

  it('includes gate results', () => {
    const sm = createStateMachine('CREATE');
    // Walk to CRITIC_1 and pass gate
    while (sm.state !== 'CRITIC_1') sm.advance();
    sm.advance({ verdict: 'APPROVED' });

    const data = sm.serialize();
    expect(data.gate_results).toHaveProperty('CRITIC_1');
    expect(data.gate_results.CRITIC_1.verdict).toBe('APPROVED');
  });

  it('includes flow version metadata for replay determinism', () => {
    const sm = createStateMachine('CREATE');
    const data = sm.serialize();
    expect(typeof data.flow_version).toBe('string');
    expect(typeof data.flow_source).toBe('string');
  });
});

describe('StateMachine — flow source compatibility', () => {
  const originalFlowSource = process.env[FLOW_SOURCE_ENV];

  afterEach(() => {
    if (typeof originalFlowSource === 'undefined') {
      delete process.env[FLOW_SOURCE_ENV];
    } else {
      process.env[FLOW_SOURCE_ENV] = originalFlowSource;
    }
  });

  it('defaults to legacy flow source when no feature flag is set', () => {
    delete process.env[FLOW_SOURCE_ENV];
    const sm = createStateMachine('CREATE');
    expect(sm.flowVersion).toBe(LEGACY_FLOW_VERSION);
    expect(sm.flowSource).toBe('legacy');
  });

  it('supports schema flow source via feature flag', () => {
    process.env[FLOW_SOURCE_ENV] = 'schema';
    const sm = createStateMachine('CREATE');
    expect(sm.flowSource).toBe('schema');
    expect(sm.flowVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('uses persisted flow version over current feature-flag source', () => {
    process.env[FLOW_SOURCE_ENV] = 'schema';
    const sm = createStateMachine('CREATE', { flow_version: LEGACY_FLOW_VERSION });
    expect(sm.flowSource).toBe('legacy');
    expect(sm.flowVersion).toBe(LEGACY_FLOW_VERSION);
  });

  it('throws actionable startup error for unknown persisted flow version', () => {
    expect(() => createStateMachine('CREATE', { flow_version: 'does-not-exist' })).toThrow(
      /Unknown flow version/
    );
  });
});

// ─────────────────────────────────────────────────────────────
// AC-4: Command variants
// ─────────────────────────────────────────────────────────────
describe('MODE_CONFIGS — command variants', () => {
  it('has all required modes', () => {
    const required = [
      'CREATE',
      'AUDIT',
      'CREATE_BUSINESS',
      'CREATE_TECH',
      'CREATE_UX',
      'CREATE_MARKETING',
      'FEATURE',
      'SCOPE_CHANGE',
      'HOTFIX',
    ];
    for (const m of required) {
      expect(MODE_CONFIGS).toHaveProperty(m);
    }
  });

  it('CREATE and AUDIT include all 4 phases', () => {
    expect(MODE_CONFIGS.CREATE.phases).toEqual(['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4']);
    expect(MODE_CONFIGS.AUDIT.phases).toEqual(['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4']);
  });

  it('partial modes include exactly one phase', () => {
    expect(MODE_CONFIGS.CREATE_BUSINESS.phases).toEqual(['PHASE_1']);
    expect(MODE_CONFIGS.CREATE_TECH.phases).toEqual(['PHASE_2']);
    expect(MODE_CONFIGS.CREATE_UX.phases).toEqual(['PHASE_3']);
    expect(MODE_CONFIGS.CREATE_MARKETING.phases).toEqual(['PHASE_4']);
  });
});

describe('createStateMachine — mode validation', () => {
  it('throws for unknown mode', () => {
    expect(() => createStateMachine('INVALID_MODE')).toThrow(/Unknown mode/);
  });

  it('works for AUDIT mode', () => {
    const sm = createStateMachine('AUDIT');
    expect(sm.mode).toBe('AUDIT');
    expect(sm.state).toBe('IDLE');
    sm.advance();
    expect(sm.state).toBe('ONBOARDING');
  });

  it('works for FEATURE mode', () => {
    const sm = createStateMachine('FEATURE');
    expect(sm.mode).toBe('FEATURE');
    // Full flow available
    expect(sm.nextState).toBe('ONBOARDING');
  });
});

// ─────────────────────────────────────────────────────────────
// AC-5: Combination machine
// ─────────────────────────────────────────────────────────────
describe('createCombinationMachine', () => {
  it('TECH + UX creates correct flow', () => {
    const sm = createCombinationMachine(['TECH', 'UX']);
    const visited = [];
    while (sm.nextState) {
      visited.push(sm.state);
      sm.advance();
    }
    visited.push(sm.state);

    expect(visited).toContain('PHASE_2');
    expect(visited).toContain('CRITIC_2');
    expect(visited).toContain('PHASE_3');
    expect(visited).toContain('CRITIC_3');
    expect(visited).not.toContain('PHASE_1');
    expect(visited).not.toContain('PHASE_4');
    expect(visited[visited.length - 1]).toBe('COMPLETED');
  });

  it('enforces canonical order regardless of input order', () => {
    const sm1 = createCombinationMachine(['UX', 'BUSINESS']);
    const sm2 = createCombinationMachine(['BUSINESS', 'UX']);

    // Both should have same flow
    const flow1 = [];
    const flow2 = [];
    while (sm1.nextState) {
      flow1.push(sm1.state);
      sm1.advance();
    }
    flow1.push(sm1.state);
    while (sm2.nextState) {
      flow2.push(sm2.state);
      sm2.advance();
    }
    flow2.push(sm2.state);

    expect(flow1).toEqual(flow2);
    // BUSINESS (PHASE_1) comes before UX (PHASE_3)
    const p1Idx = flow1.indexOf('PHASE_1');
    const p3Idx = flow1.indexOf('PHASE_3');
    expect(p1Idx).toBeLessThan(p3Idx);
  });

  it('supports 3-discipline combo', () => {
    const sm = createCombinationMachine(['TECH', 'UX', 'MARKETING']);
    const visited = [];
    while (sm.nextState) {
      visited.push(sm.state);
      sm.advance();
    }
    visited.push(sm.state);

    expect(visited).toContain('PHASE_2');
    expect(visited).toContain('PHASE_3');
    expect(visited).toContain('PHASE_4');
    expect(visited).not.toContain('PHASE_1');
  });
});

// ─────────────────────────────────────────────────────────────
// HOTFIX machine
// ─────────────────────────────────────────────────────────────
describe('createHotfixMachine', () => {
  it('creates a machine in IDLE state', () => {
    const sm = createHotfixMachine();
    expect(sm.state).toBe('IDLE');
    expect(sm.mode).toBe('HOTFIX');
  });

  it('HOTFIX flow bypasses design phases', () => {
    const sm = createHotfixMachine();
    const visited = [];
    while (sm.nextState) {
      visited.push(sm.state);
      sm.advance();
    }
    visited.push(sm.state);

    // Should NOT contain any PHASE_1-4
    expect(visited).not.toContain('PHASE_1');
    expect(visited).not.toContain('PHASE_2');
    expect(visited).not.toContain('PHASE_3');
    expect(visited).not.toContain('PHASE_4');
  });
});

// ─────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────
describe('StateMachine — edge cases', () => {
  it('nextState returns null when COMPLETED', () => {
    const sm = createStateMachine('CREATE');
    while (sm.nextState) sm.advance();
    expect(sm.nextState).toBeNull();
  });

  it('nextState returns null when in ERROR', () => {
    const sm = createStateMachine('CREATE');
    sm.error('fail');
    expect(sm.nextState).toBeNull();
  });

  it('multiple advance() calls track correct state', () => {
    const sm = createStateMachine('CREATE');
    sm.advance(); // → ONBOARDING
    sm.advance(); // → PHASE_1
    sm.advance(); // → CRITIC_1
    expect(sm.state).toBe('CRITIC_1');
    expect(sm.history.length).toBe(3);
  });

  it('IDLE session state initializes to IDLE', () => {
    const sm = createStateMachine('CREATE', { status: 'IDLE' });
    expect(sm.state).toBe('IDLE');
  });

  it('null session state initializes to IDLE', () => {
    const sm = createStateMachine('CREATE', null);
    expect(sm.state).toBe('IDLE');
  });
});

// ─────────────────────────────────────────────────────────────
// #170 Hardening: VALID_STATES set
// ─────────────────────────────────────────────────────────────
describe('VALID_STATES — validation set', () => {
  it('contains all STATES values', () => {
    for (const s of Object.values(STATES)) {
      expect(VALID_STATES.has(s)).toBe(true);
    }
  });

  it('does not contain unknown strings', () => {
    expect(VALID_STATES.has('BOGUS')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// #170 Hardening: corrupt session state
// ─────────────────────────────────────────────────────────────
describe('StateMachine — corrupt session state recovery', () => {
  it('falls back to IDLE on unknown status', () => {
    const errors = [];
    const sm = createStateMachine(
      'CREATE',
      { status: 'TOTALLY_BOGUS' },
      {
        onError: (e) => errors.push(e),
      }
    );
    expect(sm.state).toBe('IDLE');
    expect(errors.some((e) => /Corrupt session state/.test(e.reason))).toBe(true);
  });

  it('handles non-array state_history gracefully', () => {
    const sm = createStateMachine('CREATE', {
      status: 'PHASE_2',
      state_history: 'not-an-array',
    });
    expect(sm.state).toBe('PHASE_2');
    expect(sm.history).toEqual([]);
  });

  it('handles null state_history gracefully', () => {
    const sm = createStateMachine('CREATE', {
      status: 'PHASE_1',
      state_history: null,
    });
    expect(sm.state).toBe('PHASE_1');
    expect(sm.history).toEqual([]);
  });

  it('preserves started_at from session state', () => {
    const sm = createStateMachine('CREATE', {
      status: 'PHASE_2',
      started_at: '2025-06-01T00:00:00Z',
    });
    expect(sm.startedAt).toBe('2025-06-01T00:00:00Z');
  });
});

// ─────────────────────────────────────────────────────────────
// #170 Hardening: concurrent advance protection
// ─────────────────────────────────────────────────────────────
describe('StateMachine — concurrent advance protection', () => {
  it('blocks re-entrant advance() calls', () => {
    // Simulate re-entrancy by calling advance() inside onTransition
    let caughtError;
    const sm = createStateMachine('CREATE', null, {
      onTransition: () => {
        try {
          sm.advance(); // re-entrant call
        } catch (err) {
          caughtError = err;
        }
      },
    });
    sm.advance(); // IDLE → ONBOARDING — triggers callback which tries another advance
    expect(caughtError).toBeDefined();
    expect(caughtError.message).toMatch(/concurrent advance\(\) blocked/);
  });

  it('unlocks after a failed advance', () => {
    const sm = createStateMachine('CREATE');
    while (sm.nextState) sm.advance();
    // Now at COMPLETED — advance throws
    expect(() => sm.advance()).toThrow(/Pipeline is complete/);
    // Machine should not be permanently locked — if we recover or reset it should work
    // (there's no next state, but the lock is released)
    expect(() => sm.advance()).toThrow(/Pipeline is complete/);
  });
});

// ─────────────────────────────────────────────────────────────
// #170 Hardening: elapsed time & startedAt
// ─────────────────────────────────────────────────────────────
describe('StateMachine — elapsed time tracking', () => {
  it('startedAt returns an ISO timestamp', () => {
    const sm = createStateMachine('CREATE');
    expect(sm.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('elapsedMs returns a positive number', () => {
    const sm = createStateMachine('CREATE');
    expect(sm.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('serialize() includes started_at', () => {
    const sm = createStateMachine('CREATE');
    const data = sm.serialize();
    expect(data.started_at).toBeDefined();
    expect(typeof data.started_at).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────
// #170 Hardening: stateMetadata()
// ─────────────────────────────────────────────────────────────
describe('StateMachine — stateMetadata()', () => {
  it('returns all states in flow with their status', () => {
    const sm = createStateMachine('CREATE');
    sm.advance(); // → ONBOARDING
    sm.advance(); // → PHASE_1
    const meta = sm.stateMetadata();

    expect(meta.length).toBeGreaterThan(0);

    const idle = meta.find((m) => m.state === 'IDLE');
    expect(idle.status).toBe('completed');

    const onb = meta.find((m) => m.state === 'ONBOARDING');
    expect(onb.status).toBe('completed');

    const p1 = meta.find((m) => m.state === 'PHASE_1');
    expect(p1.status).toBe('current');

    const p2 = meta.find((m) => m.state === 'PHASE_2');
    expect(p2.status).toBe('pending');
  });

  it('marks completed state with a timestamp', () => {
    const sm = createStateMachine('CREATE');
    sm.advance();
    const meta = sm.stateMetadata();
    const idle = meta.find((m) => m.state === 'IDLE');
    expect(idle.timestamp).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// #170 Hardening: serialization round-trip
// ─────────────────────────────────────────────────────────────
describe('StateMachine — full serialization round-trip', () => {
  it('serialize → JSON → new machine restores same state', () => {
    const sm1 = createStateMachine('CREATE');
    sm1.advance(); // → ONBOARDING
    sm1.advance(); // → PHASE_1
    while (sm1.state !== 'CRITIC_1') sm1.advance();
    sm1.advance({ verdict: 'APPROVED' }); // → PHASE_2

    const json = JSON.stringify(sm1.serialize());
    const restored = JSON.parse(json);

    const sm2 = createStateMachine('CREATE', restored);
    expect(sm2.state).toBe(sm1.state);
    expect(sm2.mode).toBe(sm1.mode);
    expect(sm2.history.length).toBe(sm1.history.length);
    // Can continue advancing
    const next = sm2.advance();
    expect(next.from).toBe('PHASE_2');
  });
});

// ─────────────────────────────────────────────────────────────
// #170 Hardening: recover edge cases
// ─────────────────────────────────────────────────────────────
describe('StateMachine — recover edge cases', () => {
  it('recover finds from-branch when to is ERROR', () => {
    const sm = createStateMachine('CREATE');
    sm.advance(); // → ONBOARDING
    sm.error('fail');
    // History: [{IDLE→ONBOARDING}, {ONBOARDING→ERROR}]
    // Last entry: to=ERROR, so check from=ONBOARDING
    const recovered = sm.recover();
    expect(recovered).toBe('ONBOARDING');
  });

  it('recover falls back to IDLE when all history entries are ERROR', () => {
    const sm = new StateMachine({ mode: 'CREATE' });
    // Force ERROR state + all-ERROR history
    sm._state = STATES.ERROR;
    sm._history = [{ from: STATES.ERROR, to: STATES.ERROR, timestamp: new Date().toISOString() }];
    const recovered = sm.recover();
    expect(recovered).toBe('IDLE');
  });
});

// ─────────────────────────────────────────────────────────────
// S5: modeConfigs injection from template manifest
// ─────────────────────────────────────────────────────────────
describe('StateMachine — modeConfigs injection (S5)', () => {
  const customModes = {
    CUSTOM: { phases: ['PHASE_2', 'PHASE_3'], label: 'Custom mode' },
    CREATE: { phases: ['PHASE_1'], label: 'Overridden CREATE' },
  };

  it('uses injected modeConfigs for a custom mode', () => {
    const sm = new StateMachine({ mode: 'CUSTOM', modeConfigs: customModes });
    expect(sm.state).toBe('IDLE');
    sm.advance(); // IDLE → ONBOARDING
    sm.advance(); // ONBOARDING → PHASE_2
    expect(sm.state).toBe('PHASE_2');
  });

  it('rejects unknown mode even with custom modeConfigs', () => {
    expect(() => new StateMachine({ mode: 'UNKNOWN', modeConfigs: customModes })).toThrow(
      /Unknown mode: UNKNOWN/
    );
  });

  it('overrides built-in CREATE mode via injected modeConfigs', () => {
    const sm = new StateMachine({ mode: 'CREATE', modeConfigs: customModes });
    sm.advance(); // IDLE → ONBOARDING
    sm.advance(); // ONBOARDING → PHASE_1
    sm.advance(); // PHASE_1 → CRITIC_1
    expect(sm.state).toBe('CRITIC_1');
    sm.advance({ verdict: 'APPROVED' }); // CRITIC_1 → SYNTHESIS
    expect(sm.state).toBe('SYNTHESIS');
  });

  it('falls back to default MODE_CONFIGS when not injected', () => {
    const sm = new StateMachine({ mode: 'CREATE' });
    expect(sm.state).toBe('IDLE');
    sm.advance(); // IDLE → ONBOARDING
    sm.advance(); // ONBOARDING → PHASE_1 (full 4-phase flow)
    expect(sm.state).toBe('PHASE_1');
  });

  it('createStateMachine forwards modeConfigs', () => {
    const sm = createStateMachine('CUSTOM', null, { modeConfigs: customModes });
    expect(sm.state).toBe('IDLE');
    sm.advance();
    sm.advance();
    expect(sm.state).toBe('PHASE_2');
  });
});
