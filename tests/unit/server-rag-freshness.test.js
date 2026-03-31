// Copyright (c) 2026 Robert Agterhuis. MIT License.
import fs from 'node:fs';

vi.mock('../../src/webapp/services/rag/embedding-provider', () => ({
  createEmbeddingProvider: () => ({
    embedText: async () => [0.1, 0.2, 0.3],
  }),
}));

const ENV_KEYS = [
  'RAG_FRESHNESS_HEALTH_INTERVAL_MS',
  'RAG_FRESHNESS_STALE_SEC',
  'RAG_WATCH_DEBOUNCE_MS',
  'RAG_WATCH_ENABLED',
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

let _lastLoadedServerModule = null;
let _serverImportCounter = 0;

const _serverLoaders = [
  () => import('../../src/webapp/server.ts?rgf0'),
  () => import('../../src/webapp/server.ts?rgf1'),
  () => import('../../src/webapp/server.ts?rgf2'),
  () => import('../../src/webapp/server.ts?rgf3'),
  () => import('../../src/webapp/server.ts?rgf4'),
  () => import('../../src/webapp/server.ts?rgf5'),
  () => import('../../src/webapp/server.ts?rgf6'),
  () => import('../../src/webapp/server.ts?rgf7'),
  () => import('../../src/webapp/server.ts?rgf8'),
  () => import('../../src/webapp/server.ts?rgf9'),
  () => import('../../src/webapp/server.ts?rgf10'),
  () => import('../../src/webapp/server.ts?rgf11'),
];

async function loadServerModule() {
  vi.resetModules();
  _lastLoadedServerModule = await _serverLoaders[_serverImportCounter % _serverLoaders.length]();
  _serverImportCounter += 1;
  return _lastLoadedServerModule;
}

describe('server RAG freshness configuration', () => {
  const itSlow = (name, fn) => it(name, fn, 120000);
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
    if (_lastLoadedServerModule?.__testing?.resetRagFreshnessState) {
      _lastLoadedServerModule.__testing.resetRagFreshnessState();
    }
    _lastLoadedServerModule = null;
  });

  itSlow('reads env overrides for freshness interval and watch debounce', async () => {
    setEnv({
      RAG_FRESHNESS_HEALTH_INTERVAL_MS: '120000',
      RAG_FRESHNESS_STALE_SEC: '1800',
      RAG_WATCH_DEBOUNCE_MS: '2500',
      RAG_WATCH_ENABLED: 'false',
    });

    const { __testing } = await loadServerModule();

    expect(__testing.getRagFreshnessConfig()).toEqual({
      intervalMs: 120000,
      staleSec: 1800,
      debounceMs: 2500,
      watchEnabled: false,
    });
  });

  itSlow('falls back to defaults when env values are invalid', async () => {
    setEnv({
      RAG_FRESHNESS_HEALTH_INTERVAL_MS: '0',
      RAG_FRESHNESS_STALE_SEC: '-1',
      RAG_WATCH_DEBOUNCE_MS: 'abc',
      RAG_WATCH_ENABLED: 'TRUE',
    });

    const { __testing } = await loadServerModule();

    expect(__testing.getRagFreshnessConfig()).toEqual({
      intervalMs: 300000,
      staleSec: 3600,
      debounceMs: 5000,
      watchEnabled: true,
    });
  });

  itSlow('parsePositiveIntEnv handles missing, blank, invalid, and valid values', async () => {
    const { __testing } = await loadServerModule();
    const key = 'RAG_TEST_PARSE_POSITIVE_INT';

    delete process.env[key];
    expect(__testing.parsePositiveIntEnv(key, 123)).toBe(123);

    process.env[key] = '   ';
    expect(__testing.parsePositiveIntEnv(key, 123)).toBe(123);

    process.env[key] = 'NaN';
    expect(__testing.parsePositiveIntEnv(key, 123)).toBe(123);

    process.env[key] = '-50';
    expect(__testing.parsePositiveIntEnv(key, 123)).toBe(123);

    process.env[key] = '42';
    expect(__testing.parsePositiveIntEnv(key, 123)).toBe(42);

    delete process.env[key];
  });

  itSlow('does not register filesystem watchers when disabled via env', async () => {
    setEnv({ RAG_WATCH_ENABLED: 'false' });

    const { __testing } = await loadServerModule();
    __testing.setupRagFreshnessWatchers();

    expect(__testing.getRagWatcherCount()).toBe(0);
  });

  itSlow('debounces repeated watch-triggered freshness passes', async () => {
    setEnv({ RAG_WATCH_DEBOUNCE_MS: '25' });
    vi.useFakeTimers();

    const { __testing } = await loadServerModule();
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

  itSlow('queues exactly one follow-up freshness pass while one is still running', async () => {
    const { __testing } = await loadServerModule();
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

  itSlow('registers one watcher per unique monitored path when enabled', async () => {
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
      const { __testing } = await loadServerModule();
      __testing.setupRagFreshnessWatchers();

      expect(__testing.getRagWatcherCount()).toBe(9);
      expect(fs.watch).toHaveBeenCalledTimes(9);
    } finally {
      fs.existsSync = originalExistsSync;
      fs.statSync = originalStatSync;
      fs.watch = originalWatch;
    }
  });

  itSlow('self-heals file-backed collections with deleteFile plus indexFile', async () => {
    const { __testing } = await loadServerModule();
    const { RagIndexer } = await import('../../src/webapp/services/rag/rag-indexer');
    const { RagStore } = await import('../../src/webapp/services/rag/rag-store');
    const originalStatSync = fs.statSync;
    const originalIndexFile = RagIndexer.prototype.indexFile;
    const originalSyncDirectory = RagIndexer.prototype.syncDirectory;
    const originalDeleteFile = RagStore.prototype.deleteFile;

    const deleteFile = vi.fn();
    const indexFile = vi.fn().mockResolvedValue({
      filesProcessed: 1,
      chunksInserted: 2,
      filesSkipped: 0,
    });
    const syncDirectory = vi.fn().mockResolvedValue({
      filesProcessed: 99,
      chunksInserted: 99,
      filesSkipped: 0,
    });

    fs.statSync = vi.fn(() => ({
      isDirectory: () => false,
    }));
    RagStore.prototype.deleteFile = deleteFile;
    RagIndexer.prototype.indexFile = indexFile;
    RagIndexer.prototype.syncDirectory = syncDirectory;

    try {
      const stats = await __testing.syncRagFreshnessSource(
        'decisions',
        'D:\\repositories\\myAgentic-IT-Project-team-V2\\BusinessDocs\\decisions.md'
      );

      expect(deleteFile).toHaveBeenCalledWith(
        'decisions',
        'D:\\repositories\\myAgentic-IT-Project-team-V2\\BusinessDocs\\decisions.md'
      );
      expect(indexFile).toHaveBeenCalledWith(
        'decisions',
        'D:\\repositories\\myAgentic-IT-Project-team-V2\\BusinessDocs\\decisions.md'
      );
      expect(syncDirectory).not.toHaveBeenCalled();
      expect(stats.filesProcessed).toBe(1);
    } finally {
      fs.statSync = originalStatSync;
      RagIndexer.prototype.indexFile = originalIndexFile;
      RagIndexer.prototype.syncDirectory = originalSyncDirectory;
      RagStore.prototype.deleteFile = originalDeleteFile;
    }
  });

  itSlow('self-heals directory-backed collections with syncDirectory', async () => {
    const { __testing } = await loadServerModule();
    const { RagIndexer } = await import('../../src/webapp/services/rag/rag-indexer');
    const { RagStore } = await import('../../src/webapp/services/rag/rag-store');
    const originalStatSync = fs.statSync;
    const originalIndexFile = RagIndexer.prototype.indexFile;
    const originalSyncDirectory = RagIndexer.prototype.syncDirectory;
    const originalDeleteFile = RagStore.prototype.deleteFile;

    const deleteFile = vi.fn();
    const indexFile = vi.fn().mockResolvedValue({
      filesProcessed: 1,
      chunksInserted: 1,
      filesSkipped: 0,
    });
    const syncDirectory = vi.fn().mockResolvedValue({
      filesProcessed: 3,
      chunksInserted: 8,
      filesSkipped: 1,
    });

    fs.statSync = vi.fn(() => ({
      isDirectory: () => true,
    }));
    RagStore.prototype.deleteFile = deleteFile;
    RagIndexer.prototype.indexFile = indexFile;
    RagIndexer.prototype.syncDirectory = syncDirectory;

    try {
      const stats = await __testing.syncRagFreshnessSource(
        'decisions',
        'D:\\repositories\\myAgentic-IT-Project-team-V2\\BusinessDocs\\decisions'
      );

      expect(syncDirectory).toHaveBeenCalledWith(
        'decisions',
        'D:\\repositories\\myAgentic-IT-Project-team-V2\\BusinessDocs\\decisions',
        { incremental: true }
      );
      expect(deleteFile).not.toHaveBeenCalled();
      expect(indexFile).not.toHaveBeenCalled();
      expect(stats.filesProcessed).toBe(3);
    } finally {
      fs.statSync = originalStatSync;
      RagIndexer.prototype.indexFile = originalIndexFile;
      RagIndexer.prototype.syncDirectory = originalSyncDirectory;
      RagStore.prototype.deleteFile = originalDeleteFile;
    }
  });
});
