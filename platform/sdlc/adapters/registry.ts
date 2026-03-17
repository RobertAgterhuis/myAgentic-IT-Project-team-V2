// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Provider Registry
 *
 * Dynamic registry for adapter providers with discovery, factory-based
 * registration, and configuration-driven provider selection.
 *
 * Features:
 * - Factory-based registration: providers are instantiated on demand
 * - Type-safe lookup by adapter category and provider name
 * - Default provider selection per category
 * - Validation: rejects providers that don't match their declared type
 * - Auto-registration of built-in providers
 *
 * @module sdlc/adapters/registry
 */

import type { GitProvider } from './contracts/git-provider.js';
import type { CIProvider } from './contracts/ci-provider.js';
import type { ContainerProvider } from './contracts/container-provider.js';
import type { CloudProvider } from './contracts/cloud-provider.js';
import type { LLMProvider } from './contracts/llm-provider.js';
import type { SecurityProvider } from './contracts/security-provider.js';
import type { TestingProvider } from './contracts/testing-provider.js';
import type { ToolProvider } from './contracts/tool-provider.js';

// ─── Provider Category Map ──────────────────────────────────

export type ProviderType =
  | 'git'
  | 'ci'
  | 'container'
  | 'cloud'
  | 'llm'
  | 'security'
  | 'testing'
  | 'tool';

export interface ProviderTypeMap {
  git: GitProvider;
  ci: CIProvider;
  container: ContainerProvider;
  cloud: CloudProvider;
  llm: LLMProvider;
  security: SecurityProvider;
  testing: TestingProvider;
  tool: ToolProvider;
}

// ─── Registration types ─────────────────────────────────────

export type ProviderFactory<T> = (config?: Record<string, unknown>) => T;

interface RegistryEntry<T = unknown> {
  name: string;
  type: ProviderType;
  factory: ProviderFactory<T>;
  instance?: T;
}

// ─── Required method checks ─────────────────────────────────

const REQUIRED_METHODS: Record<ProviderType, string[]> = {
  git: ['listBranches', 'createBranch', 'listCommits', 'getDiff'],
  ci: ['triggerPipeline', 'getStatus', 'getLogs', 'listWorkflows'],
  container: ['build', 'push', 'listImages', 'scan'],
  cloud: ['deploy', 'getStatus', 'listEnvironments'],
  llm: ['complete', 'listModels'],
  security: ['scan', 'auditDependencies', 'scanSecrets'],
  testing: ['runTests', 'getCoverage'],
  tool: ['discover', 'invoke', 'validate'],
};

function validateProvider(type: ProviderType, provider: unknown): string[] {
  const errors: string[] = [];
  if (!provider || typeof provider !== 'object') {
    errors.push(`Provider must be a non-null object`);
    return errors;
  }
  const obj = provider as Record<string, unknown>;

  if (typeof obj.providerName !== 'string' || !obj.providerName) {
    errors.push(`Provider must have a non-empty 'providerName' string`);
  }
  if (!obj.capabilities || typeof obj.capabilities !== 'object') {
    errors.push(`Provider must have a 'capabilities' object`);
  }

  for (const method of REQUIRED_METHODS[type] || []) {
    if (typeof obj[method] !== 'function') {
      errors.push(`Provider missing required method: ${method}`);
    }
  }
  return errors;
}

// ─── Provider Registry ──────────────────────────────────────

export class ProviderRegistry {
  private _entries = new Map<string, RegistryEntry>();
  private _defaults = new Map<ProviderType, string>();

  /**
   * Register a provider factory under a type + name combination.
   * The factory is called lazily when getProvider() is first invoked.
   */
  registerProvider<K extends ProviderType>(
    type: K,
    name: string,
    factory: ProviderFactory<ProviderTypeMap[K]>
  ): void {
    const key = `${type}:${name}`;
    if (this._entries.has(key)) {
      throw new Error(`Provider already registered: ${key}`);
    }
    this._entries.set(key, { name, type, factory });

    // First registered provider becomes the default for its type
    if (!this._defaults.has(type)) {
      this._defaults.set(type, name);
    }
  }

  /**
   * Set the default provider for a given type.
   */
  setDefault(type: ProviderType, name: string): void {
    const key = `${type}:${name}`;
    if (!this._entries.has(key)) {
      throw new Error(`No provider registered as ${key}`);
    }
    this._defaults.set(type, name);
  }

  /**
   * Get a provider by type and optional name. If name is omitted,
   * returns the default provider for that type.
   *
   * The provider is instantiated on first access and validated
   * against its contract.
   */
  getProvider<K extends ProviderType>(
    type: K,
    name?: string,
    config?: Record<string, unknown>
  ): ProviderTypeMap[K] {
    const resolvedName = name || this._defaults.get(type);
    if (!resolvedName) {
      throw new Error(`No provider registered for type: ${type}`);
    }

    const key = `${type}:${resolvedName}`;
    const entry = this._entries.get(key);
    if (!entry) {
      throw new Error(`Provider not found: ${key}`);
    }

    // Lazy instantiation
    if (!entry.instance || config) {
      const instance = entry.factory(config);
      const errors = validateProvider(type, instance);
      if (errors.length > 0) {
        throw new Error(`Provider ${key} failed validation:\n${errors.join('\n')}`);
      }
      entry.instance = instance;
    }

    return entry.instance as ProviderTypeMap[K];
  }

  /**
   * Check if a provider is registered for the given type and name.
   */
  hasProvider(type: ProviderType, name?: string): boolean {
    if (!name) return this._defaults.has(type);
    return this._entries.has(`${type}:${name}`);
  }

  /**
   * List all registered providers, grouped by type.
   */
  listProviders(): Array<{ type: ProviderType; name: string; isDefault: boolean }> {
    const result: Array<{ type: ProviderType; name: string; isDefault: boolean }> = [];
    for (const [_key, entry] of this._entries) {
      const isDefault = this._defaults.get(entry.type) === entry.name;
      result.push({ type: entry.type as ProviderType, name: entry.name, isDefault });
    }
    return result;
  }

  /**
   * List providers of a specific type.
   */
  listByType(type: ProviderType): string[] {
    const result: string[] = [];
    for (const [, entry] of this._entries) {
      if (entry.type === type) result.push(entry.name);
    }
    return result;
  }

  /**
   * Unregister a provider.
   */
  unregister(type: ProviderType, name: string): boolean {
    const key = `${type}:${name}`;
    const removed = this._entries.delete(key);
    if (removed && this._defaults.get(type) === name) {
      this._defaults.delete(type);
    }
    return removed;
  }

  /**
   * Clear all registrations.
   */
  clear(): void {
    this._entries.clear();
    this._defaults.clear();
  }
}

// ─── Auto-registration helper ────────────────────────────────

/**
 * Create a ProviderRegistry pre-populated with the built-in providers.
 * Each provider is registered as a lazy factory — only instantiated
 * when first requested.
 */
export function createDefaultRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();

  // Git: GitHub
  registry.registerProvider('git', 'github', (config) => {
    const { GitHubProvider } = require('./providers/github.js');
    return new GitHubProvider({
      owner: (config?.owner as string) || '',
      repo: (config?.repo as string) || '',
      token: config?.token as string,
      apiBase: config?.apiBase as string,
      timeout: config?.timeout as number,
    });
  });

  // Container: Docker
  registry.registerProvider('container', 'docker', (config) => {
    const { DockerContainerProvider } = require('./providers/docker-container.js');
    return new DockerContainerProvider({
      runtime: (config?.runtime as 'docker' | 'podman') || 'docker',
      registryUrl: config?.registryUrl as string,
      timeout: config?.timeout as number,
    });
  });

  // Testing: Vitest
  registry.registerProvider('testing', 'vitest', (config) => {
    const { VitestTestingProvider } = require('./providers/vitest-testing.js');
    return new VitestTestingProvider({
      projectRoot: config?.projectRoot as string,
      configPath: config?.configPath as string,
      timeout: config?.timeout as number,
    });
  });

  // LLM: OpenAI
  registry.registerProvider('llm', 'openai', (config) => {
    const { OpenAILLMProvider } = require('./providers/openai-llm.js');
    return new OpenAILLMProvider({
      model: config?.model as string,
      maxTokens: config?.maxTokens as number,
      timeout: config?.timeout as number,
    });
  });

  // LLM: Anthropic
  registry.registerProvider('llm', 'anthropic', (config) => {
    const { AnthropicLLMProvider } = require('./providers/anthropic-llm.js');
    return new AnthropicLLMProvider({
      model: config?.model as string,
      maxTokens: config?.maxTokens as number,
      timeout: config?.timeout as number,
    });
  });

  // LLM: Copilot
  registry.registerProvider('llm', 'copilot', (config) => {
    const { CopilotLLMProvider } = require('./providers/copilot-llm.js');
    return new CopilotLLMProvider({
      model: config?.model as string,
      maxTokens: config?.maxTokens as number,
      timeout: config?.timeout as number,
    });
  });

  return registry;
}
