'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

let NativeGitBackend;

beforeAll(async () => {
  ({ NativeGitBackend } = await import('../../src/webapp/services/git/native-git-backend.ts'));
});

function hasGitBinary() {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runGit(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
  });
}

function createRepoWithRemote() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'native-git-backend-'));
  const repoDir = path.join(root, 'repo');
  const remoteDir = path.join(root, 'remote.git');
  fs.mkdirSync(repoDir, { recursive: true });

  runGit(repoDir, ['init', '--initial-branch=main']);
  runGit(repoDir, ['config', 'user.name', 'Native Tester']);
  runGit(repoDir, ['config', 'user.email', 'native@example.com']);

  fs.writeFileSync(path.join(repoDir, 'tracked.txt'), 'line one\n', 'utf8');
  runGit(repoDir, ['add', '--', 'tracked.txt']);
  runGit(repoDir, ['commit', '-m', 'initial commit']);

  runGit(root, ['init', '--bare', remoteDir]);
  runGit(repoDir, ['remote', 'add', 'origin', remoteDir]);
  runGit(repoDir, ['push', '-u', 'origin', 'main']);

  return { root, repoDir, remoteDir };
}

const maybeDescribe = hasGitBinary() ? describe : describe.skip;

maybeDescribe('NativeGitBackend (#960)', () => {
  let root;
  let repoDir;
  let backend;

  beforeEach(() => {
    const setup = createRepoWithRemote();
    root = setup.root;
    repoDir = setup.repoDir;
    backend = new NativeGitBackend({ repositoryPath: repoDir });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('status(), commit(), and push() work against a test repo', async () => {
    fs.writeFileSync(path.join(repoDir, 'tracked.txt'), 'line one\nline two\n', 'utf8');

    const [statusBefore, statusBeforeError] = await backend.status();
    expect(statusBeforeError).toBeNull();
    expect(statusBefore.clean).toBe(false);

    const [addResult, addError] = await backend.add(['tracked.txt']);
    expect(addError).toBeNull();
    expect(addResult.status).toBe('ok');

    const [commitResult, commitError] = await backend.commit('native backend commit');
    expect(commitError).toBeNull();
    expect(commitResult.status).toBe('ok');
    expect(commitResult.commitHash.length).toBeGreaterThan(6);

    const [pushResult, pushError] = await backend.fetchPullPush('push', 'origin', 'main');
    expect(pushError).toBeNull();
    expect(pushResult.status).toBe('ok');

    const head = runGit(repoDir, ['rev-parse', 'HEAD']).trim();
    const remoteHead = runGit(repoDir, ['rev-parse', 'origin/main']).trim();
    expect(remoteHead).toBe(head);
  }, 15000);

  test('semicolon argument does not execute a secondary command (#960)', async () => {
    const markerPath = path.join(repoDir, 'injection-marker.txt');

    const [result, error] = await backend.add([`tracked.txt;echo hacked > ${markerPath}`]);
    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(fs.existsSync(markerPath)).toBe(false);
  });
});
