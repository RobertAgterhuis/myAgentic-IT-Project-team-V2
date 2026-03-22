// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Fastify integration test helper (M30-007).
 *
 * Builds a fully-configured Fastify app using `buildApp()` + route registration,
 * backed by InMemoryStore. Tests use `app.inject()` instead of raw HTTP.
 *
 * Usage:
 *   const { createTestApp } = require('../helpers/create-test-app');
 *   let app;
 *   beforeAll(async () => { app = await createTestApp(); });
 *   afterAll(async () => { await app.close(); });
 *   it('works', async () => {
 *     const res = await app.inject({ method: 'GET', url: '/health' });
 *     expect(res.statusCode).toBe(200);
 *   });
 */

const path = require('path');
const { InMemoryStore, setStore } = require('../../src/webapp/store');
const { FileCache } = require('../../src/webapp/cache');
const { AuditTrail } = require('../../src/webapp/audit');
const { createRateLimiter } = require('../../src/webapp/rate-limiter');
const { createSSEManager } = require('../../src/webapp/sse-manager');
const { createMetricsCollector } = require('../../src/webapp/metrics-collector');
const { buildApp } = require('../../src/webapp/app');

/* ── Route plugins ────────────────────────────────────────────── */
const {
  registerRoutes: registerQuestionnaireRoutes,
} = require('../../src/webapp/routes/questionnaires');
const { registerRoutes: registerDecisionRoutes } = require('../../src/webapp/routes/decisions');
const { registerRoutes: registerCommandRoutes } = require('../../src/webapp/routes/commands');
const { registerRoutes: registerProgressRoutes } = require('../../src/webapp/routes/progress');
const { registerRoutes: registerDriftRoutes } = require('../../src/webapp/routes/drift');
const {
  registerRoutes: registerMetricsDashboardRoutes,
} = require('../../src/webapp/routes/metrics-dashboard');
const { registerRoutes: registerDashboardRoutes } = require('../../src/webapp/routes/dashboard');
const { registerRoutes: registerMilestonesRoutes } = require('../../src/webapp/routes/milestones');
const { registerRoutes: registerSubscribeRoutes } = require('../../src/webapp/routes/subscribe');
const {
  registerRoutes: registerOrchestratorRoutes,
} = require('../../src/webapp/routes/orchestrator');
const { registerRoutes: registerApprovalRoutes } = require('../../src/webapp/routes/approvals');
const { registerRoutes: registerPolicyRoutes } = require('../../src/webapp/routes/policies');
const { registerRoutes: registerArtifactRoutes } = require('../../src/webapp/routes/artifacts');
const { registerRoutes: registerAnalyticsRoutes } = require('../../src/webapp/routes/analytics');
const { registerRoutes: registerSessionRoutes } = require('../../src/webapp/routes/sessions');
const { registerRoutes: registerAgentRoutes } = require('../../src/webapp/routes/agents');
const { registerRoutes: registerWorkspaceRoutes } = require('../../src/webapp/routes/workspaces');
const { registerRoutes: registerCockpitRoutes } = require('../../src/webapp/routes/cockpit');
const { registerRoutes: registerAuthRoutes } = require('../../src/webapp/routes/auth');
const { registerRoutes: registerMcpRoutes } = require('../../src/webapp/routes/mcp');
const { registerRoutes: registerMiscRoutes } = require('../../src/webapp/routes/misc');

/* ── Path constants ───────────────────────────────────────────── */
const WEBAPP_DIR = path.resolve(__dirname, '../../src/webapp');
const PROJECT_ROOT = path.resolve(WEBAPP_DIR, '..', '..');
const BUSINESS_DOCS = path.join(PROJECT_ROOT, 'BusinessDocs');
const SESSION_DIR = path.join(BUSINESS_DOCS, 'session');
const SESSION_FILE = path.join(SESSION_DIR, 'session-state.json');
const SESSION_AUDIT_FILE = path.join(SESSION_DIR, 'session-audit.jsonl');
const Q_INDEX_FILE = path.join(BUSINESS_DOCS, 'questionnaire-index.json');
const DECISIONS_FILE = path.join(BUSINESS_DOCS, 'decisions.md');
const DECISIONS_DIR = path.join(BUSINESS_DOCS, 'decisions');
const COMMAND_QUEUE = path.join(SESSION_DIR, 'command-queue.json');
const HELP_DIR = path.join(PROJECT_ROOT, 'docs', 'help');
const ANALYTICS_FILE = path.join(BUSINESS_DOCS, 'analytics-events.json');
const METRICS_FILE = path.join(SESSION_DIR, 'metrics.json');
const GITHUB_DOCS = path.join(PROJECT_ROOT, '.github');

/**
 * Build a fully wired Fastify app for integration testing.
 * Uses InMemoryStore, disables rate limiting and request logging.
 *
 * @param {Record<string, string>} [seedFiles] - Optional file map for InMemoryStore
 * @returns {Promise<import('fastify').FastifyInstance & { _ctx: object, _cache: object }>}
 */
async function createTestApp(seedFiles = {}) {
  const store = new InMemoryStore(seedFiles);
  setStore(store);

  const cache = new FileCache();
  const audit = new AuditTrail({ logDir: path.join(BUSINESS_DOCS, 'audit') });
  const rateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 9999 });
  const sseManager = createSSEManager({ heartbeatMs: 30000 });
  const { getStore } = require('../../src/webapp/store');
  const { resolveSessionFile } = require('../../src/webapp/session-state-resolver');

  const metricsCollector = createMetricsCollector({
    flushIntervalMs: 999999,
    outputPath: METRICS_FILE,
    store: {
      mkdirp: (d) => getStore().mkdirp(d),
      writeFile: (p, data) => getStore().writeFile(p, data),
      readFile: (p) => getStore().readFile(p),
      exists: (p) => getStore().exists(p),
    },
    log: () => {},
  });

  const ctx = {
    _cache: cache,
    sseManager,
    _metrics: metricsCollector._state,
    _audit: audit,
    safeWriteSync(filePath, data, encoding, auditMeta) {
      getStore().writeFile(filePath, data, encoding);
      cache.invalidate(filePath);
      metricsCollector.incrementFileOps();
      sseManager.broadcast('file_change', {
        file: path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/'),
        timestamp: new Date().toISOString(),
      });
      audit.log({
        operation: auditMeta?.operation || 'update',
        entityType: auditMeta?.entityType || 'file',
        entityId: auditMeta?.entityId || null,
        user: auditMeta?.user || 'system',
        summary: auditMeta?.summary || `File written`,
      });
    },
    sseNotify(eventType, data) {
      sseManager.broadcast(eventType, data);
    },
    computePercentiles: metricsCollector.computePercentiles,
    recordMetric(method, pathname, durationMs, statusCode) {
      metricsCollector.record(method, pathname, durationMs, statusCode);
    },
    scheduleRebuildIndex() {},
    flushMetrics() {
      metricsCollector.flush();
    },
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
    HOST: '127.0.0.1',
    PORT: 0,
    SSE_HEARTBEAT_MS: 30000,
    ANALYTICS_MAX_EVENTS: 1000,
    resolveSessionFile: () => resolveSessionFile(getStore(), cache, SESSION_DIR),
    getStorageProvider: () => null,
    STORAGE_PROVIDER: 'file',
    _authManager: null,
    _authMiddleware: null,
  };

  const app = await buildApp({
    ctx,
    disableRequestLogging: true,
    disableRateLimit: true,
    disableSwaggerUi: true,
  });

  // Register routes in same order as server.ts
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
  await registerMcpRoutes(app, ctx);
  await registerMiscRoutes(app, ctx);

  await app.ready();

  // Attach test helpers
  app._ctx = ctx;
  app._cache = cache;
  app._metrics = metricsCollector._state;
  app._rateLimitMap = rateLimiter._map;
  app._metricsCollector = metricsCollector;
  app._audit = audit;

  return app;
}

module.exports = {
  createTestApp,
  paths: {
    WEBAPP_DIR,
    PROJECT_ROOT,
    BUSINESS_DOCS,
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
    GITHUB_DOCS,
  },
};
