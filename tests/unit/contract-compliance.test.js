'use strict';

/**
 * M19-007 — Contract Compliance Test Suite
 *
 * Data-driven tests that verify every concrete provider implements
 * the structural requirements of its contract interface:
 *   - providerName (non-empty string)
 *   - capabilities (non-null object)
 *   - All required methods are functions
 *
 * Also covers ProviderRegistry and createDefaultRegistry.
 */

const {
  GitHubProvider,
  DockerContainerProvider,
  VitestTestingProvider,
  OpenAILLMProvider,
  AnthropicLLMProvider,
  CopilotLLMProvider,
  LocalLLMProvider,
  ProviderRegistry,
  createDefaultRegistry,
  probeProviderHealth,
  buildLlmFallbackPolicy,
} = require('../../platform/sdlc/adapters');

// ─── Contract spec table ─────────────────────────────────────

const CONTRACT_SPECS = [
  {
    name: 'GitHubProvider',
    type: 'git',
    factory: () => new GitHubProvider({ owner: 'test', repo: 'repo' }),
    requiredMethods: [
      'listBranches',
      'createBranch',
      'listCommits',
      'getDiff',
      'getFileContents',
      'blame',
      'createPR',
      'listPRs',
      'mergePR',
    ],
    expectedProviderName: 'github',
  },
  {
    name: 'DockerContainerProvider',
    type: 'container',
    factory: () => new DockerContainerProvider({}),
    requiredMethods: ['build', 'push', 'pull', 'tag', 'listImages', 'scan'],
    expectedProviderName: 'docker',
  },
  {
    name: 'VitestTestingProvider',
    type: 'testing',
    factory: () => new VitestTestingProvider({}),
    requiredMethods: ['runTests', 'runIntegration', 'getCoverage', 'getReport'],
    expectedProviderName: 'vitest',
  },
  {
    name: 'OpenAILLMProvider',
    type: 'llm',
    factory: () => new OpenAILLMProvider({}),
    requiredMethods: ['complete', 'embed', 'listModels'],
    expectedProviderName: 'openai',
  },
  {
    name: 'AnthropicLLMProvider',
    type: 'llm',
    factory: () => new AnthropicLLMProvider({}),
    requiredMethods: ['complete', 'embed', 'listModels'],
    expectedProviderName: 'anthropic',
  },
  {
    name: 'CopilotLLMProvider',
    type: 'llm',
    factory: () => new CopilotLLMProvider({}),
    requiredMethods: ['complete', 'embed', 'listModels'],
    expectedProviderName: 'copilot',
  },
  {
    name: 'LocalLLMProvider',
    type: 'llm',
    factory: () => new LocalLLMProvider({}),
    requiredMethods: ['complete', 'embed', 'listModels'],
    expectedProviderName: 'local',
  },
];

// ─── Data-driven structural compliance ───────────────────────

describe('Contract compliance — structural', () => {
  for (const spec of CONTRACT_SPECS) {
    describe(spec.name, () => {
      let provider;

      beforeAll(() => {
        provider = spec.factory();
      });

      it('has a non-empty providerName string', () => {
        expect(typeof provider.providerName).toBe('string');
        expect(provider.providerName.length).toBeGreaterThan(0);
        expect(provider.providerName).toBe(spec.expectedProviderName);
      });

      it('has a capabilities object', () => {
        expect(provider.capabilities).toBeDefined();
        expect(typeof provider.capabilities).toBe('object');
        expect(provider.capabilities).not.toBeNull();
      });

      for (const method of spec.requiredMethods) {
        it(`implements ${method}()`, () => {
          expect(typeof provider[method]).toBe('function');
        });
      }
    });
  }
});

// ─── ProviderRegistry unit tests ─────────────────────────────

describe('ProviderRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it('registers and retrieves a provider by type and name', () => {
    const mockProvider = {
      providerName: 'mock-git',
      capabilities: { branches: true },
      listBranches: () => Promise.resolve([]),
      createBranch: () => Promise.resolve({ branch: '', created: true }),
      listCommits: () => Promise.resolve([]),
      getDiff: () =>
        Promise.resolve({ files: [], stats: { additions: 0, deletions: 0, changed: 0 } }),
    };

    registry.registerProvider('git', 'mock', () => mockProvider);
    const result = registry.getProvider('git', 'mock');
    expect(result).toBe(mockProvider);
  });

  it('uses the first registered provider as default', () => {
    const p1 = {
      providerName: 'first',
      capabilities: {},
      listBranches: () => Promise.resolve([]),
      createBranch: () => Promise.resolve({ branch: '', created: true }),
      listCommits: () => Promise.resolve([]),
      getDiff: () => Promise.resolve({ files: [] }),
    };
    const p2 = {
      providerName: 'second',
      capabilities: {},
      listBranches: () => Promise.resolve([]),
      createBranch: () => Promise.resolve({ branch: '', created: true }),
      listCommits: () => Promise.resolve([]),
      getDiff: () => Promise.resolve({ files: [] }),
    };

    registry.registerProvider('git', 'first', () => p1);
    registry.registerProvider('git', 'second', () => p2);

    const result = registry.getProvider('git');
    expect(result.providerName).toBe('first');
  });

  it('setDefault changes the default provider', () => {
    const p1 = {
      providerName: 'first',
      capabilities: {},
      listBranches: () => Promise.resolve([]),
      createBranch: () => Promise.resolve({ branch: '', created: true }),
      listCommits: () => Promise.resolve([]),
      getDiff: () => Promise.resolve({ files: [] }),
    };
    const p2 = {
      providerName: 'second',
      capabilities: {},
      listBranches: () => Promise.resolve([]),
      createBranch: () => Promise.resolve({ branch: '', created: true }),
      listCommits: () => Promise.resolve([]),
      getDiff: () => Promise.resolve({ files: [] }),
    };

    registry.registerProvider('git', 'first', () => p1);
    registry.registerProvider('git', 'second', () => p2);
    registry.setDefault('git', 'second');

    expect(registry.getProvider('git').providerName).toBe('second');
  });

  it('throws when registering a duplicate', () => {
    registry.registerProvider('git', 'dup', () => ({
      providerName: 'dup',
      capabilities: {},
      listBranches: () => {},
      createBranch: () => {},
      listCommits: () => {},
      getDiff: () => {},
    }));
    expect(() => {
      registry.registerProvider('git', 'dup', () => ({}));
    }).toThrow(/already registered/);
  });

  it('throws when getting an unregistered provider', () => {
    expect(() => registry.getProvider('git', 'nope')).toThrow(/not found/i);
  });

  it('throws when getting a type with no default', () => {
    expect(() => registry.getProvider('security')).toThrow(/no provider registered/i);
  });

  it('resolves the first available provider from a fallback list', () => {
    const fallback = {
      providerName: 'fallback',
      capabilities: {},
      listBranches: () => Promise.resolve([]),
      createBranch: () => Promise.resolve({ branch: '', created: true }),
      listCommits: () => Promise.resolve([]),
      getDiff: () => Promise.resolve({ files: [] }),
    };

    registry.registerProvider('git', 'fallback', () => fallback);

    const result = registry.getProviderWithFallback('git', {
      primaryName: 'missing-primary',
      fallbackNames: ['fallback'],
    });

    expect(result).toBe(fallback);
  });

  it('throws when all fallback providers fail', () => {
    registry.registerProvider('git', 'broken', () => ({ noName: true }));

    expect(() =>
      registry.getProviderWithFallback('git', {
        primaryName: 'missing-primary',
        fallbackNames: ['broken'],
      })
    ).toThrow(/No available provider for type git/i);
  });

  it('throws setDefault for unregistered provider', () => {
    expect(() => registry.setDefault('git', 'nope')).toThrow(/no provider registered/i);
  });

  it('validates provider at instantiation — rejects invalid', () => {
    registry.registerProvider('git', 'bad', () => ({ noName: true }));
    expect(() => registry.getProvider('git', 'bad')).toThrow(/failed validation/i);
  });

  it('hasProvider returns true/false correctly', () => {
    expect(registry.hasProvider('git')).toBe(false);

    registry.registerProvider('git', 'test', () => ({
      providerName: 't',
      capabilities: {},
      listBranches: () => {},
      createBranch: () => {},
      listCommits: () => {},
      getDiff: () => {},
    }));

    expect(registry.hasProvider('git')).toBe(true);
    expect(registry.hasProvider('git', 'test')).toBe(true);
    expect(registry.hasProvider('git', 'other')).toBe(false);
  });

  it('listProviders returns all registered entries', () => {
    registry.registerProvider('git', 'a', () => ({
      providerName: 'a',
      capabilities: {},
      listBranches: () => {},
      createBranch: () => {},
      listCommits: () => {},
      getDiff: () => {},
    }));
    registry.registerProvider('llm', 'b', () => ({
      providerName: 'b',
      capabilities: {},
      complete: () => {},
      listModels: () => {},
    }));

    const list = registry.listProviders();
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ type: 'git', name: 'a', isDefault: true });
    expect(list[1]).toEqual({ type: 'llm', name: 'b', isDefault: true });
  });

  it('listByType filters by type', () => {
    registry.registerProvider('llm', 'x', () => ({
      providerName: 'x',
      capabilities: {},
      complete: () => {},
      listModels: () => {},
    }));
    registry.registerProvider('llm', 'y', () => ({
      providerName: 'y',
      capabilities: {},
      complete: () => {},
      listModels: () => {},
    }));
    registry.registerProvider('git', 'z', () => ({
      providerName: 'z',
      capabilities: {},
      listBranches: () => {},
      createBranch: () => {},
      listCommits: () => {},
      getDiff: () => {},
    }));

    expect(registry.listByType('llm')).toEqual(['x', 'y']);
    expect(registry.listByType('git')).toEqual(['z']);
    expect(registry.listByType('security')).toEqual([]);
  });

  it('unregister removes the entry and clears default', () => {
    registry.registerProvider('git', 'rm', () => ({
      providerName: 'rm',
      capabilities: {},
      listBranches: () => {},
      createBranch: () => {},
      listCommits: () => {},
      getDiff: () => {},
    }));

    expect(registry.unregister('git', 'rm')).toBe(true);
    expect(registry.hasProvider('git')).toBe(false);
    expect(registry.unregister('git', 'rm')).toBe(false);
  });

  it('clear removes everything', () => {
    registry.registerProvider('git', 'c', () => ({
      providerName: 'c',
      capabilities: {},
      listBranches: () => {},
      createBranch: () => {},
      listCommits: () => {},
      getDiff: () => {},
    }));
    registry.clear();
    expect(registry.listProviders()).toEqual([]);
    expect(registry.hasProvider('git')).toBe(false);
  });

  it('reuses cached provider instance when config is not passed', () => {
    const factory = vi.fn(() => ({
      providerName: 'cached-git',
      capabilities: {},
      listBranches: () => {},
      createBranch: () => {},
      listCommits: () => {},
      getDiff: () => {},
    }));

    registry.registerProvider('git', 'cached', factory);

    const first = registry.getProvider('git', 'cached');
    const second = registry.getProvider('git', 'cached');

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('re-instantiates provider when config is passed', () => {
    const factory = vi.fn((config) => ({
      providerName: 'cfg-git',
      capabilities: { config },
      listBranches: () => {},
      createBranch: () => {},
      listCommits: () => {},
      getDiff: () => {},
    }));

    registry.registerProvider('git', 'cfg', factory);

    const first = registry.getProvider('git', 'cfg', { token: 'a' });
    const second = registry.getProvider('git', 'cfg', { token: 'b' });

    expect(first).not.toBe(second);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('getProviderWithFallback ignores empty names and de-duplicates repeated names', () => {
    const provider = {
      providerName: 'dedupe-git',
      capabilities: {},
      listBranches: () => {},
      createBranch: () => {},
      listCommits: () => {},
      getDiff: () => {},
    };
    const factory = vi.fn(() => provider);
    registry.registerProvider('git', 'a', factory);

    const result = registry.getProviderWithFallback('git', {
      primaryName: 'a',
      fallbackNames: ['', 'a', 'a', ''],
    });

    expect(result).toBe(provider);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('getProviderWithFallback throws when no primary, no fallback, and no default exist', () => {
    expect(() => registry.getProviderWithFallback('git', {})).toThrow(
      /No provider registered for type: git/i
    );
  });
});

describe('probeProviderHealth', () => {
  const originalOpenAi = process.env.OPENAI_API_KEY;
  const originalAnthropic = process.env.ANTHROPIC_API_KEY;
  const originalGithub = process.env.GITHUB_TOKEN;

  afterEach(() => {
    if (originalOpenAi === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenAi;
    }
    if (originalAnthropic === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalAnthropic;
    }
    if (originalGithub === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalGithub;
    }
  });

  it('returns healthy for unknown providers', () => {
    expect(probeProviderHealth('local')).toEqual({ healthy: true });
    expect(probeProviderHealth('some-custom-provider')).toEqual({ healthy: true });
  });

  it('returns unhealthy when required key is missing', () => {
    delete process.env.OPENAI_API_KEY;
    expect(probeProviderHealth('openai')).toEqual({
      healthy: false,
      reason: 'OPENAI_API_KEY is not set',
    });
  });

  it('returns unhealthy when required key is blank/whitespace', () => {
    process.env.ANTHROPIC_API_KEY = '   ';
    expect(probeProviderHealth('anthropic')).toEqual({
      healthy: false,
      reason: 'ANTHROPIC_API_KEY is not set',
    });
  });

  it('returns healthy when required key is present', () => {
    process.env.GITHUB_TOKEN = 'token-123';
    expect(probeProviderHealth('copilot')).toEqual({ healthy: true });
  });
});

describe('buildLlmFallbackPolicy', () => {
  const originalOpenAi = process.env.OPENAI_API_KEY;
  const originalAnthropic = process.env.ANTHROPIC_API_KEY;
  const originalGithub = process.env.GITHUB_TOKEN;

  afterEach(() => {
    if (originalOpenAi === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenAi;
    }
    if (originalAnthropic === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalAnthropic;
    }
    if (originalGithub === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalGithub;
    }
  });

  it('chooses first healthy provider as primary and orders fallbacks', () => {
    process.env.OPENAI_API_KEY = 'openai-key';
    delete process.env.ANTHROPIC_API_KEY;
    process.env.GITHUB_TOKEN = 'gh-key';

    const policy = buildLlmFallbackPolicy();
    expect(policy).toEqual({
      primaryName: 'openai',
      fallbackNames: ['copilot', 'anthropic'],
      localFallback: true,
    });
  });

  it('falls back to local when no provider keys are set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GITHUB_TOKEN;

    const policy = buildLlmFallbackPolicy();
    expect(policy).toEqual({
      primaryName: 'local',
      fallbackNames: ['openai', 'anthropic', 'copilot'],
      localFallback: true,
    });
  });

  it('applies overrides for primary/fallback/localFallback', () => {
    process.env.OPENAI_API_KEY = 'openai-key';
    process.env.ANTHROPIC_API_KEY = 'anthropic-key';
    process.env.GITHUB_TOKEN = 'gh-key';

    const policy = buildLlmFallbackPolicy({
      primaryName: 'copilot',
      fallbackNames: ['anthropic'],
      localFallback: false,
    });

    expect(policy).toEqual({
      primaryName: 'copilot',
      fallbackNames: ['anthropic'],
      localFallback: false,
    });
  });
});

// ─── createDefaultRegistry ──────────────────────────────────

describe('createDefaultRegistry', () => {
  let registry;

  beforeAll(() => {
    registry = createDefaultRegistry();
  });

  it('registers providers for git, container, testing, and llm', () => {
    expect(registry.hasProvider('git')).toBe(true);
    expect(registry.hasProvider('container')).toBe(true);
    expect(registry.hasProvider('testing')).toBe(true);
    expect(registry.hasProvider('llm')).toBe(true);
  });

  it('has github as default git provider', () => {
    expect(registry.hasProvider('git', 'github')).toBe(true);
  });

  it('has docker as default container provider', () => {
    expect(registry.hasProvider('container', 'docker')).toBe(true);
  });

  it('has vitest as default testing provider', () => {
    expect(registry.hasProvider('testing', 'vitest')).toBe(true);
  });

  it('has four LLM providers registered', () => {
    const llmList = registry.listByType('llm');
    expect(llmList).toContain('openai');
    expect(llmList).toContain('anthropic');
    expect(llmList).toContain('copilot');
    expect(llmList).toContain('local');
    expect(llmList).toHaveLength(4);
  });

  it('does not pre-register security, cloud, ci, or tool', () => {
    expect(registry.hasProvider('security')).toBe(false);
    expect(registry.hasProvider('cloud')).toBe(false);
    expect(registry.hasProvider('ci')).toBe(false);
    expect(registry.hasProvider('tool')).toBe(false);
  });
});

// ─── LocalLLMProvider ───────────────────────────────────────────────────────────────────

describe('LocalLLMProvider', () => {
  let provider;

  beforeAll(() => {
    provider = new LocalLLMProvider();
  });

  it('reports providerName as "local"', () => {
    expect(provider.providerName).toBe('local');
  });

  it('is always available (no API key required)', () => {
    expect(provider.isAvailable()).toBe(true);
  });

  it('complete() returns content with LOCAL_MODE marker', async () => {
    const result = await provider.complete({
      messages: [{ role: 'user', content: 'Hello world' }],
    });
    expect(result.content).toContain('[LOCAL_MODE');
    expect(result.finishReason).toBe('local_fallback');
    expect(result.model).toBe('local');
  });

  it('complete() echoes a snippet of the user prompt', async () => {
    const result = await provider.complete({
      messages: [{ role: 'user', content: 'Echo this back to me' }],
    });
    expect(result.content).toContain('Echo this back to me');
  });

  it('stream() calls onChunk with the full content', async () => {
    const chunks = [];
    const result = await provider.stream(
      { messages: [{ role: 'user', content: 'stream test' }] },
      (chunk) => chunks.push(chunk)
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain('[LOCAL_MODE');
    expect(result.content).toBe(chunks[0]);
  });

  it('embed() throws unsupported', async () => {
    await expect(provider.embed({ text: 'test' })).rejects.toThrow(/does not support embeddings/i);
  });

  it('listModels() returns ["local"]', async () => {
    const models = await provider.listModels();
    expect(models).toEqual(['local']);
  });

  it('accepts a custom label via config', async () => {
    const labelled = new LocalLLMProvider({ label: 'ci-stub' });
    const result = await labelled.complete({
      messages: [{ role: 'user', content: 'test' }],
    });
    expect(result.content).toContain('[LOCAL_MODE:ci-stub]');
    expect(result.model).toBe('ci-stub');
  });
});

// ─── probeProviderHealth ─────────────────────────────────────────────────────────

describe('probeProviderHealth', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    // Restore env after each test
    for (const key of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GITHUB_TOKEN']) {
      if (origEnv[key] !== undefined) {
        process.env[key] = origEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  it('reports healthy for "local" with no env var required', () => {
    const result = probeProviderHealth('local');
    expect(result.healthy).toBe(true);
  });

  it('reports unhealthy for "openai" when OPENAI_API_KEY is absent', () => {
    delete process.env.OPENAI_API_KEY;
    const result = probeProviderHealth('openai');
    expect(result.healthy).toBe(false);
    expect(result.reason).toMatch(/OPENAI_API_KEY/);
  });

  it('reports healthy for "openai" when OPENAI_API_KEY is set', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    const result = probeProviderHealth('openai');
    expect(result.healthy).toBe(true);
  });

  it('reports unhealthy for "anthropic" when ANTHROPIC_API_KEY is absent', () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = probeProviderHealth('anthropic');
    expect(result.healthy).toBe(false);
    expect(result.reason).toMatch(/ANTHROPIC_API_KEY/);
  });

  it('reports unhealthy for "copilot" when GITHUB_TOKEN is absent', () => {
    delete process.env.GITHUB_TOKEN;
    const result = probeProviderHealth('copilot');
    expect(result.healthy).toBe(false);
    expect(result.reason).toMatch(/GITHUB_TOKEN/);
  });

  it('reports healthy for unknown provider name (no known key to check)', () => {
    const result = probeProviderHealth('some-unknown-provider');
    expect(result.healthy).toBe(true);
  });
});

// ─── buildLlmFallbackPolicy ────────────────────────────────────────────────────────

describe('buildLlmFallbackPolicy', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    for (const key of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GITHUB_TOKEN']) {
      if (origEnv[key] !== undefined) {
        process.env[key] = origEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  it('sets localFallback to true by default', () => {
    const policy = buildLlmFallbackPolicy();
    expect(policy.localFallback).toBe(true);
  });

  it('uses only openai as primary when only OPENAI_API_KEY is set', () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GITHUB_TOKEN;
    process.env.OPENAI_API_KEY = 'sk-test';
    const policy = buildLlmFallbackPolicy();
    expect(policy.primaryName).toBe('openai');
    expect(policy.fallbackNames).not.toContain('openai');
  });

  it('falls back to "local" as primary when no keys are set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GITHUB_TOKEN;
    const policy = buildLlmFallbackPolicy();
    expect(policy.primaryName).toBe('local');
  });

  it('respects primaryName override', () => {
    const policy = buildLlmFallbackPolicy({ primaryName: 'copilot' });
    expect(policy.primaryName).toBe('copilot');
  });

  it('respects fallbackNames override', () => {
    const policy = buildLlmFallbackPolicy({ fallbackNames: ['anthropic'] });
    expect(policy.fallbackNames).toEqual(['anthropic']);
  });

  it('can disable local fallback', () => {
    const policy = buildLlmFallbackPolicy({ localFallback: false });
    expect(policy.localFallback).toBe(false);
  });
});
