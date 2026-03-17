// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Miscellaneous route handlers — session, reevaluate, export, help,
 * SSE events, metrics, health, analytics, audit, and static serving.
 * @module routes/misc
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import path from 'path';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import { getStore } from '../store';
import * as models from '../models';
import * as schemas from '../schemas';
import { withFileLock } from '../file-lock';
import { SessionService, toServiceContext } from '../services';
import { errorResponse } from '../utils/errors';
import { VALIDATION as V, RESPONSES as R, STATIC as S } from '../strings';
import { structuredLog, safePath, setSecurityHeaders } from '../middleware';

const HELP_TOC = [
  { slug: 'getting-started', title: 'Getting Started', icon: '🚀' },
  { slug: 'commands', title: 'Commands Reference', icon: '⌨️' },
  { slug: 'questionnaires', title: 'Questionnaires', icon: '📝' },
  { slug: 'decisions', title: 'Decisions', icon: '⚖️' },
  { slug: 'pipeline', title: 'Pipeline & Progress', icon: '📊' },
  { slug: 'agents', title: 'Agents', icon: '🤖' },
  { slug: 'keyboard-shortcuts', title: 'Keyboard Shortcuts', icon: '⌨️' },
];

const MAX_EXPORT_SIZE = 10 * 1024 * 1024;

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const {
    _cache,
    sseManager,
    _metrics,
    safeWriteSync,
    computePercentiles,
    flushMetrics,
    SESSION_DIR,
    SESSION_FILE,
    resolveSessionFile,
    ANALYTICS_FILE,
    PROJECT_ROOT,
    WEBAPP_DIR,
    ANALYTICS_MAX_EVENTS,
    _readCommandQueue,
    getStorageProvider,
    STORAGE_PROVIDER: _storageProviderType,
  } = ctx;

  const svc = new SessionService(toServiceContext(ctx));

  /* ── Version (read once at module load) ──────────────────────── */
  let _version = '0.0.0';
  try {
    const pkgPath = path.resolve(__dirname, '..', '..', '..', 'package.json');
    const pkg = JSON.parse(getStore().readFile(pkgPath));
    _version = pkg.version || '0.0.0';
  } catch {
    /* package.json missing — use fallback */
  }

  /* ── Session API ──────────────────────────────────────────────── */

  async function apiGetSession(_request: FastifyRequest, reply: FastifyReply) {
    const session = svc.readSessionState();
    reply.send({ session: session || null });
  }

  async function apiReevaluate(request: FastifyRequest, reply: FastifyReply) {
    const body = (request.body as Record<string, unknown>) || {};
    const rawScope = body.scope as string;
    const scope = ['ALL', 'BUSINESS', 'TECH', 'UX', 'MARKETING'].includes(rawScope)
      ? rawScope
      : 'ALL';
    getStore().mkdirp(SESSION_DIR);

    const triggerPath = path.join(SESSION_DIR, 'reevaluate-trigger.json');
    const triggerData = {
      requested_at: models.isoNow(),
      scope,
      source: 'questionnaire-webapp',
      status: 'PENDING',
    };
    const triggerCheck = schemas.validateReevaluateTrigger(triggerData);
    if (!triggerCheck.valid)
      return reply
        .code(400)
        .send(errorResponse('VALIDATION_ERROR', triggerCheck.errors.join('; ')));
    await withFileLock(triggerPath, async () => {
      safeWriteSync(triggerPath, JSON.stringify(triggerData, null, 2));
    });
    reply.send({ ok: true, scope, message: R.reevaluateTrigger(scope) });
  }

  /* ── Export API ───────────────────────────────────────────────── */

  function readSafeFile(store, basePath, relativePath) {
    let fp;
    try {
      fp = safePath(basePath, relativePath);
    } catch {
      return null;
    }
    if (!store.exists(fp)) return null;
    try {
      return _cache.read(fp);
    } catch {
      return null;
    }
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
      const out =
        collectStringPhaseOutput(val, store, sizeCtx) ||
        collectObjectPhaseOutput(val, store, sizeCtx);
      if (out) result[phase] = out;
    }
    return result;
  }

  async function apiGetExport(_request: FastifyRequest, reply: FastifyReply) {
    const store = getStore();
    const sessionFile =
      typeof resolveSessionFile === 'function' ? resolveSessionFile() : SESSION_FILE;
    const bundle = {
      exported_at: models.isoNow(),
      session: null,
      command_queue: [],
      phase_outputs: {},
    };

    if (sessionFile && store.exists(sessionFile)) {
      try {
        bundle.session = JSON.parse(_cache.read(sessionFile));
      } catch {}
    }
    bundle.command_queue = _readCommandQueue();

    if (bundle.session && bundle.session.phase_outputs) {
      bundle.phase_outputs = collectPhaseOutputs(bundle.session.phase_outputs, store);
    }

    reply.send(bundle);
  }

  /* ── Help API ─────────────────────────────────────────────────── */

  async function apiGetHelp(request: FastifyRequest, reply: FastifyReply) {
    const slug = (request.query as Record<string, string>).topic;

    if (!slug) {
      return reply.send({ toc: HELP_TOC });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return reply.code(400).send(errorResponse('INVALID_TOPIC', 'Invalid topic slug'));
    }

    const result = svc.getHelpTopic(slug);
    if (!result) {
      return reply.code(404).send(errorResponse('TOPIC_NOT_FOUND', 'Help topic not found'));
    }
    const entry = HELP_TOC.find((t) => t.slug === slug);
    reply.send({ slug, title: entry ? entry.title : slug, content: result.content });
  }

  /* ── SSE Endpoint (SP-R2-004-005) ─────────────────────────────── */

  const MAX_SSE_CLIENTS = 50;

  async function apiGetEvents(request: FastifyRequest, reply: FastifyReply) {
    if (sseManager.size >= MAX_SSE_CLIENTS) {
      return reply.code(503).send(errorResponse('SSE_LIMIT', 'Too many SSE connections'));
    }
    const res = reply.raw;
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(
      `event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`
    );
    sseManager.addClient(request.raw, res);
    structuredLog('info', 'sse_client_connected', { clients: sseManager.size });
    // Tell Fastify we're handling the response manually
    reply.hijack();
  }

  /* ── Metrics Endpoint (SP-R2-004-007) ─────────────────────────── */

  async function apiGetMetrics(_request: FastifyRequest, reply: FastifyReply) {
    const uptimeS = Math.round((Date.now() - _metrics.startedAt) / 1000);
    const pcts = computePercentiles(_metrics.responseTimes);
    const cacheStats = _cache.stats ? _cache.stats() : { hits: 0, misses: 0 };
    const totalCache = (cacheStats.hits || 0) + (cacheStats.misses || 0);
    const result = {
      uptime_seconds: uptimeS,
      request_count: _metrics.requestCount,
      error_count: _metrics.errorCount,
      error_rate:
        _metrics.requestCount > 0 ? +(_metrics.errorCount / _metrics.requestCount).toFixed(4) : 0,
      response_time_p50: pcts.p50,
      response_time_p95: pcts.p95,
      response_time_p99: pcts.p99,
      sse_connections: sseManager.size,
      file_ops_count: _metrics.fileOpsCount,
      cache_hit_ratio: totalCache > 0 ? +((cacheStats.hits || 0) / totalCache).toFixed(4) : 0,
      per_endpoint: {},
    };
    for (const [ep, data] of Object.entries(_metrics.perEndpoint) as [
      string,
      Record<string, unknown>,
    ][]) {
      const epPcts = computePercentiles(data.times);
      result.per_endpoint[ep] = {
        count: data.count,
        p50: epPcts.p50,
        p95: epPcts.p95,
        p99: epPcts.p99,
      };
    }
    reply.send(result);
  }

  async function apiFlushMetrics(_request: FastifyRequest, reply: FastifyReply) {
    flushMetrics();
    reply.send({ ok: true, flushed_at: new Date().toISOString() });
  }

  /** Readiness probe — used by Docker HEALTHCHECK and Playwright webServer. */
  async function apiGetHealth(_request: FastifyRequest, reply: FastifyReply) {
    let store_status = 'ok';
    try {
      const store = getStore();
      store.exists(SESSION_DIR);
    } catch {
      store_status = 'degraded';
    }
    // StorageProvider health (M23-005 / M23-007)
    let storage_health: Record<string, unknown> | undefined;
    const sp = typeof getStorageProvider === 'function' ? getStorageProvider() : null;
    if (sp) {
      try {
        const h = await sp.health();
        storage_health = {
          status: h.status,
          provider: h.provider,
          latencyMs: h.latencyMs,
        };
      } catch {
        storage_health = { status: 'unhealthy', provider: _storageProviderType || 'unknown' };
      }
    }
    reply.send({
      status: 'ok',
      version: _version,
      uptime: Math.round(process.uptime()),
      store_status,
      sse_connections: sseManager.size,
      timestamp: new Date().toISOString(),
      ...(storage_health ? { storage: storage_health } : {}),
    });
  }

  /* ── Analytics Endpoint (SP-R2-004-008) ───────────────────────── */

  function validateAnalyticsEvent(evt) {
    const r = schemas.validateAnalyticsEvent(evt);
    return r.valid ? null : r.errors[0];
  }

  async function apiPostAnalytics(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as Record<string, unknown>;
    if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > 100) {
      return reply.code(400).send(errorResponse('VALIDATION_ERROR', V.EVENTS_RANGE));
    }
    const errors = [];
    const valid = [];
    for (const evt of body.events) {
      const err = validateAnalyticsEvent(evt);
      if (err) {
        errors.push(err);
        continue;
      }
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
          try {
            existing = JSON.parse(_cache.read(ANALYTICS_FILE));
          } catch {
            existing = [];
          }
        }
        existing.push(...valid);
        if (existing.length > ANALYTICS_MAX_EVENTS)
          existing = existing.slice(-ANALYTICS_MAX_EVENTS);
        getStore().mkdirp(path.dirname(ANALYTICS_FILE));
        safeWriteSync(ANALYTICS_FILE, JSON.stringify(existing, null, 2));
      });
    }

    reply.send({ ok: true, accepted: valid.length, rejected: errors.length });
  }

  async function apiGetAnalytics(request: FastifyRequest, reply: FastifyReply) {
    if (!getStore().exists(ANALYTICS_FILE)) return reply.send({ events: [], total: 0 });
    let events = [];
    try {
      events = JSON.parse(_cache.read(ANALYTICS_FILE));
    } catch {}
    const q = request.query as Record<string, string>;
    const total = events.length;
    const limit = Math.min(Math.max(parseInt(q.limit, 10) || 100, 1), 1000);
    const offset = Math.max(parseInt(q.offset, 10) || 0, 0);
    const page = events.slice(offset, offset + limit);
    reply.send({ events: page, total, limit, offset });
  }

  /* ── Audit Trail Endpoint (SP-R2-007-005) ─────────────────────── */

  async function apiGetAudit(request: FastifyRequest, reply: FastifyReply) {
    const q = request.query as Record<string, string>;
    const limitParam = parseInt(q.limit, 10);
    const limit = limitParam >= 1 && limitParam <= 1000 ? limitParam : 50;
    const result = svc.readAuditLog(limit);
    reply.send({ entries: result.entries, total: result.total, limit });
  }

  /* ── Static file serving (React SPA from ui/dist/) ──────────── */

  const UI_DIST = path.join(WEBAPP_DIR, 'ui', 'dist');

  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  let cachedSpaHtml = null;
  try {
    const spaPath = path.join(UI_DIST, 'index.html');
    if (getStore().exists(spaPath)) cachedSpaHtml = Buffer.from(getStore().readFile(spaPath));
  } catch {
    /* React build not present — run `npm run build` in src/webapp/ui/ */
  }

  function serveDistFile(pathname: string, reply: FastifyReply): boolean {
    try {
      const filePath = safePath(UI_DIST, pathname.startsWith('/') ? pathname.slice(1) : pathname);
      if (!getStore().exists(filePath)) return false;
      const content = getStore().readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      const isHashed = pathname.startsWith('/assets/');
      const raw = reply.raw;
      setSecurityHeaders(raw);
      raw.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': Buffer.byteLength(content),
        'Cache-Control': isHashed ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      });
      raw.end(content);
      reply.hijack();
      return true;
    } catch {
      return false;
    }
  }

  function serveStatic(request: FastifyRequest, reply: FastifyReply) {
    const pathname = (request.url || '/').split('?')[0];

    // Try serving a real file from ui/dist/
    if (serveDistFile(pathname, reply)) return;

    // SPA fallback — serve index.html for client-side routing
    const raw = reply.raw;
    setSecurityHeaders(raw);
    if (!cachedSpaHtml) {
      raw.writeHead(404, { 'Content-Type': 'text/plain' });
      raw.end(S.NOT_FOUND);
      reply.hijack();
      return;
    }
    raw.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': cachedSpaHtml.length,
    });
    raw.end(cachedSpaHtml);
    reply.hijack();
  }

  /* ── Register routes ────────────────────────────────────────── */

  app.get('/api/session', apiGetSession);
  app.post('/api/reevaluate', apiReevaluate);
  app.get('/api/export', apiGetExport);
  app.get('/api/help', apiGetHelp);
  app.get('/api/events', apiGetEvents);
  app.get('/api/metrics', apiGetMetrics);
  app.post('/api/metrics/flush', apiFlushMetrics);
  app.get('/api/health', apiGetHealth);
  app.post('/api/analytics', apiPostAnalytics);
  app.get('/api/analytics', apiGetAnalytics);
  app.get('/api/audit', apiGetAudit);

  /** Liveness probe — lightweight check that the process is running. */
  app.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    let store_status = 'ok';
    try {
      getStore().exists(SESSION_DIR);
    } catch {
      store_status = 'degraded';
    }
    const sp = typeof getStorageProvider === 'function' ? getStorageProvider() : null;
    reply.send({
      status: 'ok',
      version: _version,
      uptime: Math.round(process.uptime()),
      store_status,
      storage_provider: sp ? sp.name : 'none',
    });
  });

  // SPA static fallback — catch-all for non-API routes
  app.get('*', serveStatic);
}
