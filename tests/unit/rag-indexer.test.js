import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

/**
 * RagIndexer unit tests (RAG-1.2.1).
 * Uses in-memory SQLite, a temp LanceDB dir, a MockEmbeddingProvider,
 * and the MarkdownChunker to verify the full index → query pipeline.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

let RagStore, RagIndexer, MarkdownChunker, AdaptiveChunker;

beforeAll(async () => {
  [{ RagStore }, { RagIndexer }, { MarkdownChunker, AdaptiveChunker }] = await Promise.all([
    import('../../src/webapp/services/rag/rag-store.ts'),
    import('../../src/webapp/services/rag/rag-indexer.ts'),
    import('../../src/webapp/services/rag/text-chunker.ts'),
  ]);
});

/* ── Mock EmbeddingProvider ─────────────────────────────────── */
class MockEmbeddingProvider {
  async embedText(text) {
    // Deterministic 4-dim vector based on text hash
    const hash = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return [
      ((hash * 1) % 100) / 100,
      ((hash * 2) % 100) / 100,
      ((hash * 3) % 100) / 100,
      ((hash * 4) % 100) / 100,
    ];
  }
}

/* ── Test helpers ───────────────────────────────────────────── */
function tmpDirs() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'rag-indexer-test-'));
  const lanceDir = path.join(base, 'lance');
  const docsDir = path.join(base, 'docs');
  fs.mkdirSync(lanceDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });
  return { base, lanceDir, docsDir };
}

function cleanup(base) {
  try {
    fs.rmSync(base, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

const COLLECTION = {
  id: 'idx-col',
  name: 'index-test',
  description: 'Indexer test collection',
  created_at: new Date().toISOString(),
};

/* ── Tests ──────────────────────────────────────────────────── */

describe('RagIndexer.indexFile', () => {
  let store, indexer, dirs;

  beforeEach(() => {
    dirs = tmpDirs();
    store = new RagStore(':memory:', dirs.lanceDir);
    store.ensureCollection(COLLECTION);
    indexer = new RagIndexer(store, new MockEmbeddingProvider(), new MarkdownChunker());
  });

  afterEach(() => {
    store.close();
    cleanup(dirs.base);
  });

  test('indexes a markdown file and returns stats', async () => {
    const filePath = path.join(dirs.docsDir, 'readme.md');
    fs.writeFileSync(filePath, '# Hello\n\nThis is a test document.');

    const stats = await indexer.indexFile('idx-col', filePath);
    expect(stats.filesProcessed).toBe(1);
    expect(stats.chunksInserted).toBeGreaterThanOrEqual(1);
    expect(stats.filesSkipped).toBe(0);
  });

  test('non-matching file extension is skipped by default filter', async () => {
    const filePath = path.join(dirs.docsDir, 'image.png');
    fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG header

    const stats = await indexer.indexFile('idx-col', filePath);
    expect(stats.filesSkipped).toBe(1);
    expect(stats.filesProcessed).toBe(0);
  });

  test('can be queried after indexing', async () => {
    const filePath = path.join(dirs.docsDir, 'contract.md');
    fs.writeFileSync(
      filePath,
      '# Contracts\n\nAcceptance criteria for RAG pipeline.\n\nVector embeddings enable semantic retrieval.'
    );

    await indexer.indexFile('idx-col', filePath);

    // Build a query vector using the mock embedder
    const embed = new MockEmbeddingProvider();
    const queryVec = await embed.embedText('Acceptance criteria for RAG pipeline.');
    const results = await store.query('idx-col', queryVec, 5);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].chunk.source_path).toBe(filePath);
  });
});

describe('RagIndexer.indexDirectory', () => {
  let store, indexer, dirs;

  beforeEach(() => {
    dirs = tmpDirs();
    store = new RagStore(':memory:', dirs.lanceDir);
    store.ensureCollection(COLLECTION);
    indexer = new RagIndexer(store, new MockEmbeddingProvider(), new MarkdownChunker());
  });

  afterEach(() => {
    store.close();
    cleanup(dirs.base);
  });

  test('indexes all matching files under a directory', async () => {
    fs.writeFileSync(path.join(dirs.docsDir, 'a.md'), '# Alpha\n\nFirst doc content.');
    fs.writeFileSync(path.join(dirs.docsDir, 'b.md'), '# Beta\n\nSecond doc content.');
    fs.writeFileSync(path.join(dirs.docsDir, 'c.png'), 'not indexed');

    const stats = await indexer.indexDirectory('idx-col', dirs.docsDir);
    expect(stats.filesProcessed).toBe(2);
    expect(stats.filesSkipped).toBe(1);
    expect(stats.chunksInserted).toBeGreaterThanOrEqual(2);
  });

  test('custom fileFilter is respected', async () => {
    fs.writeFileSync(path.join(dirs.docsDir, 'include.md'), '# Include\n\nContent.');
    fs.writeFileSync(path.join(dirs.docsDir, 'exclude.md'), '# Exclude\n\nContent.');

    const stats = await indexer.indexDirectory('idx-col', dirs.docsDir, {
      fileFilter: (p) => path.basename(p) === 'include.md',
    });
    expect(stats.filesProcessed).toBe(1);
    expect(stats.filesSkipped).toBe(1);
  });

  test('indexes files in subdirectories', async () => {
    const subDir = path.join(dirs.docsDir, 'sub');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, 'deep.md'), '# Deep\n\nNested content.');

    const stats = await indexer.indexDirectory('idx-col', dirs.docsDir);
    expect(stats.filesProcessed).toBeGreaterThanOrEqual(1);
  });

  test('querying auth provider terms can retrieve auth.ts chunks', async () => {
    indexer = new RagIndexer(store, new MockEmbeddingProvider(), new AdaptiveChunker());
    const authFile = path.join(dirs.docsDir, 'auth.ts');
    fs.writeFileSync(
      authFile,
      [
        'export class AuthProvider {',
        '  constructor(config) {',
        '    this.config = config;',
        '  }',
        '}',
        '',
        'export function createAuthProvider(config) {',
        '  return new AuthProvider(config);',
        '}',
      ].join('\n')
    );

    await indexer.indexDirectory('idx-col', dirs.docsDir);

    const embed = new MockEmbeddingProvider();
    const queryVec = await embed.embedText('auth provider setup');
    const results = await store.query('idx-col', queryVec, 5);

    expect(results.some((result) => result.chunk.source_path === authFile)).toBe(true);
  });
});

describe('RagIndexer.indexFiles', () => {
  let store, indexer, dirs;

  beforeEach(() => {
    dirs = tmpDirs();
    store = new RagStore(':memory:', dirs.lanceDir);
    store.ensureCollection(COLLECTION);
    indexer = new RagIndexer(store, new MockEmbeddingProvider(), new MarkdownChunker());
  });

  afterEach(() => {
    store.close();
    cleanup(dirs.base);
  });

  test('handles empty file list without error', async () => {
    const stats = await indexer.indexFiles('idx-col', []);
    expect(stats.filesProcessed).toBe(0);
    expect(stats.chunksInserted).toBe(0);
  });

  test('re-indexing the same file is idempotent – no duplicate chunks', async () => {
    const filePath = path.join(dirs.docsDir, 'idempotent.md');
    fs.writeFileSync(filePath, '# Idempotent\n\nSame content both times.');

    await indexer.indexFile('idx-col', filePath);
    await indexer.indexFile('idx-col', filePath);

    const embed = new MockEmbeddingProvider();
    const queryVec = await embed.embedText('Idempotent');
    const results = await store.query('idx-col', queryVec, 10);
    // Should not duplicate chunks
    const hashes = results.map((r) => r.chunk.chunk_hash);
    const unique = new Set(hashes);
    expect(unique.size).toBe(hashes.length);
  });
});
