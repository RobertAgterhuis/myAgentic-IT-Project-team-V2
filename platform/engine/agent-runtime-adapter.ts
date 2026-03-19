// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * AgentRuntimeAdapter — First-class runtime adapter abstraction (Epic E-A1).
 *
 * Replaces the ad-hoc external `invoker` function requirement with a typed,
 * registerable adapter contract. The Dispatcher resolves its runtime provider
 * from the AdapterRegistry at construction time, removing the requirement for
 * callers to supply an invoker function just to get past the default throw.
 *
 * I-A1-001: Interface + registry + built-ins.
 * I-A1-002: Dispatcher's default invoker delegates here.
 */

// ─── Interface ────────────────────────────────────────────────

/**
 * Provider contract for executing an agent invocation.
 */
export interface AgentRuntimeAdapter {
  /** Unique adapter name used as registry key. */
  readonly name: string;

  /**
   * Invoke an agent and return a result envelope.
   *
   * @param agent    - { id, name } of the agent being invoked
   * @param platform - Platform key (copilot | claude | openai)
   * @param context  - Assembled invocation context from Dispatcher.buildContext()
   * @returns        - Envelope with optional `outputPath` pointing to the output file
   */
  invoke(
    agent: { id: string; name: string },
    platform: string,
    context: Record<string, unknown>
  ): Promise<{ outputPath?: string }>;
}

// ─── Built-in Adapters ────────────────────────────────────────

/**
 * NullAdapter — deterministic no-op for ci-test profile.
 *
 * Returns a synthetic output path so test suites can exercise the full
 * dispatch loop without any external I/O or LLM calls.
 */
export class NullAdapter implements AgentRuntimeAdapter {
  readonly name = 'null';

  async invoke(
    agent: { id: string; name: string },
    _platform: string,
    _context: Record<string, unknown>
  ): Promise<{ outputPath?: string }> {
    return { outputPath: `/tmp/null-adapter-output-${agent.id}.md` };
  }
}

/**
 * LogOnlyAdapter — local-dev / development-time adapter.
 *
 * Logs the invocation and returns a synthetic output path.
 * Safe default when no real LLM provider is configured — no external calls
 * are made, and the dispatcher loop completes normally.
 */
export class LogOnlyAdapter implements AgentRuntimeAdapter {
  readonly name = 'log-only';

  async invoke(
    agent: { id: string; name: string },
    platform: string,
    _context: Record<string, unknown>
  ): Promise<{ outputPath?: string }> {
    // Safe local logging only — no external I/O
    // eslint-disable-next-line no-console
    console.log(
      `[LogOnlyAdapter] invoke agent=${agent.id} name="${agent.name}" platform=${platform}`
    );
    return { outputPath: `/tmp/log-only-output-${agent.id}.md` };
  }
}

// ─── Registry ─────────────────────────────────────────────────

/**
 * AdapterRegistry — maps adapter names to implementation instances.
 *
 * The global DEFAULT_REGISTRY singleton is pre-populated with built-in
 * adapters. Production providers can register additional entries at
 * application startup before the first Dispatcher is constructed.
 */
export class AdapterRegistry {
  private readonly _adapters = new Map<string, AgentRuntimeAdapter>();

  /** Register an adapter under its name. Overwrites any existing entry. */
  register(adapter: AgentRuntimeAdapter): void {
    this._adapters.set(adapter.name, adapter);
  }

  /** Retrieve an adapter by name; returns undefined if not found. */
  get(name: string): AgentRuntimeAdapter | undefined {
    return this._adapters.get(name);
  }

  /** Alias for get — semantically clearer in resolution contexts. */
  resolve(name: string): AgentRuntimeAdapter | undefined {
    return this._adapters.get(name);
  }

  /** List all registered adapter names. Useful for error messages. */
  listNames(): string[] {
    return [...this._adapters.keys()];
  }
}

/** Global default registry, pre-populated with built-in adapters. */
export const DEFAULT_REGISTRY = new AdapterRegistry();
DEFAULT_REGISTRY.register(new NullAdapter());
DEFAULT_REGISTRY.register(new LogOnlyAdapter());

// ─── Adapter Resolution ───────────────────────────────────────

/**
 * Result of adapter resolution.
 */
export interface AdapterResolutionResult {
  adapter: AgentRuntimeAdapter | null;
  /** Non-null when resolution failed — surface this as a startup config error. */
  error: string | null;
}

/**
 * Resolve an adapter from configuration.
 *
 * Resolution order:
 * 1. `adapterName` (from AGENT_RUNTIME_ADAPTER env var) — explicit wins.
 * 2. Profile-based default: `ci-test` → `null`, everything else → `log-only`.
 *
 * If `adapterName` is set but not registered, the error is returned so the
 * caller can fail at startup (config validation time), NOT at first invocation.
 *
 * @param config.adapterName - AGENT_RUNTIME_ADAPTER value (may be undefined).
 * @param config.profile     - Detected runtime profile (may be undefined).
 * @param config.registry    - Registry to resolve from (defaults to DEFAULT_REGISTRY).
 */
export function resolveAdapter(config: {
  adapterName?: string;
  profile?: string;
  registry?: AdapterRegistry;
}): AdapterResolutionResult {
  const registry = config.registry ?? DEFAULT_REGISTRY;

  if (config.adapterName) {
    const adapter = registry.get(config.adapterName);
    if (!adapter) {
      return {
        adapter: null,
        error:
          `AGENT_RUNTIME_ADAPTER='${config.adapterName}' is not registered. ` +
          `Available adapters: ${registry.listNames().join(', ')}.`,
      };
    }
    return { adapter, error: null };
  }

  // Profile-based default: ci-test uses the no-op null adapter for determinism.
  const defaultName = config.profile === 'ci-test' ? 'null' : 'log-only';
  const adapter = registry.get(defaultName) ?? null;
  return { adapter, error: null };
}
