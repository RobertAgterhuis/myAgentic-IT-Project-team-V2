// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * LLM Provider Contract
 *
 * Formal interface for LLM operations: text completion, embeddings,
 * streaming, and tool-use protocol.
 *
 * @module sdlc/adapters/contracts/llm-provider
 */

// ─── Capability Flags ────────────────────────────────────────

export interface LLMCapabilities {
  supportsStreaming: boolean;
  supportsToolUse: boolean;
  supportsEmbeddings: boolean;
  supportsVision: boolean;
}

// ─── Input / Output Types ────────────────────────────────────

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionInput {
  messages: LLMMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
  signal?: AbortSignal;
}

export interface CompletionResult {
  content: string;
  model: string;
  usage: TokenUsage;
  finishReason: string;
  toolCalls?: ToolCall[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface EmbeddingInput {
  text: string;
  model?: string;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: { totalTokens: number };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// ─── Error Classification ────────────────────────────────────

export type LLMErrorKind =
  | 'RATE_LIMITED'
  | 'TOKEN_LIMIT_EXCEEDED'
  | 'INVALID_MODEL'
  | 'AUTH_FAILURE'
  | 'TRANSIENT'
  | 'UNKNOWN';

export interface LLMError {
  kind: LLMErrorKind;
  message: string;
  detail?: string;
}

// ─── Provider Interface ──────────────────────────────────────

export interface LLMProvider {
  readonly providerName: string;
  readonly capabilities: LLMCapabilities;

  complete(input: CompletionInput): Promise<CompletionResult>;
  embed(input: EmbeddingInput): Promise<EmbeddingResult>;
  stream(input: CompletionInput, onChunk: (chunk: string) => void): Promise<CompletionResult>;
  listModels(): Promise<string[]>;
}
