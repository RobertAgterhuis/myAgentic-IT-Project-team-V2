// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Cloud Adapter
 *
 * Adapter for cloud deployment operations: deploy artifacts, query
 * infrastructure status, manage environments, and rollback. Targets Azure
 * via the `az` CLI by default, with extensible provider support.
 *
 * Credentials are sourced exclusively from environment variables or
 * Azure CLI login state — no secrets are hardcoded or stored in config.
 *
 * @module sdlc/adapters/cloud-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';
import { shellExec, isBinaryAvailable, type ShellResult } from './shell-executor.js';

export interface CloudConfig {
  [key: string]: unknown;
  provider: 'azure' | 'aws' | 'gcp' | 'generic';
  region?: string;
  subscription_id?: string;
  resource_group?: string;
  timeout?: number;
}

export class CloudAdapter extends BaseAdapter {
  readonly name = 'cloud';
  readonly category = ADAPTER_CATEGORIES.CLOUD;
  readonly version = '2.0.0';

  /** @internal — test-only override for shellExec */
  _exec: typeof shellExec = shellExec;
  /** @internal — test-only override for isBinaryAvailable */
  _isAvail: typeof isBinaryAvailable = isBinaryAvailable;

  constructor(config: CloudConfig = { provider: 'azure' }) {
    super();
    this._config = config as Record<string, unknown>;
    const timeout = config.timeout ?? 300_000;

    // ── deploy ───────────────────────────────────────────
    this._operations.set('deploy', async (params) => {
      const environment = params.environment as string;
      const artifact = params.artifact as string;
      const appName = params.app_name as string;
      if (!environment) throw new Error('environment is required');
      if (!artifact) throw new Error('artifact is required');

      if (config.provider === 'azure') {
        return await this._azureDeploy(appName || artifact, environment, artifact, timeout);
      }
      throw new Error(`Provider '${config.provider}' deploy not yet implemented`);
    });

    // ── get-status ───────────────────────────────────────
    this._operations.set('get-status', async (params) => {
      const environment = params.environment as string;
      const appName = params.app_name as string;
      if (!environment) throw new Error('environment is required');

      if (config.provider === 'azure') {
        return await this._azureStatus(appName || environment, timeout);
      }
      throw new Error(`Provider '${config.provider}' status not yet implemented`);
    });

    // ── list-environments ────────────────────────────────
    this._operations.set('list-environments', async () => {
      if (config.provider === 'azure') {
        return await this._azureListSlots(timeout);
      }
      throw new Error(`Provider '${config.provider}' list not yet implemented`);
    });

    // ── rollback ─────────────────────────────────────────
    this._operations.set('rollback', async (params) => {
      const environment = params.environment as string;
      const appName = params.app_name as string;
      const version = params.version as string;
      if (!environment) throw new Error('environment is required');

      if (config.provider === 'azure') {
        return await this._azureRollback(appName || environment, version, timeout);
      }
      throw new Error(`Provider '${config.provider}' rollback not yet implemented`);
    });
  }

  // ── Azure CLI helpers ────────────────────────────────────

  private _rg(): string {
    return (this._config.resource_group as string) || '';
  }

  private _azBin(): string {
    return process.platform === 'win32' ? 'az.cmd' : 'az';
  }

  private async _azureDeploy(appName: string, slot: string, artifact: string, timeout: number) {
    const az = this._azBin();
    const rg = this._rg();
    if (!rg) throw new Error('resource_group is required for Azure deployments');
    if (!appName) throw new Error('app_name is required for Azure deployments');

    const args = [
      'webapp',
      'deployment',
      'source',
      'config-zip',
      '--resource-group',
      rg,
      '--name',
      appName,
      '--src',
      artifact,
    ];
    if (slot && slot !== 'production') {
      args.push('--slot', slot);
    }

    const result = await this._exec(az, args, { timeout });
    if (result.exitCode !== 0) throw new Error(result.stderr || 'az deployment failed');

    let response: unknown = {};
    try {
      response = JSON.parse(result.stdout);
    } catch {
      /* non-json */
    }
    return { app_name: appName, slot, artifact, deployed: true, response };
  }

  private async _azureStatus(appName: string, timeout: number) {
    const az = this._azBin();
    const rg = this._rg();
    if (!rg) throw new Error('resource_group is required');

    const result = await this._exec(
      az,
      ['webapp', 'show', '--resource-group', rg, '--name', appName, '--output', 'json'],
      { timeout: Math.min(timeout, 30_000) }
    );
    if (result.exitCode !== 0) throw new Error(result.stderr || 'az webapp show failed');

    let status: unknown = {};
    try {
      status = JSON.parse(result.stdout);
    } catch {
      /* non-json */
    }
    return { app_name: appName, status };
  }

  private async _azureListSlots(timeout: number) {
    const az = this._azBin();
    const rg = this._rg();
    if (!rg) return { environments: [], note: 'resource_group not configured' };

    const result = await this._exec(
      az,
      ['webapp', 'list', '--resource-group', rg, '--output', 'json'],
      { timeout: Math.min(timeout, 30_000) }
    );
    if (result.exitCode !== 0) throw new Error(result.stderr || 'az webapp list failed');

    let apps: Array<{ name: string; state: string }> = [];
    try {
      const data = JSON.parse(result.stdout) as Array<{ name: string; state: string }>;
      apps = data.map((a) => ({ name: a.name, state: a.state }));
    } catch {
      /* non-json */
    }
    return { environments: apps };
  }

  private async _azureRollback(appName: string, version: string | undefined, timeout: number) {
    const az = this._azBin();
    const rg = this._rg();
    if (!rg) throw new Error('resource_group is required for rollback');

    // Swap deployment slots (staging ↔ production)
    const args = [
      'webapp',
      'deployment',
      'slot',
      'swap',
      '--resource-group',
      rg,
      '--name',
      appName,
      '--slot',
      'staging',
      '--target-slot',
      'production',
    ];

    const result = await this._exec(az, args, { timeout });
    if (result.exitCode !== 0) throw new Error(result.stderr || 'az slot swap failed');
    return { app_name: appName, rolled_back: true, version: version || 'previous-slot' };
  }

  async healthCheck(): Promise<HealthCheck> {
    if (this._config.provider !== 'azure') {
      return {
        status: this._config.provider ? HEALTH_STATUS.DEGRADED : HEALTH_STATUS.UNCONFIGURED,
        adapter: this.name,
        category: this.category,
        message: `Provider '${this._config.provider || 'none'}' — only Azure is fully implemented`,
        checked_at: new Date().toISOString(),
      };
    }

    const az = this._azBin();
    const available = await this._isAvail(az);
    if (!available) {
      return {
        status: HEALTH_STATUS.UNAVAILABLE,
        adapter: this.name,
        category: this.category,
        message: 'Azure CLI (az) not found on PATH',
        checked_at: new Date().toISOString(),
      };
    }

    // Verify authentication
    let result: ShellResult;
    try {
      result = await this._exec(az, ['account', 'show', '--output', 'json'], {
        timeout: 15_000,
      });
    } catch {
      return {
        status: HEALTH_STATUS.DEGRADED,
        adapter: this.name,
        category: this.category,
        message: 'Azure CLI found but failed to execute — check installation',
        checked_at: new Date().toISOString(),
      };
    }

    if (result.exitCode !== 0) {
      return {
        status: HEALTH_STATUS.DEGRADED,
        adapter: this.name,
        category: this.category,
        message: 'Azure CLI found but not authenticated — run `az login`',
        checked_at: new Date().toISOString(),
      };
    }

    let accountInfo = '';
    try {
      const data = JSON.parse(result.stdout) as { name?: string; user?: { name?: string } };
      accountInfo = `subscription: ${data.name || 'unknown'}, user: ${data.user?.name || 'unknown'}`;
    } catch {
      /* non-json */
    }

    return {
      status: HEALTH_STATUS.HEALTHY,
      adapter: this.name,
      category: this.category,
      message: `Azure CLI authenticated — ${accountInfo}`,
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
    if (config.provider === 'azure' && !config.resource_group) {
      errors.push('resource_group is required for Azure provider');
    }
    return { valid: errors.length === 0, errors };
  }
}
