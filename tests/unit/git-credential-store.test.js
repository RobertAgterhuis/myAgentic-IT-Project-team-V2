'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');

let GitCredentialStore;

beforeAll(async () => {
  ({ GitCredentialStore } = await import('../../src/webapp/services/git/credential-store.ts'));
});

describe('GitCredentialStore (#957)', () => {
  let dbPath;
  let store;
  let env;

  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-credential-store-'));
    dbPath = path.join(dir, 'credentials.sqlite');
    env = {
      CREDENTIAL_MASTER_KEY: crypto.randomBytes(32).toString('hex'),
    };
    store = new GitCredentialStore(dbPath, { env });
  });

  afterEach(() => {
    store.close();
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  test('stores ciphertext at rest and round-trips the original credential', () => {
    const original = {
      username: 'git-user',
      token: 'super-secret-token',
      expiresAt: '2026-03-22T18:00:00.000Z',
    };

    store.setCredential('workspace-1', 'github', original);

    const db = new Database(dbPath, { readonly: true });
    const row = db
      .prepare(
        'SELECT workspace_id, provider, ciphertext, tag, iv FROM git_credentials WHERE workspace_id = ? AND provider = ?'
      )
      .get('workspace-1', 'github');
    db.close();

    expect(row.workspace_id).toBe('workspace-1');
    expect(row.provider).toBe('github');
    expect(row.ciphertext).not.toContain(original.username);
    expect(row.ciphertext).not.toContain(original.token);
    expect(row.tag).toBeTruthy();
    expect(row.iv).toBeTruthy();

    expect(store.getCredential('workspace-1', 'github')).toEqual(original);
  });

  test('deletes credentials by workspace and provider', () => {
    store.setCredential('workspace-2', 'github', { token: 'delete-me' });

    expect(store.deleteCredential('workspace-2', 'github')).toBe(true);
    expect(store.getCredential('workspace-2', 'github')).toBeNull();
    expect(store.deleteCredential('workspace-2', 'github')).toBe(false);
  });

  test('rejects missing master key configuration', () => {
    expect(
      () => new GitCredentialStore(path.join(path.dirname(dbPath), 'bad.sqlite'), { env: {} })
    ).toThrow(/CREDENTIAL_MASTER_KEY is required/);
  });
});
