import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const git = require('isomorphic-git');

let IsomorphicGitBackend;

beforeAll(async () => {
  ({ IsomorphicGitBackend } =
    await import('../../src/webapp/services/git/isomorphic-git-backend.ts'));
});

async function createTempRepo() {
  const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isogit-backend-'));
  fs.writeFileSync(path.join(repoDir, 'tracked.txt'), 'line one\n');

  await git.init({ fs, dir: repoDir, defaultBranch: 'main' });
  await git.add({ fs, dir: repoDir, filepath: 'tracked.txt' });
  await git.commit({
    fs,
    dir: repoDir,
    message: 'initial commit',
    author: {
      name: 'Initial Author',
      email: 'initial@example.com',
    },
  });

  return repoDir;
}

async function appendCommit(repoDir, idx) {
  const body = `line ${idx} at ${Date.now()}\n`;
  fs.writeFileSync(path.join(repoDir, 'tracked.txt'), body, 'utf8');
  await git.add({ fs, dir: repoDir, filepath: 'tracked.txt' });
  await git.commit({
    fs,
    dir: repoDir,
    message: `commit ${idx}\n\nbody ${idx}`,
    author: {
      name: 'Backend Author',
      email: 'backend@example.com',
    },
  });
}

describe('IsomorphicGitBackend (#952)', () => {
  let repoDir;
  let backend;

  beforeEach(async () => {
    repoDir = await createTempRepo();
    backend = new IsomorphicGitBackend({
      repositoryPath: repoDir,
      author: {
        name: 'Backend Author',
        email: 'backend@example.com',
      },
    });
  });

  afterEach(() => {
    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  test('reports modified status and returns a unified diff for a tracked file', async () => {
    fs.writeFileSync(path.join(repoDir, 'tracked.txt'), 'line one\nline two\n');

    const [statusResult, statusError] = await backend.status();
    expect(statusError).toBeNull();
    expect(statusResult.clean).toBe(false);
    expect(statusResult.entries.some((entry) => entry.path === 'tracked.txt')).toBe(true);

    const [diffResult, diffError] = await backend.diff('tracked.txt');
    expect(diffError).toBeNull();
    expect(diffResult.patch).toContain('line two');
  });

  test('stages, unstages, commits, and logs a file change', async () => {
    fs.writeFileSync(path.join(repoDir, 'tracked.txt'), 'line one\ncommitted line\n');

    const [addResult, addError] = await backend.add(['tracked.txt']);
    expect(addError).toBeNull();
    expect(addResult.status).toBe('ok');
    expect(addResult.affectedFiles).toContain('tracked.txt');

    const [removeResult, removeError] = await backend.remove(['tracked.txt']);
    expect(removeError).toBeNull();
    expect(removeResult.status).toBe('ok');

    const [statusAfterRemove] = await backend.status();
    expect(statusAfterRemove.entries.some((entry) => entry.path === 'tracked.txt')).toBe(true);

    await backend.add(['tracked.txt']);

    const [commitResult, commitError] = await backend.commit('backend commit');
    expect(commitError).toBeNull();
    expect(commitResult.status).toBe('ok');
    expect(commitResult.summary).toBe('backend commit');

    const [logResult, logError] = await backend.log({ maxCount: 1 });
    expect(logError).toBeNull();
    expect(logResult.entries).toHaveLength(1);
    expect(logResult.entries[0].hash).toBe(commitResult.commitHash);
    expect(logResult.entries[0].message).toBe('backend commit');
    expect(logResult.entries[0].authorName).toBe('Backend Author');
    expect(logResult.entries[0].authorEmail).toBe('backend@example.com');
  });

  test('creates, checks out, lists, and safely deletes branches (#953)', async () => {
    const [createResult, createError] = await backend.branch({
      op: 'create',
      name: 'feature/test',
    });
    expect(createError).toBeNull();
    expect(createResult.status).toBe('ok');

    const [checkoutResult, checkoutError] = await backend.branch({
      op: 'checkout',
      name: 'feature/test',
    });
    expect(checkoutError).toBeNull();
    expect(checkoutResult.info.current).toBe('feature/test');
    expect(checkoutResult.info.branches).toContain('feature/test');

    const [listResult, listError] = await backend.branch({ op: 'list' });
    expect(listError).toBeNull();
    expect(listResult.info.current).toBe('feature/test');
    expect(listResult.info.branches).toContain('main');
    expect(listResult.info.branches).toContain('feature/test');

    const [deleteCurrentResult, deleteCurrentError] = await backend.branch({
      op: 'delete',
      name: 'feature/test',
    });
    expect(deleteCurrentResult).toBeNull();
    expect(deleteCurrentError).toBeInstanceOf(Error);
    expect(deleteCurrentError.message).toMatch(/currently checked-out branch/i);

    const [checkoutMainResult, checkoutMainError] = await backend.branch({
      op: 'checkout',
      name: 'main',
    });
    expect(checkoutMainError).toBeNull();
    expect(checkoutMainResult.info.current).toBe('main');

    const [deleteResult, deleteError] = await backend.branch({
      op: 'delete',
      name: 'feature/test',
    });
    expect(deleteError).toBeNull();
    expect(deleteResult.info.current).toBe('main');
    expect(deleteResult.info.branches).not.toContain('feature/test');
  });

  test('uses GitCredentialStore credentials for remote push auth (#954)', async () => {
    const pushSpy = vi.spyOn(git, 'push').mockImplementation(async (args) => {
      expect(args.remote).toBe('origin');
      expect(args.ref).toBe('main');
      const auth = await args.onAuth();
      expect(auth).toEqual({
        username: 'token-user',
        password: 'token-secret',
      });
      return {
        ok: true,
        error: null,
        refs: {},
      };
    });

    const credentialStore = {
      getCredential: vi.fn().mockReturnValue({
        username: 'token-user',
        token: 'token-secret',
      }),
    };

    const remoteBackend = new IsomorphicGitBackend({
      repositoryPath: repoDir,
      workspaceId: 'workspace-1',
      credentialStore,
      httpClient: {},
    });

    const [result, error] = await remoteBackend.fetchPullPush('push', 'origin', 'main');

    expect(error).toBeNull();
    expect(result.status).toBe('ok');
    expect(credentialStore.getCredential).toHaveBeenCalledWith('workspace-1', 'origin');

    pushSpy.mockRestore();
  });

  test('routes fetch and pull through isomorphic-git remote APIs (#954)', async () => {
    const fetchSpy = vi.spyOn(git, 'fetch').mockResolvedValue({});
    const pullSpy = vi.spyOn(git, 'pull').mockResolvedValue({
      oid: 'abc123',
      fastForward: true,
    });

    const credentialStore = {
      getCredential: vi.fn().mockReturnValue({
        username: 'bot',
        password: 'pass',
      }),
    };

    const remoteBackend = new IsomorphicGitBackend({
      repositoryPath: repoDir,
      workspaceId: 'workspace-2',
      credentialStore,
      httpClient: {},
      author: {
        name: 'Remote Bot',
        email: 'remote@example.com',
      },
    });

    const [fetchResult, fetchError] = await remoteBackend.fetchPullPush('fetch', 'origin', 'main');
    expect(fetchError).toBeNull();
    expect(fetchResult.status).toBe('ok');
    expect(fetchSpy).toHaveBeenCalled();

    const [pullResult, pullError] = await remoteBackend.fetchPullPush('pull', 'origin', 'main');
    expect(pullError).toBeNull();
    expect(pullResult.status).toBe('ok');
    expect(pullSpy).toHaveBeenCalled();

    fetchSpy.mockRestore();
    pullSpy.mockRestore();
  });

  test('returns paginated commit metadata with depth option (#955)', async () => {
    for (let i = 0; i < 6; i++) {
      await appendCommit(repoDir, i + 1);
    }

    const [logResult, logError] = await backend.log({ depth: 5 });
    expect(logError).toBeNull();
    expect(logResult.entries).toHaveLength(5);

    for (const entry of logResult.entries) {
      expect(typeof entry.hash).toBe('string');
      expect(typeof entry.authorName).toBe('string');
      expect(typeof entry.authorEmail).toBe('string');
      expect(typeof entry.author).toBe('string');
      expect(typeof entry.date).toBe('string');
      expect(typeof entry.subject).toBe('string');
      expect(typeof entry.body).toBe('string');
      expect(typeof entry.message).toBe('string');
    }

    const [filteredResult, filteredError] = await backend.log({
      depth: 10,
      author: 'backend@example.com',
    });
    expect(filteredError).toBeNull();
    expect(filteredResult.entries.length).toBeGreaterThanOrEqual(5);
  });
});
