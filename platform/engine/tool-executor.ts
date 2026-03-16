// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Tool Executor — Routing Layer
 *
 * Routes tool operation requests to the correct adapter by category,
 * enforces timeouts, and integrates the adapter result cache to prevent
 * duplicate side effects on engine resume.
 *
 * The Tool Executor is the single entry point for all external tool
 * invocations from the engine. It:
 * 1. Resolves the target adapter from the registry by category or name
 * 2. Checks the result cache for idempotent replay
 * 3. Executes the operation with timeout enforcement
 * 4. Caches successful results for side-effect operations
 * 5. Returns a standardized ToolExecutionResult
 *
 * @module engine/tool-executor
 */

import {
  type AdapterRegistry,
  type AdapterResult,
  type AdapterCategory,
  type ToolAdapter,
} from '../sdlc/adapters/tool-adapter.js';
import { AdapterResultCache, type CacheStore } from './adapter-result-cache.js';

// ─── Types ──────────────────────────────────────────────────

export interface ToolRequest {
  /** Adapter name (e.g. 'git') OR category (e.g. 'GIT') */
  target: string;
  /** Operation name (e.g. 'list-branches') */
  operation: string;
  /** Operation parameters */
  params: Record<string, unknown>;
  /** Override timeout in ms (0 = no timeout) */
  timeout?: number;
  /** Skip cache lookup and force fresh execution */
  skipCache?: boolean;
  /** Whether this operation has side effects (determines cacheability) */
  sideEffect?: boolean;
}

export interface ToolExecutionResult<T = unknown> {
  /** Whether the operation succeeded */
  success: boolean;
  /** The operation result data */
  data: T | null;
  /** Error message if failed */
  error: string | null;
  /** Execution time in ms */
  duration_ms: number;
  /** Adapter that handled the request */
  adapter: string;
  /** Operation that was executed */
  operation: string;
  /** Whether the result was served from cache */
  fromCache: boolean;
  /** ISO timestamp */
  timestamp: string;
}

export interface ToolExecutorOptions {
  /** The adapter registry to resolve adapters from */
  registry: AdapterRegistry;
  /** File store for cache persistence */
  store: CacheStore;
  /** Cache file path override */
  cachePath?: string;
  /** Default cache TTL in ms */
  cacheTtl?: number;
  /** Global timeout in ms (default: 60000) */
  defaultTimeout?: number;
  /** Operations that are read-only (always cacheable, no side effects) */
  readOnlyOperations?: string[];
}

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_TIMEOUT = 60_000;

/** Operations known to be read-only across all adapters */
const DEFAULT_READ_ONLY = new Set([
  'list-branches',
  'list-commits',
  'get-diff',
  'status',
  'get-coverage',
]);

// ─── Tool Executor ──────────────────────────────────────────

export class ToolExecutor {
  private _registry: AdapterRegistry;
  private _cache: AdapterResultCache;
  private _defaultTimeout: number;
  private _readOnly: Set<string>;

  constructor(options: ToolExecutorOptions) {
    this._registry = options.registry;
    this._cache = new AdapterResultCache({
      store: options.store,
      cachePath: options.cachePath,
      defaultTtl: options.cacheTtl,
    });
    this._defaultTimeout = options.defaultTimeout ?? DEFAULT_TIMEOUT;
    this._readOnly = new Set([...DEFAULT_READ_ONLY, ...(options.readOnlyOperations || [])]);
  }

  /**
   * Execute a tool operation, routing to the correct adapter.
   */
  async execute<T = unknown>(request: ToolRequest): Promise<ToolExecutionResult<T>> {
    const start = Date.now();
    const { target, operation, params, skipCache } = request;

    // 1. Resolve adapter
    const adapter = this._resolveAdapter(target);
    if (!adapter) {
      return {
        success: false,
        data: null,
        error: `No adapter found for target: ${target}`,
        duration_ms: Date.now() - start,
        adapter: target,
        operation,
        fromCache: false,
        timestamp: new Date().toISOString(),
      };
    }

    // 2. Check supported operations
    const supported = adapter.listOperations();
    if (!supported.includes(operation)) {
      return {
        success: false,
        data: null,
        error: `Operation '${operation}' not supported by adapter '${adapter.name}'. Available: ${supported.join(', ')}`,
        duration_ms: Date.now() - start,
        adapter: adapter.name,
        operation,
        fromCache: false,
        timestamp: new Date().toISOString(),
      };
    }

    // 3. Check cache (for side-effect operations during resume)
    const isSideEffect = request.sideEffect ?? !this._readOnly.has(operation);
    if (isSideEffect && !skipCache) {
      const cached = this._cache.get<AdapterResult<T>>(adapter.name, operation, params);
      if (cached) {
        return {
          success: cached.success,
          data: cached.data,
          error: cached.error,
          duration_ms: 0,
          adapter: adapter.name,
          operation,
          fromCache: true,
          timestamp: new Date().toISOString(),
        };
      }
    }

    // 4. Execute with timeout
    const timeout = request.timeout ?? this._defaultTimeout;
    let result: AdapterResult<T>;
    try {
      result = await this._executeWithTimeout(adapter, operation, params, timeout);
    } catch (err) {
      return {
        success: false,
        data: null,
        error: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - start,
        adapter: adapter.name,
        operation,
        fromCache: false,
        timestamp: new Date().toISOString(),
      };
    }

    // 5. Cache successful side-effect results
    if (result.success && isSideEffect) {
      this._cache.set(adapter.name, operation, params, result);
    }

    return {
      success: result.success,
      data: result.data,
      error: result.error,
      duration_ms: Date.now() - start,
      adapter: adapter.name,
      operation,
      fromCache: false,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Run health checks on all registered adapters.
   */
  async healthCheck(): Promise<Record<string, { status: string; message: string }>> {
    const results: Record<string, { status: string; message: string }> = {};
    const checks = await this._registry.healthCheckAll();
    for (const check of checks) {
      results[check.adapter] = { status: check.status, message: check.message };
    }
    return results;
  }

  /**
   * Get cache statistics.
   */
  cacheStats(): { size: number; adapters: string[] } {
    return this._cache.stats();
  }

  /**
   * Clear the result cache.
   */
  clearCache(): void {
    this._cache.clear();
  }

  // ─── Private ──────────────────────────────────────────────

  private _resolveAdapter(target: string): ToolAdapter | undefined {
    // Try direct name lookup first
    const byName = this._registry.get(target);
    if (byName) return byName;

    // Try category lookup (return first adapter in that category)
    const byCategory = this._registry.getByCategory(target as AdapterCategory);
    if (byCategory.length > 0) return byCategory[0];

    // Try case-insensitive name match
    const lower = target.toLowerCase();
    const all = this._registry.listAll();
    const match = all.find((a) => a.name.toLowerCase() === lower);
    if (match) return this._registry.get(match.name);

    return undefined;
  }

  private _executeWithTimeout<T>(
    adapter: ToolAdapter,
    operation: string,
    params: Record<string, unknown>,
    timeout: number
  ): Promise<AdapterResult<T>> {
    if (!timeout || timeout <= 0) {
      return adapter.execute<T>(operation, params);
    }

    return new Promise<AdapterResult<T>>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `Operation '${operation}' on adapter '${adapter.name}' timed out after ${timeout}ms`
          )
        );
      }, timeout);

      adapter.execute<T>(operation, params).then(
        (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }
}
