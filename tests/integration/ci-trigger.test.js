/**
 * CI Adapter — Integration Tests (M6 #371)
 *
 * Tests end-to-end CiAdapter behaviour including operation flow,
 * parameter validation, error handling, and AdapterResult structure.
 * Uses real shellExec (curl may fail without network/token, but
 * error paths are validated).
 */

const { CiAdapter } = require('../../platform/sdlc/adapters/ci-adapter');

// ─── Integration: adapter operations flow ────────────────────

describe('CiAdapter integration', () => {
  let adapter;

  beforeEach(() => {
    adapter = new CiAdapter({
      provider: 'github-actions',
      repository: 'owner/repo',
      token: 'ghp_testtoken',
    });
  });

  it('all operations return consistent AdapterResult shape', async () => {
    // These will fail (no real API), but the adapter should return proper error results
    const ops = adapter.listOperations();
    for (const op of ops) {
      const result = await adapter.execute(op, { run_id: '1', workflow: 'ci.yml' });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('duration_ms');
      expect(typeof result.duration_ms).toBe('number');
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      if (!result.success) {
        expect(typeof result.error).toBe('string');
      }
    }
  }, 60000);

  it('parameter validation fails fast for trigger-workflow without workflow', async () => {
    const start = Date.now();
    const result = await adapter.execute('trigger-workflow', {});
    const elapsed = Date.now() - start;
    expect(result.success).toBe(false);
    expect(result.error).toContain('workflow');
    // Parameter validation should be near-instant (no network call)
    expect(elapsed).toBeLessThan(1000);
  });

  it('parameter validation fails fast for get-build-status without run_id', async () => {
    const result = await adapter.execute('get-build-status', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('run_id');
  });

  it('parameter validation fails fast for list-workflows without repo', async () => {
    const noRepoAdapter = new CiAdapter({ provider: 'github-actions' });
    const result = await noRepoAdapter.execute('list-workflows', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('repository');
  });

  it('healthCheck returns complete health object', async () => {
    const health = await adapter.healthCheck();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('adapter', 'ci');
    expect(typeof health.status).toBe('string');
  });

  it('adapter can be used with AdapterRegistry', () => {
    const { AdapterRegistry } = require('../../platform/sdlc/adapters/tool-adapter');
    const registry = new AdapterRegistry();
    registry.register(adapter);
    expect(registry.get('ci')).toBe(adapter);
    const ciAdapters = registry.getByCategory('CI');
    expect(ciAdapters).toHaveLength(1);
  });

  it('multiple operations can be called sequentially', async () => {
    // All will fail due to no real API, but should not crash or corrupt state
    await adapter.execute('trigger-workflow', { workflow: 'ci.yml' });
    await adapter.execute('get-build-status', { run_id: '42' });
    await adapter.execute('list-workflows', {});
    await adapter.execute('get-logs', { run_id: '42' });

    // Adapter should still be functional
    const ops = adapter.listOperations();
    expect(ops).toHaveLength(4);
  }, 60000);
});
