// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Vitest Testing Provider
 *
 * Concrete implementation of the TestingProvider contract using
 * Vitest as the test runner. Parses JSON reporter output for
 * structured results and coverage data.
 *
 * @module sdlc/adapters/providers/vitest-testing
 */

import { shellExec, isBinaryAvailable } from '../shell-executor.js';
import type {
  TestingProvider,
  TestingCapabilities,
  TestRunInput,
  TestRunResult,
  TestSummary,
  CoverageResult,
  TestReport,
} from '../contracts/testing-provider.js';

// ─── Configuration ───────────────────────────────────────────

export interface VitestTestingConfig {
  projectRoot?: string;
  configPath?: string;
  timeout?: number;
}

// ─── Output parsers ──────────────────────────────────────────

function parseVitestOutput(stdout: string, stderr: string): TestSummary {
  // Try JSON first (vitest --reporter=json)
  try {
    const jsonMatch = stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      const results = data.testResults || [];
      let passed = 0,
        failed = 0,
        skipped = 0;
      const files: string[] = [];
      for (const file of results) {
        files.push(file.name || '');
        for (const test of file.assertionResults || []) {
          if (test.status === 'passed') passed++;
          else if (test.status === 'failed') failed++;
          else skipped++;
        }
      }
      return { passed, failed, skipped, total: passed + failed + skipped, duration_ms: 0, files };
    }
  } catch {
    /* fall through */
  }

  // Text fallback
  const combined = stdout + stderr;
  const passMatch = combined.match(/(\d+)\s+pass/i);
  const failMatch = combined.match(/(\d+)\s+fail/i);
  const skipMatch = combined.match(/(\d+)\s+skip/i);
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
  const skipped = skipMatch ? parseInt(skipMatch[1], 10) : 0;
  return { passed, failed, skipped, total: passed + failed + skipped, duration_ms: 0, files: [] };
}

function parseCoverageOutput(stdout: string): Omit<CoverageResult, 'exitCode' | 'duration_ms'> {
  const stmtMatch = stdout.match(/Statements\s*:\s*([\d.]+)%/);
  const branchMatch = stdout.match(/Branches\s*:\s*([\d.]+)%/);
  const funcMatch = stdout.match(/Functions\s*:\s*([\d.]+)%/);
  const lineMatch = stdout.match(/Lines\s*:\s*([\d.]+)%/);
  return {
    statements: stmtMatch ? parseFloat(stmtMatch[1]) : 0,
    branches: branchMatch ? parseFloat(branchMatch[1]) : 0,
    functions: funcMatch ? parseFloat(funcMatch[1]) : 0,
    lines: lineMatch ? parseFloat(lineMatch[1]) : 0,
  };
}

// ─── Vitest Testing Provider ─────────────────────────────────

export class VitestTestingProvider implements TestingProvider {
  readonly providerName = 'vitest';
  readonly capabilities: TestingCapabilities = {
    supportsPatternFilter: true,
    supportsCoverage: true,
    supportsWatch: true,
    supportsParallel: true,
  };

  private _projectRoot: string;
  private _configPath: string | undefined;
  private _timeout: number;

  /** @internal — test-only override */
  _exec: typeof shellExec = shellExec;
  /** @internal — test-only override */
  _isAvail: typeof isBinaryAvailable = isBinaryAvailable;

  constructor(config: VitestTestingConfig = {}) {
    this._projectRoot = config.projectRoot || process.cwd();
    this._configPath = config.configPath;
    this._timeout = config.timeout ?? 120_000;
  }

  private _baseArgs(): string[] {
    const args = ['vitest', 'run', '--reporter=verbose'];
    if (this._configPath) args.push('--config', this._configPath);
    return args;
  }

  async runTests(input: TestRunInput): Promise<TestRunResult> {
    const args = [...this._baseArgs()];
    if (input.pattern) args.push(input.pattern);
    if (input.files) args.push(...input.files);

    const timeout = input.timeout ?? this._timeout;
    const result = await this._exec('npx', args, { cwd: this._projectRoot, timeout });
    const summary = parseVitestOutput(result.stdout, result.stderr);

    return {
      exitCode: result.exitCode,
      success: result.exitCode === 0,
      summary,
      stdout: result.stdout,
      stderr: result.stderr,
      duration_ms: result.duration_ms,
    };
  }

  async runIntegration(input: TestRunInput): Promise<TestRunResult> {
    const args = [...this._baseArgs()];
    args.push(input.pattern || 'tests/integration');

    const timeout = input.timeout ?? this._timeout;
    const result = await this._exec('npx', args, { cwd: this._projectRoot, timeout });
    const summary = parseVitestOutput(result.stdout, result.stderr);

    return {
      exitCode: result.exitCode,
      success: result.exitCode === 0,
      summary,
      stdout: result.stdout,
      stderr: result.stderr,
      duration_ms: result.duration_ms,
    };
  }

  async getCoverage(): Promise<CoverageResult> {
    const args = ['vitest', 'run', '--coverage', '--reporter=verbose'];
    if (this._configPath) args.push('--config', this._configPath);

    const result = await this._exec('npx', args, {
      cwd: this._projectRoot,
      timeout: this._timeout,
    });
    const coverage = parseCoverageOutput(result.stdout);

    return {
      ...coverage,
      exitCode: result.exitCode,
      duration_ms: result.duration_ms,
    };
  }

  async getReport(): Promise<TestReport> {
    const results = await this.runTests({});
    let coverage: CoverageResult | undefined;
    try {
      coverage = await this.getCoverage();
    } catch {
      /* coverage optional */
    }

    return {
      framework: 'vitest',
      results,
      coverage,
      generated_at: new Date().toISOString(),
    };
  }
}
