// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Local LLM Provider
 *
 * Synthetic last-resort fallback provider that operates without any
 * external API key or network call. Returns stub completions marked
 * with [LOCAL_MODE] so callers can detect and handle accordingly.
 *
 * Use-case: SRE failover — when all credentialed providers are
 * unavailable (missing key, rate limit, network incident), the engine
 * continues execution rather than hard-stopping.
 *
 * @module sdlc/adapters/providers/local-llm
 */

import type {
  LLMProvider,
  LLMCapabilities,
  CompletionInput,
  CompletionResult,
  EmbeddingInput,
  EmbeddingResult,
} from '../contracts/llm-provider.js';

// ─── Local Provider ──────────────────────────────────────────

export interface LocalLLMConfig {
  /**
   * Optional label appended to the synthetic response.
   * Defaults to 'local'.
   */
  label?: string;
}

export class LocalLLMProvider implements LLMProvider {
  readonly providerName = 'local';
  readonly capabilities: LLMCapabilities = {
    supportsStreaming: true,
    supportsToolUse: false,
    supportsEmbeddings: false,
    supportsVision: false,
  };

  private readonly _label: string;

  constructor(config: LocalLLMConfig = {}) {
    this._label = config.label || 'local';
  }

  /**
   * Always returns true — local provider never requires credentials.
   * Used by probeProviderHealth() to fast-path availability checks.
   */
  isAvailable(): boolean {
    return true;
  }

  async complete(input: CompletionInput): Promise<CompletionResult> {
    const lastUser = [...input.messages].reverse().find((m) => m.role === 'user');
    const echo = lastUser?.content?.slice(0, 120) ?? '';
    const content = [
      `[LOCAL_MODE:${this._label}] No external LLM provider is available.`,
      `This is a synthetic fallback response. Original prompt snippet: "${echo}"`,
      '',
      '## HANDOFF CHECKLIST',
      '- [x] Running in local fallback mode — verify provider credentials and retry.',
    ].join('\n');

    return {
      content,
      model: this._label,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      finishReason: 'local_fallback',
    };
  }

  async embed(_input: EmbeddingInput): Promise<EmbeddingResult> {
    throw new Error('LocalLLMProvider does not support embeddings');
  }

  async stream(
    input: CompletionInput,
    onChunk: (chunk: string) => void
  ): Promise<CompletionResult> {
    const result = await this.complete(input);
    onChunk(result.content);
    return result;
  }

  async listModels(): Promise<string[]> {
    return [this._label];
  }
}
