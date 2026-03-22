import { Octokit } from '@octokit/rest';

import type { GitCredentialStore } from './credential-store';

interface OctokitLike {
  pulls: {
    list(args: {
      owner: string;
      repo: string;
      state?: 'open' | 'closed' | 'all';
    }): Promise<{ data: Array<Record<string, unknown>> }>;
    create(args: {
      owner: string;
      repo: string;
      title: string;
      head: string;
      base: string;
      body?: string;
      draft?: boolean;
    }): Promise<{ data: Record<string, unknown> }>;
    merge(args: {
      owner: string;
      repo: string;
      pull_number: number;
      merge_method?: 'merge' | 'squash' | 'rebase';
      commit_title?: string;
      commit_message?: string;
    }): Promise<{ data: Record<string, unknown> }>;
  };
  repos: {
    listBranches(args: {
      owner: string;
      repo: string;
      per_page?: number;
      page?: number;
    }): Promise<{ data: Array<Record<string, unknown>> }>;
    getCombinedStatusForRef(args: {
      owner: string;
      repo: string;
      ref: string;
    }): Promise<{ data: Record<string, unknown> }>;
  };
  git: {
    getRef(args: {
      owner: string;
      repo: string;
      ref: string;
    }): Promise<{ data: Record<string, unknown> }>;
    createRef(args: {
      owner: string;
      repo: string;
      ref: string;
      sha: string;
    }): Promise<{ data: Record<string, unknown> }>;
    deleteRef(args: {
      owner: string;
      repo: string;
      ref: string;
    }): Promise<{ data: Record<string, unknown> }>;
  };
}

export interface GitHubPullRequestSummary {
  number: number;
  title: string;
  state: string;
  headRef: string;
  baseRef: string;
  url: string;
  draft: boolean;
}

export interface GitHubBranchSummary {
  name: string;
  protected: boolean;
  sha: string;
}

export interface GitHubCombinedStatus {
  state: string;
  sha: string;
  totalCount: number;
  statuses: Array<{
    context: string;
    state: string;
    description: string | null;
    targetUrl: string | null;
  }>;
}

export interface CreatePullRequestInput {
  title: string;
  head: string;
  base: string;
  body?: string;
  draft?: boolean;
}

export interface MergePullRequestInput {
  pullNumber: number;
  mergeMethod?: 'merge' | 'squash' | 'rebase';
  commitTitle?: string;
  commitMessage?: string;
}

export interface CreateBranchInput {
  name: string;
  from: string;
}

export interface GitHubProviderBackendOptions {
  owner: string;
  repo: string;
  workspaceId: string;
  credentialStore: Pick<GitCredentialStore, 'getCredential'>;
  octokitFactory?: (token: string) => OctokitLike;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

export class GitHubProviderBackend {
  private readonly owner: string;
  private readonly repo: string;
  private readonly workspaceId: string;
  private readonly credentialStore: Pick<GitCredentialStore, 'getCredential'>;
  private readonly octokitFactory: (token: string) => OctokitLike;

  constructor(options: GitHubProviderBackendOptions) {
    this.owner = options.owner;
    this.repo = options.repo;
    this.workspaceId = options.workspaceId;
    this.credentialStore = options.credentialStore;
    this.octokitFactory = options.octokitFactory || ((token) => new Octokit({ auth: token }));
  }

  private getClient(): OctokitLike {
    const credential = this.credentialStore.getCredential(this.workspaceId, 'github');
    const token = credential?.token || credential?.password || null;
    if (!token) {
      throw new Error('GitHub PAT is required in GitCredentialStore');
    }

    return this.octokitFactory(token);
  }

  async listPullRequests(
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<GitHubPullRequestSummary[]> {
    const client = this.getClient();
    const response = await client.pulls.list({
      owner: this.owner,
      repo: this.repo,
      state,
    });

    return response.data.map((item) => ({
      number: asNumber(item.number),
      title: asString(item.title),
      state: asString(item.state),
      headRef: asString((item.head as { ref?: unknown } | undefined)?.ref),
      baseRef: asString((item.base as { ref?: unknown } | undefined)?.ref),
      url: asString(item.html_url),
      draft: Boolean(item.draft),
    }));
  }

  async createPullRequest(input: CreatePullRequestInput): Promise<GitHubPullRequestSummary> {
    const client = this.getClient();
    const response = await client.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: input.title,
      head: input.head,
      base: input.base,
      body: input.body,
      draft: input.draft,
    });

    const item = response.data;
    return {
      number: asNumber(item.number),
      title: asString(item.title),
      state: asString(item.state),
      headRef: asString((item.head as { ref?: unknown } | undefined)?.ref),
      baseRef: asString((item.base as { ref?: unknown } | undefined)?.ref),
      url: asString(item.html_url),
      draft: Boolean(item.draft),
    };
  }

  async mergePullRequest(input: MergePullRequestInput): Promise<{
    merged: boolean;
    message: string;
    sha: string;
  }> {
    const client = this.getClient();
    const response = await client.pulls.merge({
      owner: this.owner,
      repo: this.repo,
      pull_number: input.pullNumber,
      merge_method: input.mergeMethod,
      commit_title: input.commitTitle,
      commit_message: input.commitMessage,
    });

    return {
      merged: Boolean(response.data.merged),
      message: asString(response.data.message),
      sha: asString(response.data.sha),
    };
  }

  async listBranches(): Promise<GitHubBranchSummary[]> {
    const client = this.getClient();
    const response = await client.repos.listBranches({
      owner: this.owner,
      repo: this.repo,
      per_page: 100,
    });

    return response.data.map((item) => ({
      name: asString(item.name),
      protected: Boolean(item.protected),
      sha: asString((item.commit as { sha?: unknown } | undefined)?.sha),
    }));
  }

  async createBranch(input: CreateBranchInput): Promise<GitHubBranchSummary> {
    const client = this.getClient();
    const sourceRef = await client.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${input.from}`,
    });
    const sha = asString((sourceRef.data.object as { sha?: unknown } | undefined)?.sha);

    const createdRef = await client.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${input.name}`,
      sha,
    });

    return {
      name: input.name,
      protected: false,
      sha: asString((createdRef.data.object as { sha?: unknown } | undefined)?.sha) || sha,
    };
  }

  async deleteBranch(name: string): Promise<{ deleted: boolean; name: string }> {
    const client = this.getClient();
    await client.git.deleteRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${name}`,
    });

    return { deleted: true, name };
  }

  async getCIStatus(ref: string): Promise<GitHubCombinedStatus> {
    const client = this.getClient();
    const response = await client.repos.getCombinedStatusForRef({
      owner: this.owner,
      repo: this.repo,
      ref,
    });

    return {
      state: asString(response.data.state),
      sha: asString(response.data.sha),
      totalCount: asNumber(response.data.total_count),
      statuses: Array.isArray(response.data.statuses)
        ? response.data.statuses.map((status) => ({
            context: asString((status as { context?: unknown }).context),
            state: asString((status as { state?: unknown }).state),
            description: (status as { description?: unknown }).description as string | null,
            targetUrl: (status as { target_url?: unknown }).target_url as string | null,
          }))
        : [],
    };
  }
}
