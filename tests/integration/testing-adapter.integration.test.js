/**
 * Testing Adapter — Integration Tests
 *
 * Executes real test framework commands against the current project.
 * Requires: npx and vitest available. Runs a small, fast subset of tests.
 */

const { TestingAdapter } = require('../../platform/sdlc/adapters/testing-adapter');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

describe('TestingAdapter integration (real vitest)', () => {
  let adapter;

  beforeAll(() => {
    adapter = new TestingAdapter({
      framework: 'vitest',
      project_root: PROJECT_ROOT,
      timeout: 60_000,
    });
  });

  it('healthCheck returns HEALTHY when vitest is installed', async () => {
    const check = await adapter.healthCheck();
    // vitest should be available in this project
    expect(['HEALTHY', 'DEGRADED']).toContain(check.status);
    expect(check.adapter).toBe('testing');
  });

  it('run-unit executes a single fast test file', async () => {
    const result = await adapter.execute('run-unit', {
      pattern: 'tests/unit/example.test.js',
    });
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('exitCode');
    expect(result.data).toHaveProperty('duration_ms');
    expect(result.data.duration_ms).toBeGreaterThan(0);
  }, 60000);

  it('version is 2.0.0 (upgraded from stub)', () => {
    expect(adapter.version).toBe('2.0.0');
  });

  it('listOperations includes all expected operations', () => {
    const ops = adapter.listOperations();
    expect(ops).toContain('run-unit');
    expect(ops).toContain('run-integration');
    expect(ops).toContain('run-e2e');
    expect(ops).toContain('get-coverage');
  });

  it('execute returns error for unknown operation', async () => {
    const result = await adapter.execute('nonexistent-op', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown operation');
  });
});
