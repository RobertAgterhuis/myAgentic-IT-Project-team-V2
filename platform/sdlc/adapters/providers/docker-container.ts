// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Docker Container Provider
 *
 * Concrete implementation of the ContainerProvider contract using
 * Docker CLI via shell executor. No shell interpolation — all args
 * are passed as explicit arrays.
 *
 * @module sdlc/adapters/providers/docker-container
 */

import { shellExec, isBinaryAvailable } from '../shell-executor.js';
import type {
  ContainerProvider,
  ContainerCapabilities,
  BuildInput,
  BuildResult,
  PushResult,
  ImageInfo,
  ScanResult,
  TagResult,
} from '../contracts/container-provider.js';

// ─── Configuration ───────────────────────────────────────────

export interface DockerContainerConfig {
  runtime?: 'docker' | 'podman';
  registryUrl?: string;
  timeout?: number;
}

// ─── Docker Container Provider ───────────────────────────────

export class DockerContainerProvider implements ContainerProvider {
  readonly providerName = 'docker';
  readonly capabilities: ContainerCapabilities = {
    supportsScan: true,
    supportsPull: true,
    supportsMultiPlatform: false,
    supportsInspect: true,
  };

  private _cfg: DockerContainerConfig;
  private _bin: string;
  private _timeout: number;

  /** @internal — test-only override */
  _exec: typeof shellExec = shellExec;
  /** @internal — test-only override */
  _isAvail: typeof isBinaryAvailable = isBinaryAvailable;

  constructor(config: DockerContainerConfig = {}) {
    this._cfg = config;
    this._bin = config.runtime === 'podman' ? 'podman' : 'docker';
    this._timeout = config.timeout ?? 300_000;
  }

  async build(input: BuildInput): Promise<BuildResult> {
    if (!input.image) throw new Error('image name is required');
    const tag = input.tag || 'latest';
    const context = input.context || '.';

    const args = ['build', '-t', `${input.image}:${tag}`];
    if (input.dockerfile) args.push('-f', input.dockerfile);
    for (const [k, v] of Object.entries(input.buildArgs || {})) {
      args.push('--build-arg', `${k}=${v}`);
    }
    args.push(context);

    const result = await this._exec(this._bin, args, { timeout: this._timeout });
    if (result.exitCode !== 0) throw new Error(result.stderr || `${this._bin} build failed`);
    return { image: input.image, tag, context, exit_code: result.exitCode };
  }

  async push(image: string, tag?: string): Promise<PushResult> {
    if (!image) throw new Error('image name is required');
    const t = tag || 'latest';
    const registry = this._cfg.registryUrl || '';
    const fullRef = registry ? `${registry}/${image}:${t}` : `${image}:${t}`;

    if (registry) {
      const tagResult = await this._exec(this._bin, ['tag', `${image}:${t}`, fullRef], {
        timeout: 30_000,
      });
      if (tagResult.exitCode !== 0) throw new Error(tagResult.stderr || 'docker tag failed');
    }

    const result = await this._exec(this._bin, ['push', fullRef], { timeout: this._timeout });
    if (result.exitCode !== 0) throw new Error(result.stderr || `${this._bin} push failed`);
    return { image: fullRef, pushed: true };
  }

  async pull(image: string, tag?: string): Promise<PushResult> {
    if (!image) throw new Error('image name is required');
    const t = tag || 'latest';
    const fullRef = `${image}:${t}`;

    const result = await this._exec(this._bin, ['pull', fullRef], { timeout: this._timeout });
    if (result.exitCode !== 0) throw new Error(result.stderr || `${this._bin} pull failed`);
    return { image: fullRef, pushed: false };
  }

  async tag(source: string, target: string): Promise<TagResult> {
    if (!source || !target) throw new Error('source and target are required');
    const result = await this._exec(this._bin, ['tag', source, target], { timeout: 30_000 });
    if (result.exitCode !== 0) throw new Error(result.stderr || `${this._bin} tag failed`);
    return { source, target, tagged: true };
  }

  async listImages(filter?: string): Promise<ImageInfo[]> {
    const args = ['images', '--format', '{{.Repository}}|{{.Tag}}|{{.ID}}|{{.Size}}'];
    if (filter) args.push('--filter', `reference=${filter}`);

    const result = await this._exec(this._bin, args, { timeout: 30_000 });
    if (result.exitCode !== 0) throw new Error(result.stderr || `${this._bin} images failed`);

    return result.stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [repository, tag, id, size] = line.split('|');
        return { repository, tag, id, size };
      });
  }

  async scan(image: string): Promise<ScanResult> {
    if (!image) throw new Error('image name is required');

    // Try docker scout first
    const scoutResult = await this._exec(this._bin, ['scout', 'cves', '--format', 'json', image], {
      timeout: 120_000,
    });
    if (scoutResult.exitCode === 0) {
      let vulnerabilities: unknown[] = [];
      try {
        const data = JSON.parse(scoutResult.stdout);
        vulnerabilities = Array.isArray(data) ? data : data.vulnerabilities || [];
      } catch {
        /* non-JSON output */
      }
      return { image, vulnerabilities, scanner: 'docker-scout' };
    }

    // Try trivy as fallback
    const trivyAvailable = await this._isAvail('trivy');
    if (trivyAvailable) {
      const trivyResult = await this._exec('trivy', ['image', '--format', 'json', image], {
        timeout: 120_000,
      });
      if (trivyResult.exitCode === 0) {
        let vulnerabilities: unknown[] = [];
        try {
          const data = JSON.parse(trivyResult.stdout);
          vulnerabilities = data.Results || [];
        } catch {
          /* non-JSON output */
        }
        return { image, vulnerabilities, scanner: 'trivy' };
      }
    }

    return { image, vulnerabilities: [], scanner: 'none' };
  }
}
