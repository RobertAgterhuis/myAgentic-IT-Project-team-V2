'use strict';

const { KnowledgeProvider } = require('../../platform/engine/knowledge-provider');

describe('KnowledgeProvider', () => {
  test('queries semantic memory and rag through one normalized surface', async () => {
    const provider = new KnowledgeProvider({
      semanticMemory: {
        list: vi.fn(async (tier) => {
          if (tier === 'project') {
            return [
              {
                key: 'launch-voice',
                content: 'Use confident plain language for launch updates.',
                writtenAt: Date.now(),
                topic: 'brand',
              },
            ];
          }
          return [];
        }),
      },
      ragStore: {
        query: vi.fn(async () => [
          {
            chunk: {
              source_path: '/repo/docs/launch.md',
              chunk_text: 'Launch notes use confident messaging and rollout guidance.',
              start_line: 14,
            },
            score: 0.91,
          },
        ]),
      },
      embeddingProvider: {
        embedText: vi.fn(async () => [0.2, 0.4, 0.6]),
      },
    });

    const results = await provider.query({
      query: 'confident launch messaging',
      memory: { tiers: ['project'], topK: 3, minScore: 0.1 },
      rag: {
        collections: [{ id: 'decisions', label: 'decisions' }],
        topKPerCollection: 2,
        threshold: 0.1,
      },
      maxResults: 10,
    });

    expect(results).toHaveLength(2);
    expect(results.some((result) => result.source === 'semantic-memory')).toBe(true);
    expect(results.some((result) => result.source === 'rag')).toBe(true);
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });

  test('returns only semantic memory results when rag dependencies are absent', async () => {
    const provider = new KnowledgeProvider({
      semanticMemory: {
        list: vi.fn(async () => [
          {
            key: 'k1',
            content: 'Document retention policy for project handoffs.',
            writtenAt: Date.now(),
          },
        ]),
      },
    });

    const results = await provider.query({
      query: 'retention policy',
      memory: { tiers: ['org'], topK: 2, minScore: 0.1 },
      rag: { collections: [{ id: 'decisions', label: 'decisions' }] },
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual(
      expect.objectContaining({
        source: 'semantic-memory',
        collection: 'semantic-memory',
        source_path: 'semantic-memory/org/k1',
      })
    );
  });

  test('returns empty results for blank queries and dedupes identical matches', async () => {
    const provider = new KnowledgeProvider({
      semanticMemory: {
        list: vi.fn(async () => [
          {
            key: 'k1',
            content: 'Delivery checklist for release readiness.',
            writtenAt: Date.now(),
          },
          {
            key: 'k1',
            content: 'Delivery checklist for release readiness.',
            writtenAt: Date.now(),
          },
        ]),
      },
    });

    await expect(provider.query({ query: '   ', memory: { tiers: ['project'] } })).resolves.toEqual(
      []
    );

    const deduped = await provider.query({
      query: 'delivery checklist',
      memory: { tiers: ['project'], topK: 5, minScore: 0.1 },
    });

    expect(deduped).toHaveLength(1);
  });
});
