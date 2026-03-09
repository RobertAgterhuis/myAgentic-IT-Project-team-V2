// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Miscellaneous route handlers — session, reevaluate, export, help,
 * SSE events, metrics, health, analytics, audit, and static serving.
 * @module routes/misc
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

const path = require('path');
const { getStore } = require('../store');
const models       = require('../models');
const schemas      = require('../schemas');
const { withFileLock } = require('../file-lock');
const { errorResponse } = require('../utils/errors');
const { VALIDATION: V, RESPONSES: R, STATIC: S } = require('../strings');
const {
  structuredLog, json, parseBody, safePath, setSecurityHeaders,
} = require('../middleware');

const HELP_TOC = [
  { slug: 'getting-started',    title: 'Getting Started',     icon: '🚀' },
  { slug: 'commands',           title: 'Commands Reference',  icon: '⌨️' },
  { slug: 'questionnaires',     title: 'Questionnaires',      icon: '📝' },
  { slug: 'decisions',          title: 'Decisions',           icon: '⚖️' },
  { slug: 'pipeline',           title: 'Pipeline & Progress', icon: '📊' },
  { slug: 'agents',             title: 'Agents',              icon: '🤖' },
  { slug: 'keyboard-shortcuts', title: 'Keyboard Shortcuts',  icon: '⌨️' },
];

const MAX_EXPORT_SIZE = 10 * 1024 * 1024;

module.exports = function createMiscRoutes(ctx) {
  const { _cache, _sseClients, _metrics, _audit, safeWriteSync,
          sseNotify, computePercentiles, recordMetric, flushMetrics,
          SESSION_DIR, SESSION_FILE, HELP_DIR, ANALYTICS_FILE, METRICS_FILE,
          PROJECT_ROOT, HOST, PORT, WEBAPP_DIR,
          SSE_HEARTBEAT_MS, ANALYTICS_MAX_EVENTS,
          _readCommandQueue } = ctx;

  /* ── Version (read once at module load) ──────────────────────── */
  let _version = '0.0.0';
  try {
    const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(getStore().readFile(pkgPath));
    _version = pkg.version || '0.0.0';
  } catch { /* package.json missing — use fallback */ }

  /* ── Session API ──────────────────────────────────────────────── */

  async function apiGetSession(_req, res) {
    const store = getStore();
    if (!store.exists(SESSION_FILE)) return json(res, 200, { session: null });
    const { data: session, errors } = _cache.readJSON(SESSION_FILE, schemas.validateSessionState);
    if (errors) { structuredLog('warn', 'session_validation', { errors }); }
    if (!session) return json(res, 200, { session: null });
    json(res, 200, { session });
  }

  async function apiReevaluate(req, res) {
    const body  = await parseBody(req);
    const scope = ['ALL', 'BUSINESS', 'TECH', 'UX', 'MARKETING'].includes(body.scope) ? body.scope : 'ALL';
    getStore().mkdirp(SESSION_DIR);

    const triggerPath = path.join(SESSION_DIR, 'reevaluate-trigger.json');
    const triggerData = { requested_at: models.isoNow(), scope, source: 'questionnaire-webapp', status: 'PENDING' };
    const triggerCheck = schemas.validateReevaluateTrigger(triggerData);
    if (!triggerCheck.valid) return json(res, 400, errorResponse('VALIDATION_ERROR', triggerCheck.errors.join('; ')));
    await withFileLock(triggerPath, async () => {
      safeWriteSync(triggerPath, JSON.stringify(triggerData, null, 2));
    });
    json(res, 200, { ok: true, scope, message: R.reevaluateTrigger(scope) });
  }

  /* ── Export API ───────────────────────────────────────────────── */

  function readSafeFile(store, basePath, relativePath) {
    let fp;
    try { fp = safePath(basePath, relativePath); } catch { return null; }
    if (!store.exists(fp)) return null;
    try { return _cache.read(fp); } catch { return null; }
  }

  function tryReadExportFile(store, filePath, sizeCtx) {
    const txt = readSafeFile(store, PROJECT_ROOT, filePath);
    if (!txt) return null;
    sizeCtx.size += Buffer.byteLength(txt);
    return sizeCtx.size <= MAX_EXPORT_SIZE ? txt : null;
  }

  function collectStringPhaseOutput(val, store, sizeCtx) {
    if (typeof val !== 'string' || val === 'null' || !val) return null;
    return tryReadExportFile(store, val, sizeCtx);
  }

  function collectObjectPhaseOutput(val, store, sizeCtx) {
    if (!val || typeof val !== 'object') return null;
    const entries = {};
    for (const [agentId, filePath] of Object.entries(val)) {
      if (sizeCtx.size > MAX_EXPORT_SIZE) break;
      if (filePath && filePath !== 'null') {
        const txt = tryReadExportFile(store, filePath, sizeCtx);
        if (txt) entries[agentId] = txt;
      }
    }
    return entries;
  }

  function collectPhaseOutputs(phaseOutputs, store) {
    const result = {};
    const sizeCtx = { size: 0 };
    for (const [phase, val] of Object.entries(phaseOutputs)) {
      if (sizeCtx.size > MAX_EXPORT_SIZE) break;
      const out = collectStringPhaseOutput(val, store, sizeCtx) || collectObjectPhaseOutput(val, store, sizeCtx);
      if (out) result[phase] = out;
    }
    return result;
  }

  async function apiGetExport(_req, res) {
    const store = getStore();
    const bundle = { exported_at: models.isoNow(), session: null, command_queue: [], phase_outputs: {} };

    if (store.exists(SESSION_FILE)) {
      try { bundle.session = JSON.parse(_cache.read(SESSION_FILE)); } catch {}
    }
    bundle.command_queue = _readCommandQueue();

    if (bundle.session && bundle.session.phase_outputs) {
      bundle.phase_outputs = collectPhaseOutputs(bundle.session.phase_outputs, store);
    }

    json(res, 200, bundle);
  }

  /* ── Help API ─────────────────────────────────────────────────── */

  async function apiGetHelp(req, res) {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const slug = url.searchParams.get('topic');

    if (!slug) {
      return json(res, 200, { toc: HELP_TOC });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return json(res, 400, errorResponse('INVALID_TOPIC', 'Invalid topic slug'));
    }

    const filePath = safePath(HELP_DIR, slug + '.md');
    if (!getStore().exists(filePath)) {
      return json(res, 404, errorResponse('TOPIC_NOT_FOUND', 'Help topic not found'));
    }
    const content = _cache.read(filePath);
    const entry = HELP_TOC.find(t => t.slug === slug);
    json(res, 200, { slug, title: entry ? entry.title : slug, content });
  }

  /* ── SSE Endpoint (SP-R2-004-005) ─────────────────────────────── */

  async function apiGetEvents(req, res) {
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    _sseClients.add(res);
    structuredLog('info', 'sse_client_connected', { clients: _sseClients.size });

    const heartbeat = setInterval(() => {
      try { res.write(`:heartbeat ${new Date().toISOString()}\n\n`); }
      catch { clearInterval(heartbeat); _sseClients.delete(res); }
    }, SSE_HEARTBEAT_MS);

    req.on('close', () => {
      clearInterval(heartbeat);
      _sseClients.delete(res);
      structuredLog('info', 'sse_client_disconnected', { clients: _sseClients.size });
    });
  }

  /* ── Metrics Endpoint (SP-R2-004-007) ─────────────────────────── */

  async function apiGetMetrics(_req, res) {
    const uptimeS = Math.round((Date.now() - _metrics.startedAt) / 1000);
    const pcts = computePercentiles(_metrics.responseTimes);
    const cacheStats = _cache.stats ? _cache.stats() : { hits: 0, misses: 0 };
    const totalCache = (cacheStats.hits || 0) + (cacheStats.misses || 0);
    const result = {
      uptime_seconds: uptimeS,
      request_count: _metrics.requestCount,
      error_count: _metrics.errorCount,
      error_rate: _metrics.requestCount > 0 ? +( _metrics.errorCount / _metrics.requestCount).toFixed(4) : 0,
      response_time_p50: pcts.p50,
      response_time_p95: pcts.p95,
      response_time_p99: pcts.p99,
      sse_connections: _sseClients.size,
      file_ops_count: _metrics.fileOpsCount,
      cache_hit_ratio: totalCache > 0 ? +((cacheStats.hits || 0) / totalCache).toFixed(4) : 0,
      per_endpoint: {},
    };
    for (const [ep, data] of Object.entries(_metrics.perEndpoint)) {
      const epPcts = computePercentiles(data.times);
      result.per_endpoint[ep] = { count: data.count, p50: epPcts.p50, p95: epPcts.p95, p99: epPcts.p99 };
    }
    json(res, 200, result);
  }

  async function apiFlushMetrics(_req, res) {
    flushMetrics();
    json(res, 200, { ok: true, flushed_at: new Date().toISOString() });
  }

  async function apiGetHealth(_req, res) {
    let store_status = 'ok';
    try {
      const store = getStore();
      store.exists(SESSION_DIR);
    } catch {
      store_status = 'degraded';
    }
    json(res, 200, {
      status: 'ok',
      version: _version,
      uptime: Math.round(process.uptime()),
      store_status,
      sse_connections: _sseClients.size,
      timestamp: new Date().toISOString(),
    });
  }

  /* ── Analytics Endpoint (SP-R2-004-008) ───────────────────────── */

  function validateAnalyticsEvent(evt) {
    const r = schemas.validateAnalyticsEvent(evt);
    return r.valid ? null : r.errors[0];
  }

  async function apiPostAnalytics(req, res) {
    const body = await parseBody(req);
    if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > 100) {
      return json(res, 400, errorResponse('VALIDATION_ERROR', V.EVENTS_RANGE));
    }
    const errors = [];
    const valid = [];
    for (const evt of body.events) {
      const err = validateAnalyticsEvent(evt);
      if (err) { errors.push(err); continue; }
      valid.push({
        event: evt.event,
        properties: evt.properties || {},
        timestamp: new Date().toISOString(),
      });
    }

    if (valid.length > 0) {
      await withFileLock(ANALYTICS_FILE, () => {
        let existing = [];
        if (getStore().exists(ANALYTICS_FILE)) {
          try { existing = JSON.parse(_cache.read(ANALYTICS_FILE)); } catch { existing = []; }
        }
        existing.push(...valid);
        if (existing.length > ANALYTICS_MAX_EVENTS) existing = existing.slice(-ANALYTICS_MAX_EVENTS);
        getStore().mkdirp(path.dirname(ANALYTICS_FILE));
        safeWriteSync(ANALYTICS_FILE, JSON.stringify(existing, null, 2));
      });
    }

    json(res, 200, { ok: true, accepted: valid.length, rejected: errors.length });
  }

  async function apiGetAnalytics(_req, res) {
    if (!getStore().exists(ANALYTICS_FILE)) return json(res, 200, { events: [], total: 0 });
    let events = [];
    try { events = JSON.parse(_cache.read(ANALYTICS_FILE)); } catch {}
    json(res, 200, { events, total: events.length });
  }

  /* ── Audit Trail Endpoint (SP-R2-007-005) ─────────────────────── */

  async function apiGetAudit(req, res) {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const limitParam = parseInt(url.searchParams.get('limit'), 10);
    const limit = (limitParam >= 1 && limitParam <= 1000) ? limitParam : 50;
    const entries = _audit.read(limit);
    json(res, 200, { entries, total: entries.length, limit });
  }

  /* ── Static file serving ──────────────────────────────────────── */

  let cachedHtml = null;
  try {
    const htmlPath = path.join(WEBAPP_DIR, 'index.html');
    if (getStore().exists(htmlPath)) cachedHtml = Buffer.from(getStore().readFile(htmlPath));
  } catch { /* index.html not found — static serving will return 404 */ }

  function serveStatic(_req, res) {
    if (!cachedHtml) { res.writeHead(404); return res.end(S.NOT_FOUND); }
    setSecurityHeaders(res);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': cachedHtml.length });
    res.end(cachedHtml);
  }

  return {
    'GET /api/session':        apiGetSession,
    'POST /api/reevaluate':    apiReevaluate,
    'GET /api/export':         apiGetExport,
    'GET /api/help':           apiGetHelp,
    'GET /api/events':         apiGetEvents,
    'GET /api/metrics':        apiGetMetrics,
    'POST /api/metrics/flush': apiFlushMetrics,
    'GET /api/health':         apiGetHealth,
    'POST /api/analytics':     apiPostAnalytics,
    'GET /api/analytics':      apiGetAnalytics,
    'GET /api/audit':          apiGetAudit,
    'GET /health':             (_req, res) => {
      let store_status = 'ok';
      try { getStore().exists(SESSION_DIR); } catch { store_status = 'degraded'; }
      json(res, 200, { status: 'ok', version: _version, uptime: Math.round(process.uptime()), store_status });
    },
    _serveStatic:              serveStatic,
  };
};
