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
import { RESPONSES as R, STATIC as S } from '../strings';
import { safePath, setSecurityHeaders } from '../middleware';
import * as RS from '../route-schemas';
import { collectPhaseOutputs } from './misc-export';
import { registerHealthRoutes } from './misc-health';
import { registerStaticFallback } from './misc-static';
import { registerObservabilityRoutes } from './misc-observability';
import { registerAnalyticsRoutes } from './misc-analytics';

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

type IntegrationReadinessStatus = 'ready' | 'partial' | 'not_ready';

type IntegrationCheck = {
  id: string;
  passed: boolean;
  detail: string;
};

function toReadinessStatus(checks: IntegrationCheck[]): IntegrationReadinessStatus {
  const passed = checks.filter((check) => check.passed).length;
  if (passed === checks.length) return 'ready';
  if (passed === 0) return 'not_ready';
  return 'partial';
}

function buildReadinessSummary(
  status: IntegrationReadinessStatus,
  checks: IntegrationCheck[]
): string {
  const passed = checks.filter((check) => check.passed).length;
  const base = `${passed}/${checks.length} checks passed`;
  if (status === 'ready') return `${base} — integration is operationally ready.`;
  if (status === 'partial') return `${base} — integration is partially configured.`;
  return `${base} — integration is not ready.`;
}

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
    _ragStore,
    getStorageProvider,
    STORAGE_PROVIDER: _storageProviderType,
    _getSemanticMemorySweeperStatus,
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

  async function apiGetExport(_request: FastifyRequest, reply: FastifyReply) {
    const store = getStore();
    const sessionFile =
      typeof resolveSessionFile === 'function' ? resolveSessionFile() : SESSION_FILE;
    const bundle: {
      exported_at: string;
      session: Record<string, unknown> | null;
      command_queue: unknown[];
      phase_outputs: Record<string, unknown>;
    } = {
      exported_at: models.isoNow(),
      session: null,
      command_queue: [],
      phase_outputs: {},
    };

    if (sessionFile && store.exists(sessionFile)) {
      try {
        bundle.session = JSON.parse(_cache.read(sessionFile)) as Record<string, unknown>;
      } catch {}
    }
    bundle.command_queue = _readCommandQueue?.() ?? [];

    if (bundle.session && bundle.session.phase_outputs) {
      bundle.phase_outputs = collectPhaseOutputs(
        bundle.session.phase_outputs as Record<string, unknown>,
        {
          store,
          cache: _cache,
          projectRoot: PROJECT_ROOT,
          maxExportSize: MAX_EXPORT_SIZE,
          safePath,
        }
      );
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

  registerObservabilityRoutes({
    app,
    sseManager,
    metrics: _metrics,
    cache: _cache,
    computePercentiles,
    flushMetrics,
    projectRoot: PROJECT_ROOT,
    businessDocs: ctx.BUSINESS_DOCS,
    ragStore: _ragStore,
    safeWriteSync,
  });

  registerAnalyticsRoutes({
    app,
    analyticsPostSchema: RS.analyticsPost,
    analyticsGetSchema: RS.analyticsGet,
    analyticsFile: ANALYTICS_FILE,
    analyticsMaxEvents: ANALYTICS_MAX_EVENTS,
    getStore,
    cache: _cache,
    safeWriteSync,
  });

  /* ── Audit Trail Endpoint (SP-R2-007-005) ─────────────────────── */

  async function apiGetAudit(request: FastifyRequest, reply: FastifyReply) {
    const q = request.query as Record<string, string>;
    const limitParam = parseInt(q.limit, 10);
    const limit = limitParam >= 1 && limitParam <= 1000 ? limitParam : 50;
    const result = svc.readAuditLog(limit);
    reply.send({ entries: result.entries, total: result.total, limit });
  }

  async function apiGetIntegrationReadiness(_request: FastifyRequest, reply: FastifyReply) {
    const store = getStore();

    const canvaChecks: IntegrationCheck[] = [
      {
        id: 'brand-agent-skill',
        passed: store.exists(
          path.join(PROJECT_ROOT, 'templates', 'sdlc', 'agents', '30-brand-assets-agent.md')
        ),
        detail: 'Brand & Assets (Canva) skill template is present',
      },
      {
        id: 'canva-credentials',
        passed: Boolean(process.env.CANVA_API_KEY || process.env.CANVA_ACCESS_TOKEN),
        detail: 'CANVA_API_KEY or CANVA_ACCESS_TOKEN is configured',
      },
    ];

    const storybookChecks: IntegrationCheck[] = [
      {
        id: 'storybook-config',
        passed: store.exists(
          path.join(PROJECT_ROOT, 'src', 'webapp', 'ui', '.storybook', 'main.ts')
        ),
        detail: 'Storybook config exists under src/webapp/ui/.storybook/main.ts',
      },
      {
        id: 'storybook-package',
        passed: store.exists(path.join(PROJECT_ROOT, 'src', 'webapp', 'ui', 'package.json')),
        detail: 'UI package.json exists for Storybook scripts/dependencies',
      },
    ];

    const matomoChecks: IntegrationCheck[] = [
      {
        id: 'matomo-compose',
        passed: store.exists(path.join(PROJECT_ROOT, 'infra', 'docker-compose.analytics.yml')),
        detail: 'Matomo docker-compose manifest exists',
      },
      {
        id: 'matomo-env',
        passed: Boolean(process.env.MATOMO_DB_PASSWORD || process.env.MATOMO_PORT),
        detail: 'MATOMO_DB_PASSWORD or MATOMO_PORT environment variable is configured',
      },
    ];

    const weblateChecks: IntegrationCheck[] = [
      {
        id: 'weblate-compose',
        passed: store.exists(path.join(PROJECT_ROOT, 'infra', 'docker-compose.weblate.yml')),
        detail: 'Weblate docker-compose manifest exists',
      },
      {
        id: 'weblate-env',
        passed: Boolean(process.env.WEBLATE_TOKEN || process.env.WEBLATE_ADMIN_PASSWORD),
        detail: 'WEBLATE_TOKEN or WEBLATE_ADMIN_PASSWORD is configured',
      },
    ];

    const integrations = [
      { id: 'canva', label: 'Canva', checks: canvaChecks },
      { id: 'storybook', label: 'Storybook', checks: storybookChecks },
      { id: 'matomo', label: 'Matomo', checks: matomoChecks },
      { id: 'weblate', label: 'Weblate', checks: weblateChecks },
    ].map((integration) => {
      const status = toReadinessStatus(integration.checks);
      return {
        id: integration.id,
        label: integration.label,
        status,
        checks: integration.checks,
        summary: buildReadinessSummary(status, integration.checks),
      };
    });

    reply.send({
      ok: true,
      generated_at: models.isoNow(),
      integrations,
    });
  }

  /* ── Register routes ────────────────────────────────────────── */

  app.get('/api/session', apiGetSession);
  app.post('/api/reevaluate', { schema: RS.reevaluate }, apiReevaluate);
  app.get('/api/export', apiGetExport);
  app.get('/api/help', { schema: RS.helpGet }, apiGetHelp);
  app.get('/api/audit', { schema: RS.auditGet }, apiGetAudit);
  app.get(
    '/api/v1/integrations/readiness',
    { schema: { tags: ['system'] } },
    apiGetIntegrationReadiness
  );

  registerHealthRoutes({
    app,
    version: _version,
    sessionDir: SESSION_DIR,
    storageProviderType: _storageProviderType,
    sseConnections: () => sseManager.size,
    getStore,
    getStorageProvider,
    getSemanticMemorySweeperStatus: _getSemanticMemorySweeperStatus,
  });

  registerStaticFallback({
    app,
    webappDir: WEBAPP_DIR,
    getStore,
    safePath,
    setSecurityHeaders,
    notFoundText: S.NOT_FOUND,
  });
}
