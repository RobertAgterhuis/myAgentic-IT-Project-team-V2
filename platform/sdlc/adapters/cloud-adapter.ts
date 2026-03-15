// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Cloud Adapter
 *
 * Adapter for cloud deployment operations: provision resources, deploy
 * artifacts, query infrastructure status, manage environments.
 *
 * @module sdlc/adapters/cloud-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';

export interface CloudConfig {
  [key: string]: unknown;
  provider: 'azure' | 'aws' | 'gcp' | 'generic';
  region?: string;
  subscription_id?: string;
}

export class CloudAdapter extends BaseAdapter {
  readonly name = 'cloud';
  readonly category = ADAPTER_CATEGORIES.CLOUD;
  readonly version = '1.0.0';

  constructor(config: CloudConfig = { provider: 'azure' }) {
    super();
    this._config = config as Record<string, unknown>;

    this._operations.set('deploy', async (params) => {
      return { environment: params.environment, artifact: params.artifact, note: 'Stub' };
    });
    this._operations.set('get-status', async (params) => {
      return { environment: params.environment, status: 'unknown', note: 'Stub' };
    });
    this._operations.set('list-environments', async () => {
      return { environments: [] as string[], note: 'Stub' };
    });
    this._operations.set('rollback', async (params) => {
      return { environment: params.environment, version: params.version, note: 'Stub' };
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    return {
      status: this._config.provider ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNCONFIGURED,
      adapter: this.name,
      category: this.category,
      message: `Cloud provider: ${this._config.provider || 'not set'}`,
      checked_at: new Date().toISOString(),
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (
      !config.provider ||
      !['azure', 'aws', 'gcp', 'generic'].includes(config.provider as string)
    ) {
      errors.push('provider must be one of: azure, aws, gcp, generic');
    }
    return { valid: errors.length === 0, errors };
  }
}
