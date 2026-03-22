import * as azdev from 'azure-devops-node-api';

import type { GitCredentialStore } from './credential-store';

interface GitApiLike {
  getRepositories(project: string): Promise<Array<Record<string, unknown>>>;
  createPullRequest(
    pullRequest: Record<string, unknown>,
    repositoryId: string,
    project: string
  ): Promise<Record<string, unknown>>;
  getRefs(
    repositoryId: string,
    project: string,
    filter?: string,
    includeLinks?: boolean,
    latestStatusesOnly?: boolean,
    peelTags?: boolean,
    filterContains?: string
  ): Promise<Array<Record<string, unknown>>>;
}

interface AdoClientLike {
  getGitApi(): Promise<GitApiLike>;
}

export interface AzureDevOpsRepositorySummary {
  id: string;
  name: string;
  defaultBranch: string;
  webUrl: string;
}

export interface AzureDevOpsBranchSummary {
  name: string;
  objectId: string;
  creator: string;
  isLocked: boolean;
}

export interface AzureDevOpsPullRequestSummary {
  pullRequestId: number;
  title: string;
  status: string;
  sourceRefName: string;
  targetRefName: string;
  url: string;
}

export interface AzureDevOpsCreatePullRequestInput {
  repositoryId: string;
  title: string;
  description?: string;
  sourceRefName: string;
  targetRefName: string;
  reviewers?: string[];
  isDraft?: boolean;
}

export interface AzureDevOpsProviderBackendOptions {
  organizationUrl: string;
  project: string;
  workspaceId: string;
  credentialStore: Pick<GitCredentialStore, 'getCredential'>;
  clientFactory?: (token: string) => AdoClientLike;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

export class AzureDevOpsProviderBackend {
  private readonly organizationUrl: string;
  private readonly project: string;
  private readonly workspaceId: string;
  private readonly credentialStore: Pick<GitCredentialStore, 'getCredential'>;
  private readonly clientFactory: (token: string) => AdoClientLike;

  constructor(options: AzureDevOpsProviderBackendOptions) {
    this.organizationUrl = options.organizationUrl;
    this.project = options.project;
    this.workspaceId = options.workspaceId;
    this.credentialStore = options.credentialStore;
    this.clientFactory =
      options.clientFactory ||
      ((token) =>
        new azdev.WebApi(
          this.organizationUrl,
          azdev.getPersonalAccessTokenHandler(token)
        ) as unknown as AdoClientLike);
  }

  private async getGitApi(): Promise<GitApiLike> {
    const credential = this.credentialStore.getCredential(this.workspaceId, 'ado');
    const token = credential?.token || credential?.password || null;
    if (!token) {
      throw new Error('Azure DevOps PAT is required in GitCredentialStore');
    }

    return this.clientFactory(token).getGitApi();
  }

  async listRepositories(): Promise<AzureDevOpsRepositorySummary[]> {
    const gitApi = await this.getGitApi();
    const repositories = await gitApi.getRepositories(this.project);

    return repositories.map((repo) => ({
      id: asString(repo.id),
      name: asString(repo.name),
      defaultBranch: asString(repo.defaultBranch),
      webUrl: asString(repo.webUrl),
    }));
  }

  async createPullRequest(
    input: AzureDevOpsCreatePullRequestInput
  ): Promise<AzureDevOpsPullRequestSummary> {
    const gitApi = await this.getGitApi();
    const pr = await gitApi.createPullRequest(
      {
        title: input.title,
        description: input.description,
        sourceRefName: input.sourceRefName,
        targetRefName: input.targetRefName,
        reviewers: input.reviewers,
        isDraft: input.isDraft,
      },
      input.repositoryId,
      this.project
    );

    return {
      pullRequestId: asNumber(pr.pullRequestId),
      title: asString(pr.title),
      status: asString(pr.status),
      sourceRefName: asString(pr.sourceRefName),
      targetRefName: asString(pr.targetRefName),
      url: asString(pr.url),
    };
  }

  async listBranches(repositoryId: string): Promise<AzureDevOpsBranchSummary[]> {
    const gitApi = await this.getGitApi();
    const refs = await gitApi.getRefs(repositoryId, this.project, 'heads/');

    return refs.map((ref) => ({
      name: asString(ref.name),
      objectId: asString(ref.objectId),
      creator: asString((ref.creator as { displayName?: unknown } | undefined)?.displayName),
      isLocked: Boolean(ref.isLocked),
    }));
  }
}
