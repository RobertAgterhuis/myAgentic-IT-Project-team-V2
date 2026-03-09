#!/usr/bin/env node
// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Questionnaire Manager — Local API server (coordinator)
// Zero external dependencies. Requires Node.js 14+.
'use strict';

const http = require('http');
const path = require('path');
const { getStore }     = require('./store');
const { FileCache }    = require('./cache');
const { AuditTrail }   = require('./audit');
const { withFileLock } = require('./file-lock');
const { errorResponse } = require('./utils/errors');
const {
  structuredLog, log, json, setSecurityHeaders, safePath,
  sanitizeMarkdown, sanitizeQID, detectSecrets, checkSecretsInBody,
  handleMethodNotAllowed, handleRouteError,
} = require('./middleware');

/* ── Configuration ────────────────────────────────────────────── */

const PORT          = (() => { const p = parseInt(process.env.PORT, 10); return (p >= 1 && p <= 65535) ? p : 3000; })();
const HOST          = '127.0.0.1';
const WEBAPP_DIR    = __dirname;
const PROJECT_ROOT  = path.resolve(WEBAPP_DIR, '..', '..');
const BUSINESS_DOCS = path.join(PROJECT_ROOT, 'BusinessDocs');
const GITHUB_DOCS   = path.join(PROJECT_ROOT, '.github', 'docs');
const SESSION_DIR   = path.join(GITHUB_DOCS, 'session');
const SESSION_FILE  = path.join(SESSION_DIR, 'session-state.json');
const Q_INDEX_FILE  = path.join(BUSINESS_DOCS, 'questionnaire-index.md');
const DECISIONS_FILE = path.join(GITHUB_DOCS, 'decisions.md');
const DECISIONS_DIR  = path.join(GITHUB_DOCS, 'decisions');
const COMMAND_QUEUE  = path.join(SESSION_DIR, 'command-queue.json');
const HELP_DIR       = path.join(PROJECT_ROOT, '.github', 'help');
const ANALYTICS_FILE = path.join(GITHUB_DOCS, 'analytics-events.json');
const METRICS_FILE   = path.join(GITHUB_DOCS, 'metrics', 'runtime-metrics.json');
const SSE_HEARTBEAT_MS = 30000;
const ANALYTICS_MAX_EVENTS = 5000;
const METRICS_FLUSH_INTERVAL_MS = 60000;

/* ── Shared state ─────────────────────────────────────────────── */

const _cache      = new FileCache();
const _sseClients = new Set();
const _metrics    = { requestCount: 0, errorCount: 0, responseTimes: [], fileOpsCount: 0, startedAt: Date.now(), perEndpoint: {} };
const METRICS_MAX_SAMPLES = 1000;
const AUDIT_DIR   = path.join(GITHUB_DOCS, 'audit');
const _audit      = new AuditTrail({ logDir: AUDIT_DIR });

/* ── Metrics persistence (TECH-05) ────────────────────────────── */

function loadMetrics() {
  try {
    const store = getStore();
    if (!store.exists(METRICS_FILE)) return;
    const raw = store.readFile(METRICS_FILE);
    const saved = JSON.parse(raw);
    if (typeof saved.requestCount === 'number') _metrics.requestCount = saved.requestCount;
    if (typeof saved.errorCount === 'number')   _metrics.errorCount   = saved.errorCount;
    if (typeof saved.fileOpsCount === 'number') _metrics.fileOpsCount = saved.fileOpsCount;
    if (saved.perEndpoint && typeof saved.perEndpoint === 'object') {
      for (const [key, val] of Object.entries(saved.perEndpoint)) {
        if (val && typeof val.count === 'number') {
          _metrics.perEndpoint[key] = { count: val.count, times: Array.isArray(val.times) ? val.times.slice(-METRICS_MAX_SAMPLES) : [] };
        }
      }
    }
    structuredLog('info', 'metrics_loaded', { file: METRICS_FILE, requestCount: _metrics.requestCount });
  } catch (err) {
    structuredLog('warn', 'metrics_load_failed', { error: err.message });
  }
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
      perEndpoint: {},
    };
    for (const [key, val] of Object.entries(_metrics.perEndpoint)) {
      snapshot.perEndpoint[key] = { count: val.count, times: val.times.slice(-METRICS_MAX_SAMPLES) };
    }
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
    try { client.write(payload); } catch { _sseClients.delete(client); }
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
  const idx = Math.ceil(p / 100 * sorted.length) - 1;
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
    entityType: relative.split('/').pop().replace(/\.\w+$/, ''),
    entityId: null, user: 'system',
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
      ctx._rebuildQuestionnaireIndex().catch(e => structuredLog('error', 'rebuild_index_failed', { error: e.message }));
    }
  }, 500);
}

/* ── Shared context for route modules ─────────────────────────── */

const ctx = {
  _cache, _sseClients, _metrics, _audit,
  safeWriteSync, sseNotify, computePercentiles, recordMetric,
  scheduleRebuildIndex, flushMetrics,
  PROJECT_ROOT, BUSINESS_DOCS, GITHUB_DOCS,
  SESSION_DIR, SESSION_FILE, Q_INDEX_FILE,
  DECISIONS_FILE, DECISIONS_DIR, COMMAND_QUEUE,
  HELP_DIR, ANALYTICS_FILE, METRICS_FILE, WEBAPP_DIR,
  HOST, PORT, SSE_HEARTBEAT_MS, ANALYTICS_MAX_EVENTS,
};

/* ── Route modules ────────────────────────────────────────────── */

const questionnaireRoutes = require('./routes/questionnaires')(ctx);
const decisionRoutes      = require('./routes/decisions')(ctx);
const commandRoutes       = require('./routes/commands')(ctx);

// Wire cross-module helpers before progress and misc init
ctx._getLatestCommand = commandRoutes._getLatestCommand;
ctx._readCommandQueue = commandRoutes._readCommandQueue;

const progressRoutes = require('./routes/progress')(ctx);
const miscRoutes     = require('./routes/misc')(ctx);

const serveStatic = miscRoutes._serveStatic;

/* ── Router ───────────────────────────────────────────────────── */

const ROUTES = {
  ...questionnaireRoutes,
  ...decisionRoutes,
  ...commandRoutes,
  ...progressRoutes,
  ...miscRoutes,
};

// Remove internal-only keys from the route table
delete ROUTES._readCommandQueue;
delete ROUTES._getLatestCommand;
delete ROUTES._serveStatic;
delete ROUTES._rebuildQuestionnaireIndex;

const server = http.createServer(async (req, res) => {
  const start = Date.now();
  const pathname = new URL(req.url, `http://${HOST}:${PORT}`).pathname.replace(/\/+$/, '') || '/';
  const key = `${req.method} ${pathname}`;
  if (ROUTES[key]) {
    try { await ROUTES[key](req, res); }
    catch (err) { handleRouteError(err, res); }
  } else if (req.method === 'GET' && !pathname.startsWith('/api')) {
    serveStatic(req, res);
  } else if (!handleMethodNotAllowed(res, pathname, ROUTES)) {
    json(res, 404, errorResponse('NOT_FOUND', 'Not found'));
  }
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
      structuredLog('error', 'port_in_use', { port: PORT, hint: 'Set PORT=3001 or stop the other process' });
    } else {
      structuredLog('error', 'server_error', { error: err.message });
    }
    process.exit(1);
  });

  server.listen(PORT, HOST, () => {
    structuredLog('info', 'server_started', { host: HOST, port: PORT, url: `http://${HOST}:${PORT}` });
  });

  const metricsFlushTimer = setInterval(flushMetrics, METRICS_FLUSH_INTERVAL_MS);
  metricsFlushTimer.unref();

  function shutdown() {
    structuredLog('info', 'shutdown_initiated');
    clearInterval(metricsFlushTimer);
    flushMetrics();
    server.close(() => { structuredLog('info', 'server_closed'); process.exit(0); });
    const forceTimer = setTimeout(() => { structuredLog('error', 'forced_shutdown'); process.exit(1); }, 5000);
    forceTimer.unref();
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('unhandledRejection', (reason) => { structuredLog('error', 'unhandled_rejection', { error: String(reason) }); });
  process.on('uncaughtException', (err) => { structuredLog('error', 'uncaught_exception', { error: err.message }); shutdown(); });
}

/* ── Backward-compatible exports (mcp-server.js + tests) ───────── */

module.exports = {
  sanitizeMarkdown, sanitizeQID, detectSecrets, checkSecretsInBody,
  structuredLog, withFileLock, safePath, setSecurityHeaders, server,
  _cache, _sseClients, sseNotify, _metrics, recordMetric, computePercentiles,
  _audit, flushMetrics, loadMetrics, METRICS_FILE,
};
