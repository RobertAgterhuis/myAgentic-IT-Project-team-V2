/**
 * Tool Executor — Unit Tests
 *
 * Tests the routing layer that routes tool operations to the correct adapter,
 * integrates the result cache, and enforces timeouts.
 */

import * as __req_0 from '../../platform/engine/tool-executor';
const { ToolExecutor } = __req_0;
import * as __req_1 from '../../platform/sdlc/adapters/tool-adapter';
const { AdapterRegistry, HEALTH_STATUS } = __req_1;

// ─── Test Adapter ────────────────────────────────────────────

class MockAdapter {
  constructor(name, category) {
    this.name = name;
    this.category = category;
    this.version = '1.0.0';
    this._ops = new Map();
    this._healthStatus = HEALTH_STATUS.HEALTHY;
  }

  addOp(name, handler) {
    this._ops.set(name, handler);
  }

  listOperations() {
    return [...this._ops.keys()];
  }

  async execute(operation, params) {
    const start = Date.now();
    const handler = this._ops.get(operation);
    if (!handler) {
      return {
        success: false,
        data: null,
        error: `Unknown operation: ${operation}`,
        duration_ms: 0,
        adapter: this.name,
        operation,
        timestamp: new Date().toISOString(),
      };
    }
    try {
      const data = await handler(params);
      return {
        success: true,
        data,
        error: null,
        duration_ms: Date.now() - start,
        adapter: this.name,
        operation,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        data: null,
        error: err.message,
        duration_ms: Date.now() - start,
        adapter: this.name,
        operation,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async healthCheck() {
    return {
      status: this._healthStatus,
      adapter: this.name,
      category: this.category,
      message: 'OK',
      checked_at: new Date().toISOString(),
    };
  }

  validateConfig() {
    return { valid: true, errors: [] };
  }
}

function createMemoryStore() {
  const files = {};
  return {
    exists: (p) => p in files,
    readFile: (p) => files[p],
    writeFile: (p, d) => {
      files[p] = d;
    },
    mkdirp: () => {},
  };
}

function createTestExecutor(adapters = [], options = {}) {
  const registry = new AdapterRegistry();
  for (const adapter of adapters) {
    registry.register(adapter);
  }
  const store = createMemoryStore();
  return new ToolExecutor({
    registry,
    store,
    cachePath: 'test-tool-cache.json',
    defaultTimeout: 5000,
    ...options,
  });
}

// ─── Tests ───────────────────────────────────────────────────

describe('ToolExecutor', () => {
  describe('routing', () => {
    it('routes by adapter name', async () => {
      const git = new MockAdapter('git', 'GIT');
      git.addOp('list-branches', async () => ({ branches: ['main'] }));
      const executor = createTestExecutor([git]);

      const result = await executor.execute({
        target: 'git',
        operation: 'list-branches',
        params: {},
      });

      expect(result.success).toBe(true);
      expect(result.adapter).toBe('git');
      expect(result.data.branches).toEqual(['main']);
      expect(result.fromCache).toBe(false);
    });

    it('routes by category', async () => {
      const git = new MockAdapter('git', 'GIT');
      git.addOp('list-branches', async () => ({ branches: ['main'] }));
      const executor = createTestExecutor([git]);

      const result = await executor.execute({
        target: 'GIT',
        operation: 'list-branches',
        params: {},
      });

      expect(result.success).toBe(true);
      expect(result.adapter).toBe('git');
    });

    it('returns error for unknown adapter', async () => {
      const executor = createTestExecutor([]);
      const result = await executor.execute({
        target: 'nonexistent',
        operation: 'anything',
        params: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No adapter found');
    });

    it('returns error for unsupported operation', async () => {
      const git = new MockAdapter('git', 'GIT');
      git.addOp('list-branches', async () => ({}));
      const executor = createTestExecutor([git]);

      const result = await executor.execute({
        target: 'git',
        operation: 'nonexistent-op',
        params: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not supported');
    });
  });

  describe('caching', () => {
    it('caches side-effect operation results', async () => {
      let callCount = 0;
      const git = new MockAdapter('git', 'GIT');
      git.addOp('create-branch', async (params) => {
        callCount++;
        return { branch: params.name, created: true };
      });
      const executor = createTestExecutor([git]);

      // First call — executes
      const r1 = await executor.execute({
        target: 'git',
        operation: 'create-branch',
        params: { name: 'feature-1' },
      });
      expect(r1.success).toBe(true);
      expect(r1.fromCache).toBe(false);
      expect(callCount).toBe(1);

      // Second call — from cache
      const r2 = await executor.execute({
        target: 'git',
        operation: 'create-branch',
        params: { name: 'feature-1' },
      });
      expect(r2.success).toBe(true);
      expect(r2.fromCache).toBe(true);
      expect(callCount).toBe(1); // NOT called again
    });

    it('does not cache read-only operations', async () => {
      let callCount = 0;
      const git = new MockAdapter('git', 'GIT');
      git.addOp('list-branches', async () => {
        callCount++;
        return { branches: ['main'] };
      });
      const executor = createTestExecutor([git]);

      await executor.execute({ target: 'git', operation: 'list-branches', params: {} });
      await executor.execute({ target: 'git', operation: 'list-branches', params: {} });
      expect(callCount).toBe(2); // Called both times
    });

    it('skipCache forces fresh execution', async () => {
      let callCount = 0;
      const git = new MockAdapter('git', 'GIT');
      git.addOp('create-branch', async () => {
        callCount++;
        return { ok: true };
      });
      const executor = createTestExecutor([git]);

      await executor.execute({
        target: 'git',
        operation: 'create-branch',
        params: { name: 'x' },
      });
      await executor.execute({
        target: 'git',
        operation: 'create-branch',
        params: { name: 'x' },
        skipCache: true,
      });
      expect(callCount).toBe(2);
    });
  });

  describe('timeout', () => {
    it('times out slow operations', async () => {
      const slow = new MockAdapter('slow', 'GIT');
      slow.addOp('hang', () => new Promise((resolve) => setTimeout(resolve, 10000)));
      const executor = createTestExecutor([slow]);

      const result = await executor.execute({
        target: 'slow',
        operation: 'hang',
        params: {},
        timeout: 200,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    });
  });

  describe('circuit breaker', () => {
    it('opens circuit after consecutive failures and fast-fails during cooldown', async () => {
      let callCount = 0;
      const flaky = new MockAdapter('flaky', 'GIT');
      flaky.addOp('status', async () => {
        callCount += 1;
        throw new Error('upstream failure');
      });

      const executor = createTestExecutor([flaky], {
        circuitBreakerFailureThreshold: 2,
        circuitBreakerCooldownMs: 500,
      });

      const first = await executor.execute({ target: 'flaky', operation: 'status', params: {} });
      expect(first.success).toBe(false);

      const second = await executor.execute({ target: 'flaky', operation: 'status', params: {} });
      expect(second.success).toBe(false);

      const third = await executor.execute({ target: 'flaky', operation: 'status', params: {} });
      expect(third.success).toBe(false);
      expect(third.error).toContain('CIRCUIT_OPEN');
      expect(callCount).toBe(2);
    });

    it('closes circuit after cooldown and allows execution again', async () => {
      let callCount = 0;
      const flaky = new MockAdapter('flaky', 'GIT');
      flaky.addOp('status', async () => {
        callCount += 1;
        throw new Error('still failing');
      });

      const executor = createTestExecutor([flaky], {
        circuitBreakerFailureThreshold: 1,
        circuitBreakerCooldownMs: 50,
      });

      const first = await executor.execute({ target: 'flaky', operation: 'status', params: {} });
      expect(first.success).toBe(false);

      const blocked = await executor.execute({ target: 'flaky', operation: 'status', params: {} });
      expect(blocked.success).toBe(false);
      expect(blocked.error).toContain('CIRCUIT_OPEN');

      await new Promise((resolve) => setTimeout(resolve, 80));

      const retried = await executor.execute({ target: 'flaky', operation: 'status', params: {} });
      expect(retried.success).toBe(false);
      expect(retried.error).not.toContain('CIRCUIT_OPEN');
      expect(callCount).toBe(2);
    });
  });

  describe('backpressure', () => {
    it('rejects requests when max concurrent executions is exceeded', async () => {
      const slow = new MockAdapter('slow', 'GIT');
      slow.addOp(
        'wait',
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 80))
      );

      const executor = createTestExecutor([slow], {
        maxConcurrentExecutions: 1,
      });

      const firstPromise = executor.execute({ target: 'slow', operation: 'wait', params: {} });

      const second = await executor.execute({ target: 'slow', operation: 'wait', params: {} });
      expect(second.success).toBe(false);
      expect(second.error).toContain('BACKPRESSURE_ACTIVE');

      const first = await firstPromise;
      expect(first.success).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('returns health for all registered adapters', async () => {
      const git = new MockAdapter('git', 'GIT');
      git.addOp('list-branches', async () => ({}));
      const testing = new MockAdapter('testing', 'TESTING');
      testing.addOp('run-unit', async () => ({}));
      const executor = createTestExecutor([git, testing]);

      const health = await executor.healthCheck();
      expect(health.git).toBeDefined();
      expect(health.git.status).toBe('HEALTHY');
      expect(health.testing).toBeDefined();
    });
  });

  describe('cacheStats / clearCache', () => {
    it('reports cache statistics', async () => {
      const git = new MockAdapter('git', 'GIT');
      git.addOp('create-branch', async () => ({ ok: true }));
      const executor = createTestExecutor([git]);

      await executor.execute({
        target: 'git',
        operation: 'create-branch',
        params: { name: 'x' },
      });

      const stats = executor.cacheStats();
      expect(stats.size).toBe(1);
      expect(stats.adapters).toContain('git');
    });

    it('clearCache removes all entries', async () => {
      const git = new MockAdapter('git', 'GIT');
      git.addOp('create-branch', async () => ({ ok: true }));
      const executor = createTestExecutor([git]);

      await executor.execute({
        target: 'git',
        operation: 'create-branch',
        params: { name: 'x' },
      });
      executor.clearCache();
      expect(executor.cacheStats().size).toBe(0);
    });
  });
});
