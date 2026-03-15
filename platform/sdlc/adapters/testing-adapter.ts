// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Testing Adapter
 *
 * Adapter for test execution operations: run unit/integration/E2E tests,
 * collect coverage, generate reports.
 *
 * @module sdlc/adapters/testing-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';

export interface TestingConfig {
  [key: string]: unknown;
  framework: 'vitest' | 'jest' | 'playwright' | 'generic';
  config_path?: string;
}

export class TestingAdapter extends BaseAdapter {
  readonly name = 'testing';
  readonly category = ADAPTER_CATEGORIES.TESTING;
  readonly version = '1.0.0';

  constructor(config: TestingConfig = { framework: 'vitest' }) {
    super();
    this._config = config as Record<string, unknown>;

    this._operations.set('run-unit', async (params) => {
      return {
        pattern: params.pattern || '**/*.test.*',
        results: { passed: 0, failed: 0, skipped: 0 },
        note: 'Stub',
      };
    });
    this._operations.set('run-integration', async (params) => {
      return {
        pattern: params.pattern,
        results: { passed: 0, failed: 0, skipped: 0 },
        note: 'Stub',
      };
    });
    this._operations.set('run-e2e', async (params) => {
      return {
        pattern: params.pattern,
        results: { passed: 0, failed: 0, skipped: 0 },
        note: 'Stub',
      };
    });
    this._operations.set('get-coverage', async () => {
      return { statements: 0, branches: 0, functions: 0, lines: 0, note: 'Stub' };
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    return {
      status: this._config.framework ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNCONFIGURED,
      adapter: this.name,
      category: this.category,
      message: `Test framework: ${this._config.framework || 'not set'}`,
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
