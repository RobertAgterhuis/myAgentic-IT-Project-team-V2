'use strict';
/**
 * RAG types and schema migration tests (RAG-1.1.1).
 * Verifies that:
 *  - TypeScript types are exported from src/webapp/services/rag/types.ts
 *  - RAG_MIGRATIONS SQL creates rag_collections and rag_chunks tables in SQLite
 */

const Database = require('better-sqlite3');

let RAG_MIGRATIONS;

beforeAll(async () => {
  const mod = await import('../../src/webapp/services/rag/types.ts');
  RAG_MIGRATIONS = mod.RAG_MIGRATIONS;
});

describe('RAG_MIGRATIONS', () => {
  test('exports createCollections and createChunks SQL strings', () => {
    expect(typeof RAG_MIGRATIONS.createCollections).toBe('string');
    expect(typeof RAG_MIGRATIONS.createChunks).toBe('string');
  });

  test('createCollections creates rag_collections table with correct columns', () => {
    const db = new Database(':memory:');
    db.exec(RAG_MIGRATIONS.createCollections);

    const cols = db.pragma('table_info(rag_collections)').map((c) => c.name);
    expect(cols).toContain('id');
    expect(cols).toContain('name');
    expect(cols).toContain('description');
    expect(cols).toContain('created_at');
    db.close();
  });

  test('createChunks creates rag_chunks table with correct columns', () => {
    const db = new Database(':memory:');
    db.exec(RAG_MIGRATIONS.createCollections);
    db.exec(RAG_MIGRATIONS.createChunks);

    const cols = db.pragma('table_info(rag_chunks)').map((c) => c.name);
    expect(cols).toContain('id');
    expect(cols).toContain('collection_id');
    expect(cols).toContain('source_path');
    expect(cols).toContain('chunk_text');
    expect(cols).toContain('start_line');
    expect(cols).toContain('chunk_hash');
    db.close();
  });

  test('migrations are idempotent (re-running does not throw)', () => {
    const db = new Database(':memory:');
    db.exec(RAG_MIGRATIONS.createCollections);
    db.exec(RAG_MIGRATIONS.createCollections);
    db.exec(RAG_MIGRATIONS.createChunks);
    db.exec(RAG_MIGRATIONS.createChunks);
    db.close();
  });

  test('rag_chunks enforces unique (collection_id, chunk_hash)', () => {
    const db = new Database(':memory:');
    db.exec(RAG_MIGRATIONS.createCollections);
    db.exec(RAG_MIGRATIONS.createChunks);

    db.prepare(
      'INSERT INTO rag_collections (id, name, description, created_at) VALUES (?, ?, ?, ?)'
    ).run('col-1', 'test', '', new Date().toISOString());

    db.prepare(
      'INSERT INTO rag_chunks (id, collection_id, source_path, chunk_text, chunk_hash) VALUES (?, ?, ?, ?, ?)'
    ).run('chunk-1', 'col-1', '/a.md', 'hello', 'sha256-abc');

    expect(() => {
      db.prepare(
        'INSERT INTO rag_chunks (id, collection_id, source_path, chunk_text, chunk_hash) VALUES (?, ?, ?, ?, ?)'
      ).run('chunk-2', 'col-1', '/a.md', 'hello', 'sha256-abc');
    }).toThrow();

    db.close();
  });

  test('rag_chunks ON DELETE CASCADE removes chunks when collection is deleted', () => {
    const db = new Database(':memory:');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec(RAG_MIGRATIONS.createCollections);
    db.exec(RAG_MIGRATIONS.createChunks);

    db.prepare(
      'INSERT INTO rag_collections (id, name, description, created_at) VALUES (?, ?, ?, ?)'
    ).run('col-2', 'cascade-test', '', new Date().toISOString());

    db.prepare(
      'INSERT INTO rag_chunks (id, collection_id, source_path, chunk_text, chunk_hash) VALUES (?, ?, ?, ?, ?)'
    ).run('chunk-3', 'col-2', '/b.md', 'world', 'sha256-xyz');

    db.prepare('DELETE FROM rag_collections WHERE id = ?').run('col-2');

    const remaining = db
      .prepare('SELECT COUNT(*) as cnt FROM rag_chunks WHERE collection_id = ?')
      .get('col-2');
    expect(remaining.cnt).toBe(0);
    db.close();
  });
});

describe('TypeScript type exports', () => {
  test('types module exports expected symbols', async () => {
    const mod = await import('../../src/webapp/services/rag/types.ts');
    // RAG_MIGRATIONS is a const object
    expect(mod.RAG_MIGRATIONS).toBeDefined();
    // Verify it has the two migration keys
    expect(Object.keys(mod.RAG_MIGRATIONS)).toEqual(
      expect.arrayContaining(['createCollections', 'createChunks'])
    );
  });
});
