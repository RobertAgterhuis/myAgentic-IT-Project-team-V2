import { scoreBlock, tokenise } from './retrieval-api';
import type { MemoryEntry, MemoryTier } from './semantic-memory';

export interface SemanticMemoryQuerySource {
  list(tier: MemoryTier, now?: number): Promise<MemoryEntry[]>;
}

export interface RagQuerySource {
  query(
    collectionId: string,
    queryVector: number[],
    topK: number,
    threshold?: number
  ): Promise<
    Array<{
      chunk: {
        source_path: string;
        chunk_text: string;
        start_line: number | null;
      };
      score: number;
    }>
  >;
}

export interface EmbeddingQuerySource {
  embedText(text: string): Promise<number[]>;
}

export interface KnowledgeMatch {
  source: 'semantic-memory' | 'rag';
  collection: string;
  text: string;
  source_path: string;
  start_line: number | null;
  score: number;
  metadata?: {
    tier?: MemoryTier;
    key?: string;
    topic?: string;
  };
}

export interface KnowledgeQueryOptions {
  query: string;
  memory?: {
    tiers?: MemoryTier[];
    topK?: number;
    minScore?: number;
  };
  rag?: {
    collections: Array<{ id: string; label: string }>;
    topKPerCollection?: number;
    threshold?: number;
  };
  maxResults?: number;
}

export interface KnowledgeProviderOptions {
  semanticMemory?: SemanticMemoryQuerySource;
  ragStore?: RagQuerySource;
  embeddingProvider?: EmbeddingQuerySource;
}

const DEFAULT_MEMORY_TIERS: MemoryTier[] = ['run', 'project', 'org'];

function toMemorySourcePath(tier: MemoryTier, key: string): string {
  return `semantic-memory/${tier}/${key}`;
}

function dedupeMatches(matches: KnowledgeMatch[]): KnowledgeMatch[] {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const key = [
      match.source,
      match.collection,
      match.source_path,
      match.start_line ?? '',
      match.metadata?.key ?? '',
      match.text,
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class KnowledgeProvider {
  private readonly _semanticMemory?: SemanticMemoryQuerySource;
  private readonly _ragStore?: RagQuerySource;
  private readonly _embeddingProvider?: EmbeddingQuerySource;

  constructor(options: KnowledgeProviderOptions) {
    this._semanticMemory = options.semanticMemory;
    this._ragStore = options.ragStore;
    this._embeddingProvider = options.embeddingProvider;
  }

  hasSemanticMemory(): boolean {
    return Boolean(this._semanticMemory);
  }

  hasRag(): boolean {
    return Boolean(this._ragStore && this._embeddingProvider);
  }

  async query(options: KnowledgeQueryOptions): Promise<KnowledgeMatch[]> {
    const normalizedQuery = options.query.trim();
    if (!normalizedQuery) return [];

    const tasks: Array<Promise<KnowledgeMatch[]>> = [];
    if (options.memory && this._semanticMemory) {
      tasks.push(this.querySemanticMemory(normalizedQuery, options.memory));
    }
    if (
      options.rag &&
      options.rag.collections.length > 0 &&
      this._ragStore &&
      this._embeddingProvider
    ) {
      tasks.push(this.queryRag(normalizedQuery, options.rag));
    }

    if (tasks.length === 0) return [];

    const results = dedupeMatches((await Promise.all(tasks)).flat()).sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.source_path.localeCompare(right.source_path);
    });

    return typeof options.maxResults === 'number' && options.maxResults > 0
      ? results.slice(0, options.maxResults)
      : results;
  }

  async querySemanticMemory(
    query: string,
    options: KnowledgeQueryOptions['memory'] = {}
  ): Promise<KnowledgeMatch[]> {
    if (!this._semanticMemory) return [];

    const terms = tokenise(query);
    if (terms.length === 0) return [];

    const tiers = options.tiers && options.tiers.length > 0 ? options.tiers : DEFAULT_MEMORY_TIERS;
    const minScore = options.minScore ?? 0;
    const topK = options.topK ?? 5;
    const results: KnowledgeMatch[] = [];

    for (const tier of tiers) {
      const entries = await this._semanticMemory.list(tier);
      for (const entry of entries) {
        const searchableText = [entry.topic || '', entry.key, entry.content]
          .filter(Boolean)
          .join('\n');
        const score = scoreBlock(searchableText, terms);
        if (score < minScore) continue;
        results.push({
          source: 'semantic-memory',
          collection: 'semantic-memory',
          text: entry.content,
          source_path: toMemorySourcePath(tier, entry.key),
          start_line: null,
          score,
          metadata: {
            tier,
            key: entry.key,
            ...(entry.topic ? { topic: entry.topic } : {}),
          },
        });
      }
    }

    return results
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return left.source_path.localeCompare(right.source_path);
      })
      .slice(0, topK);
  }

  async queryRag(
    query: string,
    options: NonNullable<KnowledgeQueryOptions['rag']>
  ): Promise<KnowledgeMatch[]> {
    if (!this._ragStore || !this._embeddingProvider) return [];

    const ragStore = this._ragStore;
    const queryVector = await this._embeddingProvider.embedText(query);
    const topKPerCollection = options.topKPerCollection ?? 5;
    const threshold = options.threshold ?? 0;

    const batches = await Promise.all(
      options.collections.map(async (collection) => {
        const rows = await ragStore.query(collection.id, queryVector, topKPerCollection, threshold);
        return rows.map((row) => ({
          source: 'rag' as const,
          collection: collection.label,
          text: row.chunk.chunk_text,
          source_path: row.chunk.source_path,
          start_line: Number.isFinite(row.chunk.start_line) ? row.chunk.start_line : null,
          score: row.score,
        }));
      })
    );

    return batches.flat();
  }
}
