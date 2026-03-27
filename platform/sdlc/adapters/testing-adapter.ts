// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Testing Adapter
 *
 * Adapter for test execution operations: run unit/integration/E2E tests,
 * collect coverage, generate reports. Executes real test frameworks via
 * the shell executor.
 *
 * @module sdlc/adapters/testing-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';
import { shellExec, isBinaryAvailable, withToolGuardrails } from './shell-executor.js';

export interface TestingConfig {
  [key: string]: unknown;
  framework: 'vitest' | 'jest' | 'playwright' | 'generic';
  config_path?: string;
  /** Project root where package.json lives (default: process.cwd()) */
  project_root?: string;
  /** Timeout for test runs in ms (default: 120000) */
  timeout?: number;
}

/** Parsed test results from JSON reporter output */
interface TestSummary {
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  duration_ms: number;
  files: string[];
}

/**
 * Parse vitest JSON reporter output into a test summary.
 * Falls back to parsing the text output for counts.
 */
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
    /* fall through to text parsing */
  }

  // Text output parsing fallback
  const combined = stdout + stderr;
  const passMatch = combined.match(/(\d+)\s+pass/i);
  const failMatch = combined.match(/(\d+)\s+fail/i);
  const skipMatch = combined.match(/(\d+)\s+skip/i);
  const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
  const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
  const skipped = skipMatch ? parseInt(skipMatch[1], 10) : 0;
  return { passed, failed, skipped, total: passed + failed + skipped, duration_ms: 0, files: [] };
}

export class TestingAdapter extends BaseAdapter {
  readonly name = 'testing';
  readonly category = ADAPTER_CATEGORIES.TESTING;
  readonly version = '2.0.0';

  constructor(config: TestingConfig = { framework: 'vitest' }) {
    super();
    this._config = config as Record<string, unknown>;
    const projectRoot = config.project_root || process.cwd();
    const timeout = config.timeout ?? 120_000;
    const framework = config.framework;

    this._operations.set('run-unit', async (params) => {
      const pattern = (params.pattern as string) || '';
      const args =
        framework === 'vitest'
          ? ['vitest', 'run', '--reporter=verbose', ...(pattern ? [pattern] : [])]
          : ['jest', '--verbose', ...(pattern ? [pattern] : [])];

      const result = await shellExec(
        'npx',
        args,
        withToolGuardrails({ cwd: projectRoot, timeout }, params)
      );
      const summary = parseVitestOutput(result.stdout, result.stderr);

      return {
        exitCode: result.exitCode,
        success: result.exitCode === 0,
        summary,
        stdout: result.stdout,
        stderr: result.stderr,
        duration_ms: result.duration_ms,
      };
    });

    this._operations.set('run-integration', async (params) => {
      const pattern = (params.pattern as string) || 'tests/integration';
      const args =
        framework === 'vitest'
          ? ['vitest', 'run', '--reporter=verbose', pattern]
          : ['jest', '--verbose', pattern];

      const result = await shellExec(
        'npx',
        args,
        withToolGuardrails({ cwd: projectRoot, timeout }, params)
      );
      const summary = parseVitestOutput(result.stdout, result.stderr);

      return {
        exitCode: result.exitCode,
        success: result.exitCode === 0,
        summary,
        stdout: result.stdout,
        stderr: result.stderr,
        duration_ms: result.duration_ms,
      };
    });

    this._operations.set('run-e2e', async (params) => {
      const pattern = (params.pattern as string) || '';
      const args =
        framework === 'playwright'
          ? ['playwright', 'test', ...(pattern ? [pattern] : [])]
          : ['vitest', 'run', 'tests/e2e', ...(pattern ? [pattern] : [])];

      const result = await shellExec(
        'npx',
        args,
        withToolGuardrails({ cwd: projectRoot, timeout: timeout * 2 }, params)
      );
      const summary = parseVitestOutput(result.stdout, result.stderr);

      return {
        exitCode: result.exitCode,
        success: result.exitCode === 0,
        summary,
        stdout: result.stdout,
        stderr: result.stderr,
        duration_ms: result.duration_ms,
      };
    });

    this._operations.set('get-coverage', async (params) => {
      const args =
        framework === 'vitest'
          ? ['vitest', 'run', '--coverage', '--reporter=verbose']
          : ['jest', '--coverage', '--verbose'];

      const result = await shellExec(
        'npx',
        args,
        withToolGuardrails({ cwd: projectRoot, timeout }, params)
      );

      // Try to extract coverage summary from output
      const stmtMatch = result.stdout.match(/Statements\s*:\s*([\d.]+)%/);
      const branchMatch = result.stdout.match(/Branches\s*:\s*([\d.]+)%/);
      const funcMatch = result.stdout.match(/Functions\s*:\s*([\d.]+)%/);
      const lineMatch = result.stdout.match(/Lines\s*:\s*([\d.]+)%/);

      return {
        statements: stmtMatch ? parseFloat(stmtMatch[1]) : 0,
        branches: branchMatch ? parseFloat(branchMatch[1]) : 0,
        functions: funcMatch ? parseFloat(funcMatch[1]) : 0,
        lines: lineMatch ? parseFloat(lineMatch[1]) : 0,
        exitCode: result.exitCode,
        duration_ms: result.duration_ms,
      };
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    const framework = this._config.framework as string;

    // Check npx availability
    const npxAvailable = await isBinaryAvailable('npx');
    if (!npxAvailable) {
      return {
        status: HEALTH_STATUS.UNAVAILABLE,
        adapter: this.name,
        category: this.category,
        message: 'npx binary not found on PATH',
        checked_at: new Date().toISOString(),
      };
    }

    if (!framework) {
      return {
        status: HEALTH_STATUS.UNCONFIGURED,
        adapter: this.name,
        category: this.category,
        message: 'No test framework configured',
        checked_at: new Date().toISOString(),
      };
    }

    // Verify the framework binary is resolvable
    const projectRoot = (this._config.project_root as string) || process.cwd();
    const result = await shellExec('npx', [framework, '--version'], {
      cwd: projectRoot,
      timeout: 10_000,
    });

    return {
      status: result.exitCode === 0 ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED,
      adapter: this.name,
      category: this.category,
      message:
        result.exitCode === 0
          ? `${framework} available (${result.stdout.trim()})`
          : `${framework} not resolvable: ${result.stderr.trim()}`,
      checked_at: new Date().toISOString(),
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (
      !config.framework ||
      !['vitest', 'jest', 'playwright', 'generic'].includes(config.framework as string)
    ) {
      errors.push('framework must be one of: vitest, jest, playwright, generic');
    }
    return { valid: errors.length === 0, errors };
  }
}
