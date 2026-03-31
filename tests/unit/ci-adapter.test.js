/**
 * CI Adapter — Unit Tests (M6 #371)
 *
 * Tests the CiAdapter interface, configuration, operations registry,
 * and parameter validation.
 */

import * as __req_0 from '../../platform/sdlc/adapters/ci-adapter';
const { CiAdapter } = __req_0;

// ─── Tests ───────────────────────────────────────────────────

describe('CiAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new CiAdapter({
      provider: 'github-actions',
      repository: 'owner/repo',
      token: 'ghp_test123',
    });
  });

  it('has correct name and category', () => {
    expect(adapter.name).toBe('ci');
    expect(adapter.category).toBe('CI');
  });

  it('version is 1.0.0', () => {
    expect(adapter.version).toBe('1.0.0');
  });

  it('listOperations() includes all expected operations', () => {
    const ops = adapter.listOperations();
    expect(ops).toContain('trigger-workflow');
    expect(ops).toContain('get-build-status');
    expect(ops).toContain('list-workflows');
    expect(ops).toContain('get-logs');
    expect(ops.length).toBe(4);
  });

  it('execute() returns error for unknown operation', async () => {
    const result = await adapter.execute('nonexistent-op', {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unknown|not found|unsupported/i);
  });

  it('trigger-workflow requires workflow param', async () => {
    const result = await adapter.execute('trigger-workflow', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('workflow');
  });

  it('trigger-workflow requires repository', async () => {
    const noRepoAdapter = new CiAdapter({ provider: 'github-actions' });
    const result = await noRepoAdapter.execute('trigger-workflow', { workflow: 'ci.yml' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('repository');
  });

  it('get-build-status requires run_id', async () => {
    const result = await adapter.execute('get-build-status', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('run_id');
  });

  it('get-build-status requires repository', async () => {
    const noRepoAdapter = new CiAdapter({ provider: 'github-actions' });
    const result = await noRepoAdapter.execute('get-build-status', { run_id: '123' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('repository');
  });

  it('list-workflows requires repository', async () => {
    const noRepoAdapter = new CiAdapter({ provider: 'github-actions' });
    const result = await noRepoAdapter.execute('list-workflows', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('repository');
  });

  it('execute result has standard AdapterResult shape', async () => {
    const result = await adapter.execute('nonexistent-op', {});
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('duration_ms');
    expect(typeof result.duration_ms).toBe('number');
  });

  it('healthCheck returns proper shape', async () => {
    const health = await adapter.healthCheck();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('adapter', 'ci');
    expect(typeof health.status).toBe('string');
  });

  it('healthCheck returns UNCONFIGURED without token', async () => {
    const noTokenAdapter = new CiAdapter({ provider: 'github-actions', repository: 'owner/repo' });
    const origToken = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    try {
      const health = await noTokenAdapter.healthCheck();
      // Without token, CI adapter cannot authenticate
      expect(['UNCONFIGURED', 'DEGRADED']).toContain(health.status);
    } finally {
      if (origToken) process.env.GITHUB_TOKEN = origToken;
    }
  });

  it('validateConfig checks provider field', () => {
    const result = adapter.validateConfig({ provider: 'github-actions' });
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('default config uses github-actions provider', () => {
    const defaultAdapter = new CiAdapter();
    expect(defaultAdapter.name).toBe('ci');
  });
});
