// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const fs = require('node:fs');

const MODULES_TO_RESET = [
  '../../src/webapp/server',
  '../../src/webapp/config',
  '../../src/webapp/auth',
  '../../src/webapp/redis',
  '../../src/webapp/runtime-profiles',
];

const ENV_KEYS = [
  'RAG_FRESHNESS_HEALTH_INTERVAL_MS',
  'RAG_FRESHNESS_STALE_SEC',
  'RAG_WATCH_DEBOUNCE_MS',
  'RAG_WATCH_ENABLED',
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

describe('server RAG freshness configuration', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = {};
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  });

  afterEach(() => {
    vi.useRealTimers();
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    try {
      const { __testing } = require('../../src/webapp/server');
      __testing.resetRagFreshnessState();
    } catch {
      // Server module may not have been loaded.
    }
    resetModuleCache();
  });

  it('reads env overrides for freshness interval and watch debounce', () => {
    setEnv({
      RAG_FRESHNESS_HEALTH_INTERVAL_MS: '120000',
      RAG_FRESHNESS_STALE_SEC: '1800',
      RAG_WATCH_DEBOUNCE_MS: '2500',
      RAG_WATCH_ENABLED: 'false',
    });

    const { __testing } = loadServerModule();

    expect(__testing.getRagFreshnessConfig()).toEqual({
      intervalMs: 120000,
      staleSec: 1800,
      debounceMs: 2500,
      watchEnabled: false,
    });
  });

  it('falls back to defaults when env values are invalid', () => {
    setEnv({
      RAG_FRESHNESS_HEALTH_INTERVAL_MS: '0',
      RAG_FRESHNESS_STALE_SEC: '-1',
      RAG_WATCH_DEBOUNCE_MS: 'abc',
      RAG_WATCH_ENABLED: 'TRUE',
    });

    const { __testing } = loadServerModule();

    expect(__testing.getRagFreshnessConfig()).toEqual({
      intervalMs: 300000,
      staleSec: 3600,
      debounceMs: 5000,
      watchEnabled: true,
    });
  });

  it('does not register filesystem watchers when disabled via env', () => {
    setEnv({ RAG_WATCH_ENABLED: 'false' });

    const { __testing } = loadServerModule();
    __testing.setupRagFreshnessWatchers();

    expect(__testing.getRagWatcherCount()).toBe(0);
  });

  it('debounces repeated watch-triggered freshness passes', async () => {
    setEnv({ RAG_WATCH_DEBOUNCE_MS: '25' });
    vi.useFakeTimers();

    const { __testing } = loadServerModule();
    const invocations = [];
    __testing.setRagFreshnessPassTrigger(async () => {
      invocations.push(Date.now());
    });

    __testing.queueRagFreshnessPass('fs:first');
    vi.advanceTimersByTime(10);
    __testing.queueRagFreshnessPass('fs:second');
    vi.advanceTimersByTime(24);
    await Promise.resolve();

    expect(invocations).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1);

    expect(invocations).toHaveLength(1);
  });

  it('queues exactly one follow-up freshness pass while one is still running', async () => {
    const { __testing } = loadServerModule();
    const started = [];
    let releaseFirstPass;

    __testing.setRagFreshnessPassExecutor(
      () =>
        new Promise((resolve) => {
          started.push('pass');
          if (started.length === 1) {
            releaseFirstPass = resolve;
            return;
          }
          resolve();
        })
    );

    const firstPass = __testing.runRagFreshnessHealthPass();
    await Promise.resolve();

    const secondPass = __testing.runRagFreshnessHealthPass();
    const thirdPass = __testing.runRagFreshnessHealthPass();
    await Promise.resolve();

    expect(started).toHaveLength(1);

    releaseFirstPass();
    await firstPass;
    await secondPass;
    await thirdPass;

    expect(started).toHaveLength(2);
  });

  it('registers one watcher per unique monitored path when enabled', () => {
    setEnv({ RAG_WATCH_ENABLED: 'true' });

    const originalExistsSync = fs.existsSync;
    const originalStatSync = fs.statSync;
    const originalWatch = fs.watch;
    const watcher = {
      on: vi.fn(() => watcher),
      close: vi.fn(),
    };

    fs.existsSync = vi.fn(() => true);
    fs.statSync = vi.fn((targetPath) => ({
      isDirectory: () => String(targetPath).endsWith('src') || !String(targetPath).includes('.'),
    }));
    fs.watch = vi.fn(() => watcher);

    try {
      const { __testing } = loadServerModule();
      __testing.setupRagFreshnessWatchers();

      expect(__testing.getRagWatcherCount()).toBe(9);
      expect(fs.watch).toHaveBeenCalledTimes(9);
    } finally {
      fs.existsSync = originalExistsSync;
      fs.statSync = originalStatSync;
      fs.watch = originalWatch;
    }
  });
});
