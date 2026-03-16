// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Container Adapter
 *
 * Adapter for container build and registry operations: build images, push to
 * registry, list local images, inspect manifests, scan for vulnerabilities.
 *
 * Uses the shell executor to invoke docker/podman CLI commands — no shell
 * interpolation. Build args are passed as explicit --build-arg flags.
 *
 * @module sdlc/adapters/container-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';
import { shellExec, isBinaryAvailable } from './shell-executor.js';

export interface ContainerConfig {
  [key: string]: unknown;
  runtime: 'docker' | 'podman' | 'generic';
  registry_url?: string;
  timeout?: number;
}

export class ContainerAdapter extends BaseAdapter {
  readonly name = 'container';
  readonly category = ADAPTER_CATEGORIES.CONTAINER;
  readonly version = '2.0.0';

  /** @internal — test-only override for shellExec */
  _exec: typeof shellExec = shellExec;
  /** @internal — test-only override for isBinaryAvailable */
  _isAvail: typeof isBinaryAvailable = isBinaryAvailable;

  constructor(config: ContainerConfig = { runtime: 'docker' }) {
    super();
    this._config = config as Record<string, unknown>;
    const bin = config.runtime === 'podman' ? 'podman' : 'docker';
    const timeout = config.timeout ?? 300_000; // 5 min default for builds

    // ── build ────────────────────────────────────────────
    this._operations.set('build', async (params) => {
      const image = params.image as string;
      const tag = (params.tag as string) || 'latest';
      const context = (params.context as string) || '.';
      const dockerfile = params.dockerfile as string | undefined;
      const buildArgs = (params.build_args as Record<string, string>) || {};
      if (!image) throw new Error('image name is required');

      const args = ['build', '-t', `${image}:${tag}`];
      if (dockerfile) args.push('-f', dockerfile);
      for (const [k, v] of Object.entries(buildArgs)) {
        args.push('--build-arg', `${k}=${v}`);
      }
      args.push(context);

      const result = await this._exec(bin, args, { timeout });
      if (result.exitCode !== 0) throw new Error(result.stderr || `${bin} build failed`);
      return { image, tag, context, exit_code: result.exitCode };
    });

    // ── push ─────────────────────────────────────────────
    this._operations.set('push', async (params) => {
      const image = params.image as string;
      const tag = (params.tag as string) || 'latest';
      if (!image) throw new Error('image name is required');

      const registry = (this._config.registry_url as string) || '';
      const fullRef = registry ? `${registry}/${image}:${tag}` : `${image}:${tag}`;

      // Tag for registry if registry_url is set
      if (registry) {
        const tagResult = await this._exec(bin, ['tag', `${image}:${tag}`, fullRef], {
          timeout: 30_000,
        });
        if (tagResult.exitCode !== 0) throw new Error(tagResult.stderr || 'docker tag failed');
      }

      const result = await this._exec(bin, ['push', fullRef], { timeout });
      if (result.exitCode !== 0) throw new Error(result.stderr || `${bin} push failed`);
      return { image: fullRef, pushed: true, exit_code: result.exitCode };
    });

    // ── list-images ──────────────────────────────────────
    this._operations.set('list-images', async (params) => {
      const filter = params.filter as string | undefined;
      const args = ['images', '--format', '{{.Repository}}|{{.Tag}}|{{.ID}}|{{.Size}}'];
      if (filter) args.push('--filter', `reference=${filter}`);

      const result = await this._exec(bin, args, { timeout: 30_000 });
      if (result.exitCode !== 0) throw new Error(result.stderr || `${bin} images failed`);

      const images = result.stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [repository, tag, id, size] = line.split('|');
          return { repository, tag, id, size };
        });
      return { images, count: images.length };
    });

    // ── inspect ──────────────────────────────────────────
    this._operations.set('inspect', async (params) => {
      const image = params.image as string;
      if (!image) throw new Error('image name is required');

      const result = await this._exec(bin, ['inspect', image], { timeout: 30_000 });
      if (result.exitCode !== 0) throw new Error(result.stderr || `${bin} inspect failed`);

      let manifest: unknown = {};
      try {
        manifest = JSON.parse(result.stdout);
      } catch {
        manifest = { raw: result.stdout };
      }
      return { image, manifest };
    });

    // ── scan ─────────────────────────────────────────────
    this._operations.set('scan', async (params) => {
      const image = params.image as string;
      if (!image) throw new Error('image name is required');

      // Try docker scout / trivy if available
      const scoutAvailable = bin === 'docker' && (await this._isAvail('docker'));
      if (scoutAvailable) {
        const result = await this._exec(bin, ['scout', 'cves', '--format', 'json', image], {
          timeout: 120_000,
        });
        if (result.exitCode === 0) {
          let vulnerabilities: unknown[] = [];
          try {
            const data = JSON.parse(result.stdout);
            vulnerabilities = Array.isArray(data) ? data : data.vulnerabilities || [];
          } catch {
            // non-JSON output
          }
          return { image, vulnerabilities, scanner: 'docker-scout' };
        }
      }

      // Fallback: return empty scan (scanner not available)
      return { image, vulnerabilities: [], scanner: 'none', note: 'No scanner available' };
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    const runtime = this._config.runtime as string;
    const bin = runtime === 'podman' ? 'podman' : 'docker';
    const available = await this._isAvail(bin);

    if (!available) {
      return {
        status: HEALTH_STATUS.UNAVAILABLE,
        adapter: this.name,
        category: this.category,
        message: `${bin} binary not found on PATH`,
        checked_at: new Date().toISOString(),
      };
    }

    if (!runtime) {
      return {
        status: HEALTH_STATUS.UNCONFIGURED,
        adapter: this.name,
        category: this.category,
        message: 'No container runtime configured',
        checked_at: new Date().toISOString(),
      };
    }

    // Verify daemon is running
    const result = await this._exec(bin, ['info', '--format', '{{.ServerVersion}}'], {
      timeout: 10_000,
    });

    return {
      status: result.exitCode === 0 ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED,
      adapter: this.name,
      category: this.category,
      message:
        result.exitCode === 0
          ? `${bin} daemon v${result.stdout.trim()}`
          : `${bin} daemon not responding: ${result.stderr.trim()}`,
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
