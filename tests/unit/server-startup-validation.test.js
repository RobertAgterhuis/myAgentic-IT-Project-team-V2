// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const MODULES_TO_RESET = [
  '../../src/webapp/server',
  '../../src/webapp/config',
  '../../src/webapp/auth',
  '../../src/webapp/redis',
  '../../src/webapp/runtime-profiles',
];

const ENV_KEYS = [
  'NODE_ENV',
  'HOST',
  'STORAGE_PROVIDER',
  'STORAGE_PATH',
  'QUEUE_PROVIDER',
  'SESSION_STORE',
  'REDIS_URL',
  'API_KEY',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'TRUST_PROXY',
  'ENFORCE_PREDECESSOR_CONTRACT_CONTINUITY',
];

function resetModuleCache() {
  for (const mod of MODULES_TO_RESET) {
    try {
      delete require.cache[require.resolve(mod)];
    } catch {
      // Module may not be loaded in this test path.
    }
  }
}

function setEnv(next) {
  for (const key of ENV_KEYS) {
    if (Object.prototype.hasOwnProperty.call(next, key)) {
      const value = next[key];
      if (value === undefined || value === null) delete process.env[key];
      else process.env[key] = String(value);
    }
  }
}

function loadServerModule() {
  resetModuleCache();
  return require('../../src/webapp/server');
}

describe('startup runtime profile validation', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = {};
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    resetModuleCache();
  });

  it('accepts local-dev defaults', () => {
    setEnv({
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      STORAGE_PROVIDER: 'file',
      QUEUE_PROVIDER: 'memory',
      SESSION_STORE: 'sqlite',
      API_KEY: undefined,
      GITHUB_CLIENT_ID: undefined,
      GITHUB_CLIENT_SECRET: undefined,
      TRUST_PROXY: undefined,
    });

    const { validateStartupRuntimeProfile } = loadServerModule();
    expect(() => validateStartupRuntimeProfile()).not.toThrow();
  });

  it('rejects production profile when storage provider is invalid', () => {
    setEnv({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      STORAGE_PROVIDER: 'file',
      QUEUE_PROVIDER: 'persistent',
      SESSION_STORE: 'sqlite',
      API_KEY: 'abcdefghijklmnopqrstuvwxyz123456',
      TRUST_PROXY: '1',
    });

    const { validateStartupRuntimeProfile } = loadServerModule();
    expect(() => validateStartupRuntimeProfile()).toThrow(
      /RUNTIME_PROFILE_INVALID|STORAGE_PROVIDER/
    );
  });

  it('rejects production profile when TRUST_PROXY is implicit', () => {
    setEnv({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      STORAGE_PROVIDER: 'sqlite',
      QUEUE_PROVIDER: 'persistent',
      SESSION_STORE: 'sqlite',
      API_KEY: 'abcdefghijklmnopqrstuvwxyz123456',
      TRUST_PROXY: 'true',
    });

    const { validateStartupRuntimeProfile } = loadServerModule();
    expect(() => validateStartupRuntimeProfile()).toThrow(/RUNTIME_PROFILE_INVALID|TRUST_PROXY/);
  });

  it('accepts valid production-single-node profile', () => {
    setEnv({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      STORAGE_PROVIDER: 'sqlite',
      QUEUE_PROVIDER: 'persistent',
      SESSION_STORE: 'sqlite',
      API_KEY: 'abcdefghijklmnopqrstuvwxyz123456',
      TRUST_PROXY: '1',
    });

    const { validateStartupRuntimeProfile } = loadServerModule();
    expect(() => validateStartupRuntimeProfile()).not.toThrow();
  });

  it('returns strict predecessor continuity by default in production profile', () => {
    setEnv({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      STORAGE_PROVIDER: 'sqlite',
      QUEUE_PROVIDER: 'persistent',
      SESSION_STORE: 'sqlite',
      API_KEY: 'abcdefghijklmnopqrstuvwxyz123456',
      TRUST_PROXY: '1',
      ENFORCE_PREDECESSOR_CONTRACT_CONTINUITY: undefined,
    });

    const { validateStartupRuntimeProfile } = loadServerModule();
    const result = validateStartupRuntimeProfile();

    expect(result.profile).toBe('production-single-node');
    expect(result.predecessorContractContinuity).toEqual({
      mode: true,
      source: 'profile-default',
    });
  });
});
