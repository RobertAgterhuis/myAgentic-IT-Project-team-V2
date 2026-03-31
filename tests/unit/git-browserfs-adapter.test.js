import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const git = require('isomorphic-git');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

let createBrowserFsGitAdapter;
let tmpDir;

async function createTempGitRepo() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'browserfs-git-'));

  await git.init({ fs, dir: root });

  const filePath = path.join(root, 'README.md');
  await fs.writeFile(filePath, '# temp repo\n', 'utf8');

  await git.add({ fs, dir: root, filepath: 'README.md' });
  await git.commit({
    fs,
    dir: root,
    message: 'initial commit',
    author: { name: 'test', email: 'test@example.com' },
  });

  return root;
}

beforeAll(async () => {
  ({ createBrowserFsGitAdapter } =
    await import('../../src/webapp/services/git/browserfs-adapter.ts'));
  tmpDir = await createTempGitRepo();
});

afterAll(async () => {
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

describe('BrowserFS git adapter (#951)', () => {
  test('git.log reads commit history from a git workspace', async () => {
    const adapter = await createBrowserFsGitAdapter(tmpDir);

    const commits = await git.log({
      fs: adapter.fs,
      dir: adapter.dir,
      gitdir: adapter.gitdir,
      depth: 5,
    });

    expect(Array.isArray(commits)).toBe(true);
    expect(commits.length).toBeGreaterThan(0);
    expect(typeof commits[0].oid).toBe('string');
    expect(commits[0].oid.length).toBeGreaterThan(0);
  }, 30000);
});
