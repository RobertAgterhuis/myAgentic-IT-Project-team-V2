'use strict';

const git = require('isomorphic-git');

let createBrowserFsGitAdapter;

beforeAll(async () => {
  ({ createBrowserFsGitAdapter } =
    await import('../../src/webapp/services/git/browserfs-adapter.ts'));
});

describe('BrowserFS git adapter (#951)', () => {
  test('git.log reads commit history from the current workspace', async () => {
    const adapter = await createBrowserFsGitAdapter(process.cwd());

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
