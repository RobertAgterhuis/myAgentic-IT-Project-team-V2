// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * LLM Adapter
 *
 * Adapter for LLM-powered analysis operations: code review, documentation
 * generation, architecture analysis, test generation.
 *
 * @module sdlc/adapters/llm-adapter
 */

import {
  BaseAdapter,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  type HealthCheck,
} from './tool-adapter.js';

export interface LlmConfig {
  [key: string]: unknown;
  provider: 'openai' | 'azure-openai' | 'anthropic' | 'local' | 'generic';
  model?: string;
  max_tokens?: number;
}

export class LlmAdapter extends BaseAdapter {
  readonly name = 'llm';
  readonly category = ADAPTER_CATEGORIES.LLM;
  readonly version = '1.0.0';

  constructor(config: LlmConfig = { provider: 'generic' }) {
    super();
    this._config = config as Record<string, unknown>;

    this._operations.set('analyze-code', async (params) => {
      return { path: params.path, analysis: '', note: 'Stub — wire to LLM API' };
    });
    this._operations.set('generate-docs', async (params) => {
      return { path: params.path, documentation: '', note: 'Stub — wire to LLM API' };
    });
    this._operations.set('review-architecture', async (params) => {
      return { context: params.context, review: '', note: 'Stub — wire to LLM API' };
    });
    this._operations.set('generate-tests', async (params) => {
      return { path: params.path, tests: '', note: 'Stub — wire to LLM API' };
    });
  }

  async healthCheck(): Promise<HealthCheck> {
    return {
      status: this._config.provider ? HEALTH_STATUS.HEALTHY : HEALTH_STATUS.UNCONFIGURED,
      adapter: this.name,
      category: this.category,
      message: `LLM provider: ${this._config.provider || 'not set'}, model: ${this._config.model || 'default'}`,
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
    return { valid: errors.length === 0, errors };
  }
}
