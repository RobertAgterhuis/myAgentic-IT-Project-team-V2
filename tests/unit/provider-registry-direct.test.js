'use strict';

const {
  ProviderRegistry,
  createDefaultRegistry,
  probeProviderHealth,
  buildLlmFallbackPolicy,
} = require('../../platform/sdlc/adapters/registry');

function makeGitProvider(name = 'git-provider') {
  return {
    providerName: name,
    capabilities: {},
    listBranches: () => Promise.resolve([]),
    createBranch: () => Promise.resolve({ branch: 'x', created: true }),
    listCommits: () => Promise.resolve([]),
    getDiff: () => Promise.resolve({ files: [] }),
  };
}

describe('ProviderRegistry (direct import coverage)', () => {
  let registry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it('keeps first provider as default until changed', () => {
    registry.registerProvider('git', 'first', () => makeGitProvider('first'));
    registry.registerProvider('git', 'second', () => makeGitProvider('second'));

    expect(registry.getProvider('git').providerName).toBe('first');
  });

  it('throws when setDefault points to unknown provider', () => {
    expect(() => registry.setDefault('git', 'missing')).toThrow(/No provider registered/i);
  });

  it('throws when no default provider exists for type', () => {
    expect(() => registry.getProvider('llm')).toThrow(/No provider registered for type: llm/i);
  });

  it('throws when provider name exists as default but not in entries', () => {
    registry.registerProvider('git', 'only', () => makeGitProvider('only'));
    registry.setDefault('git', 'only');
    registry.unregister('git', 'only');

    expect(() => registry.getProvider('git', 'only')).toThrow(/Provider not found/i);
  });

  it('throws validation error when factory returns null', () => {
    registry.registerProvider('git', 'bad', () => null);
    expect(() => registry.getProvider('git', 'bad')).toThrow(/non-null object/i);
  });

  it('throws validation error when required methods are missing', () => {
    registry.registerProvider('git', 'bad-methods', () => ({
      providerName: 'bad-methods',
      capabilities: {},
      listBranches: () => Promise.resolve([]),
    }));

    expect(() => registry.getProvider('git', 'bad-methods')).toThrow(/missing required method/i);
  });

  it('reuses instance when called repeatedly without config', () => {
    const factory = vi.fn(() => makeGitProvider('cached'));
    registry.registerProvider('git', 'cached', factory);

    const a = registry.getProvider('git', 'cached');
    const b = registry.getProvider('git', 'cached');

    expect(a).toBe(b);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('recreates instance when config is provided', () => {
    const factory = vi.fn((config) => ({ ...makeGitProvider('cfg'), config }));
    registry.registerProvider('git', 'cfg', factory);

    const a = registry.getProvider('git', 'cfg', { one: 1 });
    const b = registry.getProvider('git', 'cfg', { two: 2 });

    expect(a).not.toBe(b);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('fallback throws when all candidates are filtered out', () => {
    expect(() =>
      registry.getProviderWithFallback('git', { primaryName: '', fallbackNames: ['', ''] })
    ).toThrow(/No provider registered for type: git/i);
  });

  it('fallback captures non-Error throws in failure messages', () => {
    registry.registerProvider('git', 'string-throw', () => {
      throw 'boom-string';
    });

    expect(() =>
      registry.getProviderWithFallback('git', {
        primaryName: 'string-throw',
        fallbackNames: [],
      })
    ).toThrow(/boom-string/);
  });

  it('hasProvider and listByType respond correctly for empty and populated registry', () => {
    expect(registry.hasProvider('git')).toBe(false);
    expect(registry.listByType('git')).toEqual([]);

    registry.registerProvider('git', 'a', () => makeGitProvider('a'));
    expect(registry.hasProvider('git')).toBe(true);
    expect(registry.hasProvider('git', 'a')).toBe(true);
    expect(registry.listByType('git')).toEqual(['a']);
  });

  it('unregister removes default when removed entry was default', () => {
    registry.registerProvider('git', 'a', () => makeGitProvider('a'));
    expect(registry.hasProvider('git')).toBe(true);

    expect(registry.unregister('git', 'a')).toBe(true);
    expect(registry.hasProvider('git')).toBe(false);
  });
});

describe('probeProviderHealth (direct import coverage)', () => {
  const original = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    github: process.env.GITHUB_TOKEN,
  };

  afterEach(() => {
    if (original.openai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = original.openai;

    if (original.anthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = original.anthropic;

    if (original.github === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = original.github;
  });

  it('returns healthy for unknown provider', () => {
    expect(probeProviderHealth('local')).toEqual({ healthy: true });
  });

  it('returns unhealthy when key is missing/blank and healthy when set', () => {
    delete process.env.OPENAI_API_KEY;
    expect(probeProviderHealth('openai')).toEqual({
      healthy: false,
      reason: 'OPENAI_API_KEY is not set',
    });

    process.env.OPENAI_API_KEY = '  ';
    expect(probeProviderHealth('openai')).toEqual({
      healthy: false,
      reason: 'OPENAI_API_KEY is not set',
    });

    process.env.OPENAI_API_KEY = 'set';
    expect(probeProviderHealth('openai')).toEqual({ healthy: true });
  });
});

describe('buildLlmFallbackPolicy (direct import coverage)', () => {
  const original = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    github: process.env.GITHUB_TOKEN,
  };

  afterEach(() => {
    if (original.openai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = original.openai;

    if (original.anthropic === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = original.anthropic;

    if (original.github === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = original.github;
  });

  it('builds policy from available provider env keys', () => {
    process.env.OPENAI_API_KEY = 'openai';
    delete process.env.ANTHROPIC_API_KEY;
    process.env.GITHUB_TOKEN = 'gh';

    const policy = buildLlmFallbackPolicy();
    expect(policy.primaryName).toBe('openai');
    expect(policy.fallbackNames).toEqual(['copilot', 'anthropic']);
    expect(policy.localFallback).toBe(true);
  });

  it('uses local primary with unavailable providers as fallback list', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GITHUB_TOKEN;

    const policy = buildLlmFallbackPolicy();
    expect(policy.primaryName).toBe('local');
    expect(policy.fallbackNames).toEqual(['openai', 'anthropic', 'copilot']);
  });

  it('applies explicit overrides', () => {
    const policy = buildLlmFallbackPolicy({
      primaryName: 'copilot',
      fallbackNames: ['openai'],
      localFallback: false,
    });

    expect(policy).toEqual({
      primaryName: 'copilot',
      fallbackNames: ['openai'],
      localFallback: false,
    });
  });
});

describe('createDefaultRegistry (direct import coverage)', () => {
  it('registers built-in provider names by type', () => {
    const registry = createDefaultRegistry();

    expect(registry.listByType('git')).toContain('github');
    expect(registry.listByType('container')).toContain('docker');
    expect(registry.listByType('testing')).toContain('vitest');
    expect(registry.listByType('llm')).toEqual(
      expect.arrayContaining(['openai', 'anthropic', 'copilot', 'local'])
    );
  });

  it('can instantiate local llm provider from default registry', () => {
    const registry = createDefaultRegistry();
    const local = registry.getProvider('llm', 'local', { label: 'direct-test' });

    expect(local.providerName).toBe('local');
    expect(typeof local.complete).toBe('function');
  });
});
