// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Anthropic LLM Provider
 *
 * Concrete implementation of the LLMProvider contract for Anthropic/Claude API.
 * Uses curl via shell executor — no SDK dependency.
 *
 * API key sourced from ANTHROPIC_API_KEY environment variable only.
 *
 * @module sdlc/adapters/providers/anthropic-llm
 */

import { shellExec } from '../shell-executor.js';
import type {
  LLMProvider,
  LLMCapabilities,
  CompletionInput,
  CompletionResult,
  EmbeddingInput,
  EmbeddingResult,
} from '../contracts/llm-provider.js';

// ─── Configuration ───────────────────────────────────────────

export interface AnthropicConfig {
  model?: string;
  maxTokens?: number;
  timeout?: number;
}

// ─── Retry helper ────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── HTTP helper ─────────────────────────────────────────────

async function httpPost(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  timeout: number,
  exec: typeof shellExec
): Promise<{ status: number; body: unknown }> {
  const args = ['-s', '-w', '\n%{http_code}', '-X', 'POST'];
  for (const [k, v] of Object.entries(headers)) {
    args.push('-H', `${k}: ${v}`);
  }
  args.push('-d', JSON.stringify(body));
  args.push(url);

  const result = await exec('curl', args, { timeout });
  const lines = result.stdout.trimEnd().split('\n');
  const statusCode = parseInt(lines[lines.length - 1], 10) || 0;
  const jsonBody = lines.slice(0, -1).join('\n');

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonBody);
  } catch {
    parsed = { raw: jsonBody };
  }
  return { status: statusCode, body: parsed };
}

// ─── Anthropic Provider ──────────────────────────────────────

export class AnthropicLLMProvider implements LLMProvider {
  readonly providerName = 'anthropic';
  readonly capabilities: LLMCapabilities = {
    supportsStreaming: true,
    supportsToolUse: true,
    supportsEmbeddings: false,
    supportsVision: true,
  };

  private _model: string;
  private _maxTokens: number;
  private _timeout: number;

  /** @internal — test-only override */
  _exec: typeof shellExec = shellExec;

  constructor(config: AnthropicConfig = {}) {
    this._model = config.model || 'claude-sonnet-4-20250514';
    this._maxTokens = config.maxTokens || 4096;
    this._timeout = config.timeout ?? 120_000;
  }

  private _apiKey(): string {
    return process.env.ANTHROPIC_API_KEY || '';
  }

  private _headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this._apiKey(),
      'anthropic-version': '2023-06-01',
    };
  }

  async complete(input: CompletionInput): Promise<CompletionResult> {
    const model = input.model || this._model;
    const maxTokens = input.maxTokens ?? this._maxTokens;

    // Anthropic separates system from messages
    const system = input.messages.find((m) => m.role === 'system')?.content || '';
    const messages = input.messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      system,
      messages,
    };
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.tools?.length) {
      body.tools = input.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const resp = await this._callWithRetry(body);

    const d = resp as {
      content?: Array<{
        type: string;
        text?: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
      }>;
      model?: string;
      usage?: { input_tokens: number; output_tokens: number };
      stop_reason?: string;
    };

    const usage = d.usage || { input_tokens: 0, output_tokens: 0 };
    const textContent =
      d.content
        ?.filter((c) => c.type === 'text')
        .map((c) => c.text || '')
        .join('') || '';
    const toolCalls = d.content
      ?.filter((c) => c.type === 'tool_use')
      .map((c) => ({
        id: c.id || '',
        name: c.name || '',
        arguments: c.input || {},
      }));

    return {
      content: textContent,
      model: d.model || model,
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
      },
      finishReason: d.stop_reason || 'unknown',
      toolCalls: toolCalls?.length ? toolCalls : undefined,
    };
  }

  async embed(_input: EmbeddingInput): Promise<EmbeddingResult> {
    throw new Error('Anthropic does not support embeddings');
  }

  async stream(
    input: CompletionInput,
    onChunk: (chunk: string) => void
  ): Promise<CompletionResult> {
    // Stream not implemented via curl — fall back to full completion
    const result = await this.complete(input);
    onChunk(result.content);
    return result;
  }

  async listModels(): Promise<string[]> {
    return ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-haiku-20241022'];
  }

  private async _callWithRetry(body: Record<string, unknown>): Promise<unknown> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const resp = await httpPost(
        'https://api.anthropic.com/v1/messages',
        this._headers(),
        body,
        this._timeout,
        this._exec
      );
      if (resp.status >= 200 && resp.status < 300) return resp.body;
      if ((resp.status === 429 || resp.status === 529) && attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      lastErr = new Error(
        `Anthropic API error (HTTP ${resp.status}): ${JSON.stringify(resp.body)}`
      );
    }
    throw lastErr;
  }
}
