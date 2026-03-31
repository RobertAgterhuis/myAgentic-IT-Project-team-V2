import * as __req_0 from '../../platform/sdlc/adapters/security-adapter';
const {
  parseEslintFindings,
  parseAuditOutput,
  parseSecretScanOutput,
  parseLicenseCheckerOutput,
  runSastScan,
  runDependencyAudit,
  runSecretScan,
  runLicenseCheck,
} = __req_0;

describe('security-adapter helpers', () => {
  it('parses eslint findings and falls back on invalid JSON', () => {
    expect(
      parseEslintFindings(
        JSON.stringify([
          {
            filePath: 'src/demo.ts',
            messages: [
              { ruleId: 'rule-a', severity: 2, message: 'high finding', line: 3 },
              { ruleId: 'rule-b', severity: 1, message: 'medium finding', line: 8 },
              { ruleId: '', severity: 2, message: 'ignored', line: 9 },
            ],
          },
        ])
      )
    ).toEqual([
      {
        rule: 'rule-a',
        severity: 'high',
        message: 'high finding',
        file: 'src/demo.ts',
        line: 3,
      },
      {
        rule: 'rule-b',
        severity: 'medium',
        message: 'medium finding',
        file: 'src/demo.ts',
        line: 8,
      },
    ]);

    expect(parseEslintFindings('not-json')).toEqual([]);
  });

  it('parses audit and license payloads including invalid-input fallbacks', () => {
    expect(
      parseAuditOutput(
        JSON.stringify({
          vulnerabilities: {
            lodash: { severity: 'high', title: 'Prototype pollution', range: '<1.0.0' },
          },
          metadata: { vulnerabilities: { total: 1, critical: 0, high: 1, moderate: 0, low: 0 } },
        })
      )
    ).toEqual({
      vulnerabilities: [
        {
          name: 'lodash',
          severity: 'high',
          title: 'Prototype pollution',
          url: undefined,
          range: '<1.0.0',
        },
      ],
      summary: { total: 1, critical: 0, high: 1, moderate: 0, low: 0 },
    });

    expect(parseAuditOutput('invalid')).toEqual({
      vulnerabilities: [],
      summary: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
    });

    expect(
      parseLicenseCheckerOutput(
        JSON.stringify({
          'pkg-a@1.0.0': { licenses: 'MIT' },
          'pkg-b@1.0.0': { licenses: 'GPL-3.0-only' },
          'pkg-c@1.0.0': { licenses: '' },
        })
      )
    ).toEqual({
      packages: [
        { name: 'pkg-a@1.0.0', license: 'MIT' },
        { name: 'pkg-b@1.0.0', license: 'GPL-3.0-only' },
        { name: 'pkg-c@1.0.0', license: 'UNKNOWN' },
      ],
      violations: ['pkg-b@1.0.0: GPL-3.0-only'],
    });

    expect(parseLicenseCheckerOutput('invalid')).toEqual({ packages: [], violations: [] });
  });

  it('parses secret scan lines including empty and malformed rows', () => {
    expect(parseSecretScanOutput('Generic Secret', '')).toEqual([]);
    expect(
      parseSecretScanOutput(
        'Generic Secret',
        ['src/a.env:4:secret = "hunter2"', 'badline', 'src/b.env:5:password = "supersecret"'].join(
          '\n'
        )
      )
    ).toEqual([
      { pattern_name: 'Generic Secret', file: 'src/a.env', line: 4, match: '[REDACTED]' },
      { pattern_name: 'Generic Secret', file: 'src/b.env', line: 5, match: '[REDACTED]' },
    ]);
  });

  it('runs helper operations with injected executors on win32 paths', async () => {
    const execMock = vi
      .fn()
      .mockResolvedValueOnce({
        exitCode: 2,
        stdout: JSON.stringify([
          {
            filePath: 'src/a.ts',
            messages: [{ ruleId: 'rule-a', severity: 2, message: 'bad', line: 1 }],
          },
        ]),
      })
      .mockResolvedValueOnce({
        exitCode: 1,
        stdout: JSON.stringify({
          vulnerabilities: {
            minimist: { severity: 'moderate', range: '<1.2.8' },
          },
          metadata: { vulnerabilities: { total: 1, critical: 0, high: 0, moderate: 1, low: 0 } },
        }),
      })
      .mockResolvedValueOnce({ exitCode: 0, stdout: 'src/a.env:4:AKIAABCDEFGHIJKLMNOP' })
      .mockResolvedValueOnce({ exitCode: 1, stdout: '' })
      .mockResolvedValueOnce({ exitCode: 0, stdout: 'src/b.env:5:secret = "supersecret"' })
      .mockResolvedValueOnce({ exitCode: 1, stdout: '' })
      .mockResolvedValueOnce({ exitCode: 1, stdout: '' })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({
          'pkg-a@1.0.0': { licenses: 'MIT' },
          'pkg-b@1.0.0': { licenses: 'GPL-3.0-only' },
        }),
      });

    await expect(runSastScan({ path: 'src', cwd: '/repo' }, execMock, 'win32')).resolves.toEqual({
      path: 'src',
      findings: [{ rule: 'rule-a', severity: 'high', message: 'bad', file: 'src/a.ts', line: 1 }],
      finding_count: 1,
      exit_code: 2,
    });

    await expect(runDependencyAudit({ cwd: '/repo' }, execMock, 'win32')).resolves.toEqual({
      vulnerabilities: [
        {
          name: 'minimist',
          severity: 'moderate',
          title: 'minimist',
          url: undefined,
          range: '<1.2.8',
        },
      ],
      summary: { total: 1, critical: 0, high: 0, moderate: 1, low: 0 },
      exit_code: 1,
    });

    await expect(runSecretScan({ path: 'src' }, execMock, 'win32')).resolves.toEqual({
      path: 'src',
      secrets_found: 2,
      findings: [
        { pattern_name: 'AWS Key', file: 'src/a.env', line: 4, match: '[REDACTED]' },
        { pattern_name: 'Generic Secret', file: 'src/b.env', line: 5, match: '[REDACTED]' },
      ],
    });

    await expect(runLicenseCheck({ cwd: '/repo' }, execMock, 'win32')).resolves.toEqual({
      packages: [
        { name: 'pkg-a@1.0.0', license: 'MIT' },
        { name: 'pkg-b@1.0.0', license: 'GPL-3.0-only' },
      ],
      violations: ['pkg-b@1.0.0: GPL-3.0-only'],
      exit_code: 0,
    });
  });

  it('runs license check with a plain async executor', async () => {
    const exec = async () => ({
      exitCode: 0,
      stdout: JSON.stringify({
        'pkg-a@1.0.0': { licenses: 'MIT' },
        'pkg-b@1.0.0': { licenses: 'GPL-3.0-only' },
      }),
    });

    await expect(runLicenseCheck({ cwd: '/repo' }, exec, 'win32')).resolves.toEqual({
      packages: [
        { name: 'pkg-a@1.0.0', license: 'MIT' },
        { name: 'pkg-b@1.0.0', license: 'GPL-3.0-only' },
      ],
      violations: ['pkg-b@1.0.0: GPL-3.0-only'],
      exit_code: 0,
    });
  });
});
