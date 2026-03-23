'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let GitBackendRouter, GitBackendUnavailableError;

beforeAll(async () => {
  ({ GitBackendRouter, GitBackendUnavailableError } =
    await import('../../src/webapp/services/git/git-backend-router.ts'));
});

function createBackend(name) {
  return {
    name,
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

describe('GitBackendRouter (#948)', () => {
  test('defaults to isomorphic operations when GIT_BACKEND is not set', async () => {
    const isomorphic = createBackend('isomorphic');
    isomorphic.status.mockResolvedValue([
      {
        branch: 'main',
        ahead: 0,
        behind: 0,
        clean: true,
        entries: [],
      },
      null,
    ]);
    const router = new GitBackendRouter({
      repositoryPath: process.cwd(),
      env: {},
      factories: {
        isomorphic: () => isomorphic,
      },
    });

    expect(router.resolveBackendKind()).toBe('isomorphic');
    const [statusResult, statusError] = await router.getBackend().status();
    expect(statusError).toBeNull();
    expect(statusResult.clean).toBe(true);
    expect(isomorphic.status).toHaveBeenCalledTimes(1);
  });

  test('returns the native backend when configured', () => {
    const nativeBackend = createBackend('native');
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-router-force-native-'));
    fs.writeFileSync(
      path.join(repoDir, '.gitattributes'),
      '*.bin filter=lfs diff=lfs merge=lfs -text\n'
    );
    const router = new GitBackendRouter({
      repositoryPath: repoDir,
      env: { GIT_BACKEND: 'native' },
      factories: {
        native: () => nativeBackend,
      },
    });

    expect(router.resolveBackendKind()).toBe('native');
    expect(router.getBackend()).toBe(nativeBackend);

    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  test('forces isomorphic backend when configured, even when native detection would trigger (#962)', async () => {
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-router-force-isomorphic-'));
    fs.writeFileSync(path.join(repoDir, '.gitmodules'), '[submodule "lib"]\n\tpath = lib\n');

    const isomorphic = createBackend('isomorphic');
    isomorphic.status.mockResolvedValue([
      {
        branch: 'main',
        ahead: 0,
        behind: 0,
        clean: true,
        entries: [],
      },
      null,
    ]);
    const nativeBackend = createBackend('native');

    const router = new GitBackendRouter({
      repositoryPath: repoDir,
      env: { GIT_BACKEND: 'isomorphic' },
      factories: {
        isomorphic: () => isomorphic,
        native: () => nativeBackend,
      },
    });

    expect(router.resolveBackendKind()).toBe('isomorphic');
    const [statusResult, statusError] = await router.getBackend().status();
    expect(statusError).toBeNull();
    expect(statusResult.clean).toBe(true);
    expect(isomorphic.status).toHaveBeenCalledTimes(1);
    expect(nativeBackend.status).not.toHaveBeenCalled();

    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  test('returns the provider-api backend when configured', () => {
    const providerBackend = createBackend('provider-api');
    const router = new GitBackendRouter({
      repositoryPath: process.cwd(),
      env: { GIT_BACKEND: 'provider-api' },
      factories: {
        'provider-api': () => providerBackend,
      },
    });

    expect(router.resolveBackendKind()).toBe('provider-api');
    expect(router.getBackend()).toBe(providerBackend);
  });

  test('throws a graceful unavailable error when the configured backend is missing', () => {
    const router = new GitBackendRouter({
      repositoryPath: process.cwd(),
      env: { GIT_BACKEND: 'provider-api' },
      factories: {},
    });

    expect(() => router.getBackend()).toThrow(GitBackendUnavailableError);
    expect(() => router.getBackend()).toThrow(/provider-api/);
  });

  test('auto-detects native backend when LFS tracking is present (#961)', () => {
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-router-lfs-'));
    fs.writeFileSync(
      path.join(repoDir, '.gitattributes'),
      '*.bin filter=lfs diff=lfs merge=lfs -text\n'
    );

    const isomorphic = createBackend('isomorphic');
    const nativeBackend = createBackend('native');
    const audit = { log: vi.fn() };
    const router = new GitBackendRouter({
      repositoryPath: repoDir,
      env: {},
      audit,
      factories: {
        isomorphic: () => isomorphic,
        native: () => nativeBackend,
      },
    });

    expect(router.resolveBackendKind()).toBe('native');
    expect(router.getBackend()).toBe(nativeBackend);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'git_backend_fallback',
        entityType: 'git_backend',
      })
    );

    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  test('auto-detects native backend when submodules are present (#961)', () => {
    const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-router-submodules-'));
    fs.writeFileSync(
      path.join(repoDir, '.gitmodules'),
      '[submodule "lib"]\n\tpath = lib\n\turl = https://example.com/lib.git\n'
    );

    const router = new GitBackendRouter({
      repositoryPath: repoDir,
      env: {},
      factories: {
        isomorphic: () => createBackend('isomorphic'),
        native: () => createBackend('native'),
      },
    });

    expect(router.resolveBackendKind()).toBe('native');

    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  test('falls back to native when isomorphic backend returns unimplemented (#961)', async () => {
    const unimplementedError = Object.assign(new Error('UNIMPLEMENTED: lfs pointer support'), {
      code: 'UNIMPLEMENTED',
    });
    const isomorphic = {
      ...createBackend('isomorphic'),
      status: vi.fn().mockResolvedValue([null, unimplementedError]),
    };
    const nativeBackend = {
      ...createBackend('native'),
      status: vi.fn().mockResolvedValue([
        {
          branch: 'main',
          ahead: 0,
          behind: 0,
          clean: true,
          entries: [],
        },
        null,
      ]),
    };
    const audit = { log: vi.fn() };

    const router = new GitBackendRouter({
      repositoryPath: process.cwd(),
      env: {},
      audit,
      factories: {
        isomorphic: () => isomorphic,
        native: () => nativeBackend,
      },
    });

    const backend = router.getBackend();
    const [statusResult, statusError] = await backend.status();

    expect(statusError).toBeNull();
    expect(statusResult.clean).toBe(true);
    expect(isomorphic.status).toHaveBeenCalledTimes(1);
    expect(nativeBackend.status).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'git_backend_fallback',
        entityType: 'git_backend',
      })
    );
  });

  test('workspace config overrides environment backend selection (#962)', () => {
    const router = new GitBackendRouter({
      repositoryPath: process.cwd(),
      env: { GIT_BACKEND: 'isomorphic' },
      workspaceConfig: {
        git: {
          backend: 'native',
        },
      },
      factories: {
        isomorphic: () => createBackend('isomorphic'),
        native: () => createBackend('native'),
      },
    });

    expect(router.resolveBackendKind()).toBe('native');
  });
});
