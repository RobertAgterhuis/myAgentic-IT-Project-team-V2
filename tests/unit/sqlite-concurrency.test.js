import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const Database = require('better-sqlite3');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

import * as __req_0 from '../../platform/engine/sqlite-concurrency';
const { resolveSqliteConcurrencyConfig, applySqliteConcurrencyPragmas } = __req_0;
import * as __req_1 from '../../platform/engine/persistence/sqlite-provider';
const { SQLiteStorageProvider } = __req_1;

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sqlite-concurrency-'));
}

describe('sqlite concurrency config', () => {
  it('uses explicit defaults and fixed no-pool connection model', () => {
    const config = resolveSqliteConcurrencyConfig({}, {});

    expect(config).toEqual({
      journalMode: 'WAL',
      synchronous: 'NORMAL',
      busyTimeoutMs: 5000,
      connectionModel: 'single-connection',
      pooling: 'none',
    });
  });

  it('reads overrides from env and applies pragmas to a database', () => {
    const dir = tmpDir();
    const config = resolveSqliteConcurrencyConfig(
      {},
      {
        SQLITE_JOURNAL_MODE: 'delete',
        SQLITE_SYNCHRONOUS: 'full',
        SQLITE_BUSY_TIMEOUT_MS: '9000',
      }
    );

    const db = new Database(path.join(dir, 'pragmas.db'));
    applySqliteConcurrencyPragmas(db, config);

    expect(db.pragma('journal_mode', { simple: true })).toBe('delete');
    expect(db.pragma('synchronous', { simple: true })).toBe(2);
    expect(db.pragma('busy_timeout', { simple: true })).toBe(9000);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('reports configured concurrency details in sqlite provider health', async () => {
    const dir = tmpDir();
    const provider = new SQLiteStorageProvider({
      dbPath: path.join(dir, 'data.db'),
      journalMode: 'DELETE',
      synchronous: 'FULL',
      busyTimeoutMs: 7777,
    });

    await provider.initialize();
    const health = await provider.health();

    expect(health).toMatchObject({
      status: 'healthy',
      provider: 'sqlite',
      details: {
        journalMode: 'DELETE',
        synchronous: 'FULL',
        busyTimeoutMs: 7777,
        connectionModel: 'single-connection',
        pooling: 'none',
      },
    });

    await provider.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
