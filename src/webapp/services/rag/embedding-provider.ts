// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * EmbeddingProvider abstraction — decouples the RAG pipeline from any
 * specific model backend.
 *
 * Current backends:
 *   - LocalEmbeddingProvider  — @xenova/transformers (runs in-process)
 *
 * Future backends (interface-compatible, not yet implemented):
 *   - OpenAIEmbeddingProvider — text-embedding-3-small via OpenAI API
 *
 * Selection is controlled by the environment variable:
 *   EMBEDDING_PROVIDER=local|openai   (default: local)
 *
 * @module services/rag/embedding-provider
 */

/* ── Interface ────────────────────────────────────────────────── */

export interface EmbeddingProvider {
  /** Returns a dense float vector for the given text. */
  embedText(text: string): Promise<number[]>;
}

/* ── LocalEmbeddingProvider ───────────────────────────────────── */

export type LocalEmbeddingProviderOptions = {
  /** HuggingFace model id. Defaults to the 384-dim MiniLM model. */
  modelId?: string;
  /**
   * Pooling strategy applied to the token embeddings.
   * 'mean' is standard for sentence embeddings.
   */
  pooling?: 'mean' | 'cls' | 'none';
  normalize?: boolean;
};

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';

/**
 * Runs sentence-transformers via @xenova/transformers entirely in-process.
 * The model is lazy-loaded on the first call to `embedText`.
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  private readonly modelId: string;
  private readonly pooling: string;
  private readonly normalize: boolean;
  private _pipeline: ((text: string, opts: object) => Promise<unknown>) | null = null;

  constructor(opts: LocalEmbeddingProviderOptions = {}) {
    this.modelId = opts.modelId ?? DEFAULT_MODEL;
    this.pooling = opts.pooling ?? 'mean';
    this.normalize = opts.normalize ?? true;
  }

  private async _load(): Promise<(text: string, opts: object) => Promise<unknown>> {
    if (!this._pipeline) {
      // Dynamic import avoids bundling the large transformers library unless needed.
      const { pipeline } = await import('@xenova/transformers');
      this._pipeline = (await pipeline('feature-extraction', this.modelId)) as (
        text: string,
        opts: object
      ) => Promise<unknown>;
    }
    return this._pipeline;
  }

  async embedText(text: string): Promise<number[]> {
    const pipe = await this._load();
    const output = (await pipe(text, {
      pooling: this.pooling,
      normalize: this.normalize,
    })) as { data: Float32Array | number[] };
    return Array.from(output.data);
  }
}

/* ── Factory ──────────────────────────────────────────────────── */

/**
 * Creates an EmbeddingProvider based on the `EMBEDDING_PROVIDER` env var.
 *
 * @param env  Defaults to `process.env`. Pass a mock map in unit tests.
 */
export function createEmbeddingProvider(
  env: Record<string, string | undefined> = process.env
): EmbeddingProvider {
  const backend = (env['EMBEDDING_PROVIDER'] ?? 'local').toLowerCase();

  switch (backend) {
    case 'local':
      return new LocalEmbeddingProvider();

    case 'openai':
      throw new Error(
        'OpenAIEmbeddingProvider is not yet implemented. ' +
          'Set EMBEDDING_PROVIDER=local or provide a custom provider.'
      );

    default:
      throw new Error(
        `Unknown EMBEDDING_PROVIDER value: "${backend}". ` + 'Valid values: local, openai.'
      );
  }
}
