// Copyright (c) 2026 Robert Agterhuis. MIT License.

export interface AdapterLookup<TAdapter> {
  get(name: string): TAdapter | undefined;
  listNames(): string[];
}

export interface AdapterResolutionResult<TAdapter> {
  adapter: TAdapter | null;
  error: string | null;
}

export function resolveAdapterSelection<TAdapter>(config: {
  adapterName?: string;
  profile?: string;
  registry: AdapterLookup<TAdapter>;
  disallowedProductionAdapters?: string[];
  defaults?: {
    ciTest: string;
    local: string;
  };
}): AdapterResolutionResult<TAdapter> {
  const {
    adapterName,
    profile,
    registry,
    disallowedProductionAdapters = ['null', 'log-only'],
    defaults = { ciTest: 'null', local: 'log-only' },
  } = config;

  const isProductionProfile = Boolean(profile && profile.startsWith('production-'));

  if (adapterName) {
    const adapter = registry.get(adapterName);
    if (!adapter) {
      return {
        adapter: null,
        error:
          `AGENT_RUNTIME_ADAPTER='${adapterName}' is not registered. ` +
          `Available adapters: ${registry.listNames().join(', ')}.`,
      };
    }

    if (isProductionProfile && disallowedProductionAdapters.includes(adapterName)) {
      return {
        adapter: null,
        error:
          `Runtime profile '${profile}' forbids AGENT_RUNTIME_ADAPTER='${adapterName}'. ` +
          'Configure a provider-backed adapter (for example: llm-openai, llm-copilot).',
      };
    }

    return { adapter, error: null };
  }

  if (isProductionProfile) {
    return {
      adapter: null,
      error:
        `Runtime profile '${profile}' requires AGENT_RUNTIME_ADAPTER to be explicitly configured. ` +
        'Refusing default fail-open adapter selection.',
    };
  }

  const defaultName = profile === 'ci-test' ? defaults.ciTest : defaults.local;
  return { adapter: registry.get(defaultName) ?? null, error: null };
}
