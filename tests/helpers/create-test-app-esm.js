// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Fastify integration test helper (M30-007) - ESM variant for migrated profile.
 */

import * as path from 'node:path';
import { fileURLToPath as _fileURLToPath } from 'node:url';
import * as __store from '../../src/webapp/store';
import * as __cache from '../../src/webapp/cache';
import * as __audit from '../../src/webapp/audit';
import * as __rateLimiter from '../../src/webapp/rate-limiter';
import * as __sseManager from '../../src/webapp/sse-manager';
import * as __metricsCollector from '../../src/webapp/metrics-collector';
import * as __app from '../../src/webapp/app';
import * as __sessionResolver from '../../src/webapp/session-state-resolver';

import * as __questionnaireRoutes from '../../src/webapp/routes/questionnaires';
import * as __decisionRoutes from '../../src/webapp/routes/decisions';
import * as __commandRoutes from '../../src/webapp/routes/commands';
import * as __progressRoutes from '../../src/webapp/routes/progress';
import * as __driftRoutes from '../../src/webapp/routes/drift';
import * as __metricsDashboardRoutes from '../../src/webapp/routes/metrics-dashboard';
import * as __dashboardRoutes from '../../src/webapp/routes/dashboard';
import * as __milestonesRoutes from '../../src/webapp/routes/milestones';
import * as __subscribeRoutes from '../../src/webapp/routes/subscribe';
import * as __orchestratorRoutes from '../../src/webapp/routes/orchestrator';
import * as __approvalRoutes from '../../src/webapp/routes/approvals';
import * as __policyRoutes from '../../src/webapp/routes/policies';
import * as __artifactRoutes from '../../src/webapp/routes/artifacts';
import * as __analyticsRoutes from '../../src/webapp/routes/analytics';
import * as __sessionRoutes from '../../src/webapp/routes/sessions';
import * as __agentRoutes from '../../src/webapp/routes/agents';
import * as __workspaceRoutes from '../../src/webapp/routes/workspaces';
import * as __cockpitRoutes from '../../src/webapp/routes/cockpit';
import * as __authRoutes from '../../src/webapp/routes/auth';
import * as __mcpRoutes from '../../src/webapp/routes/mcp';
import * as __helpRoutes from '../../src/webapp/routes/help';
import * as __miscRoutes from '../../src/webapp/routes/misc';

const { InMemoryStore, setStore, getStore } = __store;
const { FileCache } = __cache;
const { AuditTrail } = __audit;
const { createRateLimiter } = __rateLimiter;
const { createSSEManager } = __sseManager;
const { createMetricsCollector } = __metricsCollector;
const { buildApp } = __app;
const { resolveSessionFile } = __sessionResolver;

const { registerRoutes: registerQuestionnaireRoutes } = __questionnaireRoutes;
const { registerRoutes: registerDecisionRoutes } = __decisionRoutes;
const { registerRoutes: registerCommandRoutes } = __commandRoutes;
const { registerRoutes: registerProgressRoutes } = __progressRoutes;
const { registerRoutes: registerDriftRoutes } = __driftRoutes;
const { registerRoutes: registerMetricsDashboardRoutes } = __metricsDashboardRoutes;
const { registerRoutes: registerDashboardRoutes } = __dashboardRoutes;
const { registerRoutes: registerMilestonesRoutes } = __milestonesRoutes;
const { registerRoutes: registerSubscribeRoutes } = __subscribeRoutes;
const { registerRoutes: registerOrchestratorRoutes } = __orchestratorRoutes;
const { registerRoutes: registerApprovalRoutes } = __approvalRoutes;
const { registerRoutes: registerPolicyRoutes } = __policyRoutes;
const { registerRoutes: registerArtifactRoutes } = __artifactRoutes;
const { registerRoutes: registerAnalyticsRoutes } = __analyticsRoutes;
const { registerRoutes: registerSessionRoutes } = __sessionRoutes;
const { registerRoutes: registerAgentRoutes } = __agentRoutes;
const { registerRoutes: registerWorkspaceRoutes } = __workspaceRoutes;
const { registerRoutes: registerCockpitRoutes } = __cockpitRoutes;
const { registerRoutes: registerAuthRoutes } = __authRoutes;
const { registerRoutes: registerMcpRoutes } = __mcpRoutes;
const { registerRoutes: registerHelpRoutes } = __helpRoutes;
const { registerRoutes: registerMiscRoutes } = __miscRoutes;

const __filename = _fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export async function createTestApp(seedFiles = {}) {
  const store = new InMemoryStore(seedFiles);
  setStore(store);

  const cache = new FileCache();
  const audit = new AuditTrail({ logDir: path.join(BUSINESS_DOCS, 'audit') });
  const rateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 9999 });
  const sseManager = createSSEManager({ heartbeatMs: 30000 });

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
        summary: auditMeta?.summary || 'File written',
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
  await registerHelpRoutes(app, ctx);
  await registerMiscRoutes(app, ctx);

  await app.ready();

  app._ctx = ctx;
  app._cache = cache;
  app._metrics = metricsCollector._state;
  app._rateLimitMap = rateLimiter._map;
  app._metricsCollector = metricsCollector;
  app._audit = audit;

  return app;
}

export const paths = {
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
};
