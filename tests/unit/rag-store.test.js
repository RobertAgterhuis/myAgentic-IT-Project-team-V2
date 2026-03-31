import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/**
 * RagStore unit tests (RAG-1.1.2).
 * Uses an in-memory SQLite database and a temp directory for LanceDB.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

let RagStore;

beforeAll(async () => {
  const mod = await import('../../src/webapp/services/rag/rag-store.ts');
  RagStore = mod.RagStore;
});

function tmpDirs() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-store-test-'));
  const lanceDir = path.join(base, 'lance');
  fs.mkdirSync(lanceDir, { recursive: true });
  return { base, lanceDir };
}

function cleanup(base) {
  try {
    fs.rmSync(base, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

function makeDbPath(base) {
  return path.join(base, 'rag.sqlite');
}

const COLLECTION = {
  id: 'col-1',
  name: 'test-collection',
  description: 'Unit test collection',
  created_at: new Date().toISOString(),
};

function makeChunk(id, hash, text, embedding = null) {
  return {
    id,
    collection_id: 'col-1',
    source_path: '/docs/test.md',
    chunk_text: text,
    embedding,
    start_line: 1,
    chunk_hash: hash,
  };
}

describe('RagStore.listCollections', () => {
  let store;
  let dirs;

  beforeEach(() => {
    dirs = tmpDirs();
    store = new RagStore(':memory:', dirs.lanceDir);
    store.ensureCollection(COLLECTION);
  });

  afterEach(() => {
    store.close();
    cleanup(dirs.base);
  });

  test('returns empty array when no collections', () => {
    const s = new RagStore(':memory:', dirs.lanceDir);
    expect(s.listCollections()).toEqual([]);
    s.close();
  });

  test('returns registered collection', () => {
    const cols = store.listCollections();
    expect(cols).toHaveLength(1);
    expect(cols[0].id).toBe('col-1');
    expect(cols[0].name).toBe('test-collection');
  });

  test('ensureCollection is idempotent', () => {
    store.ensureCollection(COLLECTION);
    store.ensureCollection(COLLECTION);
    expect(store.listCollections()).toHaveLength(1);
  });
});

describe('RagStore.upsert', () => {
  let store;
  let dirs;

  beforeEach(() => {
    dirs = tmpDirs();
    store = new RagStore(':memory:', dirs.lanceDir);
    store.ensureCollection(COLLECTION);
  });

  afterEach(() => {
    store.close();
    cleanup(dirs.base);
  });

  test('upserts chunks without embeddings into SQLite', async () => {
    const chunk = makeChunk('c1', 'hash-1', 'Hello world');
    await store.upsert('col-1', [chunk]);

    // Query with an embedding should return nothing (no vectors stored)
    const results = await store.query('col-1', [1, 2, 3], 5);
    expect(results).toHaveLength(0);
  });

  test('upserts chunks with embeddings and returns them via query', async () => {
    const chunk = makeChunk('c2', 'hash-2', 'Embeddings work', [1.0, 0.0, 0.0]);
    await store.upsert('col-1', [chunk]);

    const results = await store.query('col-1', [1.0, 0.0, 0.0], 5);
    expect(results).toHaveLength(1);
    expect(results[0].chunk.chunk_text).toBe('Embeddings work');
    expect(results[0].chunk.source_path).toBe('/docs/test.md');
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].score).toBeLessThanOrEqual(1);
  });

  test('re-upsert (same chunk_hash) updates metadata without duplicating', async () => {
    const chunk = makeChunk('c3', 'hash-3', 'Original', [1.0, 0.0, 0.0]);
    await store.upsert('col-1', [chunk]);

    const updated = makeChunk('c3', 'hash-3', 'Updated text', [1.0, 0.0, 0.0]);
    await store.upsert('col-1', [updated]);

    const results = await store.query('col-1', [1.0, 0.0, 0.0], 5);
    const texts = results.map((r) => r.chunk.chunk_text);
    expect(texts).toContain('Updated text');
    expect(texts).not.toContain('Original');
    expect(results).toHaveLength(1);
  });

  test('handles empty chunk array without error', async () => {
    await expect(store.upsert('col-1', [])).resolves.toBeUndefined();
  });
});

describe('RagStore.query', () => {
  let store;
  let dirs;

  beforeEach(async () => {
    dirs = tmpDirs();
    store = new RagStore(':memory:', dirs.lanceDir);
    store.ensureCollection(COLLECTION);

    await store.upsert('col-1', [
      makeChunk('q1', 'qh-1', 'alpha doc', [1.0, 0.0, 0.0]),
      makeChunk('q2', 'qh-2', 'beta doc', [0.0, 1.0, 0.0]),
      makeChunk('q3', 'qh-3', 'gamma doc', [0.0, 0.0, 1.0]),
    ]);
  });

  afterEach(() => {
    store.close();
    cleanup(dirs.base);
  });

  test('returns top-K results sorted by descending score', async () => {
    const results = await store.query('col-1', [1.0, 0.0, 0.0], 3);
    expect(results.length).toBeGreaterThanOrEqual(1);
    // First result should be alpha doc (exact match)
    expect(results[0].chunk.chunk_text).toBe('alpha doc');
    // Scores should be descending
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  test('respects topK limit', async () => {
    const results = await store.query('col-1', [1.0, 0.0, 0.0], 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('threshold filters out low-scoring results', async () => {
    // Query with a very high threshold — only exact (or near-exact) matches pass
    const results = await store.query('col-1', [1.0, 0.0, 0.0], 5, 0.99);
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(0.99);
    }
  });

  test('returns empty array for unknown collection', async () => {
    const results = await store.query('no-such-col', [1, 0, 0], 5);
    expect(results).toEqual([]);
  });

  test('each result contains source_path, chunk_text, and score', async () => {
    const results = await store.query('col-1', [1.0, 0.0, 0.0], 1);
    expect(results[0].chunk.source_path).toBeDefined();
    expect(results[0].chunk.chunk_text).toBeDefined();
    expect(typeof results[0].score).toBe('number');
  });
});

describe('RagStore.delete', () => {
  let store;
  let dirs;

  beforeEach(async () => {
    dirs = tmpDirs();
    store = new RagStore(':memory:', dirs.lanceDir);
    store.ensureCollection(COLLECTION);

    await store.upsert('col-1', [
      makeChunk('d1', 'dh-1', 'delete me', [1.0, 0.0, 0.0]),
      makeChunk('d2', 'dh-2', 'keep me', [0.0, 1.0, 0.0]),
    ]);
  });

  afterEach(() => {
    store.close();
    cleanup(dirs.base);
  });

  test('removes specified chunks from SQLite and LanceDB', async () => {
    await store.delete('col-1', ['dh-1']);

    // Should no longer appear in a query targeting its vector
    const results = await store.query('col-1', [1.0, 0.0, 0.0], 5);
    const texts = results.map((r) => r.chunk.chunk_text);
    expect(texts).not.toContain('delete me');
  });

  test('leaves other chunks intact after delete', async () => {
    await store.delete('col-1', ['dh-1']);
    const results = await store.query('col-1', [0.0, 1.0, 0.0], 5);
    expect(results.some((r) => r.chunk.chunk_text === 'keep me')).toBe(true);
  });

  test('handles empty hash list without error', async () => {
    await expect(store.delete('col-1', [])).resolves.toBeUndefined();
  });

  test('handles delete on non-existent collection without error', async () => {
    await expect(store.delete('no-such-col', ['dh-1'])).resolves.toBeUndefined();
  });
});

describe('RagStore writer-sharded strategy', () => {
  let dirs;
  let dbPath;
  let storeA;
  let storeB;
  let reader;

  beforeEach(() => {
    dirs = tmpDirs();
    dbPath = makeDbPath(dirs.base);
    storeA = new RagStore(dbPath, dirs.lanceDir, {
      vectorStrategy: 'writer-sharded',
      writerId: 'node-a',
    });
    storeB = new RagStore(dbPath, dirs.lanceDir, {
      vectorStrategy: 'writer-sharded',
      writerId: 'node-b',
    });
    reader = new RagStore(dbPath, dirs.lanceDir, {
      vectorStrategy: 'writer-sharded',
      writerId: 'reader',
    });
    storeA.ensureCollection(COLLECTION);
  });

  afterEach(() => {
    storeA.close();
    storeB.close();
    reader.close();
    cleanup(dirs.base);
  });

  test('queries merge results across writer shards', async () => {
    await storeA.upsert('col-1', [makeChunk('a1', 'shared-a', 'alpha shard', [1.0, 0.0, 0.0])]);
    await storeB.upsert('col-1', [makeChunk('b1', 'shared-b', 'beta shard', [0.0, 1.0, 0.0])]);

    const alpha = await reader.query('col-1', [1.0, 0.0, 0.0], 5);
    const beta = await reader.query('col-1', [0.0, 1.0, 0.0], 5);

    expect(alpha.some((result) => result.chunk.chunk_text === 'alpha shard')).toBe(true);
    expect(beta.some((result) => result.chunk.chunk_text === 'beta shard')).toBe(true);
  });

  test('re-upsert removes stale copies from other writer shards', async () => {
    await storeA.upsert('col-1', [makeChunk('a1', 'shared-hash', 'first owner', [1.0, 0.0, 0.0])]);
    await storeB.upsert('col-1', [makeChunk('b1', 'shared-hash', 'second owner', [1.0, 0.0, 0.0])]);

    const results = await reader.query('col-1', [1.0, 0.0, 0.0], 10);
    const matching = results.filter((result) => result.chunk.chunk_hash === 'shared-hash');

    expect(matching).toHaveLength(1);
    expect(matching[0].chunk.chunk_text).toBe('second owner');
  });

  test('delete removes vectors from every writer shard', async () => {
    await storeA.upsert('col-1', [makeChunk('a1', 'hash-a', 'alpha shard', [1.0, 0.0, 0.0])]);
    await storeB.upsert('col-1', [makeChunk('b1', 'hash-b', 'beta shard', [0.0, 1.0, 0.0])]);

    await reader.delete('col-1', ['hash-a', 'hash-b']);

    await expect(reader.query('col-1', [1.0, 0.0, 0.0], 5)).resolves.toEqual([]);
    await expect(reader.query('col-1', [0.0, 1.0, 0.0], 5)).resolves.toEqual([]);
  });
});
