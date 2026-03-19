// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Storage provider startup enforcement tests (Task #669 / M2).
 *
 * Verifies that the server.listen() path enforces production-fail-closed
 * semantics: when initStorageProvider() rejects in a production context the
 * listen callback must NOT fire.  In local-dev the listen callback fires even
 * when storage init fails (profile-bound fallback).
 *
 * Strategy: swap out platform/engine/persistence/index exports in the require
 * cache BEFORE loading server.ts so the freshly-required server picks up the
 * stub.  This avoids touching the real SQLite/file backends during test runs.
 */

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
];

function resetModuleCache() {
  for (const mod of MODULES_TO_RESET) {
    try {
      delete require.cache[require.resolve(mod)];
    } catch {
      // Module may not be in cache yet.
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

describe('storage provider startup enforcement', () => {
  let originalEnv;
  let persistencePath;
  let savedPersistenceExports;

  beforeEach(() => {
    originalEnv = {};
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];

    // Resolve the persistence module path and save its current exports so we
    // can restore them after each test.
    persistencePath = require.resolve('../../platform/engine/persistence/index');
    if (!require.cache[persistencePath]) {
      require('../../platform/engine/persistence/index');
    }
    savedPersistenceExports = require.cache[persistencePath]?.exports;
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }

    // Restore the real persistence module exports.
    if (require.cache[persistencePath] && savedPersistenceExports) {
      require.cache[persistencePath].exports = savedPersistenceExports;
    }
    resetModuleCache();
  });

  function stubPersistenceToFail() {
    if (!require.cache[persistencePath]) {
      require('../../platform/engine/persistence/index');
    }
    require.cache[persistencePath].exports = {
      ...require.cache[persistencePath].exports,
      createStorageProvider: async () => {
        throw new Error('Storage init failed (test stub)');
      },
    };
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
    resetModuleCache();
    const { server } = require('../../src/webapp/server');

    // The production abort path prevents app.listen() from being reached;
    // the callback must not fire.  Allow 1 s for the async chain to settle.
    const callbackFired = await new Promise((resolve) => {
      server.listen(0, '0.0.0.0', () => resolve(true));
      setTimeout(() => resolve(false), 1000);
    });

    expect(callbackFired).toBe(false);
  }, 5000);
});
