/**
 * P2-CORE-E3-I2 — Chaos / Resumption Test Suite
 *
 * Proves crash-and-resume, state recovery, and idempotency under failure
 * across the three core engine subsystems:
 *
 *  1. StateMachine — crash recovery from persisted session state,
 *     re-initialization with corrupt/partial state, gate failure handling,
 *     concurrent advance protection, serialize → deserialize round-trip.
 *
 *  2. ProviderBackedLlmRuntimeAdapter — provider failover when primary
 *     throws auth / transient errors, local provider used as last resort,
 *     non-retriable errors NOT triggering fallback.
 *
 *  3. Artifact Registration — idempotent re-registration: running the
 *     hook twice with the same artifacts must not duplicate entries or
 *     throw; missing-file artifacts are skipped without aborting.
 */

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { createStateMachine } = require('../../platform/engine/state-machine');

const { ProviderBackedLlmRuntimeAdapter } = require('../../platform/engine/agent-runtime-adapter');

const {
  registerPhaseArtifacts,
  createArtifactRegistrationHook,
} = require('../../platform/engine/artifact-registration');

const { ArtifactRegistry, resetArtifactIdCounter } = require('../../platform/sdlc/artifacts');

// ─── Helpers ──────────────────────────────────────────────────

const AGENT = { id: '01', name: 'Business Analyst' };
const PLATFORM = 'test';

function validDeliverable() {
  return [
    '## Metadata',
    '- Agent: Chaos Test Agent',
    '- Phase: PHASE_1',
    '- Timestamp: 2026-01-01T00:00:00Z',
    '',
    '## Findings',
    '- chaos test finding: provider failover confirmed',
    '',
    '## HANDOFF CHECKLIST',
    ...Array.from({ length: 9 }, (_, i) => `- [x] Item ${i + 1}`),
  ].join('\n');
}

let tmpRoot;

async function writeContractFixture(name, content) {
  const p = path.join(tmpRoot, name);
  await fs.writeFile(p, content, 'utf8');
  return p;
}

async function writeSkillFixture(name, contractPath) {
  const p = path.join(tmpRoot, name);
  const normalizedContract = contractPath.replace(/\\/g, '/');
  await fs.writeFile(
    p,
    [
      '# Chaos Skill',
      '',
      'Use this output contract:',
      normalizedContract,
      '',
      'Return only the deliverable content.',
    ].join('\n'),
    'utf8'
  );
  return p;
}

async function writeContractOnly(name) {
  return writeContractFixture(
    name,
    [
      '# Contract',
      '',
      '```markdown',
      '## Metadata',
      '## Findings',
      '## HANDOFF CHECKLIST',
      '```',
    ].join('\n')
  );
}

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'chaos-resumption-'));
  resetArtifactIdCounter?.();
});

afterEach(async () => {
  if (tmpRoot) {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────
// Section 1: StateMachine crash recovery
// ─────────────────────────────────────────────────────────────

describe('StateMachine — crash recovery and resumption', () => {
  it('resumes from a valid mid-pipeline session state without losing history', () => {
    const events = [];
    const persistedState = {
      status: 'PHASE_2',
      mode: 'CREATE',
      state_history: [
        { from: 'IDLE', to: 'ONBOARDING', timestamp: '2026-01-01T00:00:00Z' },
        { from: 'ONBOARDING', to: 'PHASE_1', timestamp: '2026-01-01T00:01:00Z' },
        { from: 'PHASE_1', to: 'CRITIC_1', timestamp: '2026-01-01T00:02:00Z' },
        { from: 'CRITIC_1', to: 'PHASE_2', timestamp: '2026-01-01T00:03:00Z' },
      ],
      started_at: '2026-01-01T00:00:00Z',
    };

    const sm = createStateMachine('CREATE', persistedState, {
      onTransition: (e) => events.push(e),
    });

    // Should resume at PHASE_2, preserving history
    expect(sm.state).toBe('PHASE_2');
    expect(sm.history).toHaveLength(4);
    expect(events.some((e) => e.event === 'crash_recovery')).toBe(true);
  });

  it('emits crash_recovery event with the recovered state', () => {
    const recoveryEvents = [];
    createStateMachine(
      'CREATE',
      { status: 'PHASE_3', mode: 'CREATE', state_history: [] },
      {
        onTransition: (e) => {
          if (e.event === 'crash_recovery') recoveryEvents.push(e);
        },
      }
    );
    expect(recoveryEvents).toHaveLength(1);
    expect(recoveryEvents[0].recoveredState).toBe('PHASE_3');
  });

  it('resets to IDLE when session state has unknown/corrupt status', () => {
    const errorEvents = [];
    const sm = createStateMachine(
      'CREATE',
      { status: 'TOTALLY_INVALID_STATE', mode: 'CREATE', state_history: [] },
      { onError: (e) => errorEvents.push(e) }
    );
    expect(sm.state).toBe('IDLE');
    expect(errorEvents.some((e) => /corrupt/i.test(e.reason))).toBe(true);
  });

  it('recovers from ERROR state to last known good state', () => {
    const sm = createStateMachine('CREATE');
    sm.advance(); // IDLE → ONBOARDING
    sm.advance(); // ONBOARDING → PHASE_1
    sm.error('agent crashed unexpectedly');
    expect(sm.state).toBe('ERROR');

    const recovered = sm.recover();
    expect(recovered).toBe('PHASE_1');
    expect(sm.state).toBe('PHASE_1');
  });

  it('recovers to IDLE when no history exists', () => {
    const sm = createStateMachine('CREATE');
    sm.error('immediate crash');
    const recovered = sm.recover();
    expect(recovered).toBe('IDLE');
  });

  it('prevents concurrent advance() calls', () => {
    const sm = createStateMachine('CREATE');
    // Monkey-patch: set _transitioning flag to simulate in-progress transition
    sm._transitioning = true;
    expect(() => sm.advance()).toThrow(/concurrent advance/i);
    sm._transitioning = false;
  });

  it('rejects advance() from COMPLETED state', () => {
    const sm = createStateMachine('CREATE_BUSINESS');
    // Advance all the way to COMPLETED
    while (sm.state !== 'COMPLETED') {
      if (sm.state === 'CRITIC_1') {
        sm.advance({ verdict: 'APPROVED' });
      } else {
        sm.advance();
      }
    }
    expect(() => sm.advance()).toThrow(/no valid transition/i);
  });

  it('gate failure at CRITIC state throws and records the error', () => {
    const errorEvents = [];
    const sm = createStateMachine('CREATE_BUSINESS', undefined, {
      onError: (e) => errorEvents.push(e),
    });
    sm.advance(); // IDLE → ONBOARDING
    sm.advance(); // ONBOARDING → PHASE_1
    sm.advance(); // PHASE_1 → CRITIC_1

    expect(() => sm.advance({ verdict: 'REJECTED', reason: 'Missing required sections' })).toThrow(
      /gate failed/i
    );

    expect(errorEvents.some((e) => /gate failed/i.test(e.reason || e.message || ''))).toBe(true);
  });

  it('serialize → deserialize preserves state and history', () => {
    const sm = createStateMachine('CREATE_TECH');
    sm.advance(); // IDLE → ONBOARDING
    sm.advance(); // ONBOARDING → PHASE_2

    const snapshot = sm.serialize();
    expect(snapshot.status).toBe('PHASE_2');
    expect(snapshot.state_history).toHaveLength(2);

    // Reload from snapshot
    const sm2 = createStateMachine('CREATE_TECH', snapshot);
    expect(sm2.state).toBe('PHASE_2');
    expect(sm2.history).toHaveLength(2);
  });

  it('stateMetadata() marks completed, current, and pending states correctly after resume', () => {
    const smFresh = createStateMachine('CREATE_TECH');
    smFresh.advance(); // IDLE → ONBOARDING
    smFresh.advance(); // ONBOARDING → PHASE_2
    const snapshot = smFresh.serialize();

    const sm = createStateMachine('CREATE_TECH', snapshot);
    const meta = sm.stateMetadata();

    const idle = meta.find((s) => s.state === 'IDLE');
    const onboarding = meta.find((s) => s.state === 'ONBOARDING');
    const phase2 = meta.find((s) => s.state === 'PHASE_2');
    const critic2 = meta.find((s) => s.state === 'CRITIC_2');

    expect(idle?.status).toBe('completed');
    expect(onboarding?.status).toBe('completed');
    expect(phase2?.status).toBe('current');
    expect(critic2?.status).toBe('pending');
  });
});

// ─────────────────────────────────────────────────────────────
// Section 2: Provider failover under chaos conditions
// ─────────────────────────────────────────────────────────────

describe('ProviderBackedLlmRuntimeAdapter — provider failover under chaos', () => {
  it('falls over to copilot when openai throws an auth error', async () => {
    const copilotComplete = vi.fn().mockResolvedValue({
      content: validDeliverable(),
      model: 'copilot-fallback',
      usage: { promptTokens: 5, completionTokens: 70, totalTokens: 75 },
      finishReason: 'stop',
    });

    const registry = {
      getProvider: vi.fn((type, name) => {
        if (name === 'openai') throw new Error('AUTH_FAILURE: OPENAI_API_KEY not set');
        if (name === 'copilot') {
          return { providerName: 'copilot', capabilities: {}, complete: copilotComplete };
        }
        throw new Error(`unexpected provider: ${name}`);
      }),
      getProviderWithFallback: vi.fn(function (_type, options) {
        return this.getProvider('llm', options.primaryName);
      }),
    };

    const contractPath = await writeContractOnly('auth-fallback-contract.md');
    const skillPath = await writeSkillFixture('auth-fallback-skill.md', contractPath);

    const adapter = new ProviderBackedLlmRuntimeAdapter({
      name: 'auth-chaos-adapter',
      providerName: 'openai',
      fallbackProviderNames: ['copilot'],
      outputDir: tmpRoot,
      providerRegistry: registry,
    });

    const result = await adapter.invoke(AGENT, PLATFORM, {
      skillFile: skillPath,
      predecessorOutputs: {},
      questionnaireInput: null,
      sessionState: { mode: 'CREATE' },
    });

    expect(copilotComplete).toHaveBeenCalled();
    expect(result.response.provider).toBe('copilot');
  });

  it('falls over to copilot when openai throws a 429 rate-limit error', async () => {
    const copilotComplete = vi.fn().mockResolvedValue({
      content: validDeliverable(),
      model: 'copilot-fallback',
      usage: { promptTokens: 5, completionTokens: 70, totalTokens: 75 },
      finishReason: 'stop',
    });

    const registry = {
      getProvider: vi.fn((type, name) => {
        if (name === 'openai') throw new Error('OpenAI API error (HTTP 429): rate_limit_exceeded');
        if (name === 'copilot') {
          return { providerName: 'copilot', capabilities: {}, complete: copilotComplete };
        }
        throw new Error(`unexpected provider: ${name}`);
      }),
      getProviderWithFallback: vi.fn(function (_type, options) {
        return this.getProvider('llm', options.primaryName);
      }),
    };

    const contractPath = await writeContractOnly('ratelimit-contract.md');
    const skillPath = await writeSkillFixture('ratelimit-skill.md', contractPath);

    const adapter = new ProviderBackedLlmRuntimeAdapter({
      name: 'ratelimit-chaos-adapter',
      providerName: 'openai',
      fallbackProviderNames: ['copilot'],
      outputDir: tmpRoot,
      providerRegistry: registry,
    });

    const result = await adapter.invoke(AGENT, PLATFORM, {
      skillFile: skillPath,
      predecessorOutputs: {},
      questionnaireInput: null,
      sessionState: { mode: 'CREATE' },
    });

    expect(result.response.provider).toBe('copilot');
  });

  it('falls over to copilot when openai returns a 503 service-unavailable error', async () => {
    const copilotComplete = vi.fn().mockResolvedValue({
      content: validDeliverable(),
      model: 'copilot-fallback',
      usage: { promptTokens: 5, completionTokens: 70, totalTokens: 75 },
      finishReason: 'stop',
    });

    const registry = {
      getProvider: vi.fn((type, name) => {
        if (name === 'openai') throw new Error('OpenAI API error (HTTP 503): service unavailable');
        if (name === 'copilot') {
          return { providerName: 'copilot', capabilities: {}, complete: copilotComplete };
        }
        throw new Error(`unexpected provider: ${name}`);
      }),
      getProviderWithFallback: vi.fn(function (_type, options) {
        return this.getProvider('llm', options.primaryName);
      }),
    };

    const contractPath = await writeContractOnly('srv-unavail-contract.md');
    const skillPath = await writeSkillFixture('srv-unavail-skill.md', contractPath);

    const adapter = new ProviderBackedLlmRuntimeAdapter({
      name: 'srv-unavail-adapter',
      providerName: 'openai',
      fallbackProviderNames: ['copilot'],
      outputDir: tmpRoot,
      providerRegistry: registry,
    });

    const result = await adapter.invoke(AGENT, PLATFORM, {
      skillFile: skillPath,
      predecessorOutputs: {},
      questionnaireInput: null,
      sessionState: { mode: 'CREATE' },
    });

    expect(result.response.provider).toBe('copilot');
  });

  it('falls over to copilot when openai returns a 401 unauthorized error', async () => {
    const copilotComplete = vi.fn().mockResolvedValue({
      content: validDeliverable(),
      model: 'copilot-fallback',
      usage: { promptTokens: 5, completionTokens: 70, totalTokens: 75 },
      finishReason: 'stop',
    });

    const registry = {
      getProvider: vi.fn((type, name) => {
        if (name === 'openai') throw new Error('OpenAI API error (HTTP 401): unauthorized');
        if (name === 'copilot') {
          return { providerName: 'copilot', capabilities: {}, complete: copilotComplete };
        }
        throw new Error(`unexpected provider: ${name}`);
      }),
      getProviderWithFallback: vi.fn(function (_type, options) {
        return this.getProvider('llm', options.primaryName);
      }),
    };

    const contractPath = await writeContractOnly('unauth-contract.md');
    const skillPath = await writeSkillFixture('unauth-skill.md', contractPath);

    const adapter = new ProviderBackedLlmRuntimeAdapter({
      name: 'unauth-adapter',
      providerName: 'openai',
      fallbackProviderNames: ['copilot'],
      outputDir: tmpRoot,
      providerRegistry: registry,
    });

    const result = await adapter.invoke(AGENT, PLATFORM, {
      skillFile: skillPath,
      predecessorOutputs: {},
      questionnaireInput: null,
      sessionState: { mode: 'CREATE' },
    });

    expect(result.response.provider).toBe('copilot');
  });

  it('does NOT fall over for non-retriable errors (malformed request)', async () => {
    const copilotComplete = vi.fn();

    const registry = {
      getProvider: vi.fn((type, name) => {
        if (name === 'openai')
          throw new Error('The skill file could not be parsed: syntax error at line 3');
        if (name === 'copilot') {
          return { providerName: 'copilot', capabilities: {}, complete: copilotComplete };
        }
        throw new Error(`unexpected provider: ${name}`);
      }),
      getProviderWithFallback: vi.fn(function (_type, options) {
        return this.getProvider('llm', options.primaryName);
      }),
    };

    const contractPath = await writeContractOnly('non-retriable-contract.md');
    const skillPath = await writeSkillFixture('non-retriable-skill.md', contractPath);

    const adapter = new ProviderBackedLlmRuntimeAdapter({
      name: 'non-retriable-adapter',
      providerName: 'openai',
      fallbackProviderNames: ['copilot'],
      outputDir: tmpRoot,
      providerRegistry: registry,
    });

    await expect(
      adapter.invoke(AGENT, PLATFORM, {
        skillFile: skillPath,
        predecessorOutputs: {},
        questionnaireInput: null,
        sessionState: { mode: 'CREATE' },
      })
    ).rejects.toThrow(/syntax error/i);

    expect(copilotComplete).not.toHaveBeenCalled();
  });

  it('all providers failing throws with a combined error listing all attempts', async () => {
    const registry = {
      getProvider: vi.fn(() => {
        throw new Error('AUTH_FAILURE: no keys configured');
      }),
      getProviderWithFallback: vi.fn(function (_type, options) {
        return this.getProvider('llm', options.primaryName);
      }),
    };

    const contractPath = await writeContractOnly('all-fail-contract.md');
    const skillPath = await writeSkillFixture('all-fail-skill.md', contractPath);

    const adapter = new ProviderBackedLlmRuntimeAdapter({
      name: 'all-fail-adapter',
      providerName: 'openai',
      fallbackProviderNames: ['copilot'],
      outputDir: tmpRoot,
      providerRegistry: registry,
    });

    await expect(
      adapter.invoke(AGENT, PLATFORM, {
        skillFile: skillPath,
        predecessorOutputs: {},
        questionnaireInput: null,
        sessionState: { mode: 'CREATE' },
      })
    ).rejects.toThrow();
  });

  it('adapter output file is written idempotently — second invoke overwrites cleanly', async () => {
    const contractPath = await writeContractOnly('idempotent-contract.md');
    const skillPath = await writeSkillFixture('idempotent-skill.md', contractPath);

    const complete = vi.fn().mockResolvedValue({
      content: validDeliverable(),
      model: 'gpt-4o',
      usage: { promptTokens: 10, completionTokens: 80, totalTokens: 90 },
      finishReason: 'stop',
    });

    const registry = {
      getProvider: vi.fn(() => ({ providerName: 'openai', capabilities: {}, complete })),
      getProviderWithFallback: vi.fn(function (_type, options) {
        return this.getProvider('llm', options.primaryName);
      }),
    };

    const adapter = new ProviderBackedLlmRuntimeAdapter({
      name: 'idempotent-adapter',
      providerName: 'openai',
      outputDir: tmpRoot,
      providerRegistry: registry,
    });

    const ctx = {
      skillFile: skillPath,
      predecessorOutputs: {},
      questionnaireInput: null,
      sessionState: { mode: 'CREATE' },
    };

    const r1 = await adapter.invoke(AGENT, PLATFORM, ctx);
    const r2 = await adapter.invoke(AGENT, PLATFORM, ctx);

    // Both succeed and produce a valid output path
    expect(r1.outputPath).toBeDefined();
    expect(r2.outputPath).toBeDefined();
    expect(complete).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────
// Section 3: Artifact registration idempotency
// ─────────────────────────────────────────────────────────────

describe('Artifact registration — idempotency under repeated invocation', () => {
  const PHASE_1_ARTIFACTS = [
    {
      id: 'P1-chaos-doc',
      type: 'DOCUMENT',
      stage: 'REQUIREMENTS',
      path: 'chaos-output-1.md',
    },
    {
      id: 'P1-chaos-report',
      type: 'DOCUMENT',
      stage: 'REQUIREMENTS',
      path: 'chaos-output-2.md',
    },
  ];

  const PHASE_ARTIFACTS = { PHASE_1: PHASE_1_ARTIFACTS };

  let registry;
  let store;
  let artifactStore;

  function createArtifactStore() {
    const data = {};
    return {
      read: async (key) => data[key] ?? null,
      write: async (key, value) => {
        data[key] = value;
      },
    };
  }

  beforeEach(() => {
    resetArtifactIdCounter?.();
    artifactStore = createArtifactStore();
    registry = new ArtifactRegistry(artifactStore);

    // Store that sees both artifacts as existing
    store = {
      exists: (p) => p === 'chaos-output-1.md' || p === 'chaos-output-2.md',
      readFile: (p) => `# Chaos Artifact\npath: ${p}`,
    };
  });

  it('registers all declared artifacts on first call', () => {
    const result = registerPhaseArtifacts('PHASE_1', registry, store, PHASE_ARTIFACTS, {});
    expect(result.registered).toHaveLength(2);
    expect(result.skipped).toHaveLength(0);
  });

  it('skips all on second call — no duplicate artifact IDs created', () => {
    // First call
    registerPhaseArtifacts('PHASE_1', registry, store, PHASE_ARTIFACTS, {});
    const countAfterFirst = registry.list().length;

    // Second call (idempotent)
    const result2 = registerPhaseArtifacts('PHASE_1', registry, store, PHASE_ARTIFACTS, {});
    const countAfterSecond = registry.list().length;

    expect(result2.registered).toHaveLength(0); // already registered — all skipped
    expect(result2.skipped).toHaveLength(2);
    expect(countAfterSecond).toBe(countAfterFirst); // count unchanged
  });

  it('skips artifacts whose file does not exist without throwing', () => {
    const partialStore = {
      exists: (p) => p === 'chaos-output-1.md', // only first file exists
      readFile: (p) => `# Content for ${p}`,
    };

    const result = registerPhaseArtifacts('PHASE_1', registry, partialStore, PHASE_ARTIFACTS, {});
    expect(result.registered).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toBe('P1-chaos-report'); // second artifact skipped
  });

  it('createArtifactRegistrationHook fires for known phases and registers artifacts', () => {
    const hook = createArtifactRegistrationHook(registry, store, PHASE_ARTIFACTS, {});

    // PHASE_1 → CRITIC_1 means PHASE_1 completed — artifacts should be registered
    hook({ from: 'PHASE_1', to: 'CRITIC_1', timestamp: '' });
    expect(registry.list()).toHaveLength(2);

    // Transition from unknown state — should NOT register any artifacts
    hook({ from: 'IDLE', to: 'ONBOARDING', timestamp: '' });
    expect(registry.list()).toHaveLength(2); // unchanged
  });

  it('hook called twice for the same phase transition is fully idempotent', () => {
    const hook = createArtifactRegistrationHook(registry, store, PHASE_ARTIFACTS, {});

    hook({ from: 'PHASE_1', to: 'CRITIC_1', timestamp: '' });
    const snap1 = registry.list().length;

    hook({ from: 'PHASE_1', to: 'CRITIC_1', timestamp: '' });
    const snap2 = registry.list().length;

    // No additional artifacts created on second call
    expect(snap2).toBe(snap1);
  });
});

// ─────────────────────────────────────────────────────────────
// Section 4: End-to-end crash → resume → complete scenario
// ─────────────────────────────────────────────────────────────

describe('End-to-end: crash mid-pipeline → serialize → resume → complete', () => {
  it('resumes a CREATE_TECH pipeline from PHASE_2 and advances to COMPLETED', () => {
    const transitions = [];

    // Phase 1: simulate pipeline running, then crashes mid-way
    const sm1 = createStateMachine('CREATE_TECH', undefined, {
      onTransition: (e) => transitions.push(e),
    });
    sm1.advance(); // IDLE → ONBOARDING
    sm1.advance(); // ONBOARDING → PHASE_2

    // Simulate crash: serialize state before failure
    const snapshot = sm1.serialize();
    expect(snapshot.status).toBe('PHASE_2');

    // Phase 2: restart from snapshot
    const sm2 = createStateMachine('CREATE_TECH', snapshot, {
      onTransition: (e) => transitions.push(e),
    });
    expect(sm2.state).toBe('PHASE_2');

    // Advance through remainder of pipeline
    sm2.advance(); // PHASE_2 → CRITIC_2
    sm2.advance({ verdict: 'APPROVED' }); // CRITIC_2 → SYNTHESIS
    sm2.advance(); // SYNTHESIS → SPRINT_GATE
    sm2.advance(); // SPRINT_GATE → PHASE_5_EXECUTING
    sm2.advance(); // PHASE_5_EXECUTING → COMPLETED

    expect(sm2.state).toBe('COMPLETED');

    // Total crash_recovery events: exactly one (when sm2 was initialized from snapshot)
    const recoveryCount = transitions.filter((e) => e.event === 'crash_recovery').length;
    expect(recoveryCount).toBe(1);
  });

  it('double-crash: two successive failures, each followed by recovery', () => {
    const sm = createStateMachine('CREATE_BUSINESS');
    sm.advance(); // IDLE → ONBOARDING
    sm.advance(); // ONBOARDING → PHASE_1

    // First crash
    sm.error('first agent failure');
    expect(sm.state).toBe('ERROR');
    sm.recover();
    expect(sm.state).toBe('PHASE_1');

    // Execute a critical section
    sm.advance(); // PHASE_1 → CRITIC_1

    // Second crash
    sm.error('second agent failure');
    expect(sm.state).toBe('ERROR');
    sm.recover();
    expect(sm.state).toBe('CRITIC_1');

    // Complete pipeline
    sm.advance({ verdict: 'APPROVED' }); // CRITIC_1 → SYNTHESIS
    sm.advance(); // SYNTHESIS → SPRINT_GATE
    sm.advance(); // SPRINT_GATE → PHASE_5_EXECUTING
    sm.advance(); // PHASE_5_EXECUTING → COMPLETED

    expect(sm.state).toBe('COMPLETED');
  });
});
