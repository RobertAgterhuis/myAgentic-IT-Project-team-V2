// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Git Adapter
 *
 * Adapter for Git operations: repository info, branching, commit listing,
 * tag management, and diff queries. Executes real git CLI commands via
 * the shell executor.
 *
 * @module sdlc/adapters/git-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';
import { shellExec, isBinaryAvailable } from './shell-executor.js';

export interface GitConfig {
  [key: string]: unknown;
  repository_path: string;
  remote_url?: string;
  default_branch?: string;
  /** Timeout for git operations in ms (default: 15000) */
  timeout?: number;
}

export class GitAdapter extends BaseAdapter {
  readonly name = 'git';
  readonly category = ADAPTER_CATEGORIES.GIT;
  readonly version = '2.0.0';

  constructor(config: GitConfig = { repository_path: '.' }) {
    super();
    this._config = config as Record<string, unknown>;
    const repoPath = config.repository_path;
    const timeout = config.timeout ?? 15_000;

    this._operations.set('list-branches', async () => {
      const result = await shellExec('git', ['branch', '--list', '--no-color'], {
        cwd: repoPath,
        timeout,
      });
      if (result.exitCode !== 0) throw new Error(result.stderr || 'git branch failed');
      const branches = result.stdout
        .split('\n')
        .map((b) => b.replace(/^\*?\s+/, '').trim())
        .filter(Boolean);
      return { branches };
    });

    this._operations.set('list-commits', async (params) => {
      const limit = (params.limit as number) || 10;
      const result = await shellExec(
        'git',
        ['log', `--max-count=${limit}`, '--format=%H|%an|%s|%aI', '--no-color'],
        { cwd: repoPath, timeout }
      );
      if (result.exitCode !== 0) throw new Error(result.stderr || 'git log failed');
      const commits = result.stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [hash, author, subject, date] = line.split('|');
          return { hash, author, subject, date };
        });
      return { commits, limit };
    });

    this._operations.set('create-branch', async (params) => {
      const name = params.name as string;
      if (!name) throw new Error('Branch name is required');
      const result = await shellExec('git', ['branch', name], { cwd: repoPath, timeout });
      if (result.exitCode !== 0) throw new Error(result.stderr || 'git branch create failed');
      return { branch: name, created: true };
    });

    this._operations.set('create-tag', async (params) => {
      const name = params.name as string;
      const message = (params.message as string) || name;
      if (!name) throw new Error('Tag name is required');
      const result = await shellExec('git', ['tag', '-a', name, '-m', message], {
        cwd: repoPath,
        timeout,
      });
      if (result.exitCode !== 0) throw new Error(result.stderr || 'git tag create failed');
      return { tag: name, created: true };
    });

    this._operations.set('get-diff', async (params) => {
      const from = (params.from as string) || 'HEAD~1';
      const to = (params.to as string) || 'HEAD';
      const result = await shellExec('git', ['diff', '--stat', '--no-color', from, to], {
        cwd: repoPath,
        timeout,
      });
      if (result.exitCode !== 0) throw new Error(result.stderr || 'git diff failed');
      return { from, to, diff: result.stdout };
    });

    this._operations.set('status', async () => {
      const result = await shellExec('git', ['status', '--porcelain'], { cwd: repoPath, timeout });
      if (result.exitCode !== 0) throw new Error(result.stderr || 'git status failed');
      const files = result.stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => ({
          status: line.substring(0, 2).trim(),
          file: line.substring(3),
        }));
      return { files, clean: files.length === 0 };
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    const gitAvailable = await isBinaryAvailable('git');
    if (!gitAvailable) {
      return {
        status: HEALTH_STATUS.UNAVAILABLE,
        adapter: this.name,
        category: this.category,
        message: 'git binary not found on PATH',
        checked_at: new Date().toISOString(),
      };
    }

    if (!this._config.repository_path) {
      return {
        status: HEALTH_STATUS.UNCONFIGURED,
        adapter: this.name,
        category: this.category,
        message: 'No repository path configured',
        checked_at: new Date().toISOString(),
      };
    }

    // Verify it's actually a git repo
    const result = await shellExec('git', ['rev-parse', '--is-inside-work-tree'], {
      cwd: this._config.repository_path as string,
      timeout: 5000,
    });

    return {
      status: result.exitCode === 0 ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED,
      adapter: this.name,
      category: this.category,
      message:
        result.exitCode === 0
          ? 'Git repository OK'
          : `Not a git repository: ${result.stderr.trim()}`,
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
