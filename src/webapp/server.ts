#!/usr/bin/env tsx
// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Questionnaire Manager — Local API server (composition root)
import http from 'http';
import path from 'path';
import { getStore } from './store';
import { FileCache } from './cache';
import { AuditTrail } from './audit';
import { createRateLimiter } from './rate-limiter';
import { createSSEManager } from './sse-manager';
import { createMetricsCollector } from './metrics-collector';
import { resolveRoute, findRouteTemplate, type RouteTable } from './router';
import { resolveSessionFile } from './session-state-resolver';
import { errorResponse } from './utils/errors';
import { withFileLock } from './file-lock';
import {
  structuredLog,
  log,
  json,
  setSecurityHeaders,
  safePath,
  sanitizeMarkdown,
  sanitizeQID,
  detectSecrets,
  checkSecretsInBody,
  handleMethodNotAllowed,
  handleRouteError,
} from './middleware';
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
} from './config';

const _cache = new FileCache();
const _audit = new AuditTrail({ logDir: path.join(BUSINESS_DOCS, 'audit') });
const rateLimiter = createRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: RATE_LIMIT_MAX,
});
const sseManager = createSSEManager({ heartbeatMs: SSE_HEARTBEAT_MS });
const store = () => getStore();
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
    operation: auditMeta?.operation || 'update',
    entityType:
      auditMeta?.entityType ||
      rel
        .split('/')
        .pop()!
        .replace(/\.\w+$/, ''),
    entityId: (auditMeta?.entityId as string | null) || null,
    user: auditMeta?.user || 'system',
    summary: auditMeta?.summary || `File written: ${rel}`,
  });
}

let _rebuildTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleRebuildIndex(): void {
  if (_rebuildTimer) clearTimeout(_rebuildTimer);
  _rebuildTimer = setTimeout(() => {
    _rebuildTimer = null;
    const rebuild = (ctx as Record<string, unknown>)._rebuildQuestionnaireIndex as
      | (() => Promise<void>)
      | undefined;
    rebuild?.().catch((e: Error) =>
      structuredLog('error', 'rebuild_index_failed', { error: e.message })
    );
  }, 500);
}

const ctx: Record<string, unknown> = {
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
};

const questionnaireRoutes = require('./routes/questionnaires')(ctx);
const decisionRoutes = require('./routes/decisions')(ctx);
const commandRoutes = require('./routes/commands')(ctx);
ctx._getLatestCommand = commandRoutes._getLatestCommand;
ctx._readCommandQueue = commandRoutes._readCommandQueue;
const progressRoutes = require('./routes/progress')(ctx);
const driftRoutes = require('./routes/drift')(ctx);
const metricsDashboardRoutes = require('./routes/metrics-dashboard')(ctx);
const dashboardRoutes = require('./routes/dashboard')(ctx);
const milestonesRoutes = require('./routes/milestones')(ctx);
const subscribeRoutes = require('./routes/subscribe')(ctx);
const orchestratorRoutes = require('./routes/orchestrator')(ctx);
ctx._getEngine = orchestratorRoutes._getEngine;
const approvalRoutes = require('./routes/approvals')(ctx);
const artifactRoutes = require('./routes/artifacts')(ctx);
const analyticsRoutes = require('./routes/analytics')(ctx);
const sessionRoutes = require('./routes/sessions')(ctx);
const agentRoutes = require('./routes/agents')(ctx);
const miscRoutes = require('./routes/misc')(ctx);
const serveStatic = miscRoutes._serveStatic;
Object.freeze(ctx);

const ROUTES: RouteTable = {
  ...questionnaireRoutes,
  ...decisionRoutes,
  ...commandRoutes,
  ...progressRoutes,
  ...driftRoutes,
  ...metricsDashboardRoutes,
  ...dashboardRoutes,
  ...milestonesRoutes,
  ...subscribeRoutes,
  ...orchestratorRoutes,
  ...approvalRoutes,
  ...artifactRoutes,
  ...analyticsRoutes,
  ...sessionRoutes,
  ...agentRoutes,
  ...orchestratorRoutes,
  ...miscRoutes,
};
for (const k of [
  '_readCommandQueue',
  '_getLatestCommand',
  '_getEngine',
  '_serveStatic',
  '_rebuildQuestionnaireIndex',
])
  delete ROUTES[k];

function serveLocaleFile(pathname: string, res: http.ServerResponse): void {
  try {
    const lp = safePath(path.join(WEBAPP_DIR, 'locales'), pathname.replace(/^\/locales\//, ''));
    const c = store().readFile(lp);
    JSON.parse(c);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(c, 'utf-8'),
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(c);
  } catch (err: unknown) {
    structuredLog('warn', 'locale_serve_failed', { error: (err as Error).message, pathname });
    setSecurityHeaders(res);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const start = Date.now();
  const pathname = new URL(req.url!, `http://${HOST}:${PORT}`).pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'GET' && pathname.startsWith('/locales/') && pathname.endsWith('.json')) {
    serveLocaleFile(pathname, res);
    return;
  }
  if (pathname.startsWith('/api') && req.method !== 'GET') {
    const ip = req.socket.remoteAddress || 'unknown';
    const { allowed, retryAfter } = rateLimiter.check(ip);
    if (!allowed) {
      setSecurityHeaders(res);
      res.setHeader('Retry-After', String(retryAfter ?? 60));
      json(res, 429, errorResponse('RATE_LIMITED', 'Too many requests. Please try again later.'));
      return;
    }
  }
  if (
    HOST !== '127.0.0.1' &&
    HOST !== 'localhost' &&
    pathname.startsWith('/api') &&
    req.method !== 'GET'
  ) {
    const expected = process.env.API_KEY;
    if (!expected || req.headers['x-api-key'] !== expected) {
      setSecurityHeaders(res);
      json(res, 403, errorResponse('FORBIDDEN', 'API key required for mutating requests'));
      return;
    }
  }

  const handler = resolveRoute(ROUTES, req.method!, pathname);
  if (handler) {
    try {
      await handler(req, res);
    } catch (err) {
      handleRouteError(err, res);
    }
  } else if (req.method === 'GET' && !pathname.startsWith('/api')) {
    serveStatic(req, res);
  } else if (!handleMethodNotAllowed(res, pathname, ROUTES)) {
    json(res, 404, errorResponse('NOT_FOUND', 'Not found'));
  }

  const duration = Date.now() - start;
  if (pathname !== '/api/events') {
    const routeKey = findRouteTemplate(ROUTES, req.method!, pathname) || pathname;
    recordMetric(req.method!, routeKey, duration, res.statusCode);
    log(req.method!, pathname, res.statusCode, duration);
  }
});
server.setTimeout(30000);
server.keepAliveTimeout = 5000;
/* istanbul ignore next */
if (require.main === module) {
  server.on('error', (err: NodeJS.ErrnoException) => {
    structuredLog('error', err.code === 'EADDRINUSE' ? 'port_in_use' : 'server_error', {
      port: PORT,
      error: err.message,
    });
    process.exit(1);
  });
  server.listen(PORT, HOST, () => {
    structuredLog('info', 'server_started', {
      host: HOST,
      port: PORT,
      url: `http://${HOST}:${PORT}`,
    });
    if (HOST !== '127.0.0.1' && HOST !== 'localhost' && !process.env.API_KEY)
      structuredLog('warn', 'auth_guard_no_api_key', { host: HOST });
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
    server.close(() => {
      structuredLog('info', 'server_closed');
      process.exit(0);
    });
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
};
