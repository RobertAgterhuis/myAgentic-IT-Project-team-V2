#!/usr/bin/env tsx
// Copyright (c) 2026 Robert Agterhuis. MIT License.
/* eslint-disable no-console */

/**
 * Generate OpenAPI 3.1 spec from Fastify route schemas (M30-008).
 *
 * Bootstraps the Fastify app with InMemoryStore (no side-effects),
 * calls `app.swagger({ yaml: true })` and writes the result to
 * docs/api/openapi.yaml.
 *
 * Usage:
 *   npx tsx scripts/generate-openapi.ts          # write YAML
 *   npx tsx scripts/generate-openapi.ts --json    # write JSON
 *   npx tsx scripts/generate-openapi.ts --stdout  # print to stdout
 */

import path from 'path';
import fs from 'fs';
import { InMemoryStore, setStore } from '../src/webapp/store';
import { FileCache } from '../src/webapp/cache';
import { AuditTrail } from '../src/webapp/audit';
import { createSSEManager } from '../src/webapp/sse-manager';
import { createMetricsCollector } from '../src/webapp/metrics-collector';
import { buildApp } from '../src/webapp/app';
import type { ServerContext } from '../src/webapp/context';

/* ── Route plugins ────────────────────────────────────────────── */
import { registerRoutes as registerCommandRoutes } from '../src/webapp/routes/commands';
import { registerRoutes as registerOrchestratorRoutes } from '../src/webapp/routes/orchestrator';
import { registerRoutes as registerQuestionnaireRoutes } from '../src/webapp/routes/questionnaires';
import { registerRoutes as registerDecisionRoutes } from '../src/webapp/routes/decisions';
import { registerRoutes as registerProgressRoutes } from '../src/webapp/routes/progress';
import { registerRoutes as registerDriftRoutes } from '../src/webapp/routes/drift';
import { registerRoutes as registerMetricsDashboardRoutes } from '../src/webapp/routes/metrics-dashboard';
import { registerRoutes as registerDashboardRoutes } from '../src/webapp/routes/dashboard';
import { registerRoutes as registerMilestonesRoutes } from '../src/webapp/routes/milestones';
import { registerRoutes as registerSubscribeRoutes } from '../src/webapp/routes/subscribe';
import { registerRoutes as registerApprovalRoutes } from '../src/webapp/routes/approvals';
import { registerRoutes as registerPolicyRoutes } from '../src/webapp/routes/policies';
import { registerRoutes as registerArtifactRoutes } from '../src/webapp/routes/artifacts';
import { registerRoutes as registerAnalyticsRoutes } from '../src/webapp/routes/analytics';
import { registerRoutes as registerSessionRoutes } from '../src/webapp/routes/sessions';
import { registerRoutes as registerAgentRoutes } from '../src/webapp/routes/agents';
import { registerRoutes as registerWorkspaceRoutes } from '../src/webapp/routes/workspaces';
import { registerRoutes as registerCockpitRoutes } from '../src/webapp/routes/cockpit';
import { registerRoutes as registerAuthRoutes } from '../src/webapp/routes/auth';
import { registerRoutes as registerMiscRoutes } from '../src/webapp/routes/misc';
import { resolveSessionFile } from '../src/webapp/session-state-resolver';
import { getStore } from '../src/webapp/store';

/* ── Path constants ───────────────────────────────────────────── */
const WEBAPP_DIR = path.resolve(__dirname, '../src/webapp');
const PROJECT_ROOT = path.resolve(WEBAPP_DIR, '..', '..');
const BUSINESS_DOCS = path.join(PROJECT_ROOT, 'BusinessDocs');
const SESSION_DIR = path.join(BUSINESS_DOCS, 'session');
const GITHUB_DOCS = path.join(PROJECT_ROOT, '.github');

const OUTPUT_YAML = path.join(PROJECT_ROOT, 'docs', 'api', 'openapi.yaml');
const OUTPUT_JSON = path.join(PROJECT_ROOT, 'docs', 'api', 'openapi.json');

async function generate(): Promise<void> {
  const args = process.argv.slice(2);
  const useJson = args.includes('--json');
  const toStdout = args.includes('--stdout');

  /* ── Bootstrap in-memory store ──────────────────────────────── */
  const store = new InMemoryStore({});
  setStore(store);

  const cache = new FileCache();
  const audit = new AuditTrail({ logDir: path.join(BUSINESS_DOCS, 'audit') });
  const sseManager = createSSEManager({ heartbeatMs: 30_000 });
  const metricsCollector = createMetricsCollector({
    flushIntervalMs: 999_999,
    outputPath: path.join(SESSION_DIR, 'metrics.json'),
    store: {
      mkdirp: (d: string) => getStore().mkdirp(d),
      writeFile: (p: string, data: string) => getStore().writeFile(p, data),
      readFile: (p: string) => getStore().readFile(p),
      exists: (p: string) => getStore().exists(p),
    },
    log: () => {},
  });

  const ctx: ServerContext = {
    _cache: cache,
    sseManager,
    _metrics: metricsCollector._state,
    _audit: audit,
    safeWriteSync: () => {},
    sseNotify: () => {},
    computePercentiles: metricsCollector.computePercentiles,
    recordMetric: () => {},
    scheduleRebuildIndex: () => {},
    flushMetrics: () => {},
    PROJECT_ROOT,
    BUSINESS_DOCS,
    GITHUB_DOCS,
    SESSION_DIR,
    SESSION_FILE: path.join(SESSION_DIR, 'session-state.json'),
    Q_INDEX_FILE: path.join(BUSINESS_DOCS, 'questionnaire-index.json'),
    SESSION_AUDIT_FILE: path.join(SESSION_DIR, 'session-audit.jsonl'),
    DECISIONS_FILE: path.join(BUSINESS_DOCS, 'decisions.md'),
    DECISIONS_DIR: path.join(BUSINESS_DOCS, 'decisions'),
    COMMAND_QUEUE: path.join(SESSION_DIR, 'command-queue.json'),
    HELP_DIR: path.join(PROJECT_ROOT, 'docs', 'help'),
    ANALYTICS_FILE: path.join(BUSINESS_DOCS, 'analytics-events.json'),
    METRICS_FILE: path.join(SESSION_DIR, 'metrics.json'),
    WEBAPP_DIR,
    HOST: 'localhost',
    PORT: 3000,
    SSE_HEARTBEAT_MS: 30_000,
    ANALYTICS_MAX_EVENTS: 1000,
    resolveSessionFile: () => resolveSessionFile(getStore(), cache, SESSION_DIR),
    getStorageProvider: () => null,
    STORAGE_PROVIDER: 'file',
    _authManager: null,
    _authMiddleware: null,
  } as ServerContext;

  /* ── Build Fastify app with all routes ──────────────────────── */
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
  await registerMiscRoutes(app, ctx);

  await app.ready();

  /* ── Generate spec ──────────────────────────────────────────── */
  if (toStdout) {
    if (useJson) {
      process.stdout.write(JSON.stringify(app.swagger(), null, 2) + '\n');
    } else {
      process.stdout.write(app.swagger({ yaml: true }) as string);
    }
  } else if (useJson) {
    const json = JSON.stringify(app.swagger(), null, 2) + '\n';
    fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
    fs.writeFileSync(OUTPUT_JSON, json, 'utf8');
    console.log(`✓ OpenAPI 3.1 spec written to ${path.relative(PROJECT_ROOT, OUTPUT_JSON)}`);
  } else {
    const yaml = app.swagger({ yaml: true }) as string;
    fs.mkdirSync(path.dirname(OUTPUT_YAML), { recursive: true });
    fs.writeFileSync(OUTPUT_YAML, yaml, 'utf8');
    console.log(`✓ OpenAPI 3.1 spec written to ${path.relative(PROJECT_ROOT, OUTPUT_YAML)}`);
  }

  await app.close();
}

generate().catch((err) => {
  console.error('Failed to generate OpenAPI spec:', err);
  process.exit(1);
});
