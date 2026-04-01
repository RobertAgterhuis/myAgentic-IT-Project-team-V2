// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Fastify application factory (M30-003, M30-005).
 *
 * Builds a configured Fastify instance with framework-native plugins:
 *  - body-parser plugin — text/plain content-type support
 *  - @fastify/cookie — session cookie parsing
 *  - rate-limit plugin — abuse prevention
 *  - Auth + RBAC hook (M29)
 *  - security-headers plugin — OWASP response headers
 *  - Metrics recording hook
 *  - OpenAPI / Swagger via @fastify/swagger + @fastify/swagger-ui
 *  - Static file serving via @fastify/static
 *  - Typed ServerContext decorated on every request
 *
 * See `plugins/index.ts` for the full middleware ordering table.
 *
 * @module app
 */

import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import path from 'path';

import type { ServerContext } from './context';
import type { AuthenticatedRequest } from './auth';
import { structuredLog } from './middleware';
import { errorResponse } from './utils/errors';
import { securityHeadersPlugin, rateLimitPlugin, bodyParserPlugin } from './plugins';
import {
  TRUST_PROXY,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_AUTH_MAX,
  RATE_LIMIT_ADMIN_MAX,
  RATE_LIMIT_MUTATION_MAX,
} from './config';

/* ── Fastify type augmentation ────────────────────────────────── */

declare module 'fastify' {
  interface FastifyRequest {
    ctx: ServerContext;
  }
}

/* ── App builder options ──────────────────────────────────────── */

export interface AppOptions {
  ctx: ServerContext;
  /** Disable request logging (useful in tests). */
  disableRequestLogging?: boolean;
  /** Disable rate limiting (useful in tests). */
  disableRateLimit?: boolean;
  /** Disable Swagger UI (production builds). */
  disableSwaggerUi?: boolean;
}

/* ── Build Fastify app ────────────────────────────────────────── */

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const { ctx } = options;
  const isLocalBinding = ctx.HOST === '127.0.0.1' || ctx.HOST === 'localhost' || ctx.HOST === '::1';

  const app = Fastify({
    logger: {
      level: (process.env.LOG_LEVEL || 'info').toLowerCase(),
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    trustProxy: TRUST_PROXY,
    requestTimeout: 30000,
    keepAliveTimeout: 5000,
  });

  /* ── Decorate every request with typed ctx ────────────────── */
  app.decorateRequest('ctx', { getter: () => ctx });

  /* ── 1. Body parsing plugin (M30-005) ─────────────────────── */
  await app.register(bodyParserPlugin);

  /* ── 2. Cookie parsing (for auth sessions) ────────────────── */
  await app.register(fastifyCookie);

  /* ── 3. Rate limiting plugin (M30-005) ────────────────────── */
  await app.register(rateLimitPlugin, {
    disabled: options.disableRateLimit,
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_WINDOW_MS,
    authMax: RATE_LIMIT_AUTH_MAX,
    adminMax: RATE_LIMIT_ADMIN_MAX,
    mutationMax: RATE_LIMIT_MUTATION_MAX,
  });

  /* ── OpenAPI / Swagger ────────────────────────────────────── */
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Agentic SDLC Platform API',
        description: 'REST API for the multi-agent SDLC orchestration platform.',
        version: '0.4.0',
      },
      servers: [
        {
          url: `http://${ctx.HOST}:${ctx.PORT}`,
          description: 'Local development server',
        },
      ],
      tags: [
        { name: 'agents', description: 'Agent status & execution' },
        { name: 'analytics', description: 'Analytics & trend data' },
        { name: 'approvals', description: 'Governance approval workflow' },
        { name: 'artifacts', description: 'Artifact management & lineage' },
        { name: 'auth', description: 'Authentication & user management' },
        { name: 'cockpit', description: 'Operational cockpit' },
        { name: 'commands', description: 'Command queue' },
        { name: 'dashboard', description: 'Dashboard home' },
        { name: 'decisions', description: 'Decision management' },
        { name: 'drift', description: 'Drift detection' },
        { name: 'help', description: 'Contextual help and documentation' },
        { name: 'jobs', description: 'Background job queue' },
        { name: 'metrics', description: 'Velocity & KPI metrics' },
        { name: 'milestones', description: 'Milestone management' },
        { name: 'mcp', description: 'MCP governance plugin catalog & registry' },
        { name: 'orchestrator', description: 'State machine engine' },
        { name: 'policies', description: 'Policy management' },
        { name: 'progress', description: 'Session progress' },
        { name: 'questionnaires', description: 'Questionnaire management' },
        { name: 'sessions', description: 'Session management' },
        { name: 'subscribe', description: 'Newsletter subscription' },
        { name: 'workspaces', description: 'Workspace management' },
        { name: 'system', description: 'Health & system info' },
      ],
    },
  });

  if (!options.disableSwaggerUi) {
    await app.register(fastifySwaggerUi, {
      routePrefix: '/docs',
    });
  }

  /* ── 4. Auth + RBAC hook (M29) ──────────────────────────────── */
  app.addHook('onRequest', async (request, reply) => {
    const pathname = request.url.split('?')[0].replace(/\/+$/, '') || '/';

    // Only protect /api routes
    if (!pathname.startsWith('/api')) return;

    if (ctx._authMiddleware) {
      const rawReq = request.raw as AuthenticatedRequest;
      const authed = await ctx._authMiddleware.authenticate(rawReq, reply.raw, pathname);
      if (!authed) {
        reply.hijack(); // Fastify should not send another response
        return;
      }

      // RBAC enforcement for mutating requests
      const method = request.method;
      if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        let requiredRole: 'admin' | 'operator' | 'viewer' = 'operator';

        if (
          pathname.startsWith('/api/admin') ||
          pathname.startsWith('/api/sessions') ||
          pathname.startsWith('/api/workspaces')
        ) {
          requiredRole = 'admin';
        } else if (pathname.startsWith('/api/v1/policies') && !pathname.includes('/evaluate')) {
          requiredRole = 'admin';
        }

        if (!ctx._authMiddleware.requireRole(rawReq, reply.raw, requiredRole, pathname)) {
          reply.hijack();
          return;
        }
      }
    } else {
      // Fallback: on non-local hosts, every API route must be protected.
      if (pathname.startsWith('/api') && !isLocalBinding) {
        if (process.env.NODE_ENV === 'production') {
          reply
            .status(401)
            .send(
              errorResponse(
                'UNAUTHORIZED',
                'Authenticated session required for non-local production API access'
              )
            );
          return;
        }

        const expected = process.env.API_KEY;
        if (!expected || request.headers['x-api-key'] !== expected) {
          reply
            .status(401)
            .send(errorResponse('UNAUTHORIZED', 'API key required for non-local API access'));
          return;
        }
      }
    }
  });

  /* ── 5. Security headers plugin (M30-005) ─────────────────── */
  await app.register(securityHeadersPlugin);

  /* ── 6. Metrics recording hook ──────────────────────────────── */
  if (!options.disableRequestLogging) {
    app.addHook('onResponse', async (request, reply) => {
      if (request.url === '/api/events') return; // SSE — no per-request metrics
      ctx.recordMetric(request.method, request.url, reply.elapsedTime, reply.statusCode);
    });
  }

  /* ── Static file serving (UI build output) ────────────────── */
  const uiDistDir = path.join(ctx.WEBAPP_DIR, 'ui', 'dist');
  try {
    await app.register(fastifyStatic, {
      root: uiDistDir,
      prefix: '/',
      decorateReply: true,
      wildcard: false,
    });
  } catch {
    // UI may not be built — fall through to 404
    structuredLog('warn', 'static_ui_not_available', { path: uiDistDir });
  }

  /* ── Locale files ─────────────────────────────────────────── */
  app.get('/locales/:file', async (request, reply) => {
    const { file } = request.params as { file: string };
    if (!file.endsWith('.json') || file.includes('..') || file.includes('/')) {
      return reply.status(404).send({ error: 'Not found' });
    }
    const localePath = path.join(ctx.WEBAPP_DIR, 'locales', file);
    try {
      const { getStore } = await import('./store');
      const content = getStore().readFile(localePath);
      JSON.parse(content); // validate JSON
      return reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600')
        .send(content);
    } catch {
      return reply.status(404).send({ error: 'Not found' });
    }
  });

  /* ── Global error handler ─────────────────────────────────── */
  app.setErrorHandler(async (error, request, reply) => {
    const err = error as {
      status?: number;
      statusCode?: number;
      errorCode?: string;
      code?: string;
      message?: string;
    };
    const status = err.status || err.statusCode || 500;

    // Map Fastify built-in error codes to our error code taxonomy
    let code = err.errorCode || 'INTERNAL_ERROR';
    if (err.code?.startsWith('FST_ERR_CTP_')) code = 'INVALID_CONTENT_TYPE';
    else if (err.code === 'FST_ERR_VALIDATION') code = 'VALIDATION_ERROR';

    if (status >= 500) {
      request.log.error(error, 'Unhandled route error');
    }

    return reply.status(status).send(errorResponse(code, err.message || 'Internal server error'));
  });

  /* ── 404 / 405 handler ─────────────────────────────────────── */
  app.setNotFoundHandler(async (request, reply) => {
    // SPA fallback: serve index.html for non-API GET requests
    if (request.method === 'GET' && !request.url.startsWith('/api')) {
      try {
        return reply.sendFile('index.html');
      } catch {
        // fall through
      }
    }

    // Method Not Allowed: check if this path exists with a different HTTP method
    const url = request.url.split('?')[0];
    const allMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;
    const allowed = allMethods.filter(
      (m) => m !== request.method && app.hasRoute({ method: m, url })
    );
    if (allowed.length > 0) {
      reply.header('Allow', allowed.join(', '));
      return reply.status(405).send(errorResponse('METHOD_NOT_ALLOWED', 'Method Not Allowed'));
    }

    return reply.status(404).send(errorResponse('NOT_FOUND', 'Not found'));
  });

  return app;
}
