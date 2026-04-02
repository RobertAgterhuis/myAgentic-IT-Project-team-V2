// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * OpenAI LLM Provider
 *
 * Concrete implementation of the LLMProvider contract for OpenAI API.
 * Uses curl via shell executor — no SDK dependency.
 *
 * API key sourced from OPENAI_API_KEY environment variable only.
 *
 * @module sdlc/adapters/providers/openai-llm
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

export interface OpenAIConfig {
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

// ─── OpenAI Provider ─────────────────────────────────────────

export class OpenAILLMProvider implements LLMProvider {
  readonly providerName = 'openai';
  readonly capabilities: LLMCapabilities = {
    supportsStreaming: true,
    supportsToolUse: true,
    supportsEmbeddings: true,
    supportsVision: true,
  };

  private _model: string;
  private _maxTokens: number;
  private _timeout: number;

  /** @internal — test-only override */
  _exec: typeof shellExec = shellExec;

  constructor(config: OpenAIConfig = {}) {
    this._model = config.model || 'gpt-4o';
    this._maxTokens = config.maxTokens || 4096;
    this._timeout = config.timeout ?? 120_000;
  }

  private _apiKey(): string {
    return process.env.OPENAI_API_KEY || '';
  }

  private _headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this._apiKey()}`,
    };
  }

  async complete(input: CompletionInput): Promise<CompletionResult> {
    const model = input.model || this._model;
    const maxTokens = input.maxTokens ?? this._maxTokens;
    const body: Record<string, unknown> = {
      model,
      messages: input.messages,
      max_tokens: maxTokens,
    };
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.tools?.length) {
      body.tools = input.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    const resp = await this._callWithRetry('https://api.openai.com/v1/chat/completions', body);

    const d = resp as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
        };
        finish_reason?: string;
      }>;
      model?: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const toolCalls = d.choices?.[0]?.message?.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}'),
    }));

    const usage = d.usage
      ? {
          promptTokens: d.usage.prompt_tokens,
          completionTokens: d.usage.completion_tokens,
          totalTokens: d.usage.total_tokens,
        }
      : { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    return {
      content: d.choices?.[0]?.message?.content || '',
      model: d.model || model,
      usage,
      finishReason: d.choices?.[0]?.finish_reason || 'unknown',
      toolCalls,
    };
  }

  async embed(input: EmbeddingInput): Promise<EmbeddingResult> {
    const model = input.model || 'text-embedding-3-small';
    const body = { model, input: input.text };

    const resp = await this._callWithRetry('https://api.openai.com/v1/embeddings', body);

    const d = resp as {
      data?: Array<{ embedding: number[] }>;
      model?: string;
      usage?: { total_tokens: number };
    };

    return {
      embedding: d.data?.[0]?.embedding || [],
      model: d.model || model,
      usage: { totalTokens: d.usage?.total_tokens || 0 },
    };
  }

  async stream(
    input: CompletionInput,
    onChunk: (chunk: string) => void
  ): Promise<CompletionResult> {
    const model = input.model || this._model;
    const maxTokens = input.maxTokens ?? this._maxTokens;
    const body: Record<string, unknown> = {
      model,
      messages: input.messages,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    };
    if (input.temperature !== undefined) body.temperature = input.temperature;
    if (input.tools?.length) {
      body.tools = input.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
      signal: input.signal
        ? AbortSignal.any([AbortSignal.timeout(this._timeout), input.signal])
        : AbortSignal.timeout(this._timeout),
    });

    if (!response.ok) {
      const payload = await response.text();
      throw new Error(`OpenAI API error (HTTP ${response.status}): ${payload}`);
    }

    if (!response.body) {
      const fallback = await this.complete(input);
      onChunk(fallback.content);
      return fallback;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let finishReason = 'stream_end';
    let returnedModel = model;
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;

        const payload = line.slice(5).trim();
        if (!payload) continue;
        if (payload === '[DONE]') {
          finishReason = 'stop';
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsed: any;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        if (typeof parsed.model === 'string' && parsed.model.length > 0) {
          returnedModel = parsed.model;
        }

        if (parsed.usage && typeof parsed.usage === 'object') {
          usage = {
            promptTokens: Number(parsed.usage.prompt_tokens) || 0,
            completionTokens: Number(parsed.usage.completion_tokens) || 0,
            totalTokens: Number(parsed.usage.total_tokens) || 0,
          };
        }

        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta.length > 0) {
          content += delta;
          onChunk(delta);
        }

        const finish = parsed.choices?.[0]?.finish_reason;
        if (typeof finish === 'string' && finish.length > 0) {
          finishReason = finish;
        }
      }
    }

    return {
      content,
      model: returnedModel,
      usage,
      finishReason,
    };
  }

  async listModels(): Promise<string[]> {
    return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o1-mini'];
  }

  private async _callWithRetry(url: string, body: Record<string, unknown>): Promise<unknown> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const resp = await httpPost(url, this._headers(), body, this._timeout, this._exec);
      if (resp.status >= 200 && resp.status < 300) return resp.body;
      if ((resp.status === 429 || resp.status === 503) && attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      lastErr = new Error(`OpenAI API error (HTTP ${resp.status}): ${JSON.stringify(resp.body)}`);
    }
    throw lastErr;
  }
}
