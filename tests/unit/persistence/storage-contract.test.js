import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Copyright (c) 2026 Robert Agterhuis. MIT License.
// M23-004: StorageProvider contract test suite
// Parameterized — every provider implementation must pass all tests.
const fs = require('fs');
const path = require('path');
const os = require('os');
import * as __req_0 from '../../../platform/engine/persistence/file-provider';
const { FileStorageProvider } = __req_0;
import * as __req_1 from '../../../platform/engine/persistence/sqlite-provider';
const { SQLiteStorageProvider } = __req_1;
import * as __req_2 from '../../../platform/engine/persistence/remote-provider';
const { RemoteStorageProvider, createLoopbackRemoteTransport } = __req_2;

/* ── Helper: create temp directory per test run ───────────────── */

function tmpDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `sp-test-${label}-`));
}

/* ── Provider factories ──────────────────────────────────────── */

const providers = [
  {
    name: 'FileStorageProvider',
    create() {
      const dir = tmpDir('file');
      const provider = new FileStorageProvider({ basePath: dir });
      return {
        provider,
        cleanup() {
          fs.rmSync(dir, { recursive: true, force: true });
        },
      };
    },
  },
  {
    name: 'SQLiteStorageProvider',
    create() {
      const dir = tmpDir('sqlite');
      const dbPath = path.join(dir, 'test.db');
      const provider = new SQLiteStorageProvider({ dbPath });
      return {
        provider,
        cleanup() {
          fs.rmSync(dir, { recursive: true, force: true });
        },
      };
    },
  },
  {
    name: 'RemoteStorageProvider(loopback->sqlite)',
    create() {
      const dir = tmpDir('remote');
      const dbPath = path.join(dir, 'remote.db');
      const backend = new SQLiteStorageProvider({ dbPath });
      const provider = new RemoteStorageProvider({
        transport: createLoopbackRemoteTransport(backend),
      });
      return {
        provider,
        cleanup() {
          fs.rmSync(dir, { recursive: true, force: true });
        },
      };
    },
  },
];

/* ── Contract tests (run against every provider) ─────────────── */

describe.each(providers)('StorageProvider contract — $name', ({ create }) => {
  let provider;
  let cleanup;

  beforeAll(async () => {
    const ctx = create();
    provider = ctx.provider;
    cleanup = ctx.cleanup;
    await provider.initialize();
  });

  afterAll(async () => {
    await provider.close();
    cleanup();
  });

  const COL = 'test-items';

  beforeEach(async () => {
    const docs = await provider.list(COL);
    for (const doc of docs) {
      await provider.delete(COL, doc.id);
    }
  });

  // ── 1. Provider identity ───────────────────────────────────

  it('has a non-empty name', () => {
    expect(provider.name).toBeTruthy();
    expect(typeof provider.name).toBe('string');
  });

  // ── 2. CRUD: write + read ──────────────────────────────────

  it('writes and reads a document', async () => {
    const doc = { id: 'doc-1', title: 'Hello', count: 42 };
    await provider.write(COL, 'doc-1', doc);
    const result = await provider.read(COL, 'doc-1');
    expect(result).toEqual(doc);
  });

  // ── 3. Read missing document returns null ──────────────────

  it('returns null for missing document', async () => {
    const result = await provider.read(COL, 'nonexistent');
    expect(result).toBeNull();
  });

  // ── 4. Write overwrites existing document ──────────────────

  it('overwrites existing document', async () => {
    const v1 = { id: 'doc-1', version: 1 };
    const v2 = { id: 'doc-1', version: 2 };
    await provider.write(COL, 'doc-1', v1);
    await provider.write(COL, 'doc-1', v2);
    const result = await provider.read(COL, 'doc-1');
    expect(result).toEqual(v2);
  });

  // ── 5. Delete removes document ─────────────────────────────

  it('deletes a document', async () => {
    await provider.write(COL, 'doc-del', { id: 'doc-del', value: 'x' });
    await provider.delete(COL, 'doc-del');
    const result = await provider.read(COL, 'doc-del');
    expect(result).toBeNull();
  });

  // ── 6. Delete non-existent is no-op ────────────────────────

  it('delete on non-existent document is no-op', async () => {
    await expect(provider.delete(COL, 'ghost')).resolves.toBeUndefined();
  });

  // ── 7. List returns all documents ──────────────────────────

  it('lists all documents in a collection', async () => {
    await provider.write(COL, 'a', { id: 'a', order: 1 });
    await provider.write(COL, 'b', { id: 'b', order: 2 });
    await provider.write(COL, 'c', { id: 'c', order: 3 });
    const docs = await provider.list(COL);
    expect(docs).toHaveLength(3);
    const ids = docs.map((d) => d.id).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  // ── 8. List empty collection ───────────────────────────────

  it('lists empty collection returns empty array', async () => {
    const docs = await provider.list('empty-collection');
    expect(docs).toEqual([]);
  });

  // ── 9. List with where filter ──────────────────────────────

  it('filters documents with where clause', async () => {
    await provider.write(COL, 'x1', { id: 'x1', status: 'active' });
    await provider.write(COL, 'x2', { id: 'x2', status: 'archived' });
    await provider.write(COL, 'x3', { id: 'x3', status: 'active' });
    const active = await provider.list(COL, { where: { status: 'active' } });
    expect(active).toHaveLength(2);
    expect(active.every((d) => d.status === 'active')).toBe(true);
  });

  // ── 10. List with limit ────────────────────────────────────

  it('respects limit in list', async () => {
    await provider.write(COL, 'l1', { id: 'l1' });
    await provider.write(COL, 'l2', { id: 'l2' });
    await provider.write(COL, 'l3', { id: 'l3' });
    const docs = await provider.list(COL, { limit: 2 });
    expect(docs).toHaveLength(2);
  });

  // ── 11. List with offset ───────────────────────────────────

  it('respects offset in list', async () => {
    await provider.write(COL, 'o1', { id: 'o1', order: 1 });
    await provider.write(COL, 'o2', { id: 'o2', order: 2 });
    await provider.write(COL, 'o3', { id: 'o3', order: 3 });
    const all = await provider.list(COL);
    const offset = await provider.list(COL, { offset: 1 });
    expect(offset).toHaveLength(all.length - 1);
  });

  it('defaults list queries to a bounded page size', async () => {
    const pagedCollection = `${COL}-paged-default`;
    for (let index = 0; index < 60; index++) {
      await provider.write(pagedCollection, `page-${index}`, { id: `page-${index}`, order: index });
    }

    const docs = await provider.list(pagedCollection);

    expect(docs).toHaveLength(50);
  });

  it('clamps oversized explicit limits', async () => {
    const pagedCollection = `${COL}-paged-clamped`;
    for (let index = 0; index < 220; index++) {
      await provider.write(pagedCollection, `limit-${index}`, {
        id: `limit-${index}`,
        order: index,
      });
    }

    const docs = await provider.list(pagedCollection, { limit: 999 });

    expect(docs).toHaveLength(200);
  });

  // ── 12. List with orderBy ascending ────────────────────────

  it('sorts documents ascending', async () => {
    await provider.write(COL, 'z', { id: 'z', rank: 3 });
    await provider.write(COL, 'a', { id: 'a', rank: 1 });
    await provider.write(COL, 'm', { id: 'm', rank: 2 });
    const docs = await provider.list(COL, {
      orderBy: { field: 'rank', direction: 'asc' },
    });
    expect(docs.map((d) => d.rank)).toEqual([1, 2, 3]);
  });

  // ── 13. List with orderBy descending ───────────────────────

  it('sorts documents descending', async () => {
    await provider.write(COL, 'z', { id: 'z', rank: 3 });
    await provider.write(COL, 'a', { id: 'a', rank: 1 });
    await provider.write(COL, 'm', { id: 'm', rank: 2 });
    const docs = await provider.list(COL, {
      orderBy: { field: 'rank', direction: 'desc' },
    });
    expect(docs.map((d) => d.rank)).toEqual([3, 2, 1]);
  });

  // ── 14. Query with text search ─────────────────────────────

  it('queries with text search', async () => {
    await provider.write(COL, 's1', { id: 's1', title: 'Alpha Bravo' });
    await provider.write(COL, 's2', { id: 's2', title: 'Charlie Delta' });
    await provider.write(COL, 's3', { id: 's3', title: 'Bravo Echo' });
    const results = await provider.query(COL, { text: 'bravo' });
    expect(results).toHaveLength(2);
    const ids = results.map((d) => d.id).sort();
    expect(ids).toEqual(['s1', 's3']);
  });

  // ── 15. Query with text + where filter ─────────────────────

  it('combines text search with where filter', async () => {
    await provider.write(COL, 'q1', { id: 'q1', title: 'Alpha', status: 'open' });
    await provider.write(COL, 'q2', { id: 'q2', title: 'Alpha', status: 'closed' });
    const results = await provider.query(COL, {
      text: 'Alpha',
      where: { status: 'open' },
    });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('q1');
  });

  // ── 16. Transaction: multiple writes ───────────────────────

  it('executes transaction with multiple writes', async () => {
    await provider.transaction([
      { type: 'write', collection: COL, id: 't1', data: { id: 't1', v: 1 } },
      { type: 'write', collection: COL, id: 't2', data: { id: 't2', v: 2 } },
      { type: 'write', collection: COL, id: 't3', data: { id: 't3', v: 3 } },
    ]);
    const docs = await provider.list(COL);
    expect(docs).toHaveLength(3);
  });

  // ── 17. Transaction: mixed write + delete ──────────────────

  it('executes transaction with writes and deletes', async () => {
    await provider.write(COL, 'td1', { id: 'td1', keep: true });
    await provider.write(COL, 'td2', { id: 'td2', keep: false });
    await provider.transaction([
      { type: 'write', collection: COL, id: 'td3', data: { id: 'td3', keep: true } },
      { type: 'delete', collection: COL, id: 'td2' },
    ]);
    const remaining = await provider.list(COL);
    const ids = remaining.map((d) => d.id).sort();
    expect(ids).toEqual(['td1', 'td3']);
  });

  // ── 18. Concurrent writes to different documents ───────────

  it('handles concurrent writes to different documents', async () => {
    const writes = Array.from({ length: 10 }, (_, i) =>
      provider.write(COL, `cw-${i}`, { id: `cw-${i}`, index: i })
    );
    await Promise.all(writes);
    const docs = await provider.list(COL);
    expect(docs).toHaveLength(10);
  });

  // ── 19. Write preserves complex nested data ────────────────

  it('preserves complex nested document data', async () => {
    const complex = {
      id: 'nested',
      meta: { tags: ['a', 'b'], deep: { value: 99 } },
      items: [1, 2, 3],
      flag: true,
      nullable: null,
    };
    await provider.write(COL, 'nested', complex);
    const result = await provider.read(COL, 'nested');
    expect(result).toEqual(complex);
  });

  // ── 20. Health check returns healthy ───────────────────────

  it('returns healthy status', async () => {
    const health = await provider.health();
    expect(health.status).toBe('healthy');
    expect(health.provider).toBe(provider.name);
    expect(typeof health.latencyMs).toBe('number');
  });

  // ── 21. Metrics are tracked ────────────────────────────────

  it('tracks operation metrics', async () => {
    // Perform some operations
    await provider.write(COL, 'metric-doc', { id: 'metric-doc' });
    await provider.read(COL, 'metric-doc');
    await provider.delete(COL, 'metric-doc');

    const m = provider.metrics();
    expect(m.reads).toBeGreaterThan(0);
    expect(m.writes).toBeGreaterThan(0);
    expect(m.deletes).toBeGreaterThan(0);
  });

  // ── 22. Multiple collections are isolated ──────────────────

  it('isolates documents between collections', async () => {
    await provider.write('colA', 'shared-id', { id: 'shared-id', from: 'a' });
    await provider.write('colB', 'shared-id', { id: 'shared-id', from: 'b' });

    const fromA = await provider.read('colA', 'shared-id');
    const fromB = await provider.read('colB', 'shared-id');
    expect(fromA.from).toBe('a');
    expect(fromB.from).toBe('b');

    // Clean up extra collections
    await provider.delete('colA', 'shared-id');
    await provider.delete('colB', 'shared-id');
  });

  // ── 23. Empty transaction is no-op ─────────────────────────

  it('handles empty transaction gracefully', async () => {
    await expect(provider.transaction([])).resolves.toBeUndefined();
  });

  // ── 24. List with combined filter options ──────────────────

  it('combines where + orderBy + limit', async () => {
    await provider.write(COL, 'cf1', { id: 'cf1', type: 'bug', priority: 3 });
    await provider.write(COL, 'cf2', { id: 'cf2', type: 'bug', priority: 1 });
    await provider.write(COL, 'cf3', { id: 'cf3', type: 'feature', priority: 2 });
    await provider.write(COL, 'cf4', { id: 'cf4', type: 'bug', priority: 2 });

    const bugs = await provider.list(COL, {
      where: { type: 'bug' },
      orderBy: { field: 'priority', direction: 'asc' },
      limit: 2,
    });
    expect(bugs).toHaveLength(2);
    expect(bugs[0].priority).toBe(1);
    expect(bugs[1].priority).toBe(2);
  });

  // ── 25. Write then immediate read consistency ──────────────

  it('read-after-write is consistent', async () => {
    for (let i = 0; i < 5; i++) {
      const doc = { id: `raw-${i}`, iteration: i };
      await provider.write(COL, doc.id, doc);
      const read = await provider.read(COL, doc.id);
      expect(read).toEqual(doc);
    }
  });
});
