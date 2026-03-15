// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Git Adapter
 *
 * Adapter for Git/GitHub operations: repository info, branching, commit
 * listing, tag management, and PR status queries. Executes git CLI commands
 * or GitHub API calls via the injected executor.
 *
 * @module sdlc/adapters/git-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';

export interface GitConfig {
  [key: string]: unknown;
  repository_path: string;
  remote_url?: string;
  default_branch?: string;
}

export class GitAdapter extends BaseAdapter {
  readonly name = 'git';
  readonly category = ADAPTER_CATEGORIES.GIT;
  readonly version = '1.0.0';

  constructor(config: GitConfig = { repository_path: '.' }) {
    super();
    this._config = config as Record<string, unknown>;

    this._operations.set('list-branches', async () => {
      return { branches: [] as string[], note: 'Stub — wire to git CLI or API' };
    });
    this._operations.set('list-commits', async (params) => {
      const limit = (params.limit as number) || 10;
      return { commits: [] as string[], limit, note: 'Stub — wire to git CLI or API' };
    });
    this._operations.set('create-branch', async (params) => {
      return { branch: params.name, note: 'Stub — wire to git CLI or API' };
    });
    this._operations.set('create-tag', async (params) => {
      return { tag: params.name, note: 'Stub — wire to git CLI or API' };
    });
    this._operations.set('get-diff', async (params) => {
      return { from: params.from, to: params.to, diff: '', note: 'Stub' };
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    return {
      status: this._config.repository_path ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNCONFIGURED,
      adapter: this.name,
      category: this.category,
      message: this._config.repository_path ? 'Git repository configured' : 'No repository path',
      checked_at: new Date().toISOString(),
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.repository_path || typeof config.repository_path !== 'string') {
      errors.push('repository_path is required and must be a string');
    }
    return { valid: errors.length === 0, errors };
  }
}
