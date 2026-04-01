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
import { AgentExecutionService, toServiceContext } from './services';
import { RagStore } from './services/rag/rag-store';
import { RagIndexer } from './services/rag/rag-indexer';
import { AdaptiveChunker } from './services/rag/text-chunker';
import { createEmbeddingProvider } from './services/rag/embedding-provider';
import { PHASE_AGENTS, RUNTIME_STATES_WITH_AGENTS } from '../../platform/engine/agent-phase-map';
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
const COMMAND_AUTODISPATCH_INTERVAL_MS = parsePositiveIntEnv(
  'COMMAND_AUTODISPATCH_INTERVAL_MS',
  3000
);
const AUTO_GATE_MODE =
  String(process.env.ORCHESTRATOR_AUTO_GATE_MODE || process.env.GATE_MODE || '')
    .trim()
    .toLowerCase() === 'strict'
    ? 'strict'
    : String(process.env.ORCHESTRATOR_AUTO_GATE_MODE || process.env.GATE_MODE || '')
          .trim()
          .toLowerCase() === 'advisory'
      ? 'advisory'
      : process.env.NODE_ENV === 'production'
        ? 'strict'
        : 'advisory';
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

async function syncRagFreshnessSource(
  collectionId: string,
  sourcePath: string
): Promise<{ filesProcessed: number; chunksInserted: number; filesSkipped: number }> {
  const stat = fs.statSync(sourcePath);

  if (stat.isDirectory()) {
    return _ragIndexer.syncDirectory(collectionId, sourcePath, {
      incremental: true,
    });
  }

  _ragStore.deleteFile(collectionId, sourcePath);
  return _ragIndexer.indexFile(collectionId, sourcePath);
}

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
        const stats = await syncRagFreshnessSource(target.collectionId, sourcePath);
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
  syncRagFreshnessSource,
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
            const stats = await syncRagFreshnessSource(target.collectionId, sourcePath);
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
let _commandDispatchInFlight = false;
let _orchestrationAutoRunInFlight = false;
let _autoAgentExecutionService: AgentExecutionService | null = null;
let _lastAutoExecutedState: string | null = null;
const AUTO_REMEDIATION_TASKS_FILE = path.join(SESSION_DIR, 'remediation-tasks.json');

const AUTO_AGENT_STATES = new Set<string>(RUNTIME_STATES_WITH_AGENTS);

interface AutoDispatchCommandEntry {
  command: string;
  project?: string | null;
  scope?: string | null;
  description?: string | null;
  execution_mode?: 'SDLC_ONLY' | 'AGENCY_ONLY' | 'HYBRID' | null;
  requested_at?: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR';
  source?: string;
}

interface ClaimedCommand {
  identity: string;
  entry: AutoDispatchCommandEntry;
}

interface AutoOrchestratorStatus {
  state: string;
  nextState?: string | null;
  transitionStatus?: string;
  human_override?: {
    paused?: boolean;
  };
}

type GateMode = 'strict' | 'advisory';

interface GateViolationSummary {
  severity: string;
  rule: string;
  description: string;
  deliverable?: string;
  remediation?: string;
}

interface RemediationTask {
  id: string;
  created_at: string;
  status: 'open' | 'done';
  source: 'auto-gate';
  command: string;
  state: string;
  phase: string | null;
  gate_mode: GateMode;
  summary: string;
  suggested_actions: string[];
  violations: GateViolationSummary[];
}

interface GateFailureDetails {
  mode: GateMode;
  state: string;
  phase: string | null;
  verdict: string;
  violations: number;
  suggestions: string[];
  remediationTaskIds: string[];
  topViolations: GateViolationSummary[];
}

class AutoRunGateError extends Error {
  details: GateFailureDetails;

  constructor(message: string, details: GateFailureDetails) {
    super(message);
    this.name = 'AutoRunGateError';
    this.details = details;
  }
}

function normalizeGateViolation(item: unknown): GateViolationSummary {
  const raw = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
  return {
    severity: String(raw.severity || 'MAJOR').toUpperCase(),
    rule: String(raw.rule || 'UNKNOWN_RULE'),
    description: String(raw.description || 'Gate rule was violated.'),
    ...(typeof raw.deliverable === 'string' && raw.deliverable.trim()
      ? { deliverable: raw.deliverable.trim() }
      : {}),
  };
}

function suggestedActionForViolation(violation: GateViolationSummary): string {
  const prefix = violation.deliverable
    ? `Update ${violation.deliverable}`
    : 'Update affected deliverable(s)';
  switch (violation.rule) {
    case 'MISSING_DELIVERABLE':
      return 'Create the missing deliverable file and include required sections.';
    case 'MISSING_HANDOFF_CHECKLIST':
      return `${prefix} to include a complete HANDOFF CHECKLIST section.`;
    case 'INCOMPLETE_HANDOFF_CHECKLIST':
      return `${prefix} and complete all checklist items before rerunning.`;
    case 'INSUFFICIENT_HANDOFF_ITEMS':
      return `${prefix} and include all mandatory checklist entries.`;
    case 'UNDOCUMENTED_UNCERTAIN':
      return `${prefix} with clear UNCERTAIN context and concrete follow-up.`;
    case 'UNDOCUMENTED_INSUFFICIENT_DATA':
      return `${prefix} with explicit INSUFFICIENT_DATA rationale and sources.`;
    default:
      return `${prefix}: ${violation.description}`;
  }
}

function buildGateSuggestions(violations: GateViolationSummary[]): string[] {
  const suggestions = new Set<string>();
  for (const violation of violations.slice(0, 8)) {
    suggestions.add(suggestedActionForViolation(violation));
  }
  return [...suggestions];
}

function appendRemediationTask(task: RemediationTask): void {
  const existing = (() => {
    try {
      if (!fs.existsSync(AUTO_REMEDIATION_TASKS_FILE)) return [] as RemediationTask[];
      const raw = JSON.parse(fs.readFileSync(AUTO_REMEDIATION_TASKS_FILE, 'utf8'));
      return Array.isArray(raw) ? (raw as RemediationTask[]) : [];
    } catch {
      return [] as RemediationTask[];
    }
  })();

  existing.push(task);
  fs.mkdirSync(path.dirname(AUTO_REMEDIATION_TASKS_FILE), { recursive: true });
  fs.writeFileSync(AUTO_REMEDIATION_TASKS_FILE, JSON.stringify(existing, null, 2));
}

function createRemediationTask(input: {
  command: string;
  state: string;
  phase: string | null;
  mode: GateMode;
  violations: GateViolationSummary[];
}): RemediationTask {
  const createdAt = new Date().toISOString();
  const task: RemediationTask = {
    id: `remediation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: createdAt,
    status: 'open',
    source: 'auto-gate',
    command: input.command,
    state: input.state,
    phase: input.phase,
    gate_mode: input.mode,
    summary: `Gate ${input.state} reported ${input.violations.length} violation(s).`,
    suggested_actions: buildGateSuggestions(input.violations),
    violations: input.violations.slice(0, 20),
  };
  appendRemediationTask(task);
  return task;
}

function readCommandQueueUnsafe(): AutoDispatchCommandEntry[] {
  try {
    if (!fs.existsSync(COMMAND_QUEUE)) return [];
    const raw = JSON.parse(fs.readFileSync(COMMAND_QUEUE, 'utf8'));
    return Array.isArray(raw) ? (raw as AutoDispatchCommandEntry[]) : [];
  } catch {
    return [];
  }
}

function writeCommandQueueUnsafe(queue: AutoDispatchCommandEntry[]): void {
  fs.mkdirSync(path.dirname(COMMAND_QUEUE), { recursive: true });
  fs.writeFileSync(COMMAND_QUEUE, JSON.stringify(queue, null, 2));
}

function commandIdentity(entry: AutoDispatchCommandEntry): string {
  return `${entry.requested_at || ''}|${entry.command}|${entry.source || ''}`;
}

async function claimNextPendingCommand(): Promise<ClaimedCommand | null> {
  let claimed: ClaimedCommand | null = null;
  await withFileLock(COMMAND_QUEUE, async () => {
    const queue = readCommandQueueUnsafe();
    if (queue.some((item) => item && item.status === 'PROCESSING')) {
      return;
    }
    const index = queue.findIndex((item) => item && item.status === 'PENDING');
    if (index < 0) return;

    const next = queue[index];
    const updated: AutoDispatchCommandEntry = {
      ...next,
      status: 'PROCESSING',
    };
    queue[index] = updated;
    writeCommandQueueUnsafe(queue);
    claimed = { identity: commandIdentity(updated), entry: updated };
  });
  return claimed;
}

function getProcessingCommand(): ClaimedCommand | null {
  const queue = readCommandQueueUnsafe();
  const current = queue.find((item) => item && item.status === 'PROCESSING');
  return current ? { identity: commandIdentity(current), entry: current } : null;
}

async function finalizeClaimedCommand(
  claimed: ClaimedCommand,
  status: 'DONE' | 'ERROR',
  error?: string
): Promise<void> {
  await withFileLock(COMMAND_QUEUE, async () => {
    const queue = readCommandQueueUnsafe();
    const index = queue.findIndex(
      (item) => item && item.status === 'PROCESSING' && commandIdentity(item) === claimed.identity
    );
    if (index < 0) return;

    const updated: AutoDispatchCommandEntry & { completed_at?: string; error?: string } = {
      ...queue[index],
      status,
      completed_at: new Date().toISOString(),
    };
    if (status === 'ERROR' && error) {
      updated.error = error.slice(0, 1000);
    }
    queue[index] = updated;
    writeCommandQueueUnsafe(queue);
  });
}

async function dispatchQueuedCommands(): Promise<void> {
  if (_commandDispatchInFlight || !_app) return;
  _commandDispatchInFlight = true;
  try {
    const claimed = await claimNextPendingCommand();
    if (!claimed) return;

    const payload = {
      command: claimed.entry.command,
      project: claimed.entry.project || undefined,
      scope: claimed.entry.scope || undefined,
      description: claimed.entry.description || undefined,
      execution_mode: claimed.entry.execution_mode || undefined,
      platform: 'copilot',
      resume: false,
    };

    const commandRes = await _app.inject({
      method: 'POST',
      url: '/api/orchestrator/command',
      payload,
    });

    if (commandRes.statusCode >= 400) {
      await finalizeClaimedCommand(
        claimed,
        'ERROR',
        `orchestrator command failed (${commandRes.statusCode})`
      );
      structuredLog('warn', 'command_autodispatch_failed', {
        command: claimed.entry.command,
        statusCode: commandRes.statusCode,
      });
      return;
    }

    // Kick off first state transition so pipeline no longer remains idle.
    const advanceRes = await _app.inject({
      method: 'POST',
      url: '/api/orchestrator/advance',
      payload: {},
    });
    if (advanceRes.statusCode >= 400) {
      await finalizeClaimedCommand(
        claimed,
        'ERROR',
        `initial orchestrator advance failed (${advanceRes.statusCode})`
      );
      structuredLog('warn', 'command_autodispatch_failed', {
        command: claimed.entry.command,
        statusCode: advanceRes.statusCode,
      });
      return;
    }

    structuredLog('info', 'command_autodispatch_started', {
      command: claimed.entry.command,
      requested_at: claimed.entry.requested_at || null,
    });
    _lastAutoExecutedState = null;
  } catch (err) {
    structuredLog('error', 'command_autodispatch_error', {
      error: (err as Error).message,
    });
  } finally {
    _commandDispatchInFlight = false;
  }
}

function toSessionPhaseKeyFromState(state: string): string | null {
  if (state === 'ONBOARDING') return 'ONBOARDING';
  if (state === 'SYNTHESIS') return 'SYNTHESIS';
  if (state === 'SPRINT_GATE') return 'SPRINT_GATE';

  const phaseMatch = state.match(/^PHASE_(\d+)(?:_|$)/);
  if (phaseMatch) {
    return `PHASE-${phaseMatch[1]}`;
  }

  return null;
}

function collectPredecessorPathsForAutoRun(): string[] {
  const paths = new Set<string>();

  const briefPath = path.join(BUSINESS_DOCS, 'project-brief.md');
  if (fs.existsSync(briefPath)) {
    paths.add(briefPath);
  }

  try {
    if (!fs.existsSync(SESSION_FILE)) {
      return [...paths];
    }

    const sessionState = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) as Record<
      string,
      unknown
    >;
    const phaseOutputs =
      sessionState.phase_outputs && typeof sessionState.phase_outputs === 'object'
        ? (sessionState.phase_outputs as Record<string, unknown>)
        : {};

    const collect = (value: unknown) => {
      if (typeof value === 'string' && value.trim()) {
        paths.add(value.trim());
        return;
      }
      if (Array.isArray(value)) {
        for (const entry of value) collect(entry);
        return;
      }
      if (value && typeof value === 'object') {
        for (const entry of Object.values(value as Record<string, unknown>)) {
          collect(entry);
        }
      }
    };

    for (const value of Object.values(phaseOutputs)) {
      collect(value);
    }
  } catch {
    // Best effort only.
  }

  return [...paths];
}

function getAutoQuestionnairePath(): string | undefined {
  return fs.existsSync(Q_INDEX_FILE) ? Q_INDEX_FILE : undefined;
}

function persistAutoPhaseOutput(state: string, agentId: string, outputPath?: string): void {
  if (!outputPath) return;

  const phaseKey = toSessionPhaseKeyFromState(state);
  if (!phaseKey) return;

  try {
    const sessionState = fs.existsSync(SESSION_FILE)
      ? (JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) as Record<string, unknown>)
      : {};
    const phaseOutputs =
      sessionState.phase_outputs && typeof sessionState.phase_outputs === 'object'
        ? { ...(sessionState.phase_outputs as Record<string, unknown>) }
        : {};
    const phaseKeyLower = phaseKey.toLowerCase();
    const existingPhaseOutputs =
      phaseOutputs[phaseKeyLower] && typeof phaseOutputs[phaseKeyLower] === 'object'
        ? { ...(phaseOutputs[phaseKeyLower] as Record<string, unknown>) }
        : {};

    existingPhaseOutputs[agentId] = outputPath;
    phaseOutputs[phaseKeyLower] = existingPhaseOutputs;
    sessionState.phase_outputs = phaseOutputs;

    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionState, null, 2));
  } catch (err) {
    structuredLog('warn', 'command_autorun_phase_output_persist_failed', {
      state,
      agentId,
      error: (err as Error).message,
    });
  }
}

async function getOrchestratorStatusForAutoRun(): Promise<AutoOrchestratorStatus | null> {
  if (!_app) return null;
  const response = await _app.inject({ method: 'GET', url: '/api/orchestrator/status' });
  if (response.statusCode >= 400) {
    structuredLog('warn', 'command_autorun_status_failed', { statusCode: response.statusCode });
    return null;
  }
  return response.json() as AutoOrchestratorStatus;
}

function getAutoAgentExecutionService(): AgentExecutionService {
  if (_autoAgentExecutionService) return _autoAgentExecutionService;
  _autoAgentExecutionService = new AgentExecutionService(
    toServiceContext(ctx as unknown as Record<string, unknown>)
  );
  return _autoAgentExecutionService;
}

async function executeAgentsForState(state: string): Promise<void> {
  const service = getAutoAgentExecutionService();
  const agents = PHASE_AGENTS[state] || [];
  const predecessorPaths = collectPredecessorPathsForAutoRun();
  const questionnairePath = getAutoQuestionnairePath();

  for (const agent of agents) {
    const startedAt = new Date().toISOString();
    sseNotify('agent_execution_start', {
      type: 'agent_execution_start',
      agent_id: agent.id,
      agent_name: agent.name,
      phase: state,
      timestamp: startedAt,
    });

    const result = await service.execute({
      agentId: agent.id,
      source: 'orchestrator-auto',
      trackSessionStart: false,
      context: {
        predecessorPaths,
        questionnairePath,
        workspaceId: 'default',
      },
    });

    for (const log of result.logs) {
      sseNotify('agent_execution_log', {
        type: 'agent_execution_log',
        job_id: result.job_id,
        agent_id: result.agent_id,
        level: log.level,
        message: log.message,
        timestamp: log.timestamp,
      });
    }

    if (result.status !== 'completed') {
      sseNotify('agent_execution_failed', {
        type: 'agent_execution_failed',
        job_id: result.job_id,
        agent_id: result.agent_id,
        agent_name: result.agent_name,
        status: result.status,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
      throw new Error(result.error || `Agent ${result.agent_name} did not complete successfully`);
    }

    if (result.output_path) {
      persistAutoPhaseOutput(state, agent.id, result.output_path);
      sseNotify('artifact_created', {
        type: 'artifact_created',
        agent: agent.id,
        artifact_id: result.output_path,
        phase: toSessionPhaseKeyFromState(state) || state,
        timestamp: new Date().toISOString(),
      });
    }

    sseNotify('agent_execution_complete', {
      type: 'agent_execution_complete',
      job_id: result.job_id,
      agent_id: result.agent_id,
      agent_name: result.agent_name,
      status: result.status,
      duration_ms: result.duration_ms,
      timestamp: new Date().toISOString(),
    });
  }
}

async function finalizeProcessingCommandForCycle(
  status: 'DONE' | 'ERROR',
  error?: string,
  state?: string,
  details?: Record<string, unknown>
): Promise<void> {
  const processing = getProcessingCommand();
  if (!processing) return;

  await finalizeClaimedCommand(processing, status, error);
  sseNotify(status === 'DONE' ? 'command_completed' : 'command_failed', {
    type: status === 'DONE' ? 'command_completed' : 'command_failed',
    command: processing.entry.command,
    requested_at: processing.entry.requested_at || null,
    state: state || null,
    error: error || null,
    details: details || null,
    timestamp: new Date().toISOString(),
  });
}

async function advanceOrchestratorAutomatically(
  command: ClaimedCommand,
  state: string,
  predecessorPaths: string[]
): Promise<void> {
  if (!_app) return;

  let payload: Record<string, unknown> = {};
  let gateFailureDetails: GateFailureDetails | null = null;

  if (state.startsWith('CRITIC_') && predecessorPaths.length > 0) {
    const gateRes = await _app.inject({
      method: 'POST',
      url: '/api/orchestrator/validate-gate',
      payload: { deliverables: predecessorPaths },
    });

    if (gateRes.statusCode < 400) {
      const gateBody = gateRes.json() as {
        verdict?: string;
        summary?: { totalViolations?: number; phase?: string };
        violations?: unknown[];
      };
      const verdict = String(gateBody.verdict || 'APPROVED').toUpperCase();
      const normalizedViolations = Array.isArray(gateBody.violations)
        ? gateBody.violations.map((v) => normalizeGateViolation(v))
        : [];

      if (verdict !== 'APPROVED') {
        const remediationTask = createRemediationTask({
          command: command.entry.command,
          state,
          phase: gateBody.summary?.phase || null,
          mode: AUTO_GATE_MODE,
          violations: normalizedViolations,
        });

        gateFailureDetails = {
          mode: AUTO_GATE_MODE,
          state,
          phase: gateBody.summary?.phase || null,
          verdict,
          violations: gateBody.summary?.totalViolations || normalizedViolations.length,
          suggestions: remediationTask.suggested_actions,
          remediationTaskIds: [remediationTask.id],
          topViolations: normalizedViolations.slice(0, 5),
        };

        sseNotify('gate_remediation_created', {
          type: 'gate_remediation_created',
          command: command.entry.command,
          state,
          verdict,
          gate_mode: AUTO_GATE_MODE,
          remediation_task_id: remediationTask.id,
          violations: gateFailureDetails.violations,
          timestamp: new Date().toISOString(),
        });
      }

      payload = {
        gateResult: {
          verdict: verdict === 'APPROVED' || AUTO_GATE_MODE === 'strict' ? verdict : 'APPROVED',
          reason:
            verdict === 'APPROVED'
              ? 'Auto-validated gate'
              : AUTO_GATE_MODE === 'advisory'
                ? `Advisory mode: continuing after ${gateBody.summary?.totalViolations || normalizedViolations.length} violation(s)`
                : `Auto gate validation reported ${gateBody.summary?.totalViolations || normalizedViolations.length} violation(s)`,
        },
      };

      if (verdict !== 'APPROVED' && AUTO_GATE_MODE === 'advisory') {
        sseNotify('gate_failed_advisory', {
          type: 'gate_failed_advisory',
          command: command.entry.command,
          state,
          phase: gateFailureDetails?.phase || null,
          verdict,
          violations: gateFailureDetails?.violations || 0,
          suggestions: gateFailureDetails?.suggestions || [],
          remediationTaskIds: gateFailureDetails?.remediationTaskIds || [],
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  const advanceRes = await _app.inject({
    method: 'POST',
    url: '/api/orchestrator/advance',
    payload,
  });

  if (advanceRes.statusCode >= 400) {
    const body = advanceRes.body || '';
    if (gateFailureDetails) {
      throw new AutoRunGateError(
        `advance failed (${advanceRes.statusCode}): ${body}`,
        gateFailureDetails
      );
    }
    throw new Error(`advance failed (${advanceRes.statusCode}): ${body}`);
  }
}

async function runAutoOrchestrationCycle(): Promise<void> {
  if (_orchestrationAutoRunInFlight || !_app) return;
  _orchestrationAutoRunInFlight = true;

  try {
    const status = await getOrchestratorStatusForAutoRun();
    if (!status) return;
    if (status.human_override?.paused) return;
    if (status.transitionStatus === 'IN_PROGRESS') return;

    if (status.state === 'COMPLETED') {
      _lastAutoExecutedState = null;
      await finalizeProcessingCommandForCycle('DONE', undefined, status.state);
      return;
    }

    if (status.state === 'ERROR') {
      _lastAutoExecutedState = null;
      await finalizeProcessingCommandForCycle(
        'ERROR',
        'Orchestrator entered ERROR state',
        status.state
      );
      return;
    }

    if (status.state === 'IDLE') {
      _lastAutoExecutedState = null;
      return;
    }

    if (AUTO_AGENT_STATES.has(status.state) && _lastAutoExecutedState !== status.state) {
      await executeAgentsForState(status.state);
      _lastAutoExecutedState = status.state;
    }

    const currentCommand = getProcessingCommand();
    if (!currentCommand) return;

    await advanceOrchestratorAutomatically(
      currentCommand,
      status.state,
      collectPredecessorPathsForAutoRun()
    );
  } catch (err) {
    structuredLog('error', 'command_autorun_error', {
      error: (err as Error).message,
    });
    if (err instanceof AutoRunGateError) {
      await finalizeProcessingCommandForCycle('ERROR', err.message, err.details.state, {
        category: 'gate_failure',
        mode: err.details.mode,
        phase: err.details.phase,
        verdict: err.details.verdict,
        violations: err.details.violations,
        suggestions: err.details.suggestions,
        remediationTaskIds: err.details.remediationTaskIds,
        topViolations: err.details.topViolations,
      });
      return;
    }
    await finalizeProcessingCommandForCycle('ERROR', (err as Error).message);
  } finally {
    _orchestrationAutoRunInFlight = false;
  }
}

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
  const commandAutoDispatchTimer = setInterval(() => {
    void dispatchQueuedCommands();
  }, COMMAND_AUTODISPATCH_INTERVAL_MS);
  commandAutoDispatchTimer.unref();
  const orchestrationAutoRunTimer = setInterval(() => {
    void runAutoOrchestrationCycle();
  }, COMMAND_AUTODISPATCH_INTERVAL_MS);
  orchestrationAutoRunTimer.unref();
  setupRagFreshnessWatchers();
  setTimeout(() => {
    void runRagFreshnessHealthPass();
  }, 15_000).unref();
  setTimeout(() => {
    void dispatchQueuedCommands();
  }, 2_000).unref();
  setTimeout(() => {
    void runAutoOrchestrationCycle();
  }, 3_000).unref();
  const shutdown = (): void => {
    structuredLog('info', 'shutdown_initiated');
    clearInterval(flushTimer);
    clearInterval(snapTimer);
    clearInterval(ragFreshnessTimer);
    clearInterval(commandAutoDispatchTimer);
    clearInterval(orchestrationAutoRunTimer);
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
