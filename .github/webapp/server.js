#!/usr/bin/env node
// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Questionnaire Manager — Local API server (coordinator)
// Zero external dependencies. Requires Node.js 14+.
'use strict';

const http = require('http');
const path = require('path');
const { getStore } = require('./store');
const { FileCache } = require('./cache');
const { AuditTrail } = require('./audit');
const { withFileLock } = require('./file-lock');
const { resolveSessionFile } = require('./session-state-resolver');
const { errorResponse } = require('./utils/errors');
const {
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
} = require('./middleware');

/* ── Configuration ────────────────────────────────────────────── */

const PORT = (() => {
  const p = parseInt(process.env.PORT, 10);
  return p >= 1 && p <= 65535 ? p : 3000;
})();
const HOST =
  typeof process.env.HOST === 'string' && process.env.HOST.trim()
    ? process.env.HOST.trim()
    : '127.0.0.1';
const WEBAPP_DIR = __dirname;
const PROJECT_ROOT = path.resolve(WEBAPP_DIR, '..', '..');
const BUSINESS_DOCS = path.join(PROJECT_ROOT, 'BusinessDocs');
const GITHUB_DOCS = path.join(PROJECT_ROOT, '.github', 'docs');
const SESSION_DIR = path.join(GITHUB_DOCS, 'session');
const SESSION_FILE = path.join(SESSION_DIR, 'session-state.json');
const SESSION_AUDIT_FILE = path.join(SESSION_DIR, 'session-state-audit.json');
const Q_INDEX_FILE = path.join(BUSINESS_DOCS, 'questionnaire-index.md');
const DECISIONS_FILE = path.join(GITHUB_DOCS, 'decisions.md');
const DECISIONS_DIR = path.join(GITHUB_DOCS, 'decisions');
const COMMAND_QUEUE = path.join(SESSION_DIR, 'command-queue.json');
const HELP_DIR = path.join(PROJECT_ROOT, '.github', 'help');
const ANALYTICS_FILE = path.join(GITHUB_DOCS, 'analytics-events.json');
const METRICS_FILE = path.join(GITHUB_DOCS, 'metrics', 'runtime-metrics.json');
const SSE_HEARTBEAT_MS = 30000;
const ANALYTICS_MAX_EVENTS = 5000;
const METRICS_FLUSH_INTERVAL_MS = 60000;
const SNAPSHOT_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/* ── Shared state ─────────────────────────────────────────────── */

const _cache = new FileCache();
const _sseClients = new Set();
const _metrics = {
  requestCount: 0,
  errorCount: 0,
  responseTimes: [],
  fileOpsCount: 0,
  startedAt: Date.now(),
  perEndpoint: {},
};
const METRICS_MAX_SAMPLES = 1000;
const AUDIT_DIR = path.join(GITHUB_DOCS, 'audit');
const _audit = new AuditTrail({ logDir: AUDIT_DIR });

/* ── Metrics persistence (TECH-05) ────────────────────────────── */

/** Helper: Restore per-endpoint metrics from saved data. */
function _restoreEndpointMetrics(saved) {
  if (!saved?.perEndpoint || typeof saved.perEndpoint !== 'object') return;
  for (const [key, val] of Object.entries(saved.perEndpoint)) {
    if (val && typeof val.count === 'number') {
      const times = Array.isArray(val.times) ? val.times.slice(-METRICS_MAX_SAMPLES) : [];
      _metrics.perEndpoint[key] = { count: val.count, times };
    }
  }
}

/** Helper: Restore global counter metrics from saved data. */
function _restoreCounters(saved) {
  if (typeof saved.requestCount === 'number') _metrics.requestCount = saved.requestCount;
  if (typeof saved.errorCount === 'number') _metrics.errorCount = saved.errorCount;
  if (typeof saved.fileOpsCount === 'number') _metrics.fileOpsCount = saved.fileOpsCount;
}

function loadMetrics() {
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
  } catch (err) {
    structuredLog('warn', 'metrics_load_failed', { error: err.message });
  }
}

/** Helper: Build endpoint snapshot for metrics flush. */
function _buildEndpointSnapshot() {
  const snapshot = {};
  for (const [key, val] of Object.entries(_metrics.perEndpoint)) {
    snapshot[key] = { count: val.count, times: val.times.slice(-METRICS_MAX_SAMPLES) };
  }
  return snapshot;
}

function flushMetrics() {
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
  } catch (err) {
    structuredLog('warn', 'metrics_flush_failed', { error: err.message });
  }
}

loadMetrics();

/* ── State-dependent utilities ────────────────────────────────── */

function sseNotify(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of _sseClients) {
    try {
      client.write(payload);
    } catch {
      _sseClients.delete(client);
    }
  }
}

function recordMetric(method, pathname, durationMs, statusCode) {
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

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function computePercentiles(times) {
  const sorted = [...times].sort((a, b) => a - b);
  return { p50: percentile(sorted, 50), p95: percentile(sorted, 95), p99: percentile(sorted, 99) };
}

function buildAuditMeta(filePath, meta) {
  const relative = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  const defaults = {
    operation: 'update',
    entityType: relative
      .split('/')
      .pop()
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

function safeWriteSync(filePath, data, encoding, auditMeta) {
  getStore().writeFile(filePath, data, encoding);
  _cache.invalidate(filePath);
  _metrics.fileOpsCount++;
  const relative = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  sseNotify('file_change', { file: relative, timestamp: new Date().toISOString() });
  _audit.log(buildAuditMeta(filePath, auditMeta));
}

let _rebuildTimer = null;
function scheduleRebuildIndex() {
  if (_rebuildTimer) clearTimeout(_rebuildTimer);
  _rebuildTimer = setTimeout(() => {
    _rebuildTimer = null;
    if (ctx._rebuildQuestionnaireIndex) {
      ctx
        ._rebuildQuestionnaireIndex()
        .catch((e) => structuredLog('error', 'rebuild_index_failed', { error: e.message }));
    }
  }, 500);
}

/* ── Shared context for route modules ─────────────────────────── */

const ctx = {
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
const miscRoutes = require('./routes/misc')(ctx);

const serveStatic = miscRoutes._serveStatic;

/* ── Router ───────────────────────────────────────────────────── */

const ROUTES = {
  ...questionnaireRoutes,
  ...decisionRoutes,
  ...commandRoutes,
  ...progressRoutes,
  ...driftRoutes,
  ...metricsDashboardRoutes,
  ...dashboardRoutes,
  ...milestonesRoutes,
  ...subscribeRoutes,
  ...miscRoutes,
};

function matchPathTemplate(template, pathname) {
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

function resolveRoute(routes, method, pathname) {
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

// Remove internal-only keys from the route table
delete ROUTES._readCommandQueue;
delete ROUTES._getLatestCommand;
delete ROUTES._serveStatic;
delete ROUTES._rebuildQuestionnaireIndex;

function serveDesignSystemCss(res) {
  try {
    const store = getStore();
    const cssPath = safePath(WEBAPP_DIR, 'design-system.css');
    const cssContent = store.readFile(cssPath);
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(cssContent, 'utf-8'));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.writeHead(200);
    res.end(cssContent);
  } catch (err) {
    structuredLog('warn', 'css_serve_failed', { error: err.message });
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function serveDashboardHtml(res) {
  try {
    const store = getStore();
    const dashboardPath = safePath(WEBAPP_DIR, 'dashboard.html');
    const dashboardContent = store.readFile(dashboardPath);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(dashboardContent, 'utf-8'));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'self'; base-uri 'self'"
    );
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    res.writeHead(200);
    res.end(dashboardContent);
  } catch (err) {
    structuredLog('warn', 'dashboard_serve_failed', { error: err.message });
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function serveLandingHtml(res) {
  try {
    const store = getStore();
    const landingPath = safePath(WEBAPP_DIR, 'landing.html');
    const landingContent = store.readFile(landingPath);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(landingContent, 'utf-8'));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; form-action 'self'; frame-ancestors 'self'; base-uri 'self'"
    );
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    res.writeHead(200);
    res.end(landingContent);
  } catch (err) {
    structuredLog('warn', 'landing_serve_failed', { error: err.message });
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function serveDashboardScript(pathname, res) {
  try {
    const store = getStore();
    const jsPath = safePath(WEBAPP_DIR, pathname.substring(1));
    const jsContent = store.readFile(jsPath);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(jsContent, 'utf-8'));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.writeHead(200);
    res.end(jsContent);
  } catch (err) {
    structuredLog('warn', 'js_serve_failed', { error: err.message, pathname });
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function serveSocialCard(pathname, res) {
  try {
    const store = getStore();
    const cardPath = safePath(WEBAPP_DIR, pathname.substring(1));
    const cardContent = store.readFile(cardPath);
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Length', Buffer.byteLength(cardContent, 'utf-8'));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.writeHead(200);
    res.end(cardContent);
  } catch (err) {
    structuredLog('warn', 'social_card_serve_failed', { error: err.message, pathname });
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function serveLocaleFile(pathname, res) {
  try {
    const store = getStore();
    const localePath = safePath(path.join(PROJECT_ROOT, 'locales'), pathname.replace(/^\/locales\//, ''));
    const localeContent = store.readFile(localePath);
    JSON.parse(localeContent); // validate JSON
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Length', Buffer.byteLength(localeContent, 'utf-8'));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.writeHead(200);
    res.end(localeContent);
  } catch (err) {
    structuredLog('warn', 'locale_serve_failed', { error: err.message, pathname });
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
}

function handleExplicitStatic(req, pathname, res) {
  if (req.method !== 'GET') return false;
  if (pathname === '/design-system.css') {
    serveDesignSystemCss(res);
    return true;
  }
  if (pathname === '/dashboard' || pathname === '/dashboard.html') {
    serveDashboardHtml(res);
    return true;
  }
  if (pathname === '/landing' || pathname === '/landing.html') {
    serveLandingHtml(res);
    return true;
  }
  if (pathname.endsWith('.js')) {
    serveDashboardScript(pathname, res);
    return true;
  }
  if (pathname.startsWith('/social-cards/') && pathname.endsWith('.svg')) {
    serveSocialCard(pathname, res);
    return true;
  }
  if (pathname.startsWith('/locales/') && pathname.endsWith('.json')) {
    serveLocaleFile(pathname, res);
    return true;
  }
  return false;
}

async function dispatchRequest(req, res, pathname) {
  const routeHandler = resolveRoute(ROUTES, req.method, pathname);
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
  const pathname = new URL(req.url, `http://${HOST}:${PORT}`).pathname.replace(/\/+$/, '') || '/';
  if (handleExplicitStatic(req, pathname, res)) {
    return;
  }

  await dispatchRequest(req, res, pathname);
  const duration = Date.now() - start;
  if (pathname !== '/api/events') {
    recordMetric(req.method, pathname, duration, res.statusCode);
    log(req.method, pathname, res.statusCode, duration);
  }
});

server.setTimeout(30000);
server.keepAliveTimeout = 5000;

/* istanbul ignore next -- only when run directly */
if (require.main === module) {
  server.on('error', (err) => {
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
  });

  const metricsFlushTimer = setInterval(flushMetrics, METRICS_FLUSH_INTERVAL_MS);
  metricsFlushTimer.unref();

  // GitHub state snapshot sync (every 10 minutes)
  let _snapshotScript;
  try {
    _snapshotScript = require('../scripts/github-state-snapshot');
  } catch {
    /* gh CLI may not be available */
  }
  let _snapshotRunning = false;
  function syncGitHubSnapshot() {
    if (!_snapshotScript || _snapshotRunning) return;
    _snapshotRunning = true;
    try {
      _snapshotScript.createSnapshot();
      structuredLog('info', 'github_snapshot_synced');
      sseNotify('github_snapshot', { timestamp: new Date().toISOString() });
    } catch (err) {
      structuredLog('warn', 'github_snapshot_failed', { error: err.message });
    } finally {
      _snapshotRunning = false;
    }
  }
  const snapshotTimer = setInterval(syncGitHubSnapshot, SNAPSHOT_SYNC_INTERVAL_MS);
  snapshotTimer.unref();
  // Run once at startup (deferred so server is listening first)
  setTimeout(syncGitHubSnapshot, 5000).unref();

  function shutdown() {
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
  }
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

/* ── Backward-compatible exports (mcp-server.js + tests) ───────── */

module.exports = {
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
};
