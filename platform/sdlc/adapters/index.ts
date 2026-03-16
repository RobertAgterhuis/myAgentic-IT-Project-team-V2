// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * SDLC Adapters — Barrel Export
 *
 * @module sdlc/adapters
 */

export {
  type ToolAdapter,
  type AdapterResult,
  type HealthCheck,
  type HealthStatus,
  type AdapterCategory,
  ADAPTER_CATEGORIES,
  HEALTH_STATUS,
  AdapterRegistry,
  BaseAdapter,
} from './tool-adapter.js';
export {
  shellExec,
  isBinaryAvailable,
  type ShellResult,
  type ShellOptions,
} from './shell-executor.js';
export { GitAdapter, type GitConfig } from './git-adapter.js';
export { CiAdapter, type CiConfig } from './ci-adapter.js';
export { ContainerAdapter, type ContainerConfig } from './container-adapter.js';
export { CloudAdapter, type CloudConfig } from './cloud-adapter.js';
export { SecurityAdapter, type SecurityConfig } from './security-adapter.js';
export { TestingAdapter, type TestingConfig } from './testing-adapter.js';
export { LlmAdapter, type LlmConfig } from './llm-adapter.js';

// ─── Formal Contracts ────────────────────────────────────────

export type {
  GitProvider,
  GitCapabilities,
  CIProvider,
  CICapabilities,
  ContainerProvider,
  ContainerCapabilities,
  CloudProvider,
  CloudCapabilities,
  LLMProvider,
  LLMCapabilities,
  SecurityProvider,
  SecurityCapabilities,
  TestingProvider,
  TestingCapabilities,
  ToolProvider,
  ToolCapabilities,
  ShellExecutorProvider,
  ShellCapabilities,
} from './contracts/index.js';

// ─── Concrete Providers ──────────────────────────────────────

export { GitHubProvider, type GitHubProviderConfig } from './providers/github.js';
export {
  DockerContainerProvider,
  type DockerContainerConfig,
} from './providers/docker-container.js';
export { VitestTestingProvider, type VitestTestingConfig } from './providers/vitest-testing.js';
export { OpenAILLMProvider, type OpenAIConfig } from './providers/openai-llm.js';
export { AnthropicLLMProvider, type AnthropicConfig } from './providers/anthropic-llm.js';
export { CopilotLLMProvider, type CopilotConfig } from './providers/copilot-llm.js';

// ─── Provider Registry ───────────────────────────────────────

export {
  ProviderRegistry,
  createDefaultRegistry,
  type ProviderType,
  type ProviderTypeMap,
  type ProviderFactory,
} from './registry.js';
