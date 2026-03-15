'use strict';

/**
 * SDLC Adapters — Unit Tests
 *
 * Validates the AdapterRegistry, BaseAdapter, ToolAdapter interface,
 * and concrete adapter stubs (git, ci, container, cloud, security,
 * testing, llm).
 */

const {
  AdapterRegistry,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
} = require('../../platform/sdlc/adapters/tool-adapter');
const { GitAdapter } = require('../../platform/sdlc/adapters/git-adapter');
const { CiAdapter } = require('../../platform/sdlc/adapters/ci-adapter');
const { ContainerAdapter } = require('../../platform/sdlc/adapters/container-adapter');
const { CloudAdapter } = require('../../platform/sdlc/adapters/cloud-adapter');
const { SecurityAdapter } = require('../../platform/sdlc/adapters/security-adapter');
const { TestingAdapter } = require('../../platform/sdlc/adapters/testing-adapter');
const { LlmAdapter } = require('../../platform/sdlc/adapters/llm-adapter');

// ─── Enum Guards ─────────────────────────────────────────────

describe('Adapter enums', () => {
  it('ADAPTER_CATEGORIES has 7 entries', () => {
    expect(Object.keys(ADAPTER_CATEGORIES)).toHaveLength(7);
  });

  it('HEALTH_STATUS has 4 entries', () => {
    expect(Object.keys(HEALTH_STATUS)).toHaveLength(4);
  });

  it('enums are frozen', () => {
    expect(Object.isFrozen(ADAPTER_CATEGORIES)).toBe(true);
    expect(Object.isFrozen(HEALTH_STATUS)).toBe(true);
  });
});

// ─── AdapterRegistry ─────────────────────────────────────────

describe('AdapterRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new AdapterRegistry();
  });

  it('register() adds an adapter', () => {
    const git = new GitAdapter();
    registry.register(git);
    expect(registry.get('git')).toBe(git);
  });

  it('register() throws on duplicate name', () => {
    registry.register(new GitAdapter());
    expect(() => registry.register(new GitAdapter())).toThrow(/already registered/);
  });

  it('unregister() removes an adapter', () => {
    registry.register(new GitAdapter());
    expect(registry.unregister('git')).toBe(true);
    expect(registry.get('git')).toBeUndefined();
  });

  it('unregister() returns false for unknown adapter', () => {
    expect(registry.unregister('nonexistent')).toBe(false);
  });

  it('getByCategory() returns adapters of a given category', () => {
    registry.register(new GitAdapter());
    registry.register(new CiAdapter());
    const gitAdapters = registry.getByCategory('GIT');
    expect(gitAdapters).toHaveLength(1);
    expect(gitAdapters[0].name).toBe('git');
  });

  it('listAll() returns summary of all adapters', () => {
    registry.register(new GitAdapter());
    registry.register(new CiAdapter());
    const list = registry.listAll();
    expect(list).toHaveLength(2);
    expect(list[0]).toHaveProperty('name');
    expect(list[0]).toHaveProperty('category');
    expect(list[0]).toHaveProperty('version');
  });

  it('healthCheckAll() returns health for all adapters', async () => {
    registry.register(new GitAdapter());
    registry.register(new CiAdapter());
    const checks = await registry.healthCheckAll();
    expect(checks).toHaveLength(2);
    expect(checks[0]).toHaveProperty('status');
  });
});

// ─── GitAdapter ──────────────────────────────────────────────

describe('GitAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new GitAdapter();
  });

  it('has correct name and category', () => {
    expect(adapter.name).toBe('git');
    expect(adapter.category).toBe('GIT');
  });

  it('listOperations() returns known operations', () => {
    const ops = adapter.listOperations();
    expect(ops).toContain('list-branches');
    expect(ops).toContain('list-commits');
    expect(ops).toContain('create-branch');
  });

  it('execute() returns success result for known operation', async () => {
    const result = await adapter.execute('list-branches', {});
    expect(result.success).toBe(true);
    expect(result.adapter).toBe('git');
    expect(result.operation).toBe('list-branches');
  });

  it('execute() returns error for unknown operation', async () => {
    const result = await adapter.execute('nonexistent', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown operation');
  });

  it('healthCheck() returns HEALTHY with default config', async () => {
    const check = await adapter.healthCheck();
    expect(check.status).toBe('HEALTHY');
    expect(check.adapter).toBe('git');
  });

  it('validateConfig() rejects missing repository_path', () => {
    const result = adapter.validateConfig({});
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('validateConfig() accepts valid config', () => {
    const result = adapter.validateConfig({ repository_path: '/repo' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ─── Concrete Adapters — category and name checks ────────────

describe('Concrete adapters — identity', () => {
  const cases = [
    { Ctor: CiAdapter, name: 'ci', category: 'CI' },
    { Ctor: ContainerAdapter, name: 'container', category: 'CONTAINER' },
    { Ctor: CloudAdapter, name: 'cloud', category: 'CLOUD' },
    { Ctor: SecurityAdapter, name: 'security', category: 'SECURITY' },
    { Ctor: TestingAdapter, name: 'testing', category: 'TESTING' },
    { Ctor: LlmAdapter, name: 'llm', category: 'LLM' },
  ];

  for (const { Ctor, name, category } of cases) {
    it(`${name} adapter has correct name and category`, () => {
      const adapter = new Ctor();
      expect(adapter.name).toBe(name);
      expect(adapter.category).toBe(category);
    });

    it(`${name} adapter lists operations`, () => {
      const adapter = new Ctor();
      expect(adapter.listOperations().length).toBeGreaterThan(0);
    });

    it(`${name} adapter healthCheck returns valid status`, async () => {
      const adapter = new Ctor();
      const check = await adapter.healthCheck();
      expect(['HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'UNCONFIGURED']).toContain(check.status);
      expect(check.adapter).toBe(name);
      expect(check.category).toBe(category);
    });
  }
});
