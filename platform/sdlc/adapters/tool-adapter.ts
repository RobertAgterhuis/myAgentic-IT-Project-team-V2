// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * SDLC Tool Adapter Interface
 *
 * Defines the abstract adapter contract that all external tool integrations
 * must implement. Adapters are the boundary between the SDLC platform and
 * external services (Git, CI, containers, cloud, security, testing, LLM).
 *
 * Each adapter is responsible for:
 * - Validating its own configuration
 * - Executing tool-specific operations
 * - Returning standardized results
 * - Reporting health status
 *
 * Adapters are registered in the AdapterRegistry and resolved by category.
 *
 * Zero external dependencies. Pure interfaces + registry.
 *
 * @module sdlc/adapters/tool-adapter
 */

// ─── Adapter Categories ──────────────────────────────────────

export const ADAPTER_CATEGORIES = Object.freeze({
  GIT: 'GIT',
  CI: 'CI',
  CONTAINER: 'CONTAINER',
  CLOUD: 'CLOUD',
  SECURITY: 'SECURITY',
  TESTING: 'TESTING',
  LLM: 'LLM',
} as const);

export type AdapterCategory = (typeof ADAPTER_CATEGORIES)[keyof typeof ADAPTER_CATEGORIES];

// ─── Adapter Health ──────────────────────────────────────────

export const HEALTH_STATUS = Object.freeze({
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  UNAVAILABLE: 'UNAVAILABLE',
  UNCONFIGURED: 'UNCONFIGURED',
} as const);

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];

export interface HealthCheck {
  status: HealthStatus;
  adapter: string;
  category: AdapterCategory;
  message: string;
  checked_at: string;
}

// ─── Operation Result ────────────────────────────────────────

export interface AdapterResult<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  duration_ms: number;
  adapter: string;
  operation: string;
  timestamp: string;
}

// ─── Tool Adapter Interface ──────────────────────────────────

export interface ToolAdapter {
  readonly name: string;
  readonly category: AdapterCategory;
  readonly version: string;

  /** Check adapter health and configuration validity. */
  healthCheck(): Promise<HealthCheck>;

  /** List supported operations. */
  listOperations(): string[];

  /** Execute a named operation with typed parameters. */
  execute<T = unknown>(
    operation: string,
    params: Record<string, unknown>
  ): Promise<AdapterResult<T>>;

  /** Validate adapter configuration without executing anything. */
  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] };
}

// ─── Adapter Registry ────────────────────────────────────────

export class AdapterRegistry {
  private _adapters = new Map<string, ToolAdapter>();

  register(adapter: ToolAdapter): void {
    if (this._adapters.has(adapter.name)) {
      throw new Error(`Adapter already registered: ${adapter.name}`);
    }
    this._adapters.set(adapter.name, adapter);
  }

  unregister(name: string): boolean {
    return this._adapters.delete(name);
  }

  get(name: string): ToolAdapter | undefined {
    return this._adapters.get(name);
  }

  getByCategory(category: AdapterCategory): ToolAdapter[] {
    return Array.from(this._adapters.values()).filter((a) => a.category === category);
  }

  listAll(): { name: string; category: AdapterCategory; version: string }[] {
    return Array.from(this._adapters.values()).map((a) => ({
      name: a.name,
      category: a.category,
      version: a.version,
    }));
  }

  async healthCheckAll(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    for (const adapter of this._adapters.values()) {
      checks.push(await adapter.healthCheck());
    }
    return checks;
  }
}

// ─── Base Adapter (abstract helper) ──────────────────────────

export abstract class BaseAdapter implements ToolAdapter {
  abstract readonly name: string;
  abstract readonly category: AdapterCategory;
  abstract readonly version: string;

  protected _config: Record<string, unknown> = {};
  protected _operations = new Map<string, (params: Record<string, unknown>) => Promise<unknown>>();

  listOperations(): string[] {
    return Array.from(this._operations.keys());
  }

  async execute<T = unknown>(
    operation: string,
    params: Record<string, unknown>
  ): Promise<AdapterResult<T>> {
    const start = Date.now();
    const handler = this._operations.get(operation);
    if (!handler) {
      return {
        success: false,
        data: null,
        error: `Unknown operation: ${operation}`,
        duration_ms: Date.now() - start,
        adapter: this.name,
        operation,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      const data = await handler(params);
      return {
        success: true,
        data: data as T,
        error: null,
        duration_ms: Date.now() - start,
        adapter: this.name,
        operation,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        data: null,
        error: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - start,
        adapter: this.name,
        operation,
        timestamp: new Date().toISOString(),
      };
    }
  }

  abstract healthCheck(): Promise<HealthCheck>;
  abstract validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] };
}
