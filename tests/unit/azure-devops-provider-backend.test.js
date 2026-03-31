let AzureDevOpsProviderBackend;

beforeAll(async () => {
  ({ AzureDevOpsProviderBackend } =
    await import('../../src/webapp/services/git/azure-devops-provider-backend.ts'));
});

function createGitApi() {
  return {
    getRepositories: vi.fn().mockResolvedValue([
      {
        id: 'repo-1',
        name: 'platform',
        defaultBranch: 'refs/heads/main',
        webUrl: 'https://dev.azure.com/org/project/_git/platform',
      },
    ]),
    createPullRequest: vi.fn().mockResolvedValue({
      pullRequestId: 101,
      title: 'ADO PR',
      status: 'active',
      sourceRefName: 'refs/heads/feature/ado',
      targetRefName: 'refs/heads/main',
      url: 'https://dev.azure.com/org/project/_git/platform/pullrequest/101',
    }),
    getRefs: vi.fn().mockResolvedValue([
      {
        name: 'refs/heads/main',
        objectId: 'sha-main',
        creator: { displayName: 'Build Bot' },
        isLocked: false,
      },
    ]),
  };
}

describe('AzureDevOpsProviderBackend (#965)', () => {
  test('listRepositories prefers Entra token from credential store', async () => {
    const gitApi = createGitApi();
    const clientFactory = vi.fn().mockReturnValue({
      getGitApi: vi.fn().mockResolvedValue(gitApi),
    });
    const credentialStore = {
      getCredential: vi
        .fn()
        .mockImplementation((_workspaceId, provider) =>
          provider === 'entra' ? { token: 'entra-access-token' } : { token: 'ado-pat-token' }
        ),
    };

    const backend = new AzureDevOpsProviderBackend({
      organizationUrl: 'https://dev.azure.com/org',
      project: 'proj',
      workspaceId: 'workspace-ado',
      credentialStore,
      clientFactory,
    });

    const repositories = await backend.listRepositories();

    expect(credentialStore.getCredential).toHaveBeenCalledWith('workspace-ado', 'entra');
    expect(credentialStore.getCredential).toHaveBeenCalledWith('workspace-ado', 'ado');
    expect(clientFactory).toHaveBeenCalledWith('entra-access-token');
    expect(repositories).toEqual([
      {
        id: 'repo-1',
        name: 'platform',
        defaultBranch: 'refs/heads/main',
        webUrl: 'https://dev.azure.com/org/project/_git/platform',
      },
    ]);
  });

  test('creates pull requests and lists branches', async () => {
    const gitApi = createGitApi();
    const backend = new AzureDevOpsProviderBackend({
      organizationUrl: 'https://dev.azure.com/org',
      project: 'proj',
      workspaceId: 'workspace-ado',
      credentialStore: {
        getCredential: vi.fn().mockReturnValue({ token: 'ado-pat-token' }),
      },
      clientFactory: vi.fn().mockReturnValue({
        getGitApi: vi.fn().mockResolvedValue(gitApi),
      }),
    });

    const pullRequest = await backend.createPullRequest({
      repositoryId: 'repo-1',
      title: 'ADO PR',
      description: 'desc',
      sourceRefName: 'refs/heads/feature/ado',
      targetRefName: 'refs/heads/main',
    });
    const branches = await backend.listBranches('repo-1');

    expect(gitApi.createPullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'ADO PR',
        sourceRefName: 'refs/heads/feature/ado',
        targetRefName: 'refs/heads/main',
      }),
      'repo-1',
      'proj'
    );
    expect(pullRequest.pullRequestId).toBe(101);
    expect(gitApi.getRefs).toHaveBeenCalledWith('repo-1', 'proj', 'heads/');
    expect(branches).toEqual([
      {
        name: 'refs/heads/main',
        objectId: 'sha-main',
        creator: 'Build Bot',
        isLocked: false,
      },
    ]);
  });

  test('throws when Azure DevOps PAT is missing', async () => {
    const backend = new AzureDevOpsProviderBackend({
      organizationUrl: 'https://dev.azure.com/org',
      project: 'proj',
      workspaceId: 'workspace-ado',
      credentialStore: {
        getCredential: vi.fn().mockReturnValue(null),
      },
      clientFactory: vi.fn(),
    });

    await expect(backend.listRepositories()).rejects.toThrow(
      /Azure DevOps credential is required/i
    );
  });
});
