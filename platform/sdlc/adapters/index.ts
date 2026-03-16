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
