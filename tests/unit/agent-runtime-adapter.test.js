'use strict';

/**
 * AgentRuntimeAdapter — Unit & Integration Tests (Epic E-A1 / I-A1-004)
 *
 * Covers:
 * - I-A1-001: AgentRuntimeAdapter interface, AdapterRegistry, built-in adapters
 * - I-A1-002: Dispatcher._defaultInvoker delegates to adapter when configured
 * - I-A1-003: Adapter resolution wiring (resolveAdapter helper)
 * - I-A1-004: Configured adapter succeeds; missing adapter surfaces config error
 *             at invocation (not a silent no-op).
 */

const {
  NullAdapter,
  LogOnlyAdapter,
  AdapterRegistry,
  DEFAULT_REGISTRY,
  resolveAdapter,
} = require('../../platform/engine/agent-runtime-adapter');

const { Dispatcher } = require('../../platform/engine/dispatcher');

// ─── Test Helpers ────────────────────────────────────────────

function createMockStore(files = {}) {
  return {
    exists: (fp) => fp in files,
    read: (fp) => files[fp] || '',
    write: (fp, content) => {
      files[fp] = content;
    },
  };
}

const AGENT = { id: '01', name: 'Business Analyst' };
const PLATFORM = 'copilot';
const CONTEXT = { agentId: '01', predecessorOutputs: {}, questionnaireInput: null };

// ─────────────────────────────────────────────────────────────
// NullAdapter
// ─────────────────────────────────────────────────────────────
describe('NullAdapter', () => {
  it('has name "null"', () => {
    expect(new NullAdapter().name).toBe('null');
  });

  it('invoke returns an outputPath containing the agent id', async () => {
    const adapter = new NullAdapter();
    const result = await adapter.invoke(AGENT, PLATFORM, CONTEXT);
    expect(result).toHaveProperty('outputPath');
    expect(result.outputPath).toContain(AGENT.id);
  });

  it('invoke resolves without throwing', async () => {
    await expect(new NullAdapter().invoke(AGENT, PLATFORM, CONTEXT)).resolves.toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// LogOnlyAdapter
// ─────────────────────────────────────────────────────────────
describe('LogOnlyAdapter', () => {
  it('has name "log-only"', () => {
    expect(new LogOnlyAdapter().name).toBe('log-only');
  });

  it('invoke returns an outputPath containing the agent id', async () => {
    const adapter = new LogOnlyAdapter();
    const result = await adapter.invoke(AGENT, PLATFORM, CONTEXT);
    expect(result).toHaveProperty('outputPath');
    expect(result.outputPath).toContain(AGENT.id);
  });

  it('invoke resolves without throwing', async () => {
    await expect(new LogOnlyAdapter().invoke(AGENT, PLATFORM, CONTEXT)).resolves.toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// AdapterRegistry
// ─────────────────────────────────────────────────────────────
describe('AdapterRegistry', () => {
  it('register and get round-trip', () => {
    const registry = new AdapterRegistry();
    const adapter = new NullAdapter();
    registry.register(adapter);
    expect(registry.get('null')).toBe(adapter);
  });

  it('resolve is an alias for get', () => {
    const registry = new AdapterRegistry();
    const adapter = new LogOnlyAdapter();
    registry.register(adapter);
    expect(registry.resolve('log-only')).toBe(adapter);
  });

  it('get returns undefined for unknown name', () => {
    const registry = new AdapterRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('listNames returns all registered adapter names', () => {
    const registry = new AdapterRegistry();
    registry.register(new NullAdapter());
    registry.register(new LogOnlyAdapter());
    expect(registry.listNames()).toEqual(expect.arrayContaining(['null', 'log-only']));
  });

  it('overwrites existing registration with same name', () => {
    const registry = new AdapterRegistry();
    const a1 = new NullAdapter();
    const a2 = new NullAdapter();
    registry.register(a1);
    registry.register(a2);
    expect(registry.get('null')).toBe(a2);
  });
});

// ─────────────────────────────────────────────────────────────
// DEFAULT_REGISTRY
// ─────────────────────────────────────────────────────────────
describe('DEFAULT_REGISTRY', () => {
  it('contains null adapter', () => {
    expect(DEFAULT_REGISTRY.get('null')).toBeInstanceOf(NullAdapter);
  });

  it('contains log-only adapter', () => {
    expect(DEFAULT_REGISTRY.get('log-only')).toBeInstanceOf(LogOnlyAdapter);
  });
});

// ─────────────────────────────────────────────────────────────
// resolveAdapter
// ─────────────────────────────────────────────────────────────
describe('resolveAdapter', () => {
  it('returns null adapter when adapterName is "null"', () => {
    const { adapter, error } = resolveAdapter({ adapterName: 'null' });
    expect(error).toBeNull();
    expect(adapter).toBeInstanceOf(NullAdapter);
  });

  it('returns log-only adapter when adapterName is "log-only"', () => {
    const { adapter, error } = resolveAdapter({ adapterName: 'log-only' });
    expect(error).toBeNull();
    expect(adapter).toBeInstanceOf(LogOnlyAdapter);
  });

  it('returns error when adapterName is unknown — config error at startup, not invocation', () => {
    const { adapter, error } = resolveAdapter({ adapterName: 'unknown-provider' });
    expect(adapter).toBeNull();
    expect(error).toContain('unknown-provider');
    expect(error).toContain('Available adapters');
  });

  it('defaults to null adapter for ci-test profile', () => {
    const { adapter, error } = resolveAdapter({ profile: 'ci-test' });
    expect(error).toBeNull();
    expect(adapter).toBeInstanceOf(NullAdapter);
  });

  it('defaults to log-only adapter for local-dev profile', () => {
    const { adapter, error } = resolveAdapter({ profile: 'local-dev' });
    expect(error).toBeNull();
    expect(adapter).toBeInstanceOf(LogOnlyAdapter);
  });

  it('defaults to log-only adapter when profile is undefined', () => {
    const { adapter, error } = resolveAdapter({});
    expect(error).toBeNull();
    expect(adapter).toBeInstanceOf(LogOnlyAdapter);
  });

  it('explicit adapterName overrides profile default', () => {
    const { adapter, error } = resolveAdapter({ adapterName: 'null', profile: 'local-dev' });
    expect(error).toBeNull();
    expect(adapter).toBeInstanceOf(NullAdapter);
  });

  it('uses provided registry instead of DEFAULT_REGISTRY', () => {
    const customRegistry = new AdapterRegistry();
    const customAdapter = { name: 'custom', invoke: async () => ({ outputPath: '/custom.md' }) };
    customRegistry.register(customAdapter);
    const { adapter, error } = resolveAdapter({ adapterName: 'custom', registry: customRegistry });
    expect(error).toBeNull();
    expect(adapter).toBe(customAdapter);
  });
});

// ─────────────────────────────────────────────────────────────
// Dispatcher + Adapter integration (I-A1-002)
// ─────────────────────────────────────────────────────────────
describe('Dispatcher + AgentRuntimeAdapter integration', () => {
  it('uses configured adapter when no explicit invoker is provided', async () => {
    const adapter = new NullAdapter();
    const dispatcher = new Dispatcher({ store: createMockStore(), adapter });
    const result = await dispatcher.invoke(AGENT, 'PHASE_1', CONTEXT);
    expect(result.success).toBe(true);
    expect(result.outputPath).toContain(AGENT.id);
  });

  it('configured adapter is invoked with correct arguments', async () => {
    const calls = [];
    const spyAdapter = {
      name: 'spy',
      invoke: async (agent, platform, context) => {
        calls.push({ agent, platform, context });
        return { outputPath: '/spy-output.md' };
      },
    };
    const dispatcher = new Dispatcher({ store: createMockStore(), adapter: spyAdapter });
    await dispatcher.invoke(AGENT, 'PHASE_1', CONTEXT);
    expect(calls).toHaveLength(1);
    expect(calls[0].agent).toEqual(AGENT);
    expect(calls[0].platform).toBe('copilot');
  });

  it('explicit invoker function takes precedence over adapter', async () => {
    const adapter = new NullAdapter(); // would return null-adapter path
    const explicitInvoker = async () => ({ outputPath: '/explicit-invoker-output.md' });
    const dispatcher = new Dispatcher({
      store: createMockStore(),
      adapter,
      invoker: explicitInvoker,
    });
    const result = await dispatcher.invoke(AGENT, 'PHASE_1', CONTEXT);
    expect(result.outputPath).toBe('/explicit-invoker-output.md');
  });

  it('throws config error — not silent — when no adapter and no invoker', async () => {
    // Missing adapter must surface as a config error message, not a silent no-op.
    const dispatcher = new Dispatcher({ store: createMockStore(), config: { maxRetries: 0 } });
    const result = await dispatcher.invoke(AGENT, 'PHASE_1', CONTEXT);
    expect(result.success).toBe(false);
    // Error message must clearly indicate it is a configuration issue.
    expect(result.error).toMatch(/No runtime adapter configured/);
  });

  it('adapter error propagates as failed invocation result', async () => {
    const failAdapter = {
      name: 'fail',
      invoke: async () => {
        throw new Error('Provider unavailable');
      },
    };
    const dispatcher = new Dispatcher({
      store: createMockStore(),
      adapter: failAdapter,
      config: { maxRetries: 0 },
    });
    const result = await dispatcher.invoke(AGENT, 'PHASE_1', CONTEXT);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Provider unavailable');
  });
});
