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
  ProviderRegistry,
  createDefaultRegistry,
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

  it('has three LLM providers registered', () => {
    const llmList = registry.listByType('llm');
    expect(llmList).toContain('openai');
    expect(llmList).toContain('anthropic');
    expect(llmList).toContain('copilot');
    expect(llmList).toHaveLength(3);
  });

  it('does not pre-register security, cloud, ci, or tool', () => {
    expect(registry.hasProvider('security')).toBe(false);
    expect(registry.hasProvider('cloud')).toBe(false);
    expect(registry.hasProvider('ci')).toBe(false);
    expect(registry.hasProvider('tool')).toBe(false);
  });
});
