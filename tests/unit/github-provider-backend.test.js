let GitHubProviderBackend;

beforeAll(async () => {
  ({ GitHubProviderBackend } =
    await import('../../src/webapp/services/git/github-provider-backend.ts'));
});

function createClient() {
  return {
    pulls: {
      list: vi.fn().mockResolvedValue({
        data: [
          {
            number: 41,
            title: 'Feature PR',
            state: 'open',
            head: { ref: 'feature/x' },
            base: { ref: 'main' },
            html_url: 'https://example.test/pr/41',
            draft: false,
          },
        ],
      }),
      create: vi.fn().mockResolvedValue({
        data: {
          number: 42,
          title: 'Create PR',
          state: 'open',
          head: { ref: 'feature/create-pr' },
          base: { ref: 'main' },
          html_url: 'https://example.test/pr/42',
          draft: false,
        },
      }),
      merge: vi.fn().mockResolvedValue({
        data: {
          merged: true,
          message: 'Pull Request successfully merged',
          sha: 'merge-sha-123',
        },
      }),
    },
    repos: {
      listBranches: vi.fn().mockResolvedValue({
        data: [
          {
            name: 'main',
            protected: true,
            commit: { sha: 'abc123' },
          },
        ],
      }),
      getCombinedStatusForRef: vi.fn().mockResolvedValue({
        data: {
          state: 'success',
          sha: 'abc123',
          total_count: 1,
          statuses: [
            {
              context: 'ci/test',
              state: 'success',
              description: 'passed',
              target_url: 'https://ci.example.test/run/1',
            },
          ],
        },
      }),
    },
    git: {
      getRef: vi.fn().mockResolvedValue({
        data: {
          object: { sha: 'source-sha-123' },
        },
      }),
      createRef: vi.fn().mockResolvedValue({
        data: {
          object: { sha: 'source-sha-123' },
        },
      }),
      deleteRef: vi.fn().mockResolvedValue({ data: {} }),
    },
  };
}

describe('GitHubProviderBackend (#964)', () => {
  test('createPullRequest uses PAT from GitCredentialStore', async () => {
    const client = createClient();
    const octokitFactory = vi.fn().mockReturnValue(client);
    const credentialStore = {
      getCredential: vi.fn().mockReturnValue({ token: 'mock-pat-token' }),
    };

    const backend = new GitHubProviderBackend({
      owner: 'octo',
      repo: 'hello-world',
      workspaceId: 'workspace-1',
      credentialStore,
      octokitFactory,
    });

    const result = await backend.createPullRequest({
      title: 'Create PR',
      head: 'feature/create-pr',
      base: 'main',
      body: 'Body',
    });

    expect(credentialStore.getCredential).toHaveBeenCalledWith('workspace-1', 'github');
    expect(octokitFactory).toHaveBeenCalledWith('mock-pat-token');
    expect(client.pulls.create).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'octo',
        repo: 'hello-world',
        title: 'Create PR',
        head: 'feature/create-pr',
        base: 'main',
      })
    );
    expect(result.number).toBe(42);
    expect(result.headRef).toBe('feature/create-pr');
  });

  test('lists PRs, branches, and CI status', async () => {
    const client = createClient();
    const backend = new GitHubProviderBackend({
      owner: 'octo',
      repo: 'hello-world',
      workspaceId: 'workspace-1',
      credentialStore: {
        getCredential: vi.fn().mockReturnValue({ token: 'mock-pat-token' }),
      },
      octokitFactory: vi.fn().mockReturnValue(client),
    });

    const pullRequests = await backend.listPullRequests();
    const branches = await backend.listBranches();
    const ciStatus = await backend.getCIStatus('main');

    expect(pullRequests).toHaveLength(1);
    expect(branches).toEqual([
      {
        name: 'main',
        protected: true,
        sha: 'abc123',
      },
    ]);
    expect(ciStatus.state).toBe('success');
    expect(ciStatus.statuses).toHaveLength(1);
  });

  test('creates, merges, and deletes branches through Octokit', async () => {
    const client = createClient();
    const backend = new GitHubProviderBackend({
      owner: 'octo',
      repo: 'hello-world',
      workspaceId: 'workspace-1',
      credentialStore: {
        getCredential: vi.fn().mockReturnValue({ token: 'mock-pat-token' }),
      },
      octokitFactory: vi.fn().mockReturnValue(client),
    });

    const branch = await backend.createBranch({ name: 'feature/new-branch', from: 'main' });
    const merge = await backend.mergePullRequest({ pullNumber: 42, mergeMethod: 'squash' });
    const deleted = await backend.deleteBranch('feature/new-branch');

    expect(client.git.getRef).toHaveBeenCalledWith(expect.objectContaining({ ref: 'heads/main' }));
    expect(client.git.createRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: 'refs/heads/feature/new-branch', sha: 'source-sha-123' })
    );
    expect(branch.name).toBe('feature/new-branch');
    expect(merge.merged).toBe(true);
    expect(client.git.deleteRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: 'heads/feature/new-branch' })
    );
    expect(deleted).toEqual({ deleted: true, name: 'feature/new-branch' });
  });

  test('throws when GitHub PAT is missing', async () => {
    const backend = new GitHubProviderBackend({
      owner: 'octo',
      repo: 'hello-world',
      workspaceId: 'workspace-1',
      credentialStore: {
        getCredential: vi.fn().mockReturnValue(null),
      },
      octokitFactory: vi.fn(),
    });

    await expect(backend.listPullRequests()).rejects.toThrow(/GitHub PAT is required/i);
  });
});
