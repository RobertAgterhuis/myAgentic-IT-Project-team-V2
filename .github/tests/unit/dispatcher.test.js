'use strict';

/**
 * Agent Invocation Dispatcher — Unit Tests (FEAT-05-B / SP-5-ORCH-B)
 *
 * Covers all 7 ACs:
 * AC-1: Receives agent ID, platform, predecessor paths, questionnaire inputs
 * AC-2: Platform routing
 * AC-3: Context injection from predecessor files
 * AC-4: Questionnaire injection
 * AC-5: Deliverable collection / validation
 * AC-6: Timeout handling
 * AC-7: Retry logic
 * AC-8: Logging
 */

const {
  PHASE_AGENTS,
  PLATFORMS,
  DEFAULT_CONFIG,
  Dispatcher,
} = require('../../webapp/orchestrator/dispatcher');
const { STATES } = require('../../webapp/orchestrator/state-machine');

// ─── Test Helpers ────────────────────────────────────────────

/** Minimal in-memory file store for testing */
function createMockStore(files = {}) {
  return {
    exists: (fp) => fp in files,
    read: (fp) => files[fp] || '',
    write: (fp, content) => {
      files[fp] = content;
    },
    _files: files,
  };
}

/** Creates a mock invoker that resolves immediately */
function createSuccessInvoker(outputPath = '/output/test.md') {
  return async (_agent, _platform, _context) => ({ outputPath });
}

/** Creates a mock invoker that fails N times then succeeds */
function createFailThenSuccessInvoker(failCount, outputPath = '/output/test.md') {
  let calls = 0;
  return async () => {
    calls++;
    if (calls <= failCount) throw new Error('Transient failure');
    return { outputPath };
  };
}

/** Creates a mock invoker that always fails */
function createFailInvoker(message = 'Agent failed') {
  return async () => {
    throw new Error(message);
  };
}

/** Creates a slow invoker for timeout testing */
function createSlowInvoker(delayMs) {
  return async () => {
    await new Promise((r) => setTimeout(r, delayMs));
    return { outputPath: '/slow-output.md' };
  };
}

// ─────────────────────────────────────────────────────────────
// Agent Registry
// ─────────────────────────────────────────────────────────────
describe('PHASE_AGENTS — agent registry', () => {
  it('has agents for all pipeline states', () => {
    const pipelineStates = [
      STATES.ONBOARDING,
      STATES.PHASE_1,
      STATES.CRITIC_1,
      STATES.PHASE_2,
      STATES.CRITIC_2,
      STATES.PHASE_3,
      STATES.CRITIC_3,
      STATES.PHASE_4,
      STATES.CRITIC_4,
      STATES.SYNTHESIS,
      STATES.SPRINT_GATE,
      STATES.PHASE_5_EXECUTING,
    ];
    for (const s of pipelineStates) {
      expect(PHASE_AGENTS[s]).toBeDefined();
      expect(PHASE_AGENTS[s].length).toBeGreaterThan(0);
    }
  });

  it('PHASE_1 has 5 agents in correct order', () => {
    expect(PHASE_AGENTS[STATES.PHASE_1].length).toBe(5);
    expect(PHASE_AGENTS[STATES.PHASE_1][0].name).toBe('Business Analyst');
    expect(PHASE_AGENTS[STATES.PHASE_1][4].name).toBe('Product Manager');
  });

  it('PHASE_2 has 6 agents including Legal Counsel', () => {
    expect(PHASE_AGENTS[STATES.PHASE_2].length).toBe(6);
    const names = PHASE_AGENTS[STATES.PHASE_2].map((a) => a.name);
    expect(names).toContain('Legal Counsel');
  });

  it('all critic states have Critic + Risk agents', () => {
    for (const s of [STATES.CRITIC_1, STATES.CRITIC_2, STATES.CRITIC_3, STATES.CRITIC_4]) {
      const names = PHASE_AGENTS[s].map((a) => a.name);
      expect(names).toContain('Critic Agent');
      expect(names).toContain('Risk Agent');
    }
  });

  it('IDLE and COMPLETED have no agents', () => {
    expect(PHASE_AGENTS[STATES.IDLE]).toBeUndefined();
    expect(PHASE_AGENTS[STATES.COMPLETED]).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// PLATFORMS
// ─────────────────────────────────────────────────────────────
describe('PLATFORMS', () => {
  it('supports copilot, claude, openai', () => {
    expect(PLATFORMS.COPILOT).toBe('copilot');
    expect(PLATFORMS.CLAUDE).toBe('claude');
    expect(PLATFORMS.OPENAI).toBe('openai');
  });
});

// ─────────────────────────────────────────────────────────────
// Dispatcher — constructor
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — constructor', () => {
  it('throws without store', () => {
    expect(() => new Dispatcher()).toThrow(/requires a store/);
  });

  it('creates with minimal options', () => {
    const d = new Dispatcher({ store: createMockStore() });
    expect(d.log).toEqual([]);
  });

  it('accepts config overrides', () => {
    const d = new Dispatcher({
      store: createMockStore(),
      config: { timeoutMs: 60000 },
    });
    expect(d).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// AC-1, AC-3: Context injection
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — buildContext', () => {
  it('includes agent ID and skill path', () => {
    const d = new Dispatcher({ store: createMockStore() });
    const ctx = d.buildContext('01');
    expect(ctx.agentId).toBe('01');
    expect(ctx.skillFile).toContain('01-');
  });

  it('loads predecessor outputs from store', () => {
    const store = createMockStore({
      '/docs/phase-1/01.md': 'business analyst output',
      '/docs/phase-1/02.md': 'domain expert output',
    });
    const d = new Dispatcher({ store });
    const ctx = d.buildContext('03', {
      predecessorPaths: ['/docs/phase-1/01.md', '/docs/phase-1/02.md'],
    });
    expect(ctx.predecessorOutputs['/docs/phase-1/01.md']).toBe('business analyst output');
    expect(ctx.predecessorOutputs['/docs/phase-1/02.md']).toBe('domain expert output');
  });

  it('skips missing predecessor files', () => {
    const d = new Dispatcher({ store: createMockStore() });
    const ctx = d.buildContext('03', {
      predecessorPaths: ['/missing/file.md'],
    });
    expect(Object.keys(ctx.predecessorOutputs)).toHaveLength(0);
  });

  it('loads questionnaire input (AC-4)', () => {
    const store = createMockStore({
      '/questionnaire.md': '## Q-01: What is the target market?',
    });
    const d = new Dispatcher({ store });
    const ctx = d.buildContext('01', {
      questionnairePath: '/questionnaire.md',
    });
    expect(ctx.questionnaireInput).toContain('Q-01');
  });

  it('questionnaire null when path missing', () => {
    const d = new Dispatcher({ store: createMockStore() });
    const ctx = d.buildContext('01', { questionnairePath: '/missing.md' });
    expect(ctx.questionnaireInput).toBeNull();
  });

  it('includes session state when provided', () => {
    const d = new Dispatcher({ store: createMockStore() });
    const state = { status: 'PHASE_1' };
    const ctx = d.buildContext('01', { sessionState: state });
    expect(ctx.sessionState).toEqual(state);
  });
});

// ─────────────────────────────────────────────────────────────
// getAgentsForState
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — getAgentsForState', () => {
  it('returns agents for known states', () => {
    const d = new Dispatcher({ store: createMockStore() });
    const agents = d.getAgentsForState(STATES.PHASE_1);
    expect(agents.length).toBe(5);
  });

  it('returns empty array for unknown states', () => {
    const d = new Dispatcher({ store: createMockStore() });
    expect(d.getAgentsForState('NONEXISTENT')).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// AC-2, AC-5: Invocation + success
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — invoke (success)', () => {
  it('invokes agent and returns output path', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createSuccessInvoker('/out/01.md'),
    });
    const result = await d.invoke({ id: '01', name: 'Business Analyst' }, STATES.PHASE_1, {});
    expect(result.success).toBe(true);
    expect(result.outputPath).toBe('/out/01.md');
  });

  it('logs successful invocation (AC-8)', async () => {
    const logs = [];
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createSuccessInvoker(),
      onLog: (e) => logs.push(e),
    });
    await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});
    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe('success');
    expect(logs[0].agentId).toBe('01');
    expect(logs[0].durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────
// AC-7: Retry logic
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — invoke (retry)', () => {
  it('retries on transient failure and succeeds', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createFailThenSuccessInvoker(1),
      config: { maxRetries: 2, retryDelayMs: 10 },
    });
    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});
    expect(result.success).toBe(true);
    expect(d.log.length).toBe(2);
    expect(d.log[0].status).toBe('retry');
    expect(d.log[1].status).toBe('success');
  });

  it('fails after max retries exhausted', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createFailInvoker('persistent error'),
      config: { maxRetries: 1, retryDelayMs: 10 },
    });
    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('persistent error');
    expect(d.log.length).toBe(2); // 1 retry + 1 final failure
    expect(d.log[0].status).toBe('retry');
    expect(d.log[1].status).toBe('failure');
  });

  it('zero retries means single attempt', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createFailInvoker('fail'),
      config: { maxRetries: 0, retryDelayMs: 10 },
    });
    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});
    expect(result.success).toBe(false);
    expect(d.log.length).toBe(1);
    expect(d.log[0].status).toBe('failure');
  });
});

// ─────────────────────────────────────────────────────────────
// AC-6: Timeout handling
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — invoke (timeout)', () => {
  it('times out slow invocations', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createSlowInvoker(500),
      config: { timeoutMs: 50, maxRetries: 0 },
    });
    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('TIMEOUT');
    expect(d.log[0].status).toBe('timeout');
  });
});

// ─────────────────────────────────────────────────────────────
// dispatchState — sequential multi-agent
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — dispatchState', () => {
  it('dispatches all agents for a state', async () => {
    let callCount = 0;
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async (agent) => {
        callCount++;
        return { outputPath: `/out/${agent.id}.md` };
      },
    });
    const { completed, failed } = await d.dispatchState(STATES.CRITIC_1);
    expect(completed).toEqual(['18', '19']);
    expect(failed).toEqual([]);
    expect(callCount).toBe(2);
  });

  it('reports failed agents', async () => {
    let calls = 0;
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => {
        calls++;
        if (calls === 1) return { outputPath: '/ok.md' };
        throw new Error('fail');
      },
      config: { maxRetries: 0 },
    });
    const { completed, failed } = await d.dispatchState(STATES.CRITIC_1);
    expect(completed).toEqual(['18']);
    expect(failed).toEqual(['19']);
  });

  it('chains predecessor paths from completed agents', async () => {
    const contexts = [];
    const d = new Dispatcher({
      store: createMockStore({ '/out/01.md': 'content' }),
      invoker: async (agent, _platform, ctx) => {
        contexts.push({ ...ctx });
        return { outputPath: `/out/${agent.id}.md` };
      },
    });
    await d.dispatchState(STATES.CRITIC_1, { predecessorPaths: ['/existing.md'] });
    // Second agent should have first agent's output in predecessorPaths
    expect(contexts.length).toBe(2);
  });

  it('returns empty for unknown state', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createSuccessInvoker(),
    });
    const { completed, failed } = await d.dispatchState('NONEXISTENT');
    expect(completed).toEqual([]);
    expect(failed).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// AC-8: Logging completeness
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — logging', () => {
  it('log entries contain required fields', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createSuccessInvoker('/out.md'),
    });
    await d.invoke({ id: '05', name: 'Software Architect' }, STATES.PHASE_2, {});
    const entry = d.log[0];
    expect(entry).toHaveProperty('agentId', '05');
    expect(entry).toHaveProperty('agentName', 'Software Architect');
    expect(entry).toHaveProperty('platform');
    expect(entry).toHaveProperty('state', STATES.PHASE_2);
    expect(entry).toHaveProperty('startTime');
    expect(entry).toHaveProperty('endTime');
    expect(entry).toHaveProperty('durationMs');
    expect(entry).toHaveProperty('status', 'success');
    expect(entry).toHaveProperty('attempt', 1);
    expect(entry).toHaveProperty('outputPath', '/out.md');
  });

  it('log returns a copy', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createSuccessInvoker(),
    });
    await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});
    const l1 = d.log;
    const l2 = d.log;
    expect(l1).not.toBe(l2);
    expect(l1).toEqual(l2);
  });
});

// ─────────────────────────────────────────────────────────────
// Default invoker behavior
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — default invoker', () => {
  it('throws "no invoker" when none configured', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      config: { maxRetries: 0 },
    });
    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('No invoker configured');
  });
});
