// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * CI Adapter
 *
 * Adapter for CI/CD pipeline operations: trigger builds, query build status,
 * retrieve logs, and manage workflows. Supports GitHub Actions as the primary
 * target with an extensible operation map.
 *
 * @module sdlc/adapters/ci-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';

export interface CiConfig {
  [key: string]: unknown;
  provider: 'github-actions' | 'azure-devops' | 'generic';
  repository?: string;
}

export class CiAdapter extends BaseAdapter {
  readonly name = 'ci';
  readonly category = ADAPTER_CATEGORIES.CI;
  readonly version = '1.0.0';

  constructor(config: CiConfig = { provider: 'github-actions' }) {
    super();
    this._config = config as Record<string, unknown>;

    this._operations.set('trigger-workflow', async (params) => {
      return { workflow: params.workflow, status: 'triggered', note: 'Stub' };
    });
    this._operations.set('get-build-status', async (params) => {
      return { run_id: params.run_id, status: 'unknown', note: 'Stub' };
    });
    this._operations.set('list-workflows', async () => {
      return { workflows: [] as string[], note: 'Stub' };
    });
    this._operations.set('get-logs', async (params) => {
      return { run_id: params.run_id, logs: '', note: 'Stub' };
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    return {
      status: this._config.provider ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNCONFIGURED,
      adapter: this.name,
      category: this.category,
      message: `CI provider: ${this._config.provider || 'not set'}`,
      checked_at: new Date().toISOString(),
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validProviders = ['github-actions', 'azure-devops', 'generic'];
    if (!config.provider || !validProviders.includes(config.provider as string)) {
      errors.push(`provider must be one of: ${validProviders.join(', ')}`);
    }
    return { valid: errors.length === 0, errors };
  }
}
