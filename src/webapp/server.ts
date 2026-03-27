#!/usr/bin/env tsx
// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Agentic SDLC Platform — Fastify-based API server (M30-003, composition root)
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getStore } from './store';
import { FileCache } from './cache';
import { AuditTrail } from './audit';
import { createRateLimiter } from './rate-limiter';
import { createSSEManager } from './sse-manager';
import { createMetricsCollector } from './metrics-collector';
import { resolveSessionFile } from './session-state-resolver';
import { withFileLock } from './file-lock';
import {
  structuredLog,
  setSecurityHeaders,
  safePath,
  sanitizeMarkdown,
  sanitizeQID,
  detectSecrets,
  checkSecretsInBody,
} from './middleware';
import { AuthManager, createAuthMiddleware, loadAuthConfig } from './auth';
import {
  PORT,
  HOST,
  TRUST_PROXY,
  WEBAPP_DIR,
  PROJECT_ROOT,
  BUSINESS_DOCS,
  GITHUB_DOCS,
  SESSION_DIR,
  SESSION_FILE,
  SESSION_AUDIT_FILE,
  Q_INDEX_FILE,
  DECISIONS_FILE,
  DECISIONS_DIR,
  COMMAND_QUEUE,
  HELP_DIR,
  ANALYTICS_FILE,
  METRICS_FILE,
  SSE_HEARTBEAT_MS,
  ANALYTICS_MAX_EVENTS,
  METRICS_FLUSH_INTERVAL_MS,
  SNAPSHOT_SYNC_INTERVAL_MS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  SEMANTIC_MEMORY_SWEEPER_INTERVAL_MS,
  SEMANTIC_MEMORY_SWEEPER_ENABLED,
  STORAGE_PROVIDER,
  STORAGE_PATH,
  REDIS_URL,
  QUEUE_PROVIDER,
  SESSION_STORE,
  AGENT_TOOL_ISOLATION_LEVEL,
  TOOL_EXEC_MAX_TIMEOUT_MS,
  TOOL_EXEC_MAX_OUTPUT_BYTES,
  TOOL_EXEC_MAX_MEMORY_MB,
  TOOL_EXEC_REQUIRE_WORKSPACE_CWD,
  resolvePredecessorContractContinuityMode,
} from './config';
import { createStorageProvider } from '../../platform/engine/persistence';
import type { StorageProvider } from '../../platform/engine/persistence';
import { getRedisConnection, createRedisConnection } from './redis';
import { createRedisPubSubSSEManager } from './sse-manager-redis';
import { hasAuthConfigured, validateProfile, assertScalePrerequisites } from './runtime-profiles';

import { buildApp } from './app';
import type { ServerContext } from './context';
import { RagStore } from './services/rag/rag-store';
import { RagIndexer } from './services/rag/rag-indexer';
import { AdaptiveChunker } from './services/rag/text-chunker';
import { createEmbeddingProvider } from './services/rag/embedding-provider';
import {
  SemanticMemoryStore,
  type MemoryStorage,
  type MemoryEntry,
} from '../../platform/engine/semantic-memory';

/* ── Native Fastify route plugins (M30-004) ───────────────────── */
import { registerRoutesFromManifest } from './routes/manifest';
import { McpGovernanceService, McpHealthMonitor } from './plugins/mcp-governance';

const _cache = new FileCache();
const _audit = new AuditTrail({ logDir: path.join(BUSINESS_DOCS, 'audit') });
function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const RAG_FRESHNESS_HEALTH_INTERVAL_MS = parsePositiveIntEnv(
  'RAG_FRESHNESS_HEALTH_INTERVAL_MS',
  5 * 60 * 1000
);
const RAG_FRESHNESS_STALE_SEC = parsePositiveIntEnv('RAG_FRESHNESS_STALE_SEC', 3600);
const RAG_WATCH_DEBOUNCE_MS = parsePositiveIntEnv('RAG_WATCH_DEBOUNCE_MS', 5000);
const RAG_WATCH_ENABLED = String(process.env.RAG_WATCH_ENABLED || 'true').toLowerCase() !== 'false';
const RAG_BASE_DIR = process.env.RAG_BASE_DIR || path.join(PROJECT_ROOT, '.agentic', 'rag');
const RAG_DB_PATH = process.env.RAG_DB_PATH || path.join(RAG_BASE_DIR, 'rag.sqlite');
const RAG_LANCE_DIR = process.env.RAG_LANCE_DIR || path.join(RAG_BASE_DIR, 'vectors');
const RAG_VECTOR_STORE_STRATEGY =
  process.env.RAG_VECTOR_STORE_STRATEGY === 'writer-sharded' ? 'writer-sharded' : 'single-table';
const RAG_VECTOR_WRITER_ID = (process.env.RAG_VECTOR_WRITER_ID || `${os.hostname()}-${process.pid}`)
  .trim()
  .replace(/[^a-z0-9_-]+/gi, '_');
fs.mkdirSync(RAG_BASE_DIR, { recursive: true });
fs.mkdirSync(RAG_LANCE_DIR, { recursive: true });
const _embeddingProvider = createEmbeddingProvider();
const _ragStore = new RagStore(RAG_DB_PATH, RAG_LANCE_DIR, {
  vectorStrategy: RAG_VECTOR_STORE_STRATEGY,
  writerId: RAG_VECTOR_WRITER_ID,
});
const _ragIndexer = new RagIndexer(_ragStore, _embeddingProvider, new AdaptiveChunker());
const rateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: RATE_LIMIT_MAX,
});

/* ── SSE Manager (M33-003: Redis pub/sub when available) ──────── */
const sseManager = (() => {
  const redis = getRedisConnection(REDIS_URL);
  if (redis) {
    const subscriber = createRedisConnection(REDIS_URL);
    if (subscriber) {
      structuredLog('info', 'sse_pubsub_redis', { url: REDIS_URL ? '***' : 'none' });
      return createRedisPubSubSSEManager({
        heartbeatMs: SSE_HEARTBEAT_MS,
        publisher: redis,
        subscriber,
      });
    }
  }
  return createSSEManager({ heartbeatMs: SSE_HEARTBEAT_MS });
})();
const store = () => getStore();

/* ── StorageProvider (M23-005) ────────────────────────────────── */
let _storageProvider: StorageProvider | null = null;
function getStorageProvider(): StorageProvider | null {
  return _storageProvider;
}

class ProviderBackedMemoryStorage implements MemoryStorage {
  private _getProvider: () => StorageProvider | null;

  constructor(getProvider: () => StorageProvider | null) {
    this._getProvider = getProvider;
  }

  async set(collection: string, id: string, data: MemoryEntry): Promise<void> {
    const provider = this._getProvider();
    if (!provider) return;
    await provider.write(collection, id, { id, ...data });
  }

  async get(collection: string, id: string): Promise<MemoryEntry | null> {
    const provider = this._getProvider();
    if (!provider) return null;
    const doc = await provider.read(collection, id);
    return toMemoryEntry(id, doc);
  }

  async list(collection: string): Promise<MemoryEntry[]> {
    const provider = this._getProvider();
    if (!provider) return [];
    const docs = await provider.list(collection);
    const entries: MemoryEntry[] = [];
    for (const doc of docs) {
      const id = typeof doc.id === 'string' && doc.id.trim() ? doc.id : '';
      const entry = toMemoryEntry(id, doc);
      if (entry) entries.push(entry);
    }
    return entries;
  }

  async delete(collection: string, id: string): Promise<void> {
    const provider = this._getProvider();
    if (!provider) return;
    await provider.delete(collection, id);
  }
}

function toMemoryEntry(id: string, doc: Record<string, unknown> | null): MemoryEntry | null {
  if (!doc) return null;
  const key = typeof doc.key === 'string' ? doc.key : id;
  const content = typeof doc.content === 'string' ? doc.content : null;
  const writtenAt = typeof doc.writtenAt === 'number' ? doc.writtenAt : null;
  if (!key || content === null || writtenAt === null) return null;

  return {
    key,
    content,
    writtenAt,
    ...(typeof doc.topic === 'string' && doc.topic ? { topic: doc.topic } : {}),
  };
}

let _semanticMemoryStore: SemanticMemoryStore | null = null;

function getSemanticMemoryStore(): SemanticMemoryStore {
  if (_semanticMemoryStore) return _semanticMemoryStore;
  _semanticMemoryStore = new SemanticMemoryStore(
    new ProviderBackedMemoryStorage(getStorageProvider)
  );
  return _semanticMemoryStore;
}

function startSemanticMemorySweeper(): void {
  if (!SEMANTIC_MEMORY_SWEEPER_ENABLED) return;
  if (!getStorageProvider()) return;
  const started = getSemanticMemoryStore().startSweeper(SEMANTIC_MEMORY_SWEEPER_INTERVAL_MS);
  if (started) {
    structuredLog('info', 'semantic_memory_sweeper_started', {
      intervalMs: SEMANTIC_MEMORY_SWEEPER_INTERVAL_MS,
    });
  }
}

function stopSemanticMemorySweeper(): void {
  if (!_semanticMemoryStore) return;
  if (_semanticMemoryStore.stopSweeper()) {
    structuredLog('info', 'semantic_memory_sweeper_stopped');
  }
}

function getSemanticMemorySweeperStatus(): {
  enabled: boolean;
  running: boolean;
  intervalMs: number;
} {
  return {
    enabled: SEMANTIC_MEMORY_SWEEPER_ENABLED,
    running: _semanticMemoryStore?.isSweeperRunning() ?? false,
    intervalMs: SEMANTIC_MEMORY_SWEEPER_INTERVAL_MS,
  };
}

async function initStorageProvider(): Promise<StorageProvider> {
  const basePath =
    STORAGE_PROVIDER === 'file'
      ? STORAGE_PATH || path.join(PROJECT_ROOT, '.agentic', 'storage')
      : undefined;
  const dbPath =
    STORAGE_PROVIDER === 'sqlite'
      ? STORAGE_PATH || path.join(PROJECT_ROOT, '.agentic', 'data.db')
      : undefined;
  _storageProvider = await createStorageProvider({
    provider: STORAGE_PROVIDER,
    basePath,
    dbPath,
  });
  structuredLog('info', 'storage_provider_initialized', {
    provider: STORAGE_PROVIDER,
    name: _storageProvider.name,
  });
  return _storageProvider;
}

/* ── Auth (M29) ───────────────────────────────────────────────── */
const _authConfig = loadAuthConfig();
const _authManager: AuthManager | null = _authConfig ? new AuthManager(_authConfig) : null;
const _authMiddleware = _authManager
  ? createAuthMiddleware({
      authManager: _authManager,
      log: structuredLog,
      audit: _audit,
    })
  : null;
if (_authManager) {
  structuredLog('info', 'auth_enabled', { provider: 'github_oauth' });
} else {
  structuredLog('warn', 'auth_disabled', {
    reason: 'GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set',
  });
}

const metricsCollector = createMetricsCollector({
  flushIntervalMs: METRICS_FLUSH_INTERVAL_MS,
  outputPath: METRICS_FILE,
  store: {
    mkdirp: (d: string) => store().mkdirp(d),
    writeFile: (p: string, data: string) => store().writeFile(p, data),
    readFile: (p: string) => store().readFile(p),
    exists: (p: string) => store().exists(p),
  },
  log: structuredLog,
});

const _metrics = metricsCollector._state;
const _rateLimitMap = rateLimiter._map;
const _sseClients = {
  get size() {
    return sseManager.size;
  },
};

function sseNotify(eventType: string, data: Record<string, unknown>): void {
  sseManager.broadcast(eventType, data);
}
function recordMetric(
  method: string,
  pathname: string,
  durationMs: number,
  statusCode: number
): void {
  metricsCollector.record(method, pathname, durationMs, statusCode);
}
const computePercentiles = metricsCollector.computePercentiles;
const flushMetrics = (): void => {
  metricsCollector.flush();
};
const loadMetrics = (): void => metricsCollector.load();

function safeWriteSync(
  filePath: string,
  data: string,
  encoding?: BufferEncoding,
  auditMeta?: Record<string, unknown>
): void {
  store().writeFile(filePath, data, encoding);
  _cache.invalidate(filePath);
  metricsCollector.incrementFileOps();
  const rel = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  sseNotify('file_change', { file: rel, timestamp: new Date().toISOString() });
  _audit.log({
    operation: (auditMeta?.operation as string) || 'update',
    entityType:
      (auditMeta?.entityType as string) ||
      rel
        .split('/')
        .pop()!
        .replace(/\.\w+$/, ''),
    entityId: (auditMeta?.entityId as string | null) || null,
    user: (auditMeta?.user as string) || 'system',
    summary: (auditMeta?.summary as string) || `File written: ${rel}`,
  });
}

/**
 * Non-blocking async write — preferred for production request paths (M4/Epic-663).
 * Uses fs.promises internally to avoid blocking the Node.js event loop.
 */
async function safeWriteAsync(
  filePath: string,
  data: string,
  encoding?: BufferEncoding,
  auditMeta?: Record<string, unknown>
): Promise<void> {
  await store().writeFileAsync(filePath, data, encoding);
  _cache.invalidate(filePath);
  metricsCollector.incrementFileOps();
  const rel = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  sseNotify('file_change', { file: rel, timestamp: new Date().toISOString() });
  _audit.log({
    operation: (auditMeta?.operation as string) || 'update',
    entityType:
      (auditMeta?.entityType as string) ||
      rel
        .split('/')
        .pop()!
        .replace(/\.\w+$/, ''),
    entityId: (auditMeta?.entityId as string | null) || null,
    user: (auditMeta?.user as string) || 'system',
    summary: (auditMeta?.summary as string) || `File written: ${rel}`,
  });
}

function isLocalBinding(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

/**
 * Determine if startup should enforce production-grade requirements.
 * Returns true if NODE_ENV=production or the server is bound to a non-local address.
 */
function isProductionContext(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  return !isLocalBinding(HOST);
}

function assertStartupSecurityModel(): void {
  if (isLocalBinding(HOST)) return;
  if (_authManager) return;

  const apiKey = process.env.API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error('Non-local startup requires configured auth or API_KEY'), {
      code: 'NON_LOCAL_AUTH_UNCONFIGURED',
    });
  }

  if (apiKey.length < 24) {
    throw Object.assign(new Error('API_KEY must be at least 24 characters for non-local startup'), {
      code: 'API_KEY_TOO_WEAK',
    });
  }

  structuredLog('warn', 'non_local_api_key_fallback_enabled', {
    host: HOST,
    apiKeyMinLength: 24,
  });
}

function validateStartupRuntimeProfile(host: string = HOST): {
  profile: string;
  warnings: string[];
  predecessorContractContinuity: {
    mode: boolean | { states?: string[]; agents?: string[] };
    source: 'env' | 'profile-default';
  };
} {
  const validation = validateProfile({
    nodeEnv: process.env.NODE_ENV,
    host,
    storageProvider: STORAGE_PROVIDER,
    queueProvider: QUEUE_PROVIDER,
    sessionStore: SESSION_STORE,
    redisUrl: REDIS_URL,
    hasAuth: hasAuthConfigured({
      githubClientId: process.env.GITHUB_CLIENT_ID,
      apiKey: process.env.API_KEY,
    }),
    trustProxy: TRUST_PROXY,
    toolIsolationLevel: AGENT_TOOL_ISOLATION_LEVEL,
    toolExecMaxTimeoutMs: TOOL_EXEC_MAX_TIMEOUT_MS,
    toolExecMaxOutputBytes: TOOL_EXEC_MAX_OUTPUT_BYTES,
    toolExecMaxMemoryMb: TOOL_EXEC_MAX_MEMORY_MB,
    toolExecRequireWorkspaceCwd: TOOL_EXEC_REQUIRE_WORKSPACE_CWD,
  });

  for (const warning of validation.warnings) {
    structuredLog('warn', 'startup_runtime_profile_warning', {
      profile: validation.profile,
      warning,
    });
  }

  if (!validation.valid) {
    throw Object.assign(
      new Error(
        `Runtime profile '${validation.profile}' is invalid: ${validation.errors.join(' | ')}`
      ),
      {
        code: 'RUNTIME_PROFILE_INVALID',
        profile: validation.profile,
      }
    );
  }

  const continuity = resolvePredecessorContractContinuityMode(validation.profile);

  structuredLog('info', 'startup_runtime_profile_validated', {
    profile: validation.profile,
    warnings: validation.warnings.length,
    predecessorContractContinuity: continuity.mode,
    predecessorContractContinuitySource: continuity.source,
  });

  return {
    profile: validation.profile,
    warnings: validation.warnings,
    predecessorContractContinuity: continuity,
  };
}

/* ── Typed Server Context (M30-002) ───────────────────────────── */

const ctx: ServerContext = {
  _cache,
  sseManager,
  _metrics,
  _audit,
  safeWriteSync,
  safeWriteAsync,
  sseNotify,
  computePercentiles,
  recordMetric,
  scheduleRebuildIndex,
  flushMetrics,
  PROJECT_ROOT,
  BUSINESS_DOCS,
  GITHUB_DOCS,
  SESSION_DIR,
  SESSION_FILE,
  Q_INDEX_FILE,
  SESSION_AUDIT_FILE,
  DECISIONS_FILE,
  DECISIONS_DIR,
  COMMAND_QUEUE,
  HELP_DIR,
  ANALYTICS_FILE,
  METRICS_FILE,
  WEBAPP_DIR,
  HOST,
  PORT,
  SSE_HEARTBEAT_MS,
  ANALYTICS_MAX_EVENTS,
  resolveSessionFile: () => resolveSessionFile(getStore(), _cache, SESSION_DIR) ?? SESSION_FILE,
  getStorageProvider,
  STORAGE_PROVIDER,
  _authManager,
  _authMiddleware,
  _ragStore,
  _ragIndexer,
  _embeddingProvider,
  _semanticMemoryStore: getSemanticMemoryStore(),
  _getSemanticMemorySweeperStatus: getSemanticMemorySweeperStatus,
};

let _rebuildTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleRebuildIndex(): void {
  if (_rebuildTimer) clearTimeout(_rebuildTimer);
  _rebuildTimer = setTimeout(() => {
    _rebuildTimer = null;
    ctx
      ._rebuildQuestionnaireIndex?.()
      .catch((e: Error) => structuredLog('error', 'rebuild_index_failed', { error: e.message }));
  }, 500);
}

function newestMtimeIso(paths: string[]): string | null {
  let newest = 0;
  for (const p of paths) {
    try {
      if (!fs.existsSync(p)) continue;
      const mtime = fs.statSync(p).mtimeMs;
      if (mtime > newest) newest = mtime;
    } catch {
      // Ignore inaccessible path in best-effort scheduler.
    }
  }
  return newest > 0 ? new Date(newest).toISOString() : null;
}

const RAG_MONITORED_TARGETS: Array<{ collectionId: string; sourcePaths: string[] }> = [
  {
    collectionId: 'decisions',
    sourcePaths: [path.join(BUSINESS_DOCS, 'decisions.md'), path.join(BUSINESS_DOCS, 'decisions')],
  },
  {
    collectionId: 'codebase',
    sourcePaths: [path.join(PROJECT_ROOT, 'src')],
  },
  {
    collectionId: 'phase-outputs',
    sourcePaths: [
      path.join(BUSINESS_DOCS, 'Phase1-Business'),
      path.join(BUSINESS_DOCS, 'Phase2-Tech'),
      path.join(BUSINESS_DOCS, 'Phase3-UX'),
      path.join(BUSINESS_DOCS, 'session'),
      path.join(BUSINESS_DOCS, 'synthesis'),
    ],
  },
  {
    collectionId: 'sprint-artifacts--default',
    sourcePaths: [path.join(BUSINESS_DOCS, 'session'), path.join(BUSINESS_DOCS, 'metrics')],
  },
];

let _ragFreshnessPassRunning = false;
let _ragFreshnessQueued = false;
let _ragWatchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const _ragWatchers: fs.FSWatcher[] = [];
let _ragFreshnessPassTrigger: () => Promise<void> = () => runRagFreshnessHealthPass();
let _ragFreshnessPassExecutor: () => Promise<void> = async () => {
  for (const target of RAG_MONITORED_TARGETS) {
    _ragStore.ensureCollection({
      id: target.collectionId,
      name: target.collectionId,
      description: 'Auto-managed collection for RAG freshness self-healing.',
      created_at: new Date().toISOString(),
    });

    const sourceNewest = newestMtimeIso(target.sourcePaths);
    const freshness = _ragStore.getCollectionFreshnessStats(target.collectionId);
    const hasIndex = freshness.indexedFiles > 0;

    const lagSec =
      sourceNewest && freshness.lastIndexedAt
        ? Math.max(
            0,
            Math.round((Date.parse(sourceNewest) - Date.parse(freshness.lastIndexedAt)) / 1000)
          )
        : null;

    const shouldHeal = !hasIndex || (lagSec !== null && lagSec > RAG_FRESHNESS_STALE_SEC);
    if (!shouldHeal) continue;

    for (const sourcePath of target.sourcePaths) {
      if (!fs.existsSync(sourcePath)) continue;
      try {
        const stats = await _ragIndexer.syncDirectory(target.collectionId, sourcePath, {
          incremental: true,
        });
        recordMetric('RAG', '/freshness/self-heal', stats.filesProcessed, 200);
      } catch (err) {
        structuredLog('warn', 'rag_freshness_self_heal_failed', {
          collection_id: target.collectionId,
          source_path: sourcePath,
          error: (err as Error).message,
        });
        recordMetric('RAG', '/freshness/self-heal', 1, 500);
      }
    }
  }
};

function queueRagFreshnessPass(reason: string): void {
  if (_ragWatchDebounceTimer) clearTimeout(_ragWatchDebounceTimer);

  _ragWatchDebounceTimer = setTimeout(() => {
    _ragWatchDebounceTimer = null;
    structuredLog('debug', 'rag_freshness_watch_triggered', { reason });
    void _ragFreshnessPassTrigger();
  }, RAG_WATCH_DEBOUNCE_MS);
  _ragWatchDebounceTimer.unref();
}

function setupRagFreshnessWatchers(): void {
  if (!RAG_WATCH_ENABLED) {
    structuredLog('info', 'rag_freshness_watch_disabled');
    return;
  }

  const watchedPaths = new Set<string>();

  for (const target of RAG_MONITORED_TARGETS) {
    for (const sourcePath of target.sourcePaths) {
      if (watchedPaths.has(sourcePath)) continue;
      watchedPaths.add(sourcePath);

      try {
        if (!fs.existsSync(sourcePath)) continue;

        const stat = fs.statSync(sourcePath);
        const watcher = stat.isDirectory()
          ? fs.watch(sourcePath, { recursive: true }, () => {
              queueRagFreshnessPass(`fs:${sourcePath}`);
            })
          : fs.watch(sourcePath, () => {
              queueRagFreshnessPass(`fs:${sourcePath}`);
            });

        watcher.on('error', (err) => {
          structuredLog('warn', 'rag_freshness_watch_error', {
            path: sourcePath,
            error: (err as Error).message,
          });
        });

        _ragWatchers.push(watcher);
      } catch (err) {
        structuredLog('warn', 'rag_freshness_watch_unavailable', {
          path: sourcePath,
          error: (err as Error).message,
        });
      }
    }
  }

  structuredLog('info', 'rag_freshness_watch_started', {
    watchers: _ragWatchers.length,
    debounceMs: RAG_WATCH_DEBOUNCE_MS,
  });
}

async function runRagFreshnessHealthPass(): Promise<void> {
  if (_ragFreshnessPassRunning) {
    _ragFreshnessQueued = true;
    return;
  }
  if (!_ragIndexer) return;

  _ragFreshnessPassRunning = true;
  try {
    await _ragFreshnessPassExecutor();
  } finally {
    _ragFreshnessPassRunning = false;
    if (_ragFreshnessQueued) {
      _ragFreshnessQueued = false;
      void _ragFreshnessPassTrigger();
    }
  }
}

const __testing = {
  parsePositiveIntEnv,
  queueRagFreshnessPass,
  setupRagFreshnessWatchers,
  runRagFreshnessHealthPass,
  getRagFreshnessConfig: () => ({
    intervalMs: RAG_FRESHNESS_HEALTH_INTERVAL_MS,
    staleSec: RAG_FRESHNESS_STALE_SEC,
    debounceMs: RAG_WATCH_DEBOUNCE_MS,
    watchEnabled: RAG_WATCH_ENABLED,
  }),
  getRagWatcherCount: () => _ragWatchers.length,
  setRagFreshnessPassTrigger: (trigger: () => Promise<void>) => {
    _ragFreshnessPassTrigger = trigger;
  },
  setRagFreshnessPassExecutor: (executor: () => Promise<void>) => {
    _ragFreshnessPassExecutor = executor;
  },
  resetRagFreshnessState: () => {
    if (_ragWatchDebounceTimer) {
      clearTimeout(_ragWatchDebounceTimer);
      _ragWatchDebounceTimer = null;
    }
    _ragFreshnessPassRunning = false;
    _ragFreshnessQueued = false;
    _ragFreshnessPassTrigger = () => runRagFreshnessHealthPass();
    _ragFreshnessPassExecutor = async () => {
      for (const target of RAG_MONITORED_TARGETS) {
        _ragStore.ensureCollection({
          id: target.collectionId,
          name: target.collectionId,
          description: 'Auto-managed collection for RAG freshness self-healing.',
          created_at: new Date().toISOString(),
        });

        const sourceNewest = newestMtimeIso(target.sourcePaths);
        const freshness = _ragStore.getCollectionFreshnessStats(target.collectionId);
        const hasIndex = freshness.indexedFiles > 0;

        const lagSec =
          sourceNewest && freshness.lastIndexedAt
            ? Math.max(
                0,
                Math.round((Date.parse(sourceNewest) - Date.parse(freshness.lastIndexedAt)) / 1000)
              )
            : null;

        const shouldHeal = !hasIndex || (lagSec !== null && lagSec > RAG_FRESHNESS_STALE_SEC);
        if (!shouldHeal) continue;

        for (const sourcePath of target.sourcePaths) {
          if (!fs.existsSync(sourcePath)) continue;
          try {
            const stats = await _ragIndexer.syncDirectory(target.collectionId, sourcePath, {
              incremental: true,
            });
            recordMetric('RAG', '/freshness/self-heal', stats.filesProcessed, 200);
          } catch (err) {
            structuredLog('warn', 'rag_freshness_self_heal_failed', {
              collection_id: target.collectionId,
              source_path: sourcePath,
              error: (err as Error).message,
            });
            recordMetric('RAG', '/freshness/self-heal', 1, 500);
          }
        }
      }
    };
    for (const watcher of _ragWatchers.splice(0)) watcher.close();
  },
};

/* (Cross-route wiring for _getLatestCommand, _readCommandQueue, _getEngine
   is now handled inside registerRoutes() of commands.ts and orchestrator.ts) */

/* ── Build Fastify app ────────────────────────────────────────── */
let _app: Awaited<ReturnType<typeof buildApp>> | null = null;
let _mcpHealthMonitor: McpHealthMonitor | null = null;

function getMcpHealthMonitor(): McpHealthMonitor {
  if (_mcpHealthMonitor) return _mcpHealthMonitor;

  const intervalMs = Number(process.env.MCP_HEALTH_INTERVAL_MS || 30000);
  const failureThreshold = Number(process.env.MCP_HEALTH_FAILURE_THRESHOLD || 3);

  const svc = new McpGovernanceService({
    projectRoot: PROJECT_ROOT,
    storageProvider: getStorageProvider(),
  });

  _mcpHealthMonitor = new McpHealthMonitor(svc, {
    intervalMs: Number.isFinite(intervalMs) ? intervalMs : 30000,
    failureThreshold: Number.isFinite(failureThreshold) ? failureThreshold : 3,
  });

  return _mcpHealthMonitor;
}

async function createApp() {
  const app = await buildApp({ ctx, disableRequestLogging: false });

  // Register native Fastify route plugins from declarative manifest (C3.1)
  await registerRoutesFromManifest(app, ctx);

  _app = app;
  return app;
}

/** Get the raw Node http.Server for backward-compatible test imports. */
function getNodeServer() {
  return _app?.server ?? null;
}

/* ── Expose legacy `server` property for existing test imports ── */
const _listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

const server = {
  /**
   * Backward-compatible `listen()`. Supports two call styles:
   *   server.listen(0, '127.0.0.1', cb)   – server-api test style
   *   server.listen(0)                     – milestones test style (returns this)
   */
  listen(port: number, host?: string | (() => void), cb?: () => void) {
    let resolvedHost = '127.0.0.1';
    let resolvedCb: (() => void) | undefined;
    if (typeof host === 'function') {
      resolvedCb = host;
    } else if (typeof host === 'string') {
      resolvedHost = host;
      resolvedCb = cb;
    }

    createApp()
      .then(async (app) => {
        validateStartupRuntimeProfile(resolvedHost);
        await initStorageProvider().catch((err: Error) => {
          structuredLog('error', 'storage_provider_init_failed', { error: err.message });
          if (isProductionContext()) {
            structuredLog('error', 'startup_aborted_production_storage_required', {
              host: resolvedHost,
              nodeEnv: process.env.NODE_ENV,
              error: err.message,
            });
            throw err;
          }
        });
        await app.listen({ port, host: resolvedHost });
        startSemanticMemorySweeper();
        getMcpHealthMonitor().start();
        resolvedCb?.();
        // Emit 'listening' for tests that use server.once('listening', ...)
        const cbs = _listeners['listening'];
        if (cbs) {
          for (const fn of cbs.splice(0)) fn();
        }
      })
      .catch((err) => {
        structuredLog('error', 'server_start_failed', { error: (err as Error).message });
      });
    return this;
  },
  close(cb?: () => void) {
    stopSemanticMemorySweeper();
    _app?.close().then(cb).catch(cb);
  },
  get listening() {
    return !!_app?.server?.listening;
  },
  address() {
    return _app?.server?.address() ?? null;
  },
  on(event: string, handler: (...args: unknown[]) => void) {
    (_listeners[event] ??= []).push(handler);
  },
  once(event: string, handler: (...args: unknown[]) => void) {
    (_listeners[event] ??= []).push(handler);
  },
  setTimeout(_ms: number) {
    // Handled via Fastify requestTimeout
  },
  set keepAliveTimeout(_ms: number) {
    // Handled via Fastify keepAliveTimeout
  },
};

const bootstrapAwareGlobal = globalThis as typeof globalThis & {
  __WEBAPP_BOOTSTRAP_ENTRY?: boolean;
};

/* istanbul ignore next */
if (require.main === module || bootstrapAwareGlobal.__WEBAPP_BOOTSTRAP_ENTRY) {
  try {
    validateStartupRuntimeProfile();
    assertStartupSecurityModel();
  } catch (err) {
    const e = err as Error & { code?: string };
    structuredLog('error', 'startup_rejected_security_model', {
      host: HOST,
      error: e.message,
      code: e.code || 'STARTUP_SECURITY_ERROR',
    });
    process.exit(1);
  }

  // M4/Epic-659: verify actual Redis connectivity for the detected runtime profile
  const _redisPing = async (): Promise<void> => {
    const redis = getRedisConnection(REDIS_URL);
    if (!redis) throw new Error('Redis connection not available');
    const result = await redis.ping();
    if (result !== 'PONG') throw new Error(`Unexpected ping response: ${result}`);
  };

  assertScalePrerequisites(
    {
      nodeEnv: process.env.NODE_ENV,
      host: HOST,
      storageProvider: STORAGE_PROVIDER,
      queueProvider: QUEUE_PROVIDER,
      sessionStore: SESSION_STORE,
      redisUrl: REDIS_URL,
      hasAuth: hasAuthConfigured({
        githubClientId: process.env.GITHUB_CLIENT_ID,
        apiKey: process.env.API_KEY,
      }),
    },
    _redisPing,
    structuredLog
  )
    .catch((err: Error) => {
      structuredLog('error', 'startup_scale_prerequisites_failed', { error: err.message });
      process.exit(1);
    })
    .then(() => initStorageProvider().then(() => createApp()))
    .then(async (app) => {
      await app!.listen({ port: PORT, host: HOST });
      startSemanticMemorySweeper();
      getMcpHealthMonitor().start();
      structuredLog('info', 'server_started', {
        host: HOST,
        port: PORT,
        url: `http://${HOST}:${PORT}`,
        framework: 'fastify',
        storageProvider: STORAGE_PROVIDER,
        docs: `http://${HOST}:${PORT}/docs`,
      });
    })
    .catch((err: Error) => {
      const inProduction = isProductionContext();
      const logLevel = inProduction ? 'error' : 'warn';
      const logEvent = inProduction
        ? 'production_storage_init_failed'
        : 'storage_provider_init_failed';
      structuredLog(logLevel, logEvent, {
        error: err.message,
        host: HOST,
        nodeEnv: process.env.NODE_ENV,
      });

      if (inProduction) {
        // In production context, fail startup instead of falling back
        structuredLog('error', 'startup_aborted_production_storage_required', {
          host: HOST,
          nodeEnv: process.env.NODE_ENV,
          error: err.message,
        });
        process.exit(1);
      }

      // In local development, fall back to starting without StorageProvider (FileStore still works)
      createApp()
        .then((app) => app.listen({ port: PORT, host: HOST }))
        .then(() => {
          getMcpHealthMonitor().start();
          structuredLog('warn', 'server_started_without_storage_provider', {
            host: HOST,
            port: PORT,
            url: `http://${HOST}:${PORT}`,
            framework: 'fastify',
          });
        })
        .catch((e: Error) => {
          structuredLog('error', 'server_start_failed', { error: e.message });
          process.exit(1);
        });
    });

  const flushTimer = setInterval(() => metricsCollector.flush(), METRICS_FLUSH_INTERVAL_MS);
  flushTimer.unref();
  let _snap: { createSnapshot(): void } | undefined;
  try {
    _snap = require('../scripts/github-state-snapshot');
  } catch {
    /* */
  }
  let _snapRunning = false;
  const syncSnapshot = (): void => {
    if (!_snap || _snapRunning) return;
    _snapRunning = true;
    try {
      _snap.createSnapshot();
      structuredLog('info', 'github_snapshot_synced');
      sseNotify('github_snapshot', { timestamp: new Date().toISOString() });
    } catch (e: unknown) {
      structuredLog('warn', 'github_snapshot_failed', { error: (e as Error).message });
    } finally {
      _snapRunning = false;
    }
  };
  const snapTimer = setInterval(syncSnapshot, SNAPSHOT_SYNC_INTERVAL_MS);
  snapTimer.unref();
  setTimeout(syncSnapshot, 5000).unref();
  const ragFreshnessTimer = setInterval(() => {
    void runRagFreshnessHealthPass();
  }, RAG_FRESHNESS_HEALTH_INTERVAL_MS);
  ragFreshnessTimer.unref();
  setupRagFreshnessWatchers();
  setTimeout(() => {
    void runRagFreshnessHealthPass();
  }, 15_000).unref();
  const shutdown = (): void => {
    structuredLog('info', 'shutdown_initiated');
    clearInterval(flushTimer);
    clearInterval(snapTimer);
    clearInterval(ragFreshnessTimer);
    if (_ragWatchDebounceTimer) clearTimeout(_ragWatchDebounceTimer);
    for (const watcher of _ragWatchers) watcher.close();
    _ragWatchers.length = 0;
    stopSemanticMemorySweeper();
    metricsCollector.flush();
    const sp = getStorageProvider();
    if (sp) sp.close().catch(() => {});
    _ragStore.close();
    if (_mcpHealthMonitor) _mcpHealthMonitor.stop();
    if (_authManager) _authManager.close();
    _app
      ?.close()
      .then(() => {
        structuredLog('info', 'server_closed');
        process.exit(0);
      })
      .catch(() => process.exit(1));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('unhandledRejection', (r) =>
    structuredLog('error', 'unhandled_rejection', { error: String(r) })
  );
  process.on('uncaughtException', (err) => {
    structuredLog('error', 'uncaught_exception', { error: err.message });
    shutdown();
  });
}

export {
  sanitizeMarkdown,
  sanitizeQID,
  detectSecrets,
  checkSecretsInBody,
  structuredLog,
  withFileLock,
  safePath,
  setSecurityHeaders,
  server,
  _cache,
  _sseClients,
  sseNotify,
  sseManager,
  _metrics,
  recordMetric,
  computePercentiles,
  _audit,
  flushMetrics,
  loadMetrics,
  METRICS_FILE,
  _rateLimitMap,
  getStorageProvider,
  initStorageProvider,
  createApp,
  getNodeServer,
  ctx,
  validateStartupRuntimeProfile,
  safeWriteAsync,
  __testing,
};
