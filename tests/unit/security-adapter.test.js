'use strict';

/**
 * Security Adapter — Unit Tests
 *
 * Covers deterministic parsing, health states, and validation branches
 * without shelling out to real tools.
 */

describe('SecurityAdapter', () => {
  let SecurityAdapter;
  let HEALTH_STATUS;
  let parseEslintFindings;
  let parseAuditOutput;
  let parseSecretScanOutput;
  let parseLicenseCheckerOutput;
  let runSastScan;
  let runDependencyAudit;
  let runSecretScan;
  let runLicenseCheck;
  let shellExecMock;
  let isBinaryAvailableMock;

  beforeEach(async () => {
    vi.resetModules();
    shellExecMock = vi.fn();
    isBinaryAvailableMock = vi.fn();

    vi.doMock('../../platform/sdlc/adapters/shell-executor.js', () => ({
      shellExec: shellExecMock,
      isBinaryAvailable: isBinaryAvailableMock,
    }));

    ({
      SecurityAdapter,
      parseEslintFindings,
      parseAuditOutput,
      parseSecretScanOutput,
      parseLicenseCheckerOutput,
      runSastScan,
      runDependencyAudit,
      runSecretScan,
      runLicenseCheck,
    } = await import('../../platform/sdlc/adapters/security-adapter.ts'));
    ({ HEALTH_STATUS } = await import('../../platform/sdlc/adapters/tool-adapter.ts'));
  });

  it('has correct metadata and supported operations', () => {
    const adapter = new SecurityAdapter({ tools: ['eslint', 'npm-audit'] });

    expect(adapter.name).toBe('security');
    expect(adapter.category).toBe('SECURITY');
    expect(adapter.version).toBe('1.0.0');
    expect(adapter.listOperations()).toEqual(
      expect.arrayContaining(['sast-scan', 'dependency-audit', 'secret-scan', 'license-check'])
    );
  });

  it('returns a standard error result for unknown operations', async () => {
    const adapter = new SecurityAdapter({ tools: ['eslint'] });

    const result = await adapter.execute('nonexistent', {});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unknown operation/i);
    expect(result.data).toBeNull();
    expect(typeof result.duration_ms).toBe('number');
  });

  it('parses ESLint JSON findings and maps severity levels', async () => {
    const parsed = parseEslintFindings(
      JSON.stringify([
        {
          filePath: 'src/demo.ts',
          messages: [
            {
              ruleId: 'security/detect-eval-with-expression',
              severity: 2,
              message: 'Avoid eval',
              line: 7,
            },
            {
              ruleId: 'no-console',
              severity: 1,
              message: 'Unexpected console statement',
              line: 11,
            },
            {
              ruleId: '',
              severity: 2,
              message: 'Ignored because rule is missing',
              line: 99,
            },
          ],
        },
      ])
    );

    expect(parsed).toEqual([
      {
        rule: 'security/detect-eval-with-expression',
        severity: 'high',
        message: 'Avoid eval',
        file: 'src/demo.ts',
        line: 7,
      },
      {
        rule: 'no-console',
        severity: 'medium',
        message: 'Unexpected console statement',
        file: 'src/demo.ts',
        line: 11,
      },
    ]);

    shellExecMock.mockResolvedValue({
      exitCode: 2,
      stdout: JSON.stringify([
        {
          filePath: 'src/demo.ts',
          messages: [
            {
              ruleId: 'security/detect-eval-with-expression',
              severity: 2,
              message: 'Avoid eval',
              line: 7,
            },
            {
              ruleId: 'no-console',
              severity: 1,
              message: 'Unexpected console statement',
              line: 11,
            },
            {
              ruleId: '',
              severity: 2,
              message: 'Ignored because rule is missing',
              line: 99,
            },
          ],
        },
      ]),
      stderr: '',
      duration_ms: 12,
    });

    const helperResult = await runSastScan({ path: 'src', cwd: '/repo' }, shellExecMock, 'win32');

    expect(helperResult).toEqual({
      path: 'src',
      findings: parsed,
      finding_count: 2,
      exit_code: 2,
    });

    shellExecMock.mockClear();
    shellExecMock.mockResolvedValue({
      exitCode: 2,
      stdout: JSON.stringify([
        {
          filePath: 'src/demo.ts',
          messages: [
            {
              ruleId: 'security/detect-eval-with-expression',
              severity: 2,
              message: 'Avoid eval',
              line: 7,
            },
            {
              ruleId: 'no-console',
              severity: 1,
              message: 'Unexpected console statement',
              line: 11,
            },
            {
              ruleId: '',
              severity: 2,
              message: 'Ignored because rule is missing',
              line: 99,
            },
          ],
        },
      ]),
      stderr: '',
      duration_ms: 12,
    });

    const adapter = new SecurityAdapter({ tools: ['eslint'] });
    const result = await adapter.execute('sast-scan', { path: 'src', cwd: '/repo' });

    expect(result.success).toBe(true);
    expect(shellExecMock).toHaveBeenCalledWith(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['eslint', '--format', 'json', '--no-error-on-unmatched-pattern', 'src'],
      expect.objectContaining({ cwd: '/repo', timeout: 120000 })
    );
    expect(result.data).toEqual({
      path: 'src',
      findings: [
        {
          rule: 'security/detect-eval-with-expression',
          severity: 'high',
          message: 'Avoid eval',
          file: 'src/demo.ts',
          line: 7,
        },
        {
          rule: 'no-console',
          severity: 'medium',
          message: 'Unexpected console statement',
          file: 'src/demo.ts',
          line: 11,
        },
      ],
      finding_count: 2,
      exit_code: 2,
    });
  });

  it('falls back to empty SAST findings when ESLint output is not JSON', async () => {
    expect(parseEslintFindings('lint failed in plain text')).toEqual([]);

    shellExecMock.mockResolvedValue({
      exitCode: 1,
      stdout: 'lint failed in plain text',
      stderr: 'stderr output',
      duration_ms: 8,
    });

    const adapter = new SecurityAdapter({ tools: ['eslint'] });
    const result = await adapter.execute('sast-scan', { cwd: '/repo' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      path: '.',
      findings: [],
      finding_count: 0,
      exit_code: 1,
    });
  });

  it('parses npm audit vulnerabilities and metadata summary', async () => {
    shellExecMock.mockResolvedValue({
      exitCode: 1,
      stdout: JSON.stringify({
        vulnerabilities: {
          lodash: {
            severity: 'high',
            title: 'Prototype pollution',
            url: 'https://example.test/lodash',
            range: '<4.17.21',
          },
          minimist: {
            severity: 'moderate',
            range: '<1.2.8',
          },
        },
        metadata: {
          vulnerabilities: {
            total: 2,
            critical: 0,
            high: 1,
            moderate: 1,
            low: 0,
          },
        },
      }),
      stderr: '',
      duration_ms: 5,
    });

    const parsed = parseAuditOutput(
      JSON.stringify({
        vulnerabilities: {
          lodash: {
            severity: 'high',
            title: 'Prototype pollution',
            url: 'https://example.test/lodash',
            range: '<4.17.21',
          },
          minimist: {
            severity: 'moderate',
            range: '<1.2.8',
          },
        },
        metadata: {
          vulnerabilities: {
            total: 2,
            critical: 0,
            high: 1,
            moderate: 1,
            low: 0,
          },
        },
      })
    );

    expect(parsed).toEqual({
      vulnerabilities: [
        {
          name: 'lodash',
          severity: 'high',
          title: 'Prototype pollution',
          url: 'https://example.test/lodash',
          range: '<4.17.21',
        },
        {
          name: 'minimist',
          severity: 'moderate',
          title: 'minimist',
          url: undefined,
          range: '<1.2.8',
        },
      ],
      summary: {
        total: 2,
        critical: 0,
        high: 1,
        moderate: 1,
        low: 0,
      },
    });

    await expect(runDependencyAudit({ cwd: '/repo' }, shellExecMock, 'win32')).resolves.toEqual({
      vulnerabilities: parsed.vulnerabilities,
      summary: parsed.summary,
      exit_code: 1,
    });

    const adapter = new SecurityAdapter({ tools: ['npm-audit'] });
    const result = await adapter.execute('dependency-audit', { cwd: '/repo' });

    expect(result.success).toBe(true);
    expect(shellExecMock).toHaveBeenCalledWith(
      process.platform === 'win32' ? 'npm.cmd' : 'npm',
      ['audit', '--json'],
      expect.objectContaining({ cwd: '/repo', timeout: 60000 })
    );
    expect(result.data).toEqual({
      vulnerabilities: [
        {
          name: 'lodash',
          severity: 'high',
          title: 'Prototype pollution',
          url: 'https://example.test/lodash',
          range: '<4.17.21',
        },
        {
          name: 'minimist',
          severity: 'moderate',
          title: 'minimist',
          url: undefined,
          range: '<1.2.8',
        },
      ],
      summary: {
        total: 2,
        critical: 0,
        high: 1,
        moderate: 1,
        low: 0,
      },
      exit_code: 1,
    });
  });

  it('returns empty dependency audit data when audit output cannot be parsed', async () => {
    expect(parseAuditOutput('npm audit unavailable')).toEqual({
      vulnerabilities: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
      },
    });

    shellExecMock.mockResolvedValue({
      exitCode: 127,
      stdout: 'npm audit unavailable',
      stderr: '',
      duration_ms: 4,
    });

    const adapter = new SecurityAdapter({ tools: ['npm-audit'] });
    const result = await adapter.execute('dependency-audit', { cwd: '/repo' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      vulnerabilities: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
      },
      exit_code: 127,
    });
  });

  it('aggregates redacted secret scan findings across patterns', async () => {
    expect(
      parseSecretScanOutput(
        'Generic Secret',
        [
          'src/b.env:4:secret = "topsecretvalue"',
          'invalid-line-without-colons',
          'src/c.pem:1:-----BEGIN PRIVATE KEY-----',
        ].join('\n')
      )
    ).toEqual([
      { pattern_name: 'Generic Secret', file: 'src/b.env', line: 4, match: '[REDACTED]' },
      { pattern_name: 'Generic Secret', file: 'src/c.pem', line: 1, match: '[REDACTED]' },
    ]);

    shellExecMock
      .mockResolvedValueOnce({ exitCode: 0, stdout: 'src/a.ts:12:AKIA1234567890ABCD', stderr: '' })
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: [
          'src/b.env:4:secret = "topsecretvalue"',
          'src/c.pem:1:-----BEGIN PRIVATE KEY-----',
        ].join('\n'),
        stderr: '',
      })
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' })
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' });

    await expect(runSecretScan({ path: 'src' }, shellExecMock, 'win32')).resolves.toEqual({
      path: 'src',
      secrets_found: 3,
      findings: [
        { pattern_name: 'AWS Key', file: 'src/a.ts', line: 12, match: '[REDACTED]' },
        { pattern_name: 'Generic Secret', file: 'src/b.env', line: 4, match: '[REDACTED]' },
        { pattern_name: 'Generic Secret', file: 'src/c.pem', line: 1, match: '[REDACTED]' },
      ],
    });

    expect(shellExecMock).toHaveBeenNthCalledWith(
      1,
      'findstr',
      expect.arrayContaining(['/S', '/N', '/R', 'AKIA[0-9A-Z]{16}', 'src']),
      { timeout: 30000 }
    );

    shellExecMock.mockClear();
    shellExecMock
      .mockResolvedValueOnce({ exitCode: 0, stdout: 'src/a.ts:12:AKIA1234567890ABCD', stderr: '' })
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: [
          'src/b.env:4:secret = "topsecretvalue"',
          'src/c.pem:1:-----BEGIN PRIVATE KEY-----',
        ].join('\n'),
        stderr: '',
      })
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' })
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' });

    const adapter = new SecurityAdapter({ tools: ['grep'] });
    const result = await adapter.execute('secret-scan', { path: 'src' });

    expect(result.success).toBe(true);
    expect(result.data.secrets_found).toBe(3);
    expect(result.data.findings).toEqual([
      { pattern_name: 'AWS Key', file: 'src/a.ts', line: 12, match: '[REDACTED]' },
      { pattern_name: 'Generic Secret', file: 'src/b.env', line: 4, match: '[REDACTED]' },
      { pattern_name: 'Generic Secret', file: 'src/c.pem', line: 1, match: '[REDACTED]' },
    ]);
    expect(shellExecMock).toHaveBeenCalledTimes(5);
  });

  it('parses license data, records disallowed licenses, and truncates package output', async () => {
    const packageEntries = Object.fromEntries(
      Array.from({ length: 205 }, (_, index) => [
        `package-${index}@1.0.0`,
        { licenses: index === 3 ? 'GPL-3.0-only' : 'MIT' },
      ])
    );

    const parsed = parseLicenseCheckerOutput(JSON.stringify(packageEntries));

    expect(parsed.packages).toHaveLength(205);
    expect(parsed.violations).toEqual(['package-3@1.0.0: GPL-3.0-only']);
    expect(parseLicenseCheckerOutput('license checker failed')).toEqual({
      packages: [],
      violations: [],
    });

    shellExecMock.mockResolvedValue({
      exitCode: 0,
      stdout: JSON.stringify(packageEntries),
      stderr: '',
      duration_ms: 6,
    });

    await expect(runLicenseCheck({ cwd: '/repo' }, shellExecMock, 'win32')).resolves.toEqual({
      packages: parsed.packages.slice(0, 200),
      violations: parsed.violations,
      exit_code: 0,
    });

    const adapter = new SecurityAdapter({ tools: ['license-checker'] });
    const result = await adapter.execute('license-check', { cwd: '/repo' });

    expect(result.success).toBe(true);
    expect(shellExecMock).toHaveBeenCalledWith(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['license-checker', '--json', '--production'],
      expect.objectContaining({ cwd: '/repo', timeout: 60000 })
    );
    expect(result.data.packages).toHaveLength(200);
    expect(result.data.violations).toEqual(['package-3@1.0.0: GPL-3.0-only']);
    expect(result.data.exit_code).toBe(0);
  });

  it('returns UNAVAILABLE when neither npx nor npm is available', async () => {
    isBinaryAvailableMock.mockResolvedValueOnce(false).mockResolvedValueOnce(false);

    const adapter = new SecurityAdapter({ tools: ['eslint'] });
    const health = await adapter.healthCheck();

    expect(health.status).toBe(HEALTH_STATUS.UNAVAILABLE);
    expect(health.message).toMatch(/neither npx nor npm found/i);
  });

  it('returns DEGRADED when no tools are configured', async () => {
    isBinaryAvailableMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    const adapter = new SecurityAdapter();
    const health = await adapter.healthCheck();

    expect(health.status).toBe(HEALTH_STATUS.DEGRADED);
    expect(health.message).toMatch(/using defaults/i);
  });

  it('returns HEALTHY when required binaries exist and tools are configured', async () => {
    isBinaryAvailableMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const adapter = new SecurityAdapter({ tools: ['eslint', 'npm-audit'] });
    const health = await adapter.healthCheck();

    expect(health.status).toBe(HEALTH_STATUS.HEALTHY);
    expect(health.message).toBe('Security tools: eslint, npm-audit');
  });

  it('validates tools as an array', () => {
    const adapter = new SecurityAdapter({ tools: ['eslint'] });

    expect(adapter.validateConfig({ tools: ['eslint'] })).toEqual({ valid: true, errors: [] });
    expect(adapter.validateConfig({ tools: 'eslint' })).toEqual({
      valid: false,
      errors: ['tools must be an array of tool names'],
    });
  });
});
