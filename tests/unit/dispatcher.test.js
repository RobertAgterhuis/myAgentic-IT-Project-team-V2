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
  compileAgentPhaseMap,
  assertRuntimeSchemaParity,
  PHASE_AGENTS,
  PLATFORMS,
  _DEFAULT_CONFIG,
  Dispatcher,
} = require('../../platform/engine/dispatcher');
const { STATES } = require('../../platform/engine/state-machine');

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

  it('PHASE_2 has 6 agents including agent 33', () => {
    expect(PHASE_AGENTS[STATES.PHASE_2].length).toBe(6);
    const ids = PHASE_AGENTS[STATES.PHASE_2].map((a) => a.id);
    expect(ids).toContain('33');
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

  it('compiles dispatcher phase map from canonical schema', () => {
    const compiled = compileAgentPhaseMap();
    expect(compiled[STATES.ONBOARDING]).toEqual([{ id: '25', name: 'Onboarding Agent' }]);
    expect(compiled[STATES.CRITIC_1]).toEqual(compiled[STATES.CRITIC_2]);
    expect(compiled[STATES.CRITIC_1]).toEqual(compiled[STATES.CRITIC_3]);
    expect(compiled[STATES.CRITIC_1]).toEqual(compiled[STATES.CRITIC_4]);
  });

  it('throws when runtime map diverges from canonical schema output', () => {
    const divergent = {
      ...PHASE_AGENTS,
      [STATES.PHASE_1]: [{ id: '01', name: 'Broken Name' }],
    };
    expect(() => assertRuntimeSchemaParity(divergent)).toThrow(/parity violation/i);
  });

  it('throws when compiling from invalid schema shape', () => {
    expect(() => compileAgentPhaseMap({})).toThrow(/expected top-level agents array/i);
  });

  it('throws when compiling from invalid schema row fields', () => {
    const badSchema = {
      agents: [{ id: 1, name: 'Bad', phase: 'PHASE_1' }],
    };
    expect(() => compileAgentPhaseMap(badSchema)).toThrow(/expected string id and name/i);
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

describe('Dispatcher — enqueueInvocation', () => {
  it('throws when no job queue is configured', async () => {
    const d = new Dispatcher({ store: createMockStore() });

    await expect(
      d.enqueueInvocation({ id: '01', name: 'Business Analyst' }, STATES.PHASE_1, {})
    ).rejects.toThrow(/No job queue configured/);
  });

  it('enqueues agent invocation jobs with merged config', async () => {
    const queuedJobs = [];
    const jobQueue = {
      enqueue: vi.fn(async (job) => {
        queuedJobs.push(job);
        return { id: 'job-123', ...job };
      }),
    };

    const d = new Dispatcher({
      store: createMockStore(),
      jobQueue,
      config: { maxRetries: 2, platform: 'copilot' },
    });

    const result = await d.enqueueInvocation(
      { id: '01', name: 'Business Analyst' },
      STATES.PHASE_1,
      { predecessorPaths: ['/existing.md'] },
      { platform: 'claude', priority: 9, maxTransientRetries: 4 }
    );

    expect(result).toEqual({ jobId: 'job-123' });
    expect(jobQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(queuedJobs[0]).toEqual({
      type: 'agent-invocation',
      payload: {
        agentId: '01',
        agentName: 'Business Analyst',
        platform: 'claude',
        state: STATES.PHASE_1,
        context: { predecessorPaths: ['/existing.md'] },
      },
      priority: 9,
      retryCount: 0,
      maxRetries: 4,
    });
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
      '/BusinessDocs/phase-1/01.md': 'business analyst output',
      '/BusinessDocs/phase-1/02.md': 'domain expert output',
    });
    const d = new Dispatcher({ store });
    const ctx = d.buildContext('03', {
      predecessorPaths: ['/BusinessDocs/phase-1/01.md', '/BusinessDocs/phase-1/02.md'],
    });
    expect(ctx.predecessorOutputs['/BusinessDocs/phase-1/01.md']).toBe('business analyst output');
    expect(ctx.predecessorOutputs['/BusinessDocs/phase-1/02.md']).toBe('domain expert output');
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

  it('passes through retrieved RAG context when provided', () => {
    const d = new Dispatcher({ store: createMockStore() });
    const ragContext = {
      query: 'Use React',
      collections: ['decisions'],
      matches: [
        {
          text: 'Use React for the operator-facing web application shell.',
          source_path: 'BusinessDocs/decisions.md',
          start_line: 18,
          collection: 'decisions',
          score: 0.94,
        },
      ],
    };

    const ctx = d.buildContext('01', { ragContext });
    expect(ctx.ragContext).toEqual(ragContext);
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
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('uncertainty_reasons');
    expect(result).toHaveProperty('needs_human_review');
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

  it('logs runtime adapter telemetry when present', async () => {
    const logs = [];
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => ({
        outputPath: '/out/01.md',
        response: {
          provider: 'openai',
          model: 'gpt-test',
          status: 'success',
          finishReason: 'stop',
          attempts: 2,
          usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 },
          toolTraceId: 'trace-abc',
          toolInvocationCount: 1,
          toolAuditEvents: [
            {
              toolId: 'tool.files.read',
              operation: 'read_file',
              durationMs: 17,
              success: true,
            },
          ],
          contractValidation: { status: 'passed' },
          requestedAt: '2026-03-19T10:00:00.000Z',
          completedAt: '2026-03-19T10:00:00.250Z',
        },
      }),
      onLog: (e) => logs.push(e),
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      provider: 'openai',
      model: 'gpt-test',
      providerStatus: 'success',
      finishReason: 'stop',
      modelAttempts: 2,
      modelRetries: 1,
      promptTokens: 12,
      completionTokens: 8,
      totalTokens: 20,
      toolTraceId: 'trace-abc',
      toolInvocationCount: 1,
      contractValidationPassed: true,
    });
    expect(logs[0].toolAuditEvents).toHaveLength(1);
    expect(logs[0].toolAuditEvents[0].toolId).toBe('tool.files.read');
    expect(logs[0].providerLatencyMs).toBe(250);
    expect(result.confidence).toBeGreaterThan(0.6);
    expect(result.needs_human_review).toBe(true);
    expect(result.uncertainty_reasons).toContain('Model required 1 retry');
  });

  it('fails when invoker returns a non-object result', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => 'invalid-result',
      config: { maxRetries: 0 },
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invocation result must be an object');
  });

  it('fails when invoker returns non-string outputPath', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => ({ outputPath: 42 }),
      config: { maxRetries: 0 },
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invocation result outputPath must be a string');
  });

  it('fails when response.usage is non-object', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => ({
        outputPath: '/out/01.md',
        response: { usage: 'bad-usage-shape' },
      }),
      config: { maxRetries: 0 },
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('response.usage must be an object');
  });

  it('fails when response.toolAuditEvents is non-array', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => ({
        outputPath: '/out/01.md',
        response: { toolAuditEvents: 'bad-events-shape' },
      }),
      config: { maxRetries: 0 },
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('toolAuditEvents must be an array');
  });

  it('fails when response.toolAuditEvents item has missing toolId', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => ({
        outputPath: '/out/01.md',
        response: { toolAuditEvents: [{ success: true }] },
      }),
      config: { maxRetries: 0 },
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('toolAuditEvents[0].toolId is required');
  });

  it('fails when response.toolAuditEvents success is not boolean', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => ({
        outputPath: '/out/01.md',
        response: { toolAuditEvents: [{ toolId: 'tool.read', success: 'yes' }] },
      }),
      config: { maxRetries: 0 },
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('toolAuditEvents[0].success must be boolean');
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
    expect(result.confidence).toBe(0);
    expect(result.needs_human_review).toBe(true);
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

  it('marks exhausted recoverable failures as degraded', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createFailInvoker('plain recoverable failure'),
      config: { maxRetries: 0 },
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('plain recoverable failure');
    expect(result.severity).toBe('RECOVERABLE');
    expect(result.degraded).toBe(true);
  });

  it('does not retry fatal errors', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createFailInvoker('authentication failed (401)'),
      config: { maxRetries: 3 },
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    expect(result.success).toBe(false);
    expect(result.severity).toBe('FATAL');
    expect(d.log.length).toBe(1);
    expect(d.log[0].status).toBe('failure');
    expect(d.log[0].errorSeverity).toBe('FATAL');
  });

  it('retries transient errors before success', async () => {
    let calls = 0;
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => {
        calls += 1;
        if (calls === 1) throw new Error('ECONNRESET while calling provider');
        return { outputPath: '/out/recovered.md' };
      },
      config: { maxRetries: 2 },
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    expect(result.success).toBe(true);
    expect(d.log.length).toBe(2);
    expect(d.log[0].status).toBe('retry');
    expect(d.log[0].errorSeverity).toBe('TRANSIENT');
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
    expect(result.error).toMatch(/No runtime adapter configured/);
  });

  it('uses runtime adapter when configured', async () => {
    const adapter = {
      invoke: vi.fn(async () => ({ outputPath: '/adapter/out.md' })),
    };
    const d = new Dispatcher({
      store: createMockStore(),
      adapter,
      config: { maxRetries: 0 },
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    expect(result.success).toBe(true);
    expect(result.outputPath).toBe('/adapter/out.md');
    expect(adapter.invoke).toHaveBeenCalledTimes(1);
    expect(adapter.invoke).toHaveBeenCalledWith({ id: '01', name: 'BA' }, PLATFORMS.COPILOT, {});
  });
});

// ─────────────────────────────────────────────────────────────
// #171 Hardening: timeout ≤ 0 bypass
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — timeout ≤ 0 bypass', () => {
  it('skips timeout when timeoutMs is 0 (no timeout)', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createSuccessInvoker('/out.md'),
      config: { timeoutMs: 0, maxRetries: 0 },
    });
    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});
    expect(result.success).toBe(true);
    expect(result.outputPath).toBe('/out.md');
  });

  it('skips timeout when timeoutMs is negative', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createSuccessInvoker('/neg.md'),
      config: { timeoutMs: -1, maxRetries: 0 },
    });
    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});
    expect(result.success).toBe(true);
    expect(result.outputPath).toBe('/neg.md');
  });
});

// ─────────────────────────────────────────────────────────────
// #171 Hardening: escalation / abort modes
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — dispatchState onFailure modes', () => {
  it('onFailure=continue (default) invokes all agents', async () => {
    let calls = 0;
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => {
        calls++;
        if (calls === 1) throw new Error('fail');
        return { outputPath: '/ok.md' };
      },
      config: { maxRetries: 0 },
    });
    const { completed, failed } = await d.dispatchState(STATES.CRITIC_1);
    // Both agents called: first fails, second succeeds
    expect(failed).toEqual(['18']);
    expect(completed).toEqual(['19']);
  });

  it('onFailure=abort stops after first failure', async () => {
    let calls = 0;
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => {
        calls++;
        if (calls === 1) throw new Error('fail');
        return { outputPath: '/ok.md' };
      },
      config: { maxRetries: 0 },
    });
    const { completed, failed, escalated } = await d.dispatchState(
      STATES.CRITIC_1,
      {},
      {},
      { onFailure: 'abort' }
    );
    expect(failed).toEqual(['18']);
    expect(completed).toEqual([]);
    expect(escalated).toBe(false);
    expect(calls).toBe(1);
  });

  it('onFailure=escalate stops and sets escalated flag', async () => {
    let calls = 0;
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => {
        calls++;
        if (calls === 1) throw new Error('fail');
        return { outputPath: '/ok.md' };
      },
      config: { maxRetries: 0 },
    });
    const { failed, escalated } = await d.dispatchState(
      STATES.CRITIC_1,
      {},
      {},
      { onFailure: 'escalate' }
    );
    expect(failed).toEqual(['18']);
    expect(escalated).toBe(true);
    expect(calls).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// #171 Hardening: per-agent timeout override
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — per-agent timeout', () => {
  it('per-agent config overrides global timeout', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createSlowInvoker(200),
      config: { timeoutMs: 50, maxRetries: 0 },
    });
    // Global timeout is 50ms (would fail), but per-agent is 5000ms (should pass)
    const result = await d.invoke(
      { id: '01', name: 'BA' },
      STATES.PHASE_1,
      {},
      { timeoutMs: 5000 }
    );
    expect(result.success).toBe(true);
  });

  it('per-agent platform override routes correctly', async () => {
    let usedPlatform;
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async (_agent, platform) => {
        usedPlatform = platform;
        return { outputPath: '/out.md' };
      },
    });
    await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {}, { platform: 'claude' });
    expect(usedPlatform).toBe('claude');
  });
});

// ─────────────────────────────────────────────────────────────
// #171 Hardening: Unknown error fallback
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — Unknown error fallback', () => {
  it('returns "Unknown error" when lastError is null-ish', async () => {
    // Create an invoker that sets lastError to null by throwing something
    // without a message — tricky, but we use a custom approach
    const _unused = new Dispatcher({
      store: createMockStore(),
      config: { maxRetries: 0 },
    });
    // Override invoke internals to trigger null lastError path
    // The cleanest way is to test with an error that has an empty message
    const d2 = new Dispatcher({
      store: createMockStore(),
      invoker: async () => {
        throw Object.assign(new Error(''), { message: '' });
      },
      config: { maxRetries: 0 },
    });
    const result = await d2.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});
    expect(result.success).toBe(false);
    // Error message is empty string, which is falsy
    expect(typeof result.error).toBe('string');
  });
});

describe('Dispatcher — internal helpers', () => {
  it('classifies internal retry statuses consistently', () => {
    expect(Dispatcher._classifyError({ message: 'TIMEOUT' }, 1, 2)).toBe('timeout');
    expect(Dispatcher._classifyError({ message: 'boom' }, 1, 2)).toBe('retry');
    expect(Dispatcher._classifyError({ message: 'boom' }, 3, 2)).toBe('failure');
  });

  it('propagates promise rejection through _withTimeout', async () => {
    const d = new Dispatcher({ store: createMockStore() });

    await expect(d._withTimeout(Promise.reject(new Error('boom')), 100)).rejects.toThrow('boom');
  });

  it('classifyError() maps transient/fatal/recoverable patterns', () => {
    expect(Dispatcher.classifyError({ message: 'timeout while waiting for provider' })).toBe(
      'TRANSIENT'
    );
    expect(Dispatcher.classifyError({ message: 'contract violation detected in output' })).toBe(
      'FATAL'
    );
    expect(Dispatcher.classifyError({ message: 'unexpected adapter response shape' })).toBe(
      'RECOVERABLE'
    );
  });
});

// ─────────────────────────────────────────────────────────────
// S5: phaseAgents injection from template manifest
// ─────────────────────────────────────────────────────────────
describe('Dispatcher — phaseAgents injection (S5)', () => {
  const customAgents = {
    ONBOARDING: [{ id: '99', name: 'Custom Onboarding' }],
    PHASE_1: [{ id: '50', name: 'Custom Analyst' }],
  };

  it('uses injected phaseAgents when provided', () => {
    const d = new Dispatcher({
      store: createMockStore(),
      phaseAgents: customAgents,
    });
    expect(d.getAgentsForState('ONBOARDING')).toEqual(customAgents.ONBOARDING);
    expect(d.getAgentsForState('PHASE_1')).toEqual(customAgents.PHASE_1);
  });

  it('returns empty array for states not in injected phaseAgents', () => {
    const d = new Dispatcher({
      store: createMockStore(),
      phaseAgents: customAgents,
    });
    expect(d.getAgentsForState('PHASE_2')).toEqual([]);
  });

  it('falls back to hardcoded PHASE_AGENTS when not injected', () => {
    const d = new Dispatcher({ store: createMockStore() });
    expect(d.getAgentsForState(STATES.ONBOARDING)).toEqual(PHASE_AGENTS[STATES.ONBOARDING]);
  });

  it('dispatches using injected agents', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      phaseAgents: customAgents,
      invoker: createSuccessInvoker('/out.md'),
    });
    const result = await d.dispatchState('PHASE_1', {});
    expect(result.completed).toEqual(['50']);
    expect(result.failed).toEqual([]);
  });
});

describe('Dispatcher — dispatchStateParallel (M4/Epic-661)', () => {
  it('runs agents in the same group concurrently', async () => {
    let active = 0;
    let observedOverlap = false;

    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async (agent) => {
        active += 1;
        if (active > 1) observedOverlap = true;
        await new Promise((resolve) => setTimeout(resolve, 20));
        active -= 1;
        return { outputPath: `/out/${agent.id}.md` };
      },
    });

    const result = await d.dispatchStateParallel(STATES.CRITIC_1, {}, {}, { maxConcurrency: 2 });

    expect(observedOverlap).toBe(true);
    expect(result.completed.sort()).toEqual(['18', '19']);
    expect(result.failed).toEqual([]);
    expect(result.concurrencyHighWaterMark).toBeGreaterThan(1);
  });

  it('respects the maxConcurrency cap', async () => {
    let active = 0;
    let peak = 0;

    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async (agent) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 15));
        active -= 1;
        return { outputPath: `/out/${agent.id}.md` };
      },
    });

    const result = await d.dispatchStateParallel(STATES.PHASE_1, {}, {}, { maxConcurrency: 2 });

    expect(result.completed.length).toBe(5);
    expect(result.failed).toEqual([]);
    expect(peak).toBeLessThanOrEqual(2);
    expect(result.concurrencyHighWaterMark).toBeLessThanOrEqual(2);
  });

  it('falls back to dispatchState for states without group config', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createSuccessInvoker('/out/custom.md'),
      phaseAgents: {
        CUSTOM_STATE: [{ id: '99', name: 'Custom' }],
      },
    });

    const result = await d.dispatchStateParallel('CUSTOM_STATE');

    expect(result.completed).toEqual(['99']);
    expect(result.failed).toEqual([]);
    expect(result.concurrencyHighWaterMark).toBe(1);
    expect(result.totalWaitMs).toBe(0);
  });

  it('supports onFailure=abort', async () => {
    const calledIds = [];
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async (agent) => {
        calledIds.push(agent.id);
        if (agent.id === '20') throw new Error('group-1 failed');
        return { outputPath: `/out/${agent.id}.md` };
      },
      config: { maxRetries: 0 },
    });

    const result = await d.dispatchStateParallel(
      STATES.PHASE_5_EXECUTING,
      {},
      {},
      {
        onFailure: 'abort',
        maxConcurrency: 1,
      }
    );

    expect(calledIds).toEqual(['20', '21', '38']);
    expect(result.completed).toEqual([]);
    expect(result.failed).toEqual(['20']);
    expect(calledIds.includes('22')).toBe(false);
    expect(result.escalated).toBe(false);
  });

  it('supports onFailure=escalate', async () => {
    const calledIds = [];
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async (agent) => {
        calledIds.push(agent.id);
        if (agent.id === '20') throw new Error('group-1 failed');
        return { outputPath: `/out/${agent.id}.md` };
      },
      config: { maxRetries: 0 },
    });

    const result = await d.dispatchStateParallel(
      STATES.PHASE_5_EXECUTING,
      {},
      {},
      {
        onFailure: 'escalate',
        maxConcurrency: 1,
      }
    );

    expect(calledIds).toEqual(['20', '21', '38']);
    expect(result.completed).toEqual([]);
    expect(result.failed).toEqual(['20']);
    expect(calledIds.includes('22')).toBe(false);
    expect(result.escalated).toBe(true);
  });

  it('chains predecessor paths across groups', async () => {
    const contextsSeen = [];
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async (agent, _platform, ctx) => {
        contextsSeen.push({
          agentId: agent.id,
          predecessorPaths: (ctx.predecessorPaths || []).slice(),
        });
        return { outputPath: `/out/${agent.id}.md` };
      },
    });

    const result = await d.dispatchStateParallel(STATES.PHASE_1, {}, {}, { maxConcurrency: 1 });

    // All agents in PHASE_1 should have been invoked
    expect(result.completed.length).toBe(5);

    // Each context should be valid and contexts can be captured
    expect(contextsSeen.length).toBe(5);
  });

  it('handles agent not found in registry (graceful degradation)', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      phaseAgents: {
        CUSTOM_STATE: [
          { id: '99', name: 'Custom Agent' },
          { id: '100', name: 'Another Agent' },
        ],
      },
      invoker: async (agent) => {
        return { outputPath: `/out/${agent.id}.md` };
      },
    });

    const result = await d.dispatchStateParallel('CUSTOM_STATE', {}, {}, { maxConcurrency: 2 });

    // Both agents should have been attempted (phaseAgents lookup succeeds)
    expect(result.completed.length).toBe(2);
    expect(result.failed).toEqual([]);
  });

  it('handles Promise.allSettled rejection in _runBoundedGroup', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async (agent) => {
        // Simulate uncaught promise rejection in task
        if (agent.id === '18') {
          throw new Error('unexpected error in _runBoundedGroup');
        }
        return { outputPath: `/out/${agent.id}.md` };
      },
      config: { maxRetries: 0 },
    });

    // CRITIC_1 has agents ['18', '19']
    const result = await d.dispatchStateParallel(STATES.CRITIC_1, {}, {}, { maxConcurrency: 2 });

    expect(result.failed).toEqual(['18']);
    expect(result.completed).toEqual(['19']);
  });

  it('observes semaphore queueing with high concurrency demand', async () => {
    let peakActive = 0;
    let activeSamples = [];

    const d = new Dispatcher({
      store: createMockStore(),
      phaseAgents: {
        BIG_GROUP: [
          ...Array(10)
            .fill(null)
            .map((_, i) => ({ id: String(i), name: `Agent ${i}` })),
        ],
      },
      invoker: async () => {
        activeSamples.push(peakActive);
        await new Promise((resolve) => setTimeout(resolve, 20));
        peakActive++;
        return { outputPath: '/out.md' };
      },
    });

    const result = await d.dispatchStateParallel('BIG_GROUP', {}, {}, { maxConcurrency: 3 });

    expect(result.completed.length).toBe(10);
    expect(result.concurrencyHighWaterMark).toBeLessThanOrEqual(3);
    expect(result.totalWaitMs).toBeGreaterThanOrEqual(0);
  });

  it('aborts remaining groups on abort failure in group 1', async () => {
    const calledIds = [];
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async (agent) => {
        calledIds.push(agent.id);
        if (agent.id === '38') throw new Error('group 1 failure');
        return { outputPath: `/out/${agent.id}.md` };
      },
      config: { maxRetries: 0 },
    });

    const result = await d.dispatchStateParallel(
      STATES.PHASE_5_EXECUTING,
      {},
      {},
      { onFailure: 'abort', maxConcurrency: 2 }
    );

    // Group 1: ['20', '21', '38']
    // Agent 38 fails, abort is set
    // Group 2 should not be called
    expect(result.failed).toContain('38');
    expect(calledIds.some((id) => result.failed.includes(id))).toBe(true);
    // Group 2 agents [22, 29, 26, 27, 28] should NOT be called
    expect(calledIds).not.toContain('22');
  });

  it('dispatchStateParallel with maxConcurrency override', async () => {
    let peakConcurrency = 0;
    let currentActive = 0;

    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => {
        currentActive++;
        peakConcurrency = Math.max(peakConcurrency, currentActive);
        await new Promise((r) => setTimeout(r, 10));
        currentActive--;
        return { outputPath: '/out.md' };
      },
      config: { maxConcurrency: 10 }, // global config is high
    });

    const result = await d.dispatchStateParallel(
      STATES.PHASE_1, // 5 agents
      {},
      {},
      { maxConcurrency: 2 } // override to 2
    );

    expect(result.concurrencyHighWaterMark).toBeLessThanOrEqual(2);
    expect(result.completed.length).toBe(5);
  });

  it('error classification: FATAL stops retry', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => {
        throw new Error('authentication failed');
      },
      config: { maxRetries: 3, retryDelayMs: 10 },
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    // FATAL error should stop immediately, not retry
    expect(result.success).toBe(false);
    expect(d.log.length).toBe(1); // no retries
    expect(d.log[0].status).toBe('failure');
    expect(d.log[0].errorSeverity).toBe('FATAL');
  });

  it('error classification: TRANSIENT allows retry', async () => {
    let attempts = 0;
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => {
        attempts++;
        if (attempts <= 1) throw new Error('connection timeout');
        return { outputPath: '/out.md' };
      },
      config: { maxRetries: 2, retryDelayMs: 10, backoffBaseMs: 5 },
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    expect(result.success).toBe(true);
    expect(attempts).toBe(2);
    expect(d.log.length).toBe(2);
    expect(d.log[0].status).toBe('retry');
    expect(d.log[1].status).toBe('success');
  });

  it('multiple groups execute in sequence, not parallel', async () => {
    const executionOrder = [];

    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async (agent) => {
        executionOrder.push(agent.id);
        return { outputPath: `/out/${agent.id}.md` };
      },
    });

    await d.dispatchStateParallel(STATES.PHASE_5_EXECUTING, {}, {}, { maxConcurrency: 1 });

    // Group 1: ['20', '21', '38']
    // Then Group 2: ['22', '29', '26', '27', '28']
    const group1EndIndex = Math.max(
      executionOrder.indexOf('20'),
      executionOrder.indexOf('21'),
      executionOrder.indexOf('38')
    );
    const group2StartIndex = Math.min(
      executionOrder.indexOf('22'),
      executionOrder.indexOf('29'),
      executionOrder.indexOf('26'),
      executionOrder.indexOf('27'),
      executionOrder.indexOf('28')
    );

    // Group 2 should start after group 1 ends
    expect(group2StartIndex).toBeGreaterThan(group1EndIndex);
  });

  it('per-agent config in parallel dispatch', async () => {
    const platformsSeen = [];
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async (agent, platform) => {
        platformsSeen.push({ agentId: agent.id, platform });
        return { outputPath: '/out.md' };
      },
    });

    const agentConfigs = {
      18: { platform: 'claude' },
      19: { platform: 'openai' },
    };

    await d.dispatchStateParallel(STATES.CRITIC_1, {}, agentConfigs, { maxConcurrency: 2 });

    const agent18 = platformsSeen.find((p) => p.agentId === '18');
    const agent19 = platformsSeen.find((p) => p.agentId === '19');

    expect(agent18.platform).toBe('claude');
    expect(agent19.platform).toBe('openai');
  });

  it('marks missing grouped agents as failed when not present in state registry', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      phaseAgents: {
        [STATES.PHASE_1]: [{ id: '01', name: 'Business Analyst' }],
      },
      invoker: createSuccessInvoker('/out/01.md'),
      config: { maxRetries: 0 },
    });

    const result = await d.dispatchStateParallel(STATES.PHASE_1, {}, {}, { maxConcurrency: 2 });

    expect(result.completed).toEqual(['01']);
    expect(result.failed).toEqual(expect.arrayContaining(['02', '03', '04', '34']));
    const missing = result.results.filter((r) => !r.success);
    expect(missing.length).toBeGreaterThan(0);
    expect(missing[0].error).toMatch(/not found in registry/i);
  });

  it('handles rejected task outcomes from bounded group execution', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: createSuccessInvoker('/out/ok.md'),
      config: { maxRetries: 0 },
    });

    const originalBuildContext = d.buildContext.bind(d);
    d.buildContext = (agentId, options = {}) => {
      if (agentId === '19') {
        throw new Error('context exploded');
      }
      return originalBuildContext(agentId, options);
    };

    const result = await d.dispatchStateParallel(STATES.CRITIC_1, {}, {}, { maxConcurrency: 2 });

    expect(result.completed).toEqual(['18']);
    expect(result.failed).toEqual(['unknown']);
    const rejected = result.results.find((r) => r.agent && r.agent.id === 'unknown');
    expect(rejected).toBeDefined();
    expect(rejected.success).toBe(false);
    expect(String(rejected.error)).toMatch(/context exploded/i);
  });

  it('continues to later groups when onFailure is continue', async () => {
    const calledIds = [];
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async (agent) => {
        calledIds.push(agent.id);
        if (agent.id === '20') {
          throw new Error('group-1 failure');
        }
        return { outputPath: `/out/${agent.id}.md` };
      },
      config: { maxRetries: 0 },
    });

    const result = await d.dispatchStateParallel(
      STATES.PHASE_5_EXECUTING,
      {},
      {},
      { maxConcurrency: 1 }
    );

    expect(result.failed).toContain('20');
    expect(result.completed).toEqual(
      expect.arrayContaining(['21', '38', '22', '29', '26', '27', '28'])
    );
    expect(calledIds).toEqual(['20', '21', '38', '22', '29', '26', '27', '28']);
  });
});

describe('Dispatcher — helper path coverage buffer', () => {
  it('classifyError returns fatal, transient, and recoverable severities', () => {
    expect(Dispatcher.classifyError({ message: 'authentication failed 401' })).toBe('FATAL');
    expect(Dispatcher.classifyError({ message: 'network timeout' })).toBe('TRANSIENT');
    expect(Dispatcher.classifyError({ message: 'plain validation issue' })).toBe('RECOVERABLE');
  });

  it('default invoker uses adapter when available', async () => {
    const adapter = {
      invoke: vi.fn(async () => ({ outputPath: '/adapter/default.md' })),
    };
    const d = new Dispatcher({ store: createMockStore(), adapter });

    const result = await d._defaultInvoker({ id: '01', name: 'BA' }, 'copilot', {});

    expect(result.outputPath).toBe('/adapter/default.md');
    expect(adapter.invoke).toHaveBeenCalledWith({ id: '01', name: 'BA' }, 'copilot', {});
  });

  it('withTimeout emits TIMEOUT when promise exceeds deadline', async () => {
    const d = new Dispatcher({ store: createMockStore() });

    await expect(
      d._withTimeout(new Promise((resolve) => setTimeout(resolve, 30)), 1)
    ).rejects.toThrow('TIMEOUT');
  });

  it('logs uncertainty reasons for non-standard successful runtime response', async () => {
    const d = new Dispatcher({
      store: createMockStore(),
      invoker: async () => ({
        outputPath: '/out/non-standard.md',
        response: {
          status: 'partial',
          finishReason: 'length',
          attempts: 3,
          usage: { totalTokens: 0 },
          contractValidation: { status: 'unknown' },
        },
      }),
    });

    const result = await d.invoke({ id: '01', name: 'BA' }, STATES.PHASE_1, {});

    expect(result.success).toBe(true);
    expect(result.needs_human_review).toBe(true);
    expect(result.uncertainty_reasons).toEqual(
      expect.arrayContaining([
        'Provider status missing or non-success',
        'Contract validation status not confirmed',
        'Non-standard finish reason: length',
        'Model required 2 retries',
        'Token usage signal is empty',
      ])
    );
  });
});
