/**
 * Git Adapter — Integration Tests
 *
 * Executes real git CLI commands against the current repository.
 * Requires: git binary on PATH, running inside a git repository.
 */

const { GitAdapter } = require('../../platform/sdlc/adapters/git-adapter');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('GitAdapter integration (real git)', () => {
  let adapter;

  beforeAll(() => {
    adapter = new GitAdapter({ repository_path: REPO_ROOT });
  });

  it('healthCheck returns HEALTHY for a real repo', async () => {
    const check = await adapter.healthCheck();
    expect(check.status).toBe('HEALTHY');
    expect(check.message).toContain('OK');
  });

  it('list-branches returns real branches', async () => {
    const result = await adapter.execute('list-branches', {});
    expect(result.success).toBe(true);
    expect(result.data.branches).toBeInstanceOf(Array);
    expect(result.data.branches.length).toBeGreaterThan(0);
    // 'main' should exist in most repos
    const hasMain = result.data.branches.some((b) => b === 'main' || b === 'master');
    expect(hasMain).toBe(true);
  });

  it('list-commits returns real commits', async () => {
    const result = await adapter.execute('list-commits', { limit: 5 });
    expect(result.success).toBe(true);
    expect(result.data.commits).toBeInstanceOf(Array);
    expect(result.data.commits.length).toBeGreaterThan(0);
    expect(result.data.commits.length).toBeLessThanOrEqual(5);
    expect(result.data.commits[0]).toHaveProperty('hash');
    expect(result.data.commits[0]).toHaveProperty('author');
    expect(result.data.commits[0]).toHaveProperty('subject');
    expect(result.data.commits[0]).toHaveProperty('date');
  });

  it('status returns current status', async () => {
    const result = await adapter.execute('status', {});
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('files');
    expect(result.data).toHaveProperty('clean');
    expect(result.data.files).toBeInstanceOf(Array);
  });

  it('get-diff returns diff output', async () => {
    const result = await adapter.execute('get-diff', { from: 'HEAD~1', to: 'HEAD' });
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('diff');
    expect(typeof result.data.diff).toBe('string');
  });

  it('execute returns error for unknown operation', async () => {
    const result = await adapter.execute('nonexistent-op', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown operation');
  });

  it('create-branch fails without a name', async () => {
    const result = await adapter.execute('create-branch', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('required');
  });

  it('version is 2.0.0 (upgraded from stub)', () => {
    expect(adapter.version).toBe('2.0.0');
  });

  it('listOperations includes status (new operation)', () => {
    expect(adapter.listOperations()).toContain('status');
  });
});
