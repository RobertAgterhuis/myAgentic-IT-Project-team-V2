// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Adapter Providers — Barrel Export
 *
 * Concrete provider implementations for each adapter contract.
 *
 * @module sdlc/adapters/providers
 */

export { GitHubProvider, type GitHubProviderConfig } from './github.js';
export { DockerContainerProvider, type DockerContainerConfig } from './docker-container.js';
export { VitestTestingProvider, type VitestTestingConfig } from './vitest-testing.js';
export { OpenAILLMProvider, type OpenAIConfig } from './openai-llm.js';
export { AnthropicLLMProvider, type AnthropicConfig } from './anthropic-llm.js';
export { CopilotLLMProvider, type CopilotConfig } from './copilot-llm.js';
