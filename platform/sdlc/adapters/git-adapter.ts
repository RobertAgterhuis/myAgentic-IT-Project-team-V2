// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Git Adapter
 *
 * Adapter for Git operations: repository info, branching, commit listing,
 * tag management, and diff queries.
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
import type {
  GitBranchResult,
  GitLogResult,
  GitStatusResult,
  ResultTuple,
} from '../../../src/webapp/services/git/git-backend';

export interface GitConfig {
  [key: string]: unknown;
  repository_path: string;
  remote_url?: string;
  default_branch?: string;
  /** Timeout for git operations in ms (default: 15000) */
  timeout?: number;
}

interface GitServiceLike {
  branch(
    input: { op: 'list' } | { op: 'create'; name: string }
  ): Promise<ResultTuple<GitBranchResult>>;
  log(input: { depth: number }): Promise<ResultTuple<GitLogResult>>;
  status(): Promise<ResultTuple<GitStatusResult>>;
}

interface AgentContextLike {
  gitService?: GitServiceLike;
}

export class GitAdapter extends BaseAdapter {
  readonly name = 'git';
  readonly category = ADAPTER_CATEGORIES.GIT;
  readonly version = '2.0.0';

  private readonly repositoryPath: string;
  private readonly timeout: number;
  private readonly fallbackGitService: GitServiceLike;

  constructor(config: GitConfig = { repository_path: '.' }) {
    super();
    this._config = config as Record<string, unknown>;
    this.repositoryPath = config.repository_path;
    this.timeout = config.timeout ?? 15_000;
    this.fallbackGitService = this.createFallbackGitService();

    this._operations.set('list-branches', async (params) => {
      const gitService = this.resolveGitService(params);
      const branchResult = (await this.withTimeout(
        gitService.branch({ op: 'list' })
      )) as ResultTuple<GitBranchResult>;
      if (branchResult[1]) throw branchResult[1];
      const branches = branchResult[0].info.branches;
      return { branches };
    });

    this._operations.set('list-commits', async (params) => {
      const limit = (params.limit as number) || 10;
      const gitService = this.resolveGitService(params);
      const logResult = (await this.withTimeout(
        gitService.log({ depth: limit })
      )) as ResultTuple<GitLogResult>;
      if (logResult[1]) throw logResult[1];
      const entries = logResult[0].entries;

      const commits = entries.map((entry) => ({
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
      const gitService = this.resolveGitService(params);
      const branchResult = (await this.withTimeout(
        gitService.branch({ op: 'create', name })
      )) as ResultTuple<GitBranchResult>;
      if (branchResult[1]) throw branchResult[1];
      return { branch: name, created: true };
    });

    this._operations.set('create-tag', async (params) => {
      const name = params.name as string;
      const message = (params.message as string) || name;
      if (!name) throw new Error('Tag name is required');

      await this.withTimeout(
        git.annotatedTag({
          fs,
          dir: this.repositoryPath,
          gitdir: `${this.repositoryPath}/.git`,
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

      await this.withTimeout(
        git.writeRef({
          fs,
          dir: this.repositoryPath,
          gitdir: `${this.repositoryPath}/.git`,
          ref: `refs/tags/${name}`,
          value: await this.withTimeout(
            git.resolveRef({
              fs,
              dir: this.repositoryPath,
              gitdir: `${this.repositoryPath}/.git`,
              ref: name,
            })
          ),
          force: true,
        })
      );

      return { tag: name, created: true };
    });

    this._operations.set('get-diff', async (params) => {
      const from = (params.from as string) || 'HEAD~1';
      const to = (params.to as string) || 'HEAD';

      const fromOid = await this.withTimeout(
        git.resolveRef({
          fs,
          dir: this.repositoryPath,
          gitdir: `${this.repositoryPath}/.git`,
          ref: from,
        })
      );
      const toOid = await this.withTimeout(
        git.resolveRef({
          fs,
          dir: this.repositoryPath,
          gitdir: `${this.repositoryPath}/.git`,
          ref: to,
        })
      );
      const fromCommit = await this.withTimeout(
        git.readCommit({
          fs,
          dir: this.repositoryPath,
          gitdir: `${this.repositoryPath}/.git`,
          oid: fromOid,
        })
      );
      const toCommit = await this.withTimeout(
        git.readCommit({
          fs,
          dir: this.repositoryPath,
          gitdir: `${this.repositoryPath}/.git`,
          oid: toOid,
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

    this._operations.set('status', async (params) => {
      const gitService = this.resolveGitService(params);
      const statusResult = (await this.withTimeout(
        gitService.status()
      )) as ResultTuple<GitStatusResult>;
      if (statusResult[1]) throw statusResult[1];
      const status = statusResult[0];

      const files = status.entries.map((entry) => ({
        status: `${entry.index[0] || ' '} ${entry.workingTree[0] || ' '}`.trim(),
        file: entry.path,
      }));
      return { files, clean: status.clean };
    });
  }

  private createFallbackGitService(): GitServiceLike {
    const router = new GitBackendRouter({
      repositoryPath: this.repositoryPath,
      env: process.env,
    });

    return new GitService({
      backend: router.getBackend(),
      audit: { log: () => {} },
      repositoryPath: this.repositoryPath,
      actor: 'sdlc-adapter',
    });
  }

  private resolveGitService(params: Record<string, unknown>): GitServiceLike {
    const agentContext = params.__agentContext as AgentContextLike | undefined;
    const injected = agentContext?.gitService;
    if (
      injected &&
      typeof injected.branch === 'function' &&
      typeof injected.log === 'function' &&
      typeof injected.status === 'function'
    ) {
      return injected;
    }

    return this.fallbackGitService;
  }

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Git operation timeout after ${this.timeout}ms`)),
          this.timeout
        );
      }),
    ]);
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
