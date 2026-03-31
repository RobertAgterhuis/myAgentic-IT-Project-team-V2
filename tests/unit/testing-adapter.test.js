describe('TestingAdapter', () => {
  let TestingAdapter;
  let HEALTH_STATUS;
  let shellExecMock;
  let isBinaryAvailableMock;

  beforeEach(async () => {
    vi.resetModules();
    shellExecMock = vi.fn();
    isBinaryAvailableMock = vi.fn();

    vi.doMock('../../platform/sdlc/adapters/shell-executor.js', () => ({
      shellExec: shellExecMock,
      isBinaryAvailable: isBinaryAvailableMock,
      withToolGuardrails: (options) => options,
    }));

    ({ TestingAdapter } = await import('../../platform/sdlc/adapters/testing-adapter.ts'));
    ({ HEALTH_STATUS } = await import('../../platform/sdlc/adapters/tool-adapter.ts'));
  });

  it('exposes adapter metadata and operations', () => {
    const adapter = new TestingAdapter({ framework: 'vitest' });
    expect(adapter.name).toBe('testing');
    expect(adapter.category).toBe('TESTING');
    expect(adapter.listOperations()).toEqual(
      expect.arrayContaining(['run-unit', 'run-integration', 'run-e2e', 'get-coverage'])
    );
  });

  it('run-unit uses vitest args and parses JSON reporter output', async () => {
    shellExecMock.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify({
        testResults: [
          {
            name: 'f1',
            assertionResults: [{ status: 'passed' }, { status: 'failed' }, { status: 'pending' }],
          },
        ],
      }),
      stderr: '',
      duration_ms: 42,
    });

    const adapter = new TestingAdapter({ framework: 'vitest', project_root: '/tmp/proj' });
    const result = await adapter.execute('run-unit', {});

    expect(result.success).toBe(true);
    expect(shellExecMock).toHaveBeenCalledWith(
      'npx',
      ['vitest', 'run', '--reporter=verbose'],
      expect.objectContaining({ cwd: '/tmp/proj', timeout: 120000 })
    );
    expect(result.data.summary).toEqual(
      expect.objectContaining({ passed: 1, failed: 1, skipped: 1, total: 3 })
    );
  });

  it('run-unit uses jest args when framework is jest', async () => {
    shellExecMock.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', duration_ms: 1 });

    const adapter = new TestingAdapter({ framework: 'jest' });
    await adapter.execute('run-unit', { pattern: 'tests/unit' });

    expect(shellExecMock).toHaveBeenCalledWith(
      'npx',
      ['jest', '--verbose', 'tests/unit'],
      expect.any(Object)
    );
  });

  it('run-integration defaults pattern and supports jest branch', async () => {
    shellExecMock.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', duration_ms: 1 });

    const vitestAdapter = new TestingAdapter({ framework: 'vitest' });
    await vitestAdapter.execute('run-integration', {});
    expect(shellExecMock).toHaveBeenCalledWith(
      'npx',
      ['vitest', 'run', '--reporter=verbose', 'tests/integration'],
      expect.any(Object)
    );

    const jestAdapter = new TestingAdapter({ framework: 'jest' });
    await jestAdapter.execute('run-integration', { pattern: 'custom/int' });
    expect(shellExecMock).toHaveBeenCalledWith(
      'npx',
      ['jest', '--verbose', 'custom/int'],
      expect.any(Object)
    );
  });

  it('run-e2e uses playwright branch and doubles timeout', async () => {
    shellExecMock.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', duration_ms: 1 });

    const adapter = new TestingAdapter({ framework: 'playwright', timeout: 7000 });
    await adapter.execute('run-e2e', { pattern: 'tests/e2e/smoke.spec.ts' });

    expect(shellExecMock).toHaveBeenCalledWith(
      'npx',
      ['playwright', 'test', 'tests/e2e/smoke.spec.ts'],
      expect.objectContaining({ timeout: 14000 })
    );
  });

  it('run-e2e falls back to vitest branch for non-playwright framework', async () => {
    shellExecMock.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', duration_ms: 1 });

    const adapter = new TestingAdapter({ framework: 'vitest' });
    await adapter.execute('run-e2e', {});

    expect(shellExecMock).toHaveBeenCalledWith(
      'npx',
      ['vitest', 'run', 'tests/e2e'],
      expect.any(Object)
    );
  });

  it('get-coverage parses all four percentage metrics for vitest output', async () => {
    shellExecMock.mockResolvedValue({
      exitCode: 0,
      stdout: [
        'Statements   : 73.32%',
        'Branches     : 59.83%',
        'Functions    : 74.05%',
        'Lines        : 74.18%',
      ].join('\n'),
      stderr: '',
      duration_ms: 10,
    });

    const adapter = new TestingAdapter({ framework: 'vitest' });
    const result = await adapter.execute('get-coverage', {});

    expect(result.success).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        statements: 73.32,
        branches: 59.83,
        functions: 74.05,
        lines: 74.18,
      })
    );
  });

  it('get-coverage returns zeroes when percentages are absent', async () => {
    shellExecMock.mockResolvedValue({
      exitCode: 1,
      stdout: 'no percentages',
      stderr: '',
      duration_ms: 3,
    });

    const adapter = new TestingAdapter({ framework: 'jest' });
    const result = await adapter.execute('get-coverage', {});

    expect(result.data).toEqual(
      expect.objectContaining({ statements: 0, branches: 0, functions: 0, lines: 0, exitCode: 1 })
    );
    expect(shellExecMock).toHaveBeenCalledWith(
      'npx',
      ['jest', '--coverage', '--verbose'],
      expect.any(Object)
    );
  });

  it('parse fallback handles invalid JSON and text summary counts', async () => {
    shellExecMock.mockResolvedValue({
      exitCode: 0,
      stdout: '{not valid json',
      stderr: '2 pass 1 fail 3 skip',
      duration_ms: 8,
    });

    const adapter = new TestingAdapter({ framework: 'vitest' });
    const result = await adapter.execute('run-unit', {});

    expect(result.data.summary).toEqual(
      expect.objectContaining({ passed: 2, failed: 1, skipped: 3, total: 6 })
    );
  });

  it('healthCheck returns UNAVAILABLE when npx is missing', async () => {
    isBinaryAvailableMock.mockResolvedValue(false);

    const adapter = new TestingAdapter({ framework: 'vitest' });
    const health = await adapter.healthCheck();

    expect(health.status).toBe(HEALTH_STATUS.UNAVAILABLE);
    expect(health.message).toMatch(/npx binary not found/i);
  });

  it('healthCheck returns UNCONFIGURED when framework is empty', async () => {
    isBinaryAvailableMock.mockResolvedValue(true);

    const adapter = new TestingAdapter({ framework: '' });
    const health = await adapter.healthCheck();

    expect(health.status).toBe(HEALTH_STATUS.UNCONFIGURED);
  });

  it('healthCheck returns HEALTHY when framework version probe succeeds', async () => {
    isBinaryAvailableMock.mockResolvedValue(true);
    shellExecMock.mockResolvedValue({
      exitCode: 0,
      stdout: 'vitest/4.0.0\n',
      stderr: '',
      duration_ms: 1,
    });

    const adapter = new TestingAdapter({ framework: 'vitest', project_root: '/tmp/root' });
    const health = await adapter.healthCheck();

    expect(health.status).toBe(HEALTH_STATUS.HEALTHY);
    expect(shellExecMock).toHaveBeenCalledWith(
      'npx',
      ['vitest', '--version'],
      expect.objectContaining({ cwd: '/tmp/root', timeout: 10000 })
    );
  });

  it('healthCheck returns DEGRADED when framework version probe fails', async () => {
    isBinaryAvailableMock.mockResolvedValue(true);
    shellExecMock.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'not found',
      duration_ms: 1,
    });

    const adapter = new TestingAdapter({ framework: 'generic' });
    const health = await adapter.healthCheck();

    expect(health.status).toBe(HEALTH_STATUS.DEGRADED);
    expect(health.message).toMatch(/not resolvable/i);
  });

  it('validateConfig rejects unknown framework and accepts known framework', () => {
    const adapter = new TestingAdapter({ framework: 'vitest' });

    expect(adapter.validateConfig({ framework: 'unknown' })).toEqual(
      expect.objectContaining({ valid: false })
    );
    expect(adapter.validateConfig({ framework: 'generic' })).toEqual({ valid: true, errors: [] });
  });

  it('returns standardized error result for unknown operation', async () => {
    const adapter = new TestingAdapter({ framework: 'vitest' });
    const result = await adapter.execute('does-not-exist', {});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Unknown operation/i);
  });
});
