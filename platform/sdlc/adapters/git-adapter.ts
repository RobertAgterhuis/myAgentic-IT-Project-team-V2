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
import fs from 'node:fs';
import * as git from 'isomorphic-git';
import { GitBackendRouter } from '../../../src/webapp/services/git/git-backend-router';
import { GitService } from '../../../src/webapp/services/git/git-service';

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

    const router = new GitBackendRouter({
      repositoryPath: repoPath,
      env: process.env,
    });
    const gitService = new GitService({
      backend: router.getBackend(),
      audit: { log: () => {} },
      repositoryPath: repoPath,
      actor: 'sdlc-adapter',
    });

    const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          setTimeout(() => reject(new Error(`Git operation timeout after ${timeout}ms`)), timeout);
        }),
      ]);
    };

    const unwrap = <T>(result: readonly [T, null] | readonly [null, Error]): T => {
      if (result[1]) throw result[1];
      return result[0];
    };

    this._operations.set('list-branches', async () => {
      const branchResult = await withTimeout(gitService.branch({ op: 'list' }));
      const branches = unwrap(branchResult).info.branches;
      return { branches };
    });

    this._operations.set('list-commits', async (params) => {
      const limit = (params.limit as number) || 10;
      const logResult = await withTimeout(gitService.log({ depth: limit }));
      const commits = unwrap(logResult).entries.map((entry) => ({
        hash: entry.hash,
        author: entry.author,
        subject: entry.subject,
        date: entry.date,
      }));
      return { commits, limit };
    });

    this._operations.set('create-branch', async (params) => {
      const name = params.name as string;
      if (!name) throw new Error('Branch name is required');
      const branchResult = await withTimeout(gitService.branch({ op: 'create', name }));
      unwrap(branchResult);
      return { branch: name, created: true };
    });

    this._operations.set('create-tag', async (params) => {
      const name = params.name as string;
      const message = (params.message as string) || name;
      if (!name) throw new Error('Tag name is required');
      await withTimeout(
        git.annotatedTag({
          fs,
          dir: repoPath,
          gitdir: `${repoPath}/.git`,
          ref: name,
          message,
          tagger: {
            name: 'SDLC Adapter',
            email: 'sdlc-adapter@example.invalid',
            timestamp: Math.floor(Date.now() / 1000),
            timezoneOffset: 0,
          },
        })
      );
      await withTimeout(
        git.writeRef({
          fs,
          dir: repoPath,
          gitdir: `${repoPath}/.git`,
          ref: `refs/tags/${name}`,
          value: await git.resolveRef({
            fs,
            dir: repoPath,
            gitdir: `${repoPath}/.git`,
            ref: name,
          }),
          force: true,
        })
      );
      return { tag: name, created: true };
    });

    this._operations.set('get-diff', async (params) => {
      const from = (params.from as string) || 'HEAD~1';
      const to = (params.to as string) || 'HEAD';
      const fromCommit = await withTimeout(
        git.readCommit({
          fs,
          dir: repoPath,
          gitdir: `${repoPath}/.git`,
          oid: await git.resolveRef({
            fs,
            dir: repoPath,
            gitdir: `${repoPath}/.git`,
            ref: from,
          }),
        })
      );
      const toCommit = await withTimeout(
        git.readCommit({
          fs,
          dir: repoPath,
          gitdir: `${repoPath}/.git`,
          oid: await git.resolveRef({
            fs,
            dir: repoPath,
            gitdir: `${repoPath}/.git`,
            ref: to,
          }),
        })
      );
      const diffSummary = {
        from,
        to,
        fromMessage: fromCommit.commit.message.trim(),
        toMessage: toCommit.commit.message.trim(),
      };
      return { from, to, diff: JSON.stringify(diffSummary) };
    });

    this._operations.set('status', async () => {
      const statusResult = await withTimeout(gitService.status());
      const status = unwrap(statusResult);
      const files = status.entries.map((entry) => ({
        status: `${entry.index[0] || ' '} ${entry.workingTree[0] || ' '}`.trim(),
        file: entry.path,
      }));
      return { files, clean: status.clean };
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    if (!this._config.repository_path) {
      return {
        status: HEALTH_STATUS.UNCONFIGURED,
        adapter: this.name,
        category: this.category,
        message: 'No repository path configured',
        checked_at: new Date().toISOString(),
      };
    }

    const repoPath = this._config.repository_path as string;
    const gitDirExists = fs.existsSync(`${repoPath}/.git`);

    return {
      status: gitDirExists ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.DEGRADED,
      adapter: this.name,
      category: this.category,
      message: gitDirExists ? 'Git repository OK' : 'Not a git repository',
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
