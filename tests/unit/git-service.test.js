let GitService;

beforeAll(async () => {
  ({ GitService } = await import('../../src/webapp/services/git/git-service.ts'));
});

function ok(value) {
  return [value, null];
}

function createBackendStub() {
  return {
    status: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    commit: vi.fn(),
    diff: vi.fn(),
    log: vi.fn(),
    branch: vi.fn(),
    fetchPullPush: vi.fn(),
  };
}

function createGitHubProviderStub() {
  return {
    createPullRequest: vi.fn(),
  };
}

function createAzureDevOpsProviderStub() {
  return {
    createPullRequest: vi.fn(),
  };
}

describe('GitService (#949)', () => {
  let backend;
  let audit;
  let service;
  let githubProviderBackend;
  let azureDevOpsProviderBackend;

  beforeEach(() => {
    backend = createBackendStub();
    audit = { log: vi.fn() };
    githubProviderBackend = createGitHubProviderStub();
    azureDevOpsProviderBackend = createAzureDevOpsProviderStub();
    service = new GitService({
      backend,
      audit,
      repositoryPath: '/repo/test',
      actor: 'alice',
      githubProviderBackend,
      azureDevOpsProviderBackend,
    });
  });

  test('every operation writes an audit log entry', async () => {
    backend.status.mockResolvedValue(
      ok({
        branch: 'main',
        ahead: 0,
        behind: 0,
        clean: true,
        entries: [],
      })
    );
    backend.add.mockResolvedValue(ok({ status: 'ok', affectedFiles: ['a.txt'] }));
    backend.remove.mockResolvedValue(ok({ status: 'ok', affectedFiles: ['a.txt'] }));
    backend.commit.mockResolvedValue(ok({ status: 'ok', commitHash: 'abc1234', summary: 'test' }));
    backend.diff.mockResolvedValue(ok({ patch: 'diff --git a b', file: 'a.txt' }));
    backend.log.mockResolvedValue(ok({ entries: [] }));
    backend.branch.mockResolvedValue(
      ok({ status: 'ok', info: { current: 'main', branches: ['main'] } })
    );
    backend.fetchPullPush.mockResolvedValue(
      ok({ status: 'ok', remote: 'origin', summary: 'done' })
    );

    await service.status();
    await service.add(['a.txt']);
    await service.remove(['a.txt']);
    await service.commit('test');
    await service.diff('a.txt');
    await service.log({ maxCount: 10 });
    await service.branch({ op: 'list' });
    await service.fetchPullPush('fetch', 'origin');

    expect(audit.log).toHaveBeenCalledTimes(8);
    expect(audit.log).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ operation: 'git_status', user: 'alice', entityId: '/repo/test' })
    );
    expect(audit.log).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ operation: 'git_commit', user: 'alice', entityId: '/repo/test' })
    );
  });

  test('emits status_changed event when status transitions', async () => {
    backend.status
      .mockResolvedValueOnce(
        ok({
          branch: 'main',
          ahead: 0,
          behind: 0,
          clean: true,
          entries: [],
        })
      )
      .mockResolvedValueOnce(
        ok({
          branch: 'main',
          ahead: 0,
          behind: 0,
          clean: false,
          entries: [{ path: 'a.txt', workingTree: 'modified', index: 'updated' }],
        })
      );

    const events = [];
    service.on('status_changed', (payload) => events.push(payload));

    await service.status();
    await service.status();

    expect(events).toHaveLength(1);
    expect(events[0].actor).toBe('alice');
    expect(events[0].repositoryPath).toBe('/repo/test');
    expect(events[0].previous.clean).toBe(true);
    expect(events[0].current.clean).toBe(false);
  });

  test('emits commit_created and push_completed events', async () => {
    backend.commit.mockResolvedValue(
      ok({ status: 'ok', commitHash: 'cafe123', summary: 'feat: add' })
    );
    backend.fetchPullPush.mockResolvedValue(
      ok({ status: 'ok', remote: 'origin', branch: 'main', summary: 'pushed' })
    );

    const commits = [];
    const pushes = [];
    service.on('commit_created', (payload) => commits.push(payload));
    service.on('push_completed', (payload) => pushes.push(payload));

    await service.commit('feat: add');
    await service.fetchPullPush('push', 'origin', 'main');

    expect(commits).toHaveLength(1);
    expect(commits[0].commit.commitHash).toBe('cafe123');
    expect(pushes).toHaveLength(1);
    expect(pushes[0].push.remote).toBe('origin');
  });

  test('routes createPullRequest to GitHub backend based on remote URL (#966)', async () => {
    githubProviderBackend.createPullRequest.mockResolvedValue({
      number: 42,
      title: 'GitHub PR',
      state: 'open',
      headRef: 'feature/test',
      baseRef: 'main',
      url: 'https://github.com/org/repo/pull/42',
      draft: false,
    });

    service = new GitService({
      backend,
      audit,
      repositoryPath: '/repo/test',
      actor: 'alice',
      remoteUrl: 'https://github.com/org/repo.git',
      githubProviderBackend,
      azureDevOpsProviderBackend,
    });

    const [result, error] = await service.createPullRequest({
      title: 'GitHub PR',
      body: 'Body',
      headBranch: 'feature/test',
      baseBranch: 'main',
      reviewers: ['bob'],
      draft: false,
    });

    expect(error).toBeNull();
    expect(result).toEqual({
      provider: 'github',
      id: 42,
      title: 'GitHub PR',
      status: 'open',
      url: 'https://github.com/org/repo/pull/42',
    });
    expect(githubProviderBackend.createPullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'GitHub PR',
        head: 'feature/test',
        base: 'main',
      })
    );
    expect(azureDevOpsProviderBackend.createPullRequest).not.toHaveBeenCalled();
  });

  test('routes createPullRequest to Azure DevOps backend based on remote URL (#966)', async () => {
    azureDevOpsProviderBackend.createPullRequest.mockResolvedValue({
      pullRequestId: 101,
      title: 'ADO PR',
      status: 'active',
      sourceRefName: 'refs/heads/feature/ado',
      targetRefName: 'refs/heads/main',
      url: 'https://dev.azure.com/org/project/_git/repo/pullrequest/101',
    });

    service = new GitService({
      backend,
      audit,
      repositoryPath: '/repo/test',
      actor: 'alice',
      remoteUrl: 'https://dev.azure.com/org/project/_git/repo',
      repositoryId: 'repo-123',
      githubProviderBackend,
      azureDevOpsProviderBackend,
    });

    const [result, error] = await service.createPullRequest({
      title: 'ADO PR',
      body: 'Body',
      headBranch: 'feature/ado',
      baseBranch: 'main',
      reviewers: ['carol'],
      draft: true,
    });

    expect(error).toBeNull();
    expect(result).toEqual({
      provider: 'azure-devops',
      id: 101,
      title: 'ADO PR',
      status: 'active',
      url: 'https://dev.azure.com/org/project/_git/repo/pullrequest/101',
    });
    expect(azureDevOpsProviderBackend.createPullRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryId: 'repo-123',
        sourceRefName: 'refs/heads/feature/ado',
        targetRefName: 'refs/heads/main',
        reviewers: ['carol'],
        isDraft: true,
      })
    );
    expect(githubProviderBackend.createPullRequest).not.toHaveBeenCalled();
  });
});
