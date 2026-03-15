// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Container Adapter
 *
 * Adapter for container build and registry operations: build images, push to
 * registry, inspect manifests, scan for vulnerabilities.
 *
 * @module sdlc/adapters/container-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';

export interface ContainerConfig {
  [key: string]: unknown;
  runtime: 'docker' | 'podman' | 'generic';
  registry_url?: string;
}

export class ContainerAdapter extends BaseAdapter {
  readonly name = 'container';
  readonly category = ADAPTER_CATEGORIES.CONTAINER;
  readonly version = '1.0.0';

  constructor(config: ContainerConfig = { runtime: 'docker' }) {
    super();
    this._config = config as Record<string, unknown>;

    this._operations.set('build', async (params) => {
      return { image: params.image, tag: params.tag || 'latest', note: 'Stub' };
    });
    this._operations.set('push', async (params) => {
      return { image: params.image, registry: this._config.registry_url, note: 'Stub' };
    });
    this._operations.set('inspect', async (params) => {
      return { image: params.image, manifest: {}, note: 'Stub' };
    });
    this._operations.set('scan', async (params) => {
      return { image: params.image, vulnerabilities: [], note: 'Stub' };
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    return {
      status: this._config.runtime ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNCONFIGURED,
      adapter: this.name,
      category: this.category,
      message: `Container runtime: ${this._config.runtime || 'not set'}`,
      checked_at: new Date().toISOString(),
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.runtime || !['docker', 'podman', 'generic'].includes(config.runtime as string)) {
      errors.push('runtime must be one of: docker, podman, generic');
    }
    return { valid: errors.length === 0, errors };
  }
}
