'use strict';
/**
 * EmbeddingProvider unit tests (RAG-1.1.3).
 *
 * The LocalEmbeddingProvider downloads a transformer model at runtime which
 * is unsuitable for fast unit tests. A MockEmbeddingProvider satisfies the
 * EmbeddingProvider interface contract and lets us test every code path that
 * depends on the interface without network I/O.
 */

let LocalEmbeddingProvider, createEmbeddingProvider;

beforeAll(async () => {
  const mod = await import('../../src/webapp/services/rag/embedding-provider.ts');
  LocalEmbeddingProvider = mod.LocalEmbeddingProvider;
  createEmbeddingProvider = mod.createEmbeddingProvider;
});

/* ── Mock provider (implements EmbeddingProvider interface) ─── */

class MockEmbeddingProvider {
  constructor(dims = 3) {
    this.dims = dims;
    this.calls = [];
  }

  async embedText(text) {
    this.calls.push(text);
    // Return a deterministic float vector seeded by the string length
    return Array.from({ length: this.dims }, (_, i) => (text.length + i) / 100);
  }
}

describe('MockEmbeddingProvider (interface compliance)', () => {
  test('embedText returns a number array', async () => {
    const provider = new MockEmbeddingProvider(4);
    const embedding = await provider.embedText('hello world');
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding).toHaveLength(4);
    embedding.forEach((v) => expect(typeof v).toBe('number'));
  });

  test('embedText is async (returns a Promise)', () => {
    const provider = new MockEmbeddingProvider(2);
    const result = provider.embedText('test');
    expect(result).toBeInstanceOf(Promise);
  });

  test('returns different vectors for different inputs (deterministic mock)', async () => {
    const provider = new MockEmbeddingProvider(3);
    const a = await provider.embedText('short');
    const b = await provider.embedText('a longer string here');
    expect(a).not.toEqual(b);
  });
});

describe('LocalEmbeddingProvider (unit — no model download)', () => {
  test('can be instantiated with default options', () => {
    const provider = new LocalEmbeddingProvider();
    expect(provider).toBeDefined();
  });

  test('can be instantiated with custom modelId', () => {
    const provider = new LocalEmbeddingProvider({ modelId: 'Xenova/all-MiniLM-L6-v2' });
    expect(provider).toBeDefined();
  });

  test('embedText method exists on the prototype', () => {
    const provider = new LocalEmbeddingProvider();
    expect(typeof provider.embedText).toBe('function');
  });
});

describe('createEmbeddingProvider factory', () => {
  test('returns a LocalEmbeddingProvider when EMBEDDING_PROVIDER=local', () => {
    const provider = createEmbeddingProvider({ EMBEDDING_PROVIDER: 'local' });
    expect(provider).toBeInstanceOf(LocalEmbeddingProvider);
  });

  test('defaults to local when EMBEDDING_PROVIDER is not set', () => {
    const provider = createEmbeddingProvider({});
    expect(provider).toBeInstanceOf(LocalEmbeddingProvider);
  });

  test('throws for EMBEDDING_PROVIDER=openai (not yet implemented)', () => {
    expect(() => createEmbeddingProvider({ EMBEDDING_PROVIDER: 'openai' })).toThrow(
      /not yet implemented/i
    );
  });

  test('throws for unknown EMBEDDING_PROVIDER value', () => {
    expect(() => createEmbeddingProvider({ EMBEDDING_PROVIDER: 'azure' })).toThrow(
      /Unknown EMBEDDING_PROVIDER/i
    );
  });

  test('returned provider has embedText method', () => {
    const provider = createEmbeddingProvider({ EMBEDDING_PROVIDER: 'local' });
    expect(typeof provider.embedText).toBe('function');
  });
});
