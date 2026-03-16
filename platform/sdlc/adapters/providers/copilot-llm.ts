// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * GitHub Copilot LLM Provider
 *
 * Concrete implementation of the LLMProvider contract for GitHub Copilot.
 * Routes through the Copilot chat endpoint. Uses GITHUB_TOKEN for auth.
 *
 * @module sdlc/adapters/providers/copilot-llm
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

export interface CopilotConfig {
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

// ─── Copilot Provider ────────────────────────────────────────

export class CopilotLLMProvider implements LLMProvider {
  readonly providerName = 'copilot';
  readonly capabilities: LLMCapabilities = {
    supportsStreaming: false,
    supportsToolUse: false,
    supportsEmbeddings: false,
    supportsVision: false,
  };

  private _model: string;
  private _maxTokens: number;
  private _timeout: number;

  /** @internal — test-only override */
  _exec: typeof shellExec = shellExec;

  constructor(config: CopilotConfig = {}) {
    this._model = config.model || 'copilot-chat';
    this._maxTokens = config.maxTokens || 4096;
    this._timeout = config.timeout ?? 120_000;
  }

  private _token(): string {
    return process.env.GITHUB_TOKEN || '';
  }

  private _headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this._token()}`,
      'X-GitHub-Api-Version': '2022-11-28',
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

    const resp = await this._callWithRetry(body);

    const d = resp as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      model?: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

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
    };
  }

  async embed(_input: EmbeddingInput): Promise<EmbeddingResult> {
    throw new Error('GitHub Copilot does not support embeddings');
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
    return ['copilot-chat'];
  }

  private async _callWithRetry(body: Record<string, unknown>): Promise<unknown> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const resp = await httpPost(
        'https://api.github.com/copilot/chat/completions',
        this._headers(),
        body,
        this._timeout,
        this._exec
      );
      if (resp.status >= 200 && resp.status < 300) return resp.body;
      if ((resp.status === 429 || resp.status === 503) && attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      lastErr = new Error(`Copilot API error (HTTP ${resp.status}): ${JSON.stringify(resp.body)}`);
    }
    throw lastErr;
  }
}
