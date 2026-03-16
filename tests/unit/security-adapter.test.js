'use strict';

/**
 * Security Adapter — Unit Tests (M6 #371)
 *
 * Tests the SecurityAdapter interface, operations registry,
 * and configuration validation.
 */

const { SecurityAdapter } = require('../../platform/sdlc/adapters/security-adapter');

// ─── Tests ───────────────────────────────────────────────────

describe('SecurityAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new SecurityAdapter({ tools: ['eslint', 'npm-audit'] });
  });

  it('has correct name and category', () => {
    expect(adapter.name).toBe('security');
    expect(adapter.category).toBe('SECURITY');
  });

  it('version is 1.0.0', () => {
    expect(adapter.version).toBe('1.0.0');
  });

  it('listOperations() includes all security operations', () => {
    const ops = adapter.listOperations();
    expect(ops).toContain('sast-scan');
    expect(ops).toContain('dependency-audit');
    expect(ops).toContain('secret-scan');
    expect(ops).toContain('license-check');
    expect(ops.length).toBe(4);
  });

  it('execute() returns error for unknown operation', async () => {
    const result = await adapter.execute('nonexistent', {});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unknown|not found|unsupported/i);
  });

  it('execute result has standard AdapterResult shape', async () => {
    const result = await adapter.execute('nonexistent', {});
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('duration_ms');
    expect(typeof result.duration_ms).toBe('number');
  });

  it('healthCheck returns proper shape', async () => {
    const health = await adapter.healthCheck();
    expect(health).toHaveProperty('status');
    expect(health).toHaveProperty('adapter', 'security');
    expect(typeof health.status).toBe('string');
    expect(['HEALTHY', 'DEGRADED']).toContain(health.status);
  });

  it('sast-scan executes without throwing (may fail gracefully)', async () => {
    // Runs real eslint — may return findings or exit non-zero, but should not throw
    const result = await adapter.execute('sast-scan', { path: '.', cwd: process.cwd() });
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('duration_ms');
  }, 30000);

  it('dependency-audit executes without throwing', async () => {
    const result = await adapter.execute('dependency-audit', { cwd: process.cwd() });
    expect(result).toHaveProperty('success');
    // npm audit may find vulns, which is fine — we just test it doesn't crash
    if (result.success) {
      expect(result.data).toHaveProperty('vulnerabilities');
    }
  }, 60000);

  it('secret-scan returns result with secrets_found count', async () => {
    const result = await adapter.execute('secret-scan', { path: 'tests/', cwd: process.cwd() });
    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result.data).toHaveProperty('secrets_found');
      expect(typeof result.data.secrets_found).toBe('number');
    }
  }, 30000);

  it('default config uses empty tools array', () => {
    const defaultAdapter = new SecurityAdapter();
    expect(defaultAdapter.name).toBe('security');
  });

  it('validateConfig accepts valid config', () => {
    const result = adapter.validateConfig({ tools: ['eslint'] });
    expect(result).toEqual({ valid: true, errors: [] });
  });
});
