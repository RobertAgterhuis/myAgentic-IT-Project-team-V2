// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * LLM Adapter
 *
 * Adapter for LLM-powered analysis operations: prompt execution, code review,
 * documentation generation, architecture analysis, test generation.
 *
 * Supports multiple providers (OpenAI, Azure OpenAI, Anthropic) via a
 * unified HTTP interface using native fetch/undici (no SDK dependency). Includes token
 * budget enforcement and rate-limit retry with exponential backoff.
 *
 * API keys are sourced from environment variables only — never from config.
 *
 * @module sdlc/adapters/llm-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';
import { shellExec } from './shell-executor.js';

export interface LlmConfig {
  [key: string]: unknown;
  provider: 'openai' | 'azure-openai' | 'anthropic' | 'local' | 'generic';
  model?: string;
  max_tokens?: number;
  /** Azure OpenAI deployment name */
  deployment?: string;
  /** Azure OpenAI resource endpoint (e.g. https://myresource.openai.azure.com) */
  endpoint?: string;
  /** Request timeout in ms (default: 120000) */
  timeout?: number;
}

// ─── Rate-limit retry helper ─────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Provider endpoint resolution ────────────────────────────

interface ProviderEndpoint {
  url: string;
  headers: Record<string, string>;
  bodyTransform: (
    messages: LlmMessage[],
    model: string,
    maxTokens: number
  ) => Record<string, unknown>;
  parseResponse: (body: unknown) => LlmResponse;
}

interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LlmResponse {
  content: string;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  finish_reason: string;
}

function resolveProvider(config: LlmConfig): ProviderEndpoint | null {
  const model = config.model || 'gpt-4o';

  switch (config.provider) {
    case 'openai': {
      const apiKey = process.env.OPENAI_API_KEY || '';
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        bodyTransform: (messages, mdl, maxTokens) => ({
          model: mdl,
          messages,
          max_tokens: maxTokens,
        }),
        parseResponse: (body) => {
          const d = body as {
            choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
            model?: string;
            usage?: LlmResponse['usage'];
          };
          return {
            content: d.choices?.[0]?.message?.content || '',
            model: d.model || model,
            usage: d.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            finish_reason: d.choices?.[0]?.finish_reason || 'unknown',
          };
        },
      };
    }

    case 'azure-openai': {
      const apiKey = process.env.AZURE_OPENAI_API_KEY || '';
      const endpoint = config.endpoint || '';
      const deployment = config.deployment || model;
      if (!endpoint) return null;
      return {
        url: `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-06-01`,
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        bodyTransform: (messages, _mdl, maxTokens) => ({
          messages,
          max_tokens: maxTokens,
        }),
        parseResponse: (body) => {
          const d = body as {
            choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
            model?: string;
            usage?: LlmResponse['usage'];
          };
          return {
            content: d.choices?.[0]?.message?.content || '',
            model: d.model || deployment,
            usage: d.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            finish_reason: d.choices?.[0]?.finish_reason || 'unknown',
          };
        },
      };
    }

    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY || '';
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        bodyTransform: (messages, mdl, maxTokens) => {
          const system = messages.find((m) => m.role === 'system')?.content || '';
          const nonSystem = messages.filter((m) => m.role !== 'system');
          return { model: mdl, max_tokens: maxTokens, system, messages: nonSystem };
        },
        parseResponse: (body) => {
          const d = body as {
            content?: Array<{ text?: string }>;
            model?: string;
            usage?: { input_tokens: number; output_tokens: number };
            stop_reason?: string;
          };
          const usage = d.usage || { input_tokens: 0, output_tokens: 0 };
          return {
            content: d.content?.[0]?.text || '',
            model: d.model || model,
            usage: {
              prompt_tokens: usage.input_tokens,
              completion_tokens: usage.output_tokens,
              total_tokens: usage.input_tokens + usage.output_tokens,
            },
            finish_reason: d.stop_reason || 'unknown',
          };
        },
      };
    }

    default:
      return null;
  }
}

// ─── HTTP call via fetch (undici runtime) ────────────────────

type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }
) => Promise<{
  status: number;
  text(): Promise<string>;
}>;

async function httpPost(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
  timeout: number,
  fetchImpl: FetchLike
): Promise<{ status: number; body: unknown }> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeout);

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ac.signal,
    });

    const rawBody = await response.text();
    let parsed: unknown;
    try {
      parsed = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      parsed = { raw: rawBody };
    }

    return { status: response.status, body: parsed };
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(`LLM API timeout after ${timeout}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── LlmAdapter ──────────────────────────────────────────────

export class LlmAdapter extends BaseAdapter {
  readonly name = 'llm';
  readonly category = ADAPTER_CATEGORIES.LLM;
  readonly version = '2.0.0';

  private _provider: ProviderEndpoint | null;
  private _model: string;
  private _maxTokens: number;
  private _timeout: number;

  /** @internal — test-only override for shellExec */
  _exec: typeof shellExec = shellExec;

  /** @internal — test-only override for HTTP transport */
  _fetch: FetchLike =
    typeof globalThis.fetch === 'function'
      ? (globalThis.fetch as unknown as FetchLike)
      : async () => {
          throw new Error('global fetch is unavailable in this runtime');
        };

  constructor(config: LlmConfig = { provider: 'generic' }) {
    super();
    this._config = config as Record<string, unknown>;
    this._provider = resolveProvider(config);
    this._model = config.model || 'gpt-4o';
    this._maxTokens = config.max_tokens || 4096;
    this._timeout = config.timeout ?? 120_000;

    // ── prompt (core operation) ──────────────────────────
    this._operations.set('prompt', async (params) => {
      const systemPrompt = (params.system as string) || 'You are a helpful assistant.';
      const userPrompt = params.prompt as string;
      if (!userPrompt) throw new Error('prompt is required');
      const maxTokens = (params.max_tokens as number) || this._maxTokens;

      return await this._callLlm(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxTokens
      );
    });

    // ── analyze-code ─────────────────────────────────────
    this._operations.set('analyze-code', async (params) => {
      const code = params.code as string;
      const path = (params.path as string) || 'unknown';
      if (!code) throw new Error('code content is required');

      const resp = await this._callLlm(
        [
          {
            role: 'system',
            content:
              'You are a senior software engineer. Analyze the provided code for quality, security, and maintainability. Return structured findings.',
          },
          { role: 'user', content: `File: ${path}\n\n\`\`\`\n${code}\n\`\`\`` },
        ],
        this._maxTokens
      );
      return { path, analysis: resp.content, usage: resp.usage };
    });

    // ── generate-docs ────────────────────────────────────
    this._operations.set('generate-docs', async (params) => {
      const code = params.code as string;
      const path = (params.path as string) || 'unknown';
      if (!code) throw new Error('code content is required');

      const resp = await this._callLlm(
        [
          {
            role: 'system',
            content:
              'You are a technical writer. Generate comprehensive documentation for the provided code module.',
          },
          { role: 'user', content: `File: ${path}\n\n\`\`\`\n${code}\n\`\`\`` },
        ],
        this._maxTokens
      );
      return { path, documentation: resp.content, usage: resp.usage };
    });

    // ── review-architecture ──────────────────────────────
    this._operations.set('review-architecture', async (params) => {
      const context = params.context as string;
      if (!context) throw new Error('architecture context is required');

      const resp = await this._callLlm(
        [
          {
            role: 'system',
            content:
              'You are a principal software architect. Review the architecture for scalability, security, and maintainability risks.',
          },
          { role: 'user', content: context },
        ],
        this._maxTokens
      );
      return { review: resp.content, usage: resp.usage };
    });

    // ── generate-tests ───────────────────────────────────
    this._operations.set('generate-tests', async (params) => {
      const code = params.code as string;
      const path = (params.path as string) || 'unknown';
      const framework = (params.framework as string) || 'vitest';
      if (!code) throw new Error('code content is required');

      const resp = await this._callLlm(
        [
          {
            role: 'system',
            content: `You are a test engineer. Generate comprehensive ${framework} unit tests for the provided code.`,
          },
          { role: 'user', content: `File: ${path}\n\n\`\`\`\n${code}\n\`\`\`` },
        ],
        this._maxTokens
      );
      return { path, tests: resp.content, framework, usage: resp.usage };
    });
  }

  /**
   * Call the LLM API with exponential backoff on rate limits.
   */
  private async _callLlm(messages: LlmMessage[], maxTokens: number): Promise<LlmResponse> {
    if (!this._provider) {
      throw new Error(`LLM provider '${this._config.provider}' is not configured or not supported`);
    }

    const provider = this._provider;
    const body = provider.bodyTransform(messages, this._model, maxTokens);

    let lastErr: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const resp = await httpPost(provider.url, provider.headers, body, this._timeout, this._fetch);

      if (resp.status >= 200 && resp.status < 300) {
        return provider.parseResponse(resp.body);
      }

      if (resp.status === 429 || resp.status === 503) {
        // Rate limited — exponential backoff
        lastErr = new Error(`LLM API rate limited (HTTP ${resp.status})`);
        if (attempt < MAX_RETRIES) {
          await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
      } else {
        const errBody =
          typeof resp.body === 'object' ? JSON.stringify(resp.body) : String(resp.body);
        throw new Error(`LLM API error (HTTP ${resp.status}): ${errBody}`);
      }
    }

    throw lastErr || new Error('LLM API request failed after retries');
  }

  async healthCheck(): Promise<HealthCheck> {
    if (!this._provider) {
      return {
        status: HEALTH_STATUS.UNCONFIGURED,
        adapter: this.name,
        category: this.category,
        message: `LLM provider '${this._config.provider}' not configured — set provider and API key env var`,
        checked_at: new Date().toISOString(),
      };
    }

    // Verify API key presence
    const provider = this._config.provider as string;
    const keyEnvVars: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      'azure-openai': 'AZURE_OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
    };
    const envVar = keyEnvVars[provider];
    if (envVar && !process.env[envVar]) {
      return {
        status: HEALTH_STATUS.DEGRADED,
        adapter: this.name,
        category: this.category,
        message: `API key not set — expected env var: ${envVar}`,
        checked_at: new Date().toISOString(),
      };
    }

    return {
      status: HEALTH_STATUS.HEALTHY,
      adapter: this.name,
      category: this.category,
      message: `LLM provider: ${provider}, model: ${this._model}, max_tokens: ${this._maxTokens}`,
      checked_at: new Date().toISOString(),
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (
      !config.provider ||
      !['openai', 'azure-openai', 'anthropic', 'local', 'generic'].includes(
        config.provider as string
      )
    ) {
      errors.push('provider must be one of: openai, azure-openai, anthropic, local, generic');
    }
    if (config.provider === 'azure-openai' && !config.endpoint) {
      errors.push('endpoint is required for azure-openai provider');
    }
    if (config.max_tokens && (typeof config.max_tokens !== 'number' || config.max_tokens < 1)) {
      errors.push('max_tokens must be a positive number');
    }
    return { valid: errors.length === 0, errors };
  }
}
