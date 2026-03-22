import { EventEmitter } from 'node:events';

import type {
  GitBackend,
  GitBranchOptions,
  GitBranchResult,
  GitCommitResult,
  GitDiffResult,
  GitLogOptions,
  GitLogResult,
  GitMutationResult,
  GitRemoteOp,
  GitRemoteResult,
  GitStatusResult,
  ResultTuple,
} from './git-backend';
import type { AzureDevOpsPullRequestSummary } from './azure-devops-provider-backend';
import type { GitHubPullRequestSummary } from './github-provider-backend';

interface AuditLogger {
  log(entry: {
    operation: string;
    entityType: string;
    entityId?: string | null;
    user?: string;
    summary?: string | null;
  }): void;
}

export type GitServiceEventMap = {
  status_changed: {
    actor: string;
    repositoryPath: string;
    previous: GitStatusResult;
    current: GitStatusResult;
    timestamp: string;
  };
  commit_created: {
    actor: string;
    repositoryPath: string;
    commit: GitCommitResult;
    timestamp: string;
  };
  push_completed: {
    actor: string;
    repositoryPath: string;
    push: GitRemoteResult;
    timestamp: string;
  };
};

export interface CreatePROptions {
  title: string;
  body?: string;
  headBranch: string;
  baseBranch: string;
  reviewers?: string[];
  draft?: boolean;
}

export interface CreatePRResult {
  provider: 'github' | 'azure-devops';
  id: number;
  title: string;
  status: string;
  url: string;
}

interface GitHubProviderBackendLike {
  createPullRequest(input: {
    title: string;
    body?: string;
    head: string;
    base: string;
    draft?: boolean;
  }): Promise<GitHubPullRequestSummary>;
}

interface AzureDevOpsProviderBackendLike {
  createPullRequest(input: {
    repositoryId: string;
    title: string;
    description?: string;
    sourceRefName: string;
    targetRefName: string;
    reviewers?: string[];
    isDraft?: boolean;
  }): Promise<AzureDevOpsPullRequestSummary>;
}

export interface GitServiceOptions {
  backend: GitBackend;
  audit: AuditLogger;
  repositoryPath: string;
  actor?: string;
  remoteUrl?: string;
  repositoryId?: string;
  githubProviderBackend?: GitHubProviderBackendLike;
  azureDevOpsProviderBackend?: AzureDevOpsProviderBackendLike;
}

function parseGitHubRemote(remoteUrl: string): { owner: string; repo: string } | null {
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function parseAzureDevOpsRemote(
  remoteUrl: string
): { organization: string; project: string; repo: string } | null {
  const match = remoteUrl.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+)(?:\.git)?$/i);
  if (!match) return null;
  return {
    organization: match[1],
    project: match[2],
    repo: match[3],
  };
}

function statusSignature(status: GitStatusResult): string {
  const entries = [...status.entries]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((entry) => `${entry.path}:${entry.workingTree}:${entry.index}`)
    .join('|');
  return `${status.branch}:${status.ahead}:${status.behind}:${status.clean}:${entries}`;
}

export class GitService extends EventEmitter {
  private readonly backend: GitBackend;
  private readonly audit: AuditLogger;
  private readonly repositoryPath: string;
  private readonly actor: string;
  private readonly remoteUrl?: string;
  private readonly repositoryId?: string;
  private readonly githubProviderBackend?: GitHubProviderBackendLike;
  private readonly azureDevOpsProviderBackend?: AzureDevOpsProviderBackendLike;
  private lastStatus: GitStatusResult | null = null;

  constructor(options: GitServiceOptions) {
    super();
    this.backend = options.backend;
    this.audit = options.audit;
    this.repositoryPath = options.repositoryPath;
    this.actor = options.actor || 'system';
    this.remoteUrl = options.remoteUrl;
    this.repositoryId = options.repositoryId;
    this.githubProviderBackend = options.githubProviderBackend;
    this.azureDevOpsProviderBackend = options.azureDevOpsProviderBackend;
  }

  on<E extends keyof GitServiceEventMap>(
    event: E,
    listener: (payload: GitServiceEventMap[E]) => void
  ): this {
    return super.on(event, listener);
  }

  once<E extends keyof GitServiceEventMap>(
    event: E,
    listener: (payload: GitServiceEventMap[E]) => void
  ): this {
    return super.once(event, listener);
  }

  private emitTyped<E extends keyof GitServiceEventMap>(
    event: E,
    payload: GitServiceEventMap[E]
  ): void {
    this.emit(event, payload);
  }

  private auditOperation(operation: string, result: 'ok' | 'error', detail: string): void {
    const timestamp = new Date().toISOString();
    this.audit.log({
      operation: `git_${operation}`,
      entityType: 'git_operation',
      entityId: this.repositoryPath,
      user: this.actor,
      summary: JSON.stringify({
        actor: this.actor,
        repo: this.repositoryPath,
        operation,
        result,
        timestamp,
        detail,
      }),
    });
  }

  private async run<T>(
    operation: string,
    fn: () => Promise<ResultTuple<T>>
  ): Promise<ResultTuple<T>> {
    const [value, error] = await fn();
    if (error) {
      this.auditOperation(operation, 'error', error.message);
      return [null, error];
    }

    this.auditOperation(operation, 'ok', 'completed');
    return [value, null];
  }

  async status(): Promise<ResultTuple<GitStatusResult>> {
    const [status, error] = await this.run('status', () => this.backend.status());
    if (error || !status) return [null, error];

    if (this.lastStatus && statusSignature(this.lastStatus) !== statusSignature(status)) {
      this.emitTyped('status_changed', {
        actor: this.actor,
        repositoryPath: this.repositoryPath,
        previous: this.lastStatus,
        current: status,
        timestamp: new Date().toISOString(),
      });
    }
    this.lastStatus = status;
    return [status, null];
  }

  async add(files: readonly string[]): Promise<ResultTuple<GitMutationResult>> {
    return this.run('add', () => this.backend.add(files));
  }

  async remove(files: readonly string[]): Promise<ResultTuple<GitMutationResult>> {
    return this.run('remove', () => this.backend.remove(files));
  }

  async commit(message: string): Promise<ResultTuple<GitCommitResult>> {
    const [commit, error] = await this.run('commit', () => this.backend.commit(message));
    if (error || !commit) return [null, error];

    this.emitTyped('commit_created', {
      actor: this.actor,
      repositoryPath: this.repositoryPath,
      commit,
      timestamp: new Date().toISOString(),
    });
    return [commit, null];
  }

  async diff(file?: string): Promise<ResultTuple<GitDiffResult>> {
    return this.run('diff', () => this.backend.diff(file));
  }

  async log(opts?: GitLogOptions): Promise<ResultTuple<GitLogResult>> {
    return this.run('log', () => this.backend.log(opts));
  }

  async branch(opts: GitBranchOptions): Promise<ResultTuple<GitBranchResult>> {
    return this.run('branch', () => this.backend.branch(opts));
  }

  async fetchPullPush(
    op: GitRemoteOp,
    remote: string,
    branch?: string
  ): Promise<ResultTuple<GitRemoteResult>> {
    const [result, error] = await this.run('fetch_pull_push', () =>
      this.backend.fetchPullPush(op, remote, branch)
    );
    if (error || !result) return [null, error];

    if (op === 'push') {
      this.emitTyped('push_completed', {
        actor: this.actor,
        repositoryPath: this.repositoryPath,
        push: result,
        timestamp: new Date().toISOString(),
      });
    }

    return [result, null];
  }

  async createPullRequest(options: CreatePROptions): Promise<ResultTuple<CreatePRResult>> {
    try {
      if (!this.remoteUrl) {
        throw new Error('Remote URL is required to create a pull request');
      }

      const githubRemote = parseGitHubRemote(this.remoteUrl);
      if (githubRemote) {
        if (!this.githubProviderBackend) {
          throw new Error('GitHub provider backend is not configured');
        }

        const pr = await this.githubProviderBackend.createPullRequest({
          title: options.title,
          body: options.body,
          head: options.headBranch,
          base: options.baseBranch,
          draft: options.draft,
        });

        this.auditOperation('create_pull_request', 'ok', 'github');
        return [
          {
            provider: 'github',
            id: pr.number,
            title: pr.title,
            status: pr.state,
            url: pr.url,
          },
          null,
        ];
      }

      const azureRemote = parseAzureDevOpsRemote(this.remoteUrl);
      if (azureRemote) {
        if (!this.azureDevOpsProviderBackend) {
          throw new Error('Azure DevOps provider backend is not configured');
        }
        if (!this.repositoryId) {
          throw new Error('Repository ID is required for Azure DevOps pull requests');
        }

        const pr = await this.azureDevOpsProviderBackend.createPullRequest({
          repositoryId: this.repositoryId,
          title: options.title,
          description: options.body,
          sourceRefName: `refs/heads/${options.headBranch}`,
          targetRefName: `refs/heads/${options.baseBranch}`,
          reviewers: options.reviewers,
          isDraft: options.draft,
        });

        this.auditOperation('create_pull_request', 'ok', 'azure-devops');
        return [
          {
            provider: 'azure-devops',
            id: pr.pullRequestId,
            title: pr.title,
            status: pr.status,
            url: pr.url,
          },
          null,
        ];
      }

      throw new Error(`Unsupported remote URL for pull request creation: ${this.remoteUrl}`);
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.auditOperation('create_pull_request', 'error', normalized.message);
      return [null, normalized];
    }
  }
}
