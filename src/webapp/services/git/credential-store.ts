import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import {
  applySqliteConcurrencyPragmas,
  resolveSqliteConcurrencyConfig,
} from '../../../../platform/engine/sqlite-concurrency';

export interface GitCredential {
  username?: string | null;
  password?: string | null;
  token?: string | null;
  expiresAt?: string | null;
}

export interface GitCredentialStoreOptions {
  env?: Record<string, string | undefined>;
}

function readMasterKey(env: Record<string, string | undefined>): Buffer {
  const raw = (env.CREDENTIAL_MASTER_KEY || '').trim();
  if (!raw) {
    throw new Error('CREDENTIAL_MASTER_KEY is required');
  }

  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('CREDENTIAL_MASTER_KEY must decode to 32 bytes');
  }

  return key;
}

function encryptCredential(
  masterKey: Buffer,
  credential: GitCredential
): {
  ciphertext: string;
  tag: string;
  iv: string;
} {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv, { authTagLength: 16 });
  const plaintext = JSON.stringify(credential);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString('base64'),
    tag: tag.toString('base64'),
    iv: iv.toString('base64'),
  };
}

function decryptCredential(
  masterKey: Buffer,
  row: { ciphertext: string; tag: string; iv: string }
): GitCredential {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    masterKey,
    Buffer.from(row.iv, 'base64'),
    {
      authTagLength: 16,
    }
  );
  decipher.setAuthTag(Buffer.from(row.tag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(row.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(plaintext) as GitCredential;
}

export class GitCredentialStore {
  private readonly db: DatabaseType;
  private readonly masterKey: Buffer;

  constructor(dbPath: string, options: GitCredentialStoreOptions = {}) {
    this.masterKey = readMasterKey(options.env || process.env);
    this.db = new Database(dbPath);
    applySqliteConcurrencyPragmas(
      this.db,
      resolveSqliteConcurrencyConfig({}, options.env || process.env)
    );
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS git_credentials (
        workspace_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        tag TEXT NOT NULL,
        iv TEXT NOT NULL,
        PRIMARY KEY (workspace_id, provider)
      )
    `);
  }

  getCredential(workspaceId: string, provider: string): GitCredential | null {
    const row = this.db
      .prepare(
        `SELECT ciphertext, tag, iv
         FROM git_credentials
         WHERE workspace_id = ? AND provider = ?`
      )
      .get(workspaceId, provider) as
      | {
          ciphertext: string;
          tag: string;
          iv: string;
        }
      | undefined;

    return row ? decryptCredential(this.masterKey, row) : null;
  }

  setCredential(workspaceId: string, provider: string, credential: GitCredential): void {
    const encrypted = encryptCredential(this.masterKey, credential);

    this.db
      .prepare(
        `INSERT INTO git_credentials (workspace_id, provider, ciphertext, tag, iv)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(workspace_id, provider) DO UPDATE SET
           ciphertext = excluded.ciphertext,
           tag = excluded.tag,
           iv = excluded.iv`
      )
      .run(workspaceId, provider, encrypted.ciphertext, encrypted.tag, encrypted.iv);
  }

  deleteCredential(workspaceId: string, provider: string): boolean {
    const result = this.db
      .prepare('DELETE FROM git_credentials WHERE workspace_id = ? AND provider = ?')
      .run(workspaceId, provider);

    return result.changes > 0;
  }

  listProviders(workspaceId: string): string[] {
    const rows = this.db
      .prepare(
        `SELECT provider
         FROM git_credentials
         WHERE workspace_id = ?
         ORDER BY provider ASC`
      )
      .all(workspaceId) as Array<{ provider: string }>;

    return rows.map((row) => row.provider);
  }

  close(): void {
    this.db.close();
  }
}
