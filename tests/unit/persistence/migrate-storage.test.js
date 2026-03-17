// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Tests for migrate-storage utility (M23-006).
 * Exercises the migration round-trip: file→sqlite→file.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  FileStorageProvider,
  SQLiteStorageProvider,
} = require('../../../platform/engine/persistence');

/** Create a unique temp directory for each test. */
function tmpDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `m23-migrate-${prefix}-`));
}

describe('migrate-storage (M23-006)', () => {
  let fileDir;
  let sqliteDir;
  let fileProvider;
  let sqliteProvider;

  beforeEach(async () => {
    fileDir = tmpDir('file');
    sqliteDir = tmpDir('sqlite');
    fileProvider = new FileStorageProvider({ basePath: fileDir });
    sqliteProvider = new SQLiteStorageProvider({
      dbPath: path.join(sqliteDir, 'test.db'),
    });
    await fileProvider.initialize();
    await sqliteProvider.initialize();
  });

  afterEach(async () => {
    await fileProvider.close();
    await sqliteProvider.close();
    fs.rmSync(fileDir, { recursive: true, force: true });
    fs.rmSync(sqliteDir, { recursive: true, force: true });
  });

  async function seedProvider(provider, collections) {
    for (const [col, docs] of Object.entries(collections)) {
      for (const doc of docs) {
        await provider.write(col, doc.id, doc);
      }
    }
  }

  async function migrateAll(source, target, collections) {
    for (const col of collections) {
      const docs = await source.list(col);
      for (const doc of docs) {
        await target.write(col, doc.id, doc);
      }
    }
  }

  it('migrates file→sqlite with data preserved', async () => {
    const seed = {
      sessions: [
        { id: 's1', name: 'Session 1', status: 'active' },
        { id: 's2', name: 'Session 2', status: 'complete' },
      ],
      decisions: [{ id: 'd1', title: 'Use SQLite', verdict: 'approved' }],
    };
    await seedProvider(fileProvider, seed);

    await migrateAll(fileProvider, sqliteProvider, ['sessions', 'decisions']);

    const sessions = await sqliteProvider.list('sessions');
    expect(sessions).toHaveLength(2);
    expect(sessions.find((d) => d.id === 's1').name).toBe('Session 1');
    expect(sessions.find((d) => d.id === 's2').status).toBe('complete');

    const decisions = await sqliteProvider.list('decisions');
    expect(decisions).toHaveLength(1);
    expect(decisions[0].title).toBe('Use SQLite');
  });

  it('migrates sqlite→file with data preserved', async () => {
    const seed = {
      commands: [
        { id: 'c1', command: 'CREATE', project: 'test' },
        { id: 'c2', command: 'AUDIT', project: 'prod' },
      ],
    };
    await seedProvider(sqliteProvider, seed);

    await migrateAll(sqliteProvider, fileProvider, ['commands']);

    const commands = await fileProvider.list('commands');
    expect(commands).toHaveLength(2);
    expect(commands.find((d) => d.id === 'c1').command).toBe('CREATE');
    expect(commands.find((d) => d.id === 'c2').project).toBe('prod');
  });

  it('round-trips file→sqlite→file without data loss', async () => {
    const original = {
      artifacts: [
        { id: 'a1', type: 'report', content: 'Hello world', nested: { x: 1, y: [2, 3] } },
        { id: 'a2', type: 'schema', content: 'foo bar' },
      ],
    };
    await seedProvider(fileProvider, original);

    // file → sqlite
    await migrateAll(fileProvider, sqliteProvider, ['artifacts']);

    // sqlite → new file provider
    const fileDir2 = tmpDir('file2');
    const fileProvider2 = new FileStorageProvider({ basePath: fileDir2 });
    await fileProvider2.initialize();

    await migrateAll(sqliteProvider, fileProvider2, ['artifacts']);

    const result = await fileProvider2.list('artifacts');
    expect(result).toHaveLength(2);
    const a1 = result.find((d) => d.id === 'a1');
    expect(a1.nested).toEqual({ x: 1, y: [2, 3] });
    expect(a1.content).toBe('Hello world');

    await fileProvider2.close();
    fs.rmSync(fileDir2, { recursive: true, force: true });
  });

  it('handles empty collections gracefully', async () => {
    // Source has an empty collection dir
    fs.mkdirSync(path.join(fileDir, 'empty-col'), { recursive: true });

    const docs = await fileProvider.list('empty-col');
    expect(docs).toHaveLength(0);

    // Migrating empty is a no-op
    await migrateAll(fileProvider, sqliteProvider, ['empty-col']);
    const result = await sqliteProvider.list('empty-col');
    expect(result).toHaveLength(0);
  });

  it('is idempotent — running migration twice produces same result', async () => {
    const seed = {
      metrics: [
        { id: 'm1', value: 42 },
        { id: 'm2', value: 99 },
      ],
    };
    await seedProvider(fileProvider, seed);

    await migrateAll(fileProvider, sqliteProvider, ['metrics']);
    await migrateAll(fileProvider, sqliteProvider, ['metrics']); // second run

    const result = await sqliteProvider.list('metrics');
    expect(result).toHaveLength(2); // Still 2, not 4 (upsert)
    expect(result.find((d) => d.id === 'm1').value).toBe(42);
  });

  it('validates document count match', async () => {
    await seedProvider(fileProvider, {
      test: [
        { id: 't1', v: 1 },
        { id: 't2', v: 2 },
      ],
    });

    await migrateAll(fileProvider, sqliteProvider, ['test']);

    const srcDocs = await fileProvider.list('test');
    const tgtDocs = await sqliteProvider.list('test');
    expect(tgtDocs).toHaveLength(srcDocs.length);

    for (const src of srcDocs) {
      const tgt = tgtDocs.find((d) => d.id === src.id);
      expect(tgt).toBeTruthy();
      expect(tgt.v).toBe(src.v);
    }
  });
});
