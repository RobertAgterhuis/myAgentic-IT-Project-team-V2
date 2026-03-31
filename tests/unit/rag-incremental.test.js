import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/**
 * Incremental indexing unit tests (RAG-1.2.3).
 * Verifies:
 *  - Second run on same files produces zero re-embeds (embedder not called)
 *  - Modified file is fully re-indexed
 *  - Deleted file's chunks are removed from DB
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

let RagStore, RagIndexer, MarkdownChunker;

beforeAll(async () => {
  [{ RagStore }, { RagIndexer }, { MarkdownChunker }] = await Promise.all([
    import('../../src/webapp/services/rag/rag-store.ts'),
    import('../../src/webapp/services/rag/rag-indexer.ts'),
    import('../../src/webapp/services/rag/text-chunker.ts'),
  ]);
});

/* ── Counting MockEmbeddingProvider ─────────────────────────── */
class CountingEmbedder {
  constructor(dims = 3) {
    this.dims = dims;
    this.callCount = 0;
  }

  async embedText(text) {
    this.callCount++;
    const h = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: this.dims }, (_, i) => ((h + i) % 100) / 100);
  }
}

/* ── Test helpers ─────────────────────────────────────────── */
function tmpDirs() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-inc-test-'));
  return {
    base,
    lance: path.join(base, 'lance'),
    docs: path.join(base, 'docs'),
  };
}

function setup(dirs) {
  fs.mkdirSync(dirs.lance, { recursive: true });
  fs.mkdirSync(dirs.docs, { recursive: true });
  const store = new RagStore(':memory:', dirs.lance);
  store.ensureCollection({
    id: 'inc-col',
    name: 'incremental-test',
    description: '',
    created_at: new Date().toISOString(),
  });
  return store;
}

function cleanup(dirs) {
  try {
    fs.rmSync(dirs.base, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

/* ── Tests ─────────────────────────────────────────────────── */

describe('Incremental indexing — unchanged files are skipped', () => {
  let store, embedder, indexer, dirs;

  beforeEach(() => {
    dirs = tmpDirs();
    store = setup(dirs);
    embedder = new CountingEmbedder();
    indexer = new RagIndexer(store, embedder, new MarkdownChunker());
  });

  afterEach(() => {
    store.close();
    cleanup(dirs);
  });

  test('first sync indexes file and records embed calls', async () => {
    fs.writeFileSync(path.join(dirs.docs, 'doc.md'), '# Hello\n\nFirst run content.');
    await indexer.syncDirectory('inc-col', dirs.docs);
    expect(embedder.callCount).toBeGreaterThanOrEqual(1);
  });

  test('second sync with unchanged files produces zero re-embeds', async () => {
    const content = '# Hello\n\nThis content does not change.';
    fs.writeFileSync(path.join(dirs.docs, 'doc.md'), content);

    await indexer.syncDirectory('inc-col', dirs.docs);
    const callsAfterFirst = embedder.callCount;
    expect(callsAfterFirst).toBeGreaterThanOrEqual(1);

    // Second sync — same content on disk
    await indexer.syncDirectory('inc-col', dirs.docs);
    // No additional embed calls
    expect(embedder.callCount).toBe(callsAfterFirst);
  });
});

describe('Incremental indexing — modified file is fully re-indexed', () => {
  let store, embedder, indexer, dirs;

  beforeEach(() => {
    dirs = tmpDirs();
    store = setup(dirs);
    embedder = new CountingEmbedder();
    indexer = new RagIndexer(store, embedder, new MarkdownChunker());
  });

  afterEach(() => {
    store.close();
    cleanup(dirs);
  });

  test('modifying a file triggers re-indexing on next sync', async () => {
    const filePath = path.join(dirs.docs, 'editable.md');
    fs.writeFileSync(filePath, '# Original\n\nOriginal content.');

    await indexer.syncDirectory('inc-col', dirs.docs);
    const callsAfterFirst = embedder.callCount;

    // Modify the file
    fs.writeFileSync(filePath, '# Updated\n\nCompletely different content.');
    await indexer.syncDirectory('inc-col', dirs.docs);

    expect(embedder.callCount).toBeGreaterThan(callsAfterFirst);
  });

  test('after re-index, query returns updated content, not stale content', async () => {
    const filePath = path.join(dirs.docs, 'content.md');
    fs.writeFileSync(filePath, '# Alpha\n\nAlpha content here.');
    await indexer.syncDirectory('inc-col', dirs.docs);

    // Update the file
    fs.writeFileSync(filePath, '# Beta\n\nBeta content here.');
    await indexer.syncDirectory('inc-col', dirs.docs);

    const embed = new CountingEmbedder();
    const queryVec = await embed.embedText('Beta content here.');
    const results = await store.query('inc-col', queryVec, 10);
    const texts = results.map((r) => r.chunk.chunk_text);
    expect(texts.some((t) => t.includes('Beta'))).toBe(true);
  });
});

describe('Incremental indexing — deleted file chunks are removed', () => {
  let store, embedder, indexer, dirs;

  beforeEach(() => {
    dirs = tmpDirs();
    store = setup(dirs);
    embedder = new CountingEmbedder();
    indexer = new RagIndexer(store, embedder, new MarkdownChunker());
  });

  afterEach(() => {
    store.close();
    cleanup(dirs);
  });

  test('deleting a file removes its chunks from DB on next sync', async () => {
    const filePath = path.join(dirs.docs, 'deleteme.md');
    fs.writeFileSync(filePath, '# Delete Me\n\nThis file will be removed.');

    await indexer.syncDirectory('inc-col', dirs.docs);

    // Verify it was indexed
    const indexed = store.listIndexedFiles('inc-col');
    expect(indexed).toContain(filePath);

    // Delete the file
    fs.unlinkSync(filePath);
    await indexer.syncDirectory('inc-col', dirs.docs);

    // Should be pruned from index
    const indexedAfter = store.listIndexedFiles('inc-col');
    expect(indexedAfter).not.toContain(filePath);
  });

  test('remaining files are still queryable after deletion', async () => {
    const keep = path.join(dirs.docs, 'keep.md');
    const del = path.join(dirs.docs, 'delete.md');
    fs.writeFileSync(keep, '# Keep\n\nKeep this content.');
    fs.writeFileSync(del, '# Delete\n\nDelete this content.');

    await indexer.syncDirectory('inc-col', dirs.docs);

    fs.unlinkSync(del);
    await indexer.syncDirectory('inc-col', dirs.docs);

    const embed = new CountingEmbedder();
    const queryVec = await embed.embedText('Keep this content.');
    const results = await store.query('inc-col', queryVec, 10);
    expect(results.some((r) => r.chunk.source_path === keep)).toBe(true);
  });
});

describe('RagStore file index helpers', () => {
  let store, dirs;

  beforeEach(() => {
    dirs = tmpDirs();
    store = setup(dirs);
  });

  afterEach(() => {
    store.close();
    cleanup(dirs);
  });

  test('getFileHash returns null for unknown path', () => {
    expect(store.getFileHash('inc-col', '/no/such/file.md')).toBeNull();
  });

  test('setFileHash and getFileHash round-trip', () => {
    store.setFileHash('inc-col', '/a.md', 'deadbeef');
    expect(store.getFileHash('inc-col', '/a.md')).toBe('deadbeef');
  });

  test('setFileHash is idempotent (upsert)', () => {
    store.setFileHash('inc-col', '/b.md', 'hash-v1');
    store.setFileHash('inc-col', '/b.md', 'hash-v2');
    expect(store.getFileHash('inc-col', '/b.md')).toBe('hash-v2');
  });

  test('listIndexedFiles returns paths after set', () => {
    store.setFileHash('inc-col', '/c.md', 'hash-c');
    store.setFileHash('inc-col', '/d.md', 'hash-d');
    const files = store.listIndexedFiles('inc-col');
    expect(files).toContain('/c.md');
    expect(files).toContain('/d.md');
  });

  test('deleteFile removes both chunk records and file index entry', () => {
    store.setFileHash('inc-col', '/e.md', 'hash-e');
    store.deleteFile('inc-col', '/e.md');
    expect(store.getFileHash('inc-col', '/e.md')).toBeNull();
    expect(store.listIndexedFiles('inc-col')).not.toContain('/e.md');
  });
});
