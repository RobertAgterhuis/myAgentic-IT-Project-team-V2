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
} from './config';
import { createStorageProvider } from '../../platform/engine/persistence';
import type { StorageProvider } from '../../platform/engine/persistence';

import { buildApp } from './app';
import { registerLegacyRoutes } from './route-adapter';
import type { ServerContext } from './context';
import { toLegacyCtx } from './context';

const _cache = new FileCache();
const _audit = new AuditTrail({ logDir: path.join(BUSINESS_DOCS, 'audit') });
const rateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: RATE_LIMIT_MAX,
});
const sseManager = createSSEManager({ heartbeatMs: SSE_HEARTBEAT_MS });
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

/* ── Legacy ctx adapter for route modules not yet migrated ────── */
const legacyCtx = toLegacyCtx(ctx);

/* ── Route modules (legacy pattern: ctx → RouteTable) ─────────── */
const questionnaireRoutes = require('./routes/questionnaires')(legacyCtx);
const decisionRoutes = require('./routes/decisions')(legacyCtx);
const commandRoutes = require('./routes/commands')(legacyCtx);
ctx._getLatestCommand = commandRoutes._getLatestCommand;
ctx._readCommandQueue = commandRoutes._readCommandQueue;
const progressRoutes = require('./routes/progress')(legacyCtx);
const driftRoutes = require('./routes/drift')(legacyCtx);
const metricsDashboardRoutes = require('./routes/metrics-dashboard')(legacyCtx);
const dashboardRoutes = require('./routes/dashboard')(legacyCtx);
const milestonesRoutes = require('./routes/milestones')(legacyCtx);
const subscribeRoutes = require('./routes/subscribe')(legacyCtx);
const orchestratorRoutes = require('./routes/orchestrator')(legacyCtx);
ctx._getEngine = orchestratorRoutes._getEngine;
const approvalRoutes = require('./routes/approvals')(legacyCtx);
const policyRoutes = require('./routes/policies')(legacyCtx);
const artifactRoutes = require('./routes/artifacts')(legacyCtx);
const analyticsRoutes = require('./routes/analytics')(legacyCtx);
const sessionRoutes = require('./routes/sessions')(legacyCtx);
const agentRoutes = require('./routes/agents')(legacyCtx);
const workspaceRoutes = require('./routes/workspaces')(legacyCtx);
const cockpitRoutes = require('./routes/cockpit')(legacyCtx);
const authRoutes = require('./routes/auth')(legacyCtx);
const miscRoutes = require('./routes/misc')(legacyCtx);

/* ── Clean private keys from route tables ─────────────────────── */
function stripPrivateKeys(routes: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...routes };
  for (const k of Object.keys(clean)) {
    if (k.startsWith('_')) delete clean[k];
  }
  return clean;
}

/* ── Build Fastify app ────────────────────────────────────────── */
let _app: Awaited<ReturnType<typeof buildApp>> | null = null;

async function createApp() {
  const app = await buildApp({ ctx, disableRequestLogging: false });

  // Register all legacy route modules with OpenAPI tags
  registerLegacyRoutes(
    app,
    stripPrivateKeys(questionnaireRoutes) as Record<string, never>,
    'questionnaires'
  );
  registerLegacyRoutes(app, stripPrivateKeys(decisionRoutes) as Record<string, never>, 'decisions');
  registerLegacyRoutes(app, stripPrivateKeys(commandRoutes) as Record<string, never>, 'commands');
  registerLegacyRoutes(app, stripPrivateKeys(progressRoutes) as Record<string, never>, 'progress');
  registerLegacyRoutes(app, stripPrivateKeys(driftRoutes) as Record<string, never>, 'drift');
  registerLegacyRoutes(
    app,
    stripPrivateKeys(metricsDashboardRoutes) as Record<string, never>,
    'metrics'
  );
  registerLegacyRoutes(
    app,
    stripPrivateKeys(dashboardRoutes) as Record<string, never>,
    'dashboard'
  );
  registerLegacyRoutes(
    app,
    stripPrivateKeys(milestonesRoutes) as Record<string, never>,
    'milestones'
  );
  registerLegacyRoutes(
    app,
    stripPrivateKeys(subscribeRoutes) as Record<string, never>,
    'subscribe'
  );
  registerLegacyRoutes(
    app,
    stripPrivateKeys(orchestratorRoutes) as Record<string, never>,
    'orchestrator'
  );
  registerLegacyRoutes(app, stripPrivateKeys(approvalRoutes) as Record<string, never>, 'approvals');
  registerLegacyRoutes(app, stripPrivateKeys(policyRoutes) as Record<string, never>, 'policies');
  registerLegacyRoutes(app, stripPrivateKeys(artifactRoutes) as Record<string, never>, 'artifacts');
  registerLegacyRoutes(
    app,
    stripPrivateKeys(analyticsRoutes) as Record<string, never>,
    'analytics'
  );
  registerLegacyRoutes(app, stripPrivateKeys(sessionRoutes) as Record<string, never>, 'sessions');
  registerLegacyRoutes(app, stripPrivateKeys(agentRoutes) as Record<string, never>, 'agents');
  registerLegacyRoutes(
    app,
    stripPrivateKeys(workspaceRoutes) as Record<string, never>,
    'workspaces'
  );
  registerLegacyRoutes(app, stripPrivateKeys(cockpitRoutes) as Record<string, never>, 'cockpit');
  registerLegacyRoutes(app, stripPrivateKeys(authRoutes) as Record<string, never>, 'auth');
  registerLegacyRoutes(app, stripPrivateKeys(miscRoutes) as Record<string, never>, 'system');

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
        await initStorageProvider().catch((err: Error) => {
          structuredLog('error', 'storage_provider_init_failed', { error: err.message });
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
      if (!_authManager && HOST !== '127.0.0.1' && HOST !== 'localhost' && !process.env.API_KEY)
        structuredLog('warn', 'auth_guard_no_api_key', { host: HOST });
    })
    .catch((err: Error) => {
      structuredLog('error', 'storage_provider_init_failed', { error: err.message });
      // Fall back to starting without StorageProvider — FileStore still works
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
};
