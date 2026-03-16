#!/usr/bin/env tsx
// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Questionnaire Manager — Local API server (coordinator)
// Minimal runtime dependencies (MCP SDK, Ajv, tsx). Requires Node.js 18+.

import http from 'http';
import path from 'path';
import { getStore } from './store';
import { FileCache } from './cache';
import { AuditTrail } from './audit';
import { withFileLock } from './file-lock';
import { resolveSessionFile } from './session-state-resolver';
import { errorResponse } from './utils/errors';
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

/* ── Configuration ────────────────────────────────────────────── */

const PORT: number = (() => {
  const p = parseInt(process.env.PORT as string, 10);
  return p >= 1 && p <= 65535 ? p : 3000;
})();
const HOST: string =
  typeof process.env.HOST === 'string' && process.env.HOST.trim()
    ? process.env.HOST.trim()
    : '127.0.0.1';
const WEBAPP_DIR = __dirname;
const PROJECT_ROOT = path.resolve(WEBAPP_DIR, '..', '..');
const BUSINESS_DOCS = path.join(PROJECT_ROOT, 'BusinessDocs');
const GITHUB_DOCS = path.join(PROJECT_ROOT, 'docs');
const SESSION_DIR = path.join(BUSINESS_DOCS, 'session');
const SESSION_FILE = path.join(SESSION_DIR, 'session-state.json');
const SESSION_AUDIT_FILE = path.join(SESSION_DIR, 'session-state-audit.json');
const Q_INDEX_FILE = path.join(BUSINESS_DOCS, 'questionnaire-index.md');
const DECISIONS_FILE = path.join(BUSINESS_DOCS, 'decisions.md');
const DECISIONS_DIR = path.join(BUSINESS_DOCS, 'decisions');
const COMMAND_QUEUE = path.join(SESSION_DIR, 'command-queue.json');
const HELP_DIR = path.join(PROJECT_ROOT, 'docs', 'help');
const ANALYTICS_FILE = path.join(BUSINESS_DOCS, 'analytics-events.json');
const METRICS_FILE = path.join(BUSINESS_DOCS, 'metrics', 'runtime-metrics.json');
const SSE_HEARTBEAT_MS = 30000;
const ANALYTICS_MAX_EVENTS = 5000;
const METRICS_FLUSH_INTERVAL_MS = 60000;
const SNAPSHOT_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

/* ── Rate limiter ─────────────────────────────────────────────── */

interface RateLimitEntry {
  count: number;
  reset: number;
}

const _rateLimitMap = new Map<string, RateLimitEntry>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let entry = _rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    entry = { count: 1, reset: now + RATE_LIMIT_WINDOW_MS };
    _rateLimitMap.set(ip, entry);
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically prune stale entries to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of _rateLimitMap) {
    if (now > entry.reset) _rateLimitMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS).unref();

/* ── Shared state ─────────────────────────────────────────────── */

interface EndpointMetric {
  count: number;
  times: number[];
}

interface ServerMetrics {
  requestCount: number;
  errorCount: number;
  responseTimes: number[];
  fileOpsCount: number;
  startedAt: number;
  perEndpoint: Record<string, EndpointMetric>;
}

const _cache = new FileCache();
const _sseClients = new Set<http.ServerResponse>();
const _metrics: ServerMetrics = {
  requestCount: 0,
  errorCount: 0,
  responseTimes: [],
  fileOpsCount: 0,
  startedAt: Date.now(),
  perEndpoint: {},
};
const METRICS_MAX_SAMPLES = 1000;
const AUDIT_DIR = path.join(BUSINESS_DOCS, 'audit');
const _audit = new AuditTrail({ logDir: AUDIT_DIR });

/* ── Metrics persistence (TECH-05) ────────────────────────────── */

/** Helper: Restore per-endpoint metrics from saved data. */
function _restoreEndpointMetrics(saved: Record<string, unknown>): void {
  if (!saved?.perEndpoint || typeof saved.perEndpoint !== 'object') return;
  for (const [key, val] of Object.entries(
    saved.perEndpoint as Record<string, Record<string, unknown>>
  )) {
    if (val && typeof val.count === 'number') {
      const times = Array.isArray(val.times) ? val.times.slice(-METRICS_MAX_SAMPLES) : [];
      _metrics.perEndpoint[key] = { count: val.count, times };
    }
  }
}

/** Helper: Restore global counter metrics from saved data. */
function _restoreCounters(saved: Record<string, unknown>): void {
  if (typeof saved.requestCount === 'number') _metrics.requestCount = saved.requestCount;
  if (typeof saved.errorCount === 'number') _metrics.errorCount = saved.errorCount;
  if (typeof saved.fileOpsCount === 'number') _metrics.fileOpsCount = saved.fileOpsCount;
}

function loadMetrics(): void {
  try {
    const store = getStore();
    if (!store.exists(METRICS_FILE)) return;
    const raw = store.readFile(METRICS_FILE);
    const saved = JSON.parse(raw);
    _restoreCounters(saved);
    _restoreEndpointMetrics(saved);
    structuredLog('info', 'metrics_loaded', {
      file: METRICS_FILE,
      requestCount: _metrics.requestCount,
    });
  } catch (err: unknown) {
    structuredLog('warn', 'metrics_load_failed', { error: (err as Error).message });
  }
}

/** Helper: Build endpoint snapshot for metrics flush. */
function _buildEndpointSnapshot(): Record<string, EndpointMetric> {
  const snapshot: Record<string, EndpointMetric> = {};
  for (const [key, val] of Object.entries(_metrics.perEndpoint)) {
    snapshot[key] = { count: val.count, times: val.times.slice(-METRICS_MAX_SAMPLES) };
  }
  return snapshot;
}

function flushMetrics(): void {
  try {
    const store = getStore();
    const dir = path.dirname(METRICS_FILE);
    store.mkdirp(dir);
    const snapshot = {
      flushed_at: new Date().toISOString(),
      requestCount: _metrics.requestCount,
      errorCount: _metrics.errorCount,
      fileOpsCount: _metrics.fileOpsCount,
      responseTimes: _metrics.responseTimes.slice(-METRICS_MAX_SAMPLES),
      perEndpoint: _buildEndpointSnapshot(),
    };
    store.writeFile(METRICS_FILE, JSON.stringify(snapshot, null, 2));
    structuredLog('debug', 'metrics_flushed', { file: METRICS_FILE });
  } catch (err: unknown) {
    structuredLog('warn', 'metrics_flush_failed', { error: (err as Error).message });
  }
}

loadMetrics();

/* ── State-dependent utilities ────────────────────────────────── */

function sseNotify(eventType: string, data: Record<string, unknown>): void {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of _sseClients) {
    try {
      client.write(payload);
    } catch {
      _sseClients.delete(client);
    }
  }
}

function recordMetric(
  method: string,
  pathname: string,
  durationMs: number,
  statusCode: number
): void {
  _metrics.requestCount++;
  if (statusCode >= 400) _metrics.errorCount++;
  _metrics.responseTimes.push(durationMs);
  if (_metrics.responseTimes.length > METRICS_MAX_SAMPLES) _metrics.responseTimes.shift();
  const key = `${method} ${pathname}`;
  if (!_metrics.perEndpoint[key]) _metrics.perEndpoint[key] = { count: 0, times: [] };
  const ep = _metrics.perEndpoint[key];
  ep.count++;
  ep.times.push(durationMs);
  if (ep.times.length > METRICS_MAX_SAMPLES) ep.times.shift();
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function computePercentiles(times: number[]): { p50: number; p95: number; p99: number } {
  const sorted = [...times].sort((a, b) => a - b);
  return { p50: percentile(sorted, 50), p95: percentile(sorted, 95), p99: percentile(sorted, 99) };
}

interface AuditMeta {
  operation?: string;
  entityType?: string;
  entityId?: string | null;
  user?: string;
  summary?: string;
}

function buildAuditMeta(filePath: string, meta?: AuditMeta): Required<AuditMeta> {
  const relative = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  const defaults: Required<AuditMeta> = {
    operation: 'update',
    entityType: relative
      .split('/')
      .pop()!
      .replace(/\.\w+$/, ''),
    entityId: null,
    user: 'system',
    summary: `File written: ${relative}`,
  };
  if (!meta) return defaults;
  return {
    operation: meta.operation || defaults.operation,
    entityType: meta.entityType || defaults.entityType,
    entityId: meta.entityId || defaults.entityId,
    user: meta.user || defaults.user,
    summary: meta.summary || defaults.summary,
  };
}

function safeWriteSync(
  filePath: string,
  data: string,
  encoding?: BufferEncoding,
  auditMeta?: AuditMeta
): void {
  getStore().writeFile(filePath, data, encoding);
  _cache.invalidate(filePath);
  _metrics.fileOpsCount++;
  const relative = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  sseNotify('file_change', { file: relative, timestamp: new Date().toISOString() });
  _audit.log(buildAuditMeta(filePath, auditMeta));
}

let _rebuildTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleRebuildIndex(): void {
  if (_rebuildTimer) clearTimeout(_rebuildTimer);
  _rebuildTimer = setTimeout(() => {
    _rebuildTimer = null;
    if ((ctx as Record<string, unknown>)._rebuildQuestionnaireIndex) {
      ((ctx as Record<string, unknown>)._rebuildQuestionnaireIndex as () => Promise<void>)().catch(
        (e: Error) => structuredLog('error', 'rebuild_index_failed', { error: e.message })
      );
    }
  }, 500);
}

/* ── Shared context for route modules ─────────────────────────── */

const ctx: Record<string, unknown> = {
  _cache,
  _sseClients,
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
  resolveSessionFile: () => resolveSessionFile(getStore(), _cache, SESSION_DIR),
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
};

/* ── Route modules ────────────────────────────────────────────── */

const questionnaireRoutes = require('./routes/questionnaires')(ctx);
const decisionRoutes = require('./routes/decisions')(ctx);
const commandRoutes = require('./routes/commands')(ctx);

// Wire cross-module helpers before progress and misc init
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

// All route modules initialized and cross-module wiring complete.
// Freeze ctx to prevent further accidental mutation.
Object.freeze(ctx);

/* ── Router ───────────────────────────────────────────────────── */

type RouteHandler = (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> | void;
type RouteTable = Record<string, RouteHandler>;

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

function matchPathTemplate(template: string, pathname: string): boolean {
  if (!template.includes(':')) return template === pathname;
  const tParts = template.split('/').filter(Boolean);
  const pParts = pathname.split('/').filter(Boolean);
  if (tParts.length !== pParts.length) return false;
  for (let i = 0; i < tParts.length; i++) {
    const t = tParts[i];
    if (t.startsWith(':')) continue;
    if (t !== pParts[i]) return false;
  }
  return true;
}

function resolveRoute(routes: RouteTable, method: string, pathname: string): RouteHandler | null {
  const exactKey = `${method} ${pathname}`;
  if (routes[exactKey]) return routes[exactKey];
  for (const [key, handler] of Object.entries(routes)) {
    const splitAt = key.indexOf(' ');
    if (splitAt < 0) continue;
    const routeMethod = key.slice(0, splitAt);
    if (routeMethod !== method) continue;
    const routePath = key.slice(splitAt + 1);
    if (matchPathTemplate(routePath, pathname)) return handler;
  }
  return null;
}

function findRouteTemplate(method: string, pathname: string): string | null {
  for (const key of Object.keys(ROUTES)) {
    const splitAt = key.indexOf(' ');
    if (splitAt < 0) continue;
    const routeMethod = key.slice(0, splitAt);
    if (routeMethod !== method) continue;
    const routePath = key.slice(splitAt + 1);
    if (matchPathTemplate(routePath, pathname)) return routePath;
  }
  return null;
}

// Remove internal-only keys from the route table
delete ROUTES._readCommandQueue;
delete ROUTES._getLatestCommand;
delete ROUTES._getEngine;
delete ROUTES._serveStatic;
delete ROUTES._rebuildQuestionnaireIndex;

function serveLocaleFile(pathname: string, res: http.ServerResponse): void {
  try {
    const store = getStore();
    const localePath = safePath(
      path.join(WEBAPP_DIR, 'locales'),
      pathname.replace(/^\/locales\//, '')
    );
    const localeContent = store.readFile(localePath);
    JSON.parse(localeContent); // validate JSON
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(localeContent, 'utf-8'));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.writeHead(200);
    res.end(localeContent);
  } catch (err: unknown) {
    structuredLog('warn', 'locale_serve_failed', { error: (err as Error).message, pathname });
    setSecurityHeaders(res);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function handleExplicitStatic(
  req: http.IncomingMessage,
  pathname: string,
  res: http.ServerResponse
): boolean {
  if (req.method !== 'GET') return false;
  if (pathname.startsWith('/locales/') && pathname.endsWith('.json')) {
    serveLocaleFile(pathname, res);
    return true;
  }
  return false;
}

async function dispatchRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string
): Promise<void> {
  const routeHandler = resolveRoute(ROUTES, req.method!, pathname);
  if (routeHandler) {
    try {
      await routeHandler(req, res);
    } catch (err) {
      handleRouteError(err, res);
    }
    return;
  }

  if (req.method === 'GET' && !pathname.startsWith('/api')) {
    serveStatic(req, res);
    return;
  }

  if (!handleMethodNotAllowed(res, pathname, ROUTES)) {
    json(res, 404, errorResponse('NOT_FOUND', 'Not found'));
  }
}

const server = http.createServer(async (req, res) => {
  const start = Date.now();
  const pathname = new URL(req.url!, `http://${HOST}:${PORT}`).pathname.replace(/\/+$/, '') || '/';
  if (handleExplicitStatic(req, pathname, res)) {
    return;
  }

  // Rate limit mutating API requests per IP
  if (pathname.startsWith('/api') && req.method !== 'GET') {
    const ip = req.socket.remoteAddress || 'unknown';
    if (isRateLimited(ip)) {
      setSecurityHeaders(res);
      res.setHeader('Retry-After', '60');
      json(res, 429, errorResponse('RATE_LIMITED', 'Too many requests. Please try again later.'));
      return;
    }
  }

  // Auth guard: reject mutating API requests on non-localhost bindings
  // unless the caller provides a valid API key.
  if (
    HOST !== '127.0.0.1' &&
    HOST !== 'localhost' &&
    pathname.startsWith('/api') &&
    req.method !== 'GET'
  ) {
    const expected = process.env.API_KEY;
    const provided = req.headers['x-api-key'];
    if (!expected || provided !== expected) {
      setSecurityHeaders(res);
      json(res, 403, errorResponse('FORBIDDEN', 'API key required for mutating requests'));
      return;
    }
  }

  await dispatchRequest(req, res, pathname);
  const duration = Date.now() - start;
  if (pathname !== '/api/events') {
    // Normalize pathname to route template to avoid metric-key explosion
    // from dynamic path segments like /api/questionnaires/Q-001
    const routeKey = findRouteTemplate(req.method!, pathname) || pathname;
    recordMetric(req.method!, routeKey, duration, res.statusCode);
    log(req.method!, pathname, res.statusCode, duration);
  }
});

server.setTimeout(30000);
server.keepAliveTimeout = 5000;

/* istanbul ignore next -- only when run directly */
if (require.main === module) {
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      structuredLog('error', 'port_in_use', {
        port: PORT,
        hint: 'Set PORT=3001 or stop the other process',
      });
    } else {
      structuredLog('error', 'server_error', { error: err.message });
    }
    process.exit(1);
  });

  server.listen(PORT, HOST, () => {
    structuredLog('info', 'server_started', {
      host: HOST,
      port: PORT,
      url: `http://${HOST}:${PORT}`,
    });
    if (HOST !== '127.0.0.1' && HOST !== 'localhost' && !process.env.API_KEY) {
      structuredLog('warn', 'auth_guard_no_api_key', {
        host: HOST,
        hint: 'Set API_KEY env var — all mutating API requests will be rejected without it',
      });
    }
  });

  const metricsFlushTimer = setInterval(flushMetrics, METRICS_FLUSH_INTERVAL_MS);
  metricsFlushTimer.unref();

  // GitHub state snapshot sync (every 10 minutes)
  let _snapshotScript: { createSnapshot: () => void } | undefined;
  try {
    _snapshotScript = require('../scripts/github-state-snapshot');
  } catch {
    /* gh CLI may not be available */
  }
  let _snapshotRunning = false;
  const syncGitHubSnapshot = function syncGitHubSnapshot(): void {
    if (!_snapshotScript || _snapshotRunning) return;
    _snapshotRunning = true;
    try {
      _snapshotScript.createSnapshot();
      structuredLog('info', 'github_snapshot_synced');
      sseNotify('github_snapshot', { timestamp: new Date().toISOString() });
    } catch (err: unknown) {
      structuredLog('warn', 'github_snapshot_failed', { error: (err as Error).message });
    } finally {
      _snapshotRunning = false;
    }
  };
  const snapshotTimer = setInterval(syncGitHubSnapshot, SNAPSHOT_SYNC_INTERVAL_MS);
  snapshotTimer.unref();
  // Run once at startup (deferred so server is listening first)
  setTimeout(syncGitHubSnapshot, 5000).unref();

  const shutdown = function shutdown(): void {
    structuredLog('info', 'shutdown_initiated');
    clearInterval(metricsFlushTimer);
    clearInterval(snapshotTimer);
    flushMetrics();
    server.close(() => {
      structuredLog('info', 'server_closed');
      process.exit(0);
    });
    const forceTimer = setTimeout(() => {
      structuredLog('error', 'forced_shutdown');
      process.exit(1);
    }, 5000);
    forceTimer.unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('unhandledRejection', (reason) => {
    structuredLog('error', 'unhandled_rejection', { error: String(reason) });
  });
  process.on('uncaughtException', (err) => {
    structuredLog('error', 'uncaught_exception', { error: err.message });
    shutdown();
  });
}

/* ── Backward-compatible exports (mcp-server.ts + tests) ───────── */

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
  _metrics,
  recordMetric,
  computePercentiles,
  _audit,
  flushMetrics,
  loadMetrics,
  METRICS_FILE,
  _rateLimitMap,
};
