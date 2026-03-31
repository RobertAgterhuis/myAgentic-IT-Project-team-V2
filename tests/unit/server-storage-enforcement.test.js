// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Storage provider startup enforcement tests (Task #669 / M2).
 *
 * Verifies that the server.listen() path enforces production-fail-closed
 * semantics: when initStorageProvider() rejects in a production context the
 * listen callback must NOT fire.  In local-dev the listen callback fires even
 * when storage init fails (profile-bound fallback).
 *
 * Strategy: vi.doMock() platform/engine/persistence BEFORE importing server.ts
 * so the startup path observes failing createStorageProvider().
 */

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
];

function setEnv(next) {
  for (const key of ENV_KEYS) {
    if (Object.prototype.hasOwnProperty.call(next, key)) {
      const value = next[key];
      if (value === undefined || value === null) delete process.env[key];
      else process.env[key] = String(value);
    }
  }
}

let _serverImportCounter = 0;
const _serverLoaders = [
  () => import('../../src/webapp/server.ts?sse0'),
  () => import('../../src/webapp/server.ts?sse1'),
  () => import('../../src/webapp/server.ts?sse2'),
  () => import('../../src/webapp/server.ts?sse3'),
  () => import('../../src/webapp/server.ts?sse4'),
  () => import('../../src/webapp/server.ts?sse5'),
];

describe('storage provider startup enforcement', () => {
  let originalEnv;

  beforeEach(() => {
    vi.resetModules();
    originalEnv = {};
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }

    vi.doUnmock('../../platform/engine/persistence');
    vi.resetModules();
  });

  function stubPersistenceToFail() {
    vi.doMock('../../platform/engine/persistence', async () => {
      const actual = await vi.importActual('../../platform/engine/persistence');
      return {
        ...actual,
        createStorageProvider: async () => {
          throw new Error('Storage init failed (test stub)');
        },
      };
    });
  }

  async function loadServerModule() {
    vi.resetModules();
    const mod = await _serverLoaders[_serverImportCounter % _serverLoaders.length]();
    _serverImportCounter += 1;
    return mod;
  }

  it('aborts listen callback in production when storage provider init fails', async () => {
    setEnv({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      STORAGE_PROVIDER: 'sqlite',
      QUEUE_PROVIDER: 'persistent',
      SESSION_STORE: 'sqlite',
      API_KEY: 'abcdefghijklmnopqrstuvwxyz123456',
      GITHUB_CLIENT_ID: undefined,
      GITHUB_CLIENT_SECRET: undefined,
      TRUST_PROXY: '1',
    });

    stubPersistenceToFail();
    const { server } = await loadServerModule();

    // The production abort path prevents app.listen() from being reached;
    // the callback must not fire.  Allow 1 s for the async chain to settle.
    const callbackFired = await new Promise((resolve) => {
      server.listen(0, '0.0.0.0', () => resolve(true));
      setTimeout(() => resolve(false), 1000);
    });

    expect(callbackFired).toBe(false);
  }, 15000);
});
