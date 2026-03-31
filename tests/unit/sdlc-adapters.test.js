/**
 * SDLC Adapters — Unit Tests
 *
 * Validates the AdapterRegistry, BaseAdapter, ToolAdapter interface,
 * and concrete adapter stubs (git, ci, container, cloud, security,
 * testing, llm).
 */

import * as __req_0 from '../../platform/sdlc/adapters/tool-adapter';
const { AdapterRegistry, ADAPTER_CATEGORIES, HEALTH_STATUS } = __req_0;
import * as __req_1 from '../../platform/sdlc/adapters/git-adapter';
const { GitAdapter } = __req_1;
import * as __req_2 from '../../platform/sdlc/adapters/ci-adapter';
const { CiAdapter } = __req_2;
import * as __req_3 from '../../platform/sdlc/adapters/container-adapter';
const { ContainerAdapter } = __req_3;
import * as __req_4 from '../../platform/sdlc/adapters/cloud-adapter';
const { CloudAdapter } = __req_4;
import * as __req_5 from '../../platform/sdlc/adapters/security-adapter';
const { SecurityAdapter } = __req_5;
import * as __req_6 from '../../platform/sdlc/adapters/testing-adapter';
const { TestingAdapter } = __req_6;
import * as __req_7 from '../../platform/sdlc/adapters/llm-adapter';
const { LlmAdapter } = __req_7;

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

  it('execute() create-branch succeeds with injected git service', async () => {
    const gitService = {
      branch: vi.fn(async () => [{ info: { branches: ['main', 'feature/test'] } }, null]),
      log: vi.fn(async () => [{ entries: [] }, null]),
      status: vi.fn(async () => [{ entries: [], clean: true }, null]),
    };

    const result = await adapter.execute('create-branch', {
      name: 'feature/test',
      __agentContext: { gitService },
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ branch: 'feature/test', created: true });
    expect(gitService.branch).toHaveBeenCalledWith({ op: 'create', name: 'feature/test' });
  });

  it('execute() list-branches returns adapter error when git service tuple has error', async () => {
    const gitService = {
      branch: vi.fn(async () => [null, new Error('branch list failed')]),
      log: vi.fn(async () => [{ entries: [] }, null]),
      status: vi.fn(async () => [{ entries: [], clean: true }, null]),
    };

    const result = await adapter.execute('list-branches', {
      __agentContext: { gitService },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('branch list failed');
  });

  it('execute() list-commits returns adapter error when git service tuple has error', async () => {
    const gitService = {
      branch: vi.fn(async () => [{ info: { branches: ['main'] } }, null]),
      log: vi.fn(async () => [null, new Error('log failed')]),
      status: vi.fn(async () => [{ entries: [], clean: true }, null]),
    };

    const result = await adapter.execute('list-commits', {
      limit: 2,
      __agentContext: { gitService },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('log failed');
  });

  it('execute() status returns adapter error when git service tuple has error', async () => {
    const gitService = {
      branch: vi.fn(async () => [{ info: { branches: ['main'] } }, null]),
      log: vi.fn(async () => [{ entries: [] }, null]),
      status: vi.fn(async () => [null, new Error('status failed')]),
    };

    const result = await adapter.execute('status', {
      __agentContext: { gitService },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('status failed');
  });

  it('execute() returns timeout error for long-running git service operation', async () => {
    const timeoutAdapter = new GitAdapter({ repository_path: '/repo', timeout: 1 });
    const hangingService = {
      branch: vi.fn(() => new Promise(() => {})),
      log: vi.fn(async () => [{ entries: [] }, null]),
      status: vi.fn(async () => [{ entries: [], clean: true }, null]),
    };

    const result = await timeoutAdapter.execute('list-branches', {
      __agentContext: { gitService: hangingService },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Git operation timeout');
  });

  it('healthCheck() returns UNCONFIGURED when repository path is missing', async () => {
    const unconfiguredAdapter = new GitAdapter({ repository_path: '' });
    const check = await unconfiguredAdapter.healthCheck();

    expect(check.status).toBe('UNCONFIGURED');
    expect(check.message).toContain('No repository path configured');
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
    }, 15000);
  }
});
