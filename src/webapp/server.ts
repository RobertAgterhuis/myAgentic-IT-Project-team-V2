#!/usr/bin/env tsx
// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Agentic SDLC Platform — Fastify-based API server (M30-003, composition root)
import path from 'path';
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
  STORAGE_PROVIDER,
  STORAGE_PATH,
  REDIS_URL,
  QUEUE_PROVIDER,
  SESSION_STORE,
} from './config';
import { createStorageProvider } from '../../platform/engine/persistence';
import type { StorageProvider } from '../../platform/engine/persistence';
import { getRedisConnection, createRedisConnection } from './redis';
import { createRedisPubSubSSEManager } from './sse-manager-redis';
import { hasAuthConfigured, validateProfile } from './runtime-profiles';

import { buildApp } from './app';
import type { ServerContext } from './context';

/* ── Native Fastify route plugins (M30-004) ───────────────────── */
import { registerRoutes as registerQuestionnaireRoutes } from './routes/questionnaires';
import { registerRoutes as registerDecisionRoutes } from './routes/decisions';
import { registerRoutes as registerCommandRoutes } from './routes/commands';
import { registerRoutes as registerProgressRoutes } from './routes/progress';
import { registerRoutes as registerDriftRoutes } from './routes/drift';
import { registerRoutes as registerMetricsDashboardRoutes } from './routes/metrics-dashboard';
import { registerRoutes as registerDashboardRoutes } from './routes/dashboard';
import { registerRoutes as registerMilestonesRoutes } from './routes/milestones';
import { registerRoutes as registerSubscribeRoutes } from './routes/subscribe';
import { registerRoutes as registerOrchestratorRoutes } from './routes/orchestrator';
import { registerRoutes as registerApprovalRoutes } from './routes/approvals';
import { registerRoutes as registerPolicyRoutes } from './routes/policies';
import { registerRoutes as registerArtifactRoutes } from './routes/artifacts';
import { registerRoutes as registerAnalyticsRoutes } from './routes/analytics';
import { registerRoutes as registerSessionRoutes } from './routes/sessions';
import { registerRoutes as registerAgentRoutes } from './routes/agents';
import { registerRoutes as registerWorkspaceRoutes } from './routes/workspaces';
import { registerRoutes as registerCockpitRoutes } from './routes/cockpit';
import { registerRoutes as registerAuthRoutes } from './routes/auth';
import { registerRoutes as registerMiscRoutes } from './routes/misc';

const _cache = new FileCache();
const _audit = new AuditTrail({ logDir: path.join(BUSINESS_DOCS, 'audit') });
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

function validateStartupRuntimeProfile(host: string = HOST): void {
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

  structuredLog('info', 'startup_runtime_profile_validated', {
    profile: validation.profile,
    warnings: validation.warnings.length,
  });
}

/* ── Typed Server Context (M30-002) ───────────────────────────── */

const ctx: ServerContext = {
  _cache,
  sseManager,
  _metrics,
  _audit,
  safeWriteSync,
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
  resolveSessionFile: () => resolveSessionFile(getStore(), _cache, SESSION_DIR),
  getStorageProvider,
  STORAGE_PROVIDER,
  _authManager,
  _authMiddleware,
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

/* (Cross-route wiring for _getLatestCommand, _readCommandQueue, _getEngine
   is now handled inside registerRoutes() of commands.ts and orchestrator.ts) */

/* ── Build Fastify app ────────────────────────────────────────── */
let _app: Awaited<ReturnType<typeof buildApp>> | null = null;

async function createApp() {
  const app = await buildApp({ ctx, disableRequestLogging: false });

  // Register native Fastify route plugins (M30-004)
  // Commands must register before orchestrator (cross-route wiring order)
  await registerCommandRoutes(app, ctx);
  await registerOrchestratorRoutes(app, ctx);

  await registerQuestionnaireRoutes(app, ctx);
  await registerDecisionRoutes(app, ctx);
  await registerProgressRoutes(app, ctx);
  await registerDriftRoutes(app, ctx);
  await registerMetricsDashboardRoutes(app, ctx);
  await registerDashboardRoutes(app, ctx);
  await registerMilestonesRoutes(app, ctx);
  await registerSubscribeRoutes(app, ctx);
  await registerApprovalRoutes(app, ctx);
  await registerPolicyRoutes(app, ctx);
  await registerArtifactRoutes(app, ctx);
  await registerAnalyticsRoutes(app, ctx);
  await registerSessionRoutes(app, ctx);
  await registerAgentRoutes(app, ctx);
  await registerWorkspaceRoutes(app, ctx);
  await registerCockpitRoutes(app, ctx);
  await registerAuthRoutes(app, ctx);
  // misc registers last — includes catch-all SPA static handler
  await registerMiscRoutes(app, ctx);

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

/* istanbul ignore next */
if (require.main === module) {
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

  initStorageProvider()
    .then(() => createApp())
    .then(async (app) => {
      await app.listen({ port: PORT, host: HOST });
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
  const shutdown = (): void => {
    structuredLog('info', 'shutdown_initiated');
    clearInterval(flushTimer);
    clearInterval(snapTimer);
    metricsCollector.flush();
    const sp = getStorageProvider();
    if (sp) sp.close().catch(() => {});
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
};
