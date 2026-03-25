// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Fastify plugin — Rate limiting (M30-005, M33-005).
 *
 * Wraps `@fastify/rate-limit` with project-specific defaults:
 *  - 30 requests / minute for API routes by default
 *  - Explicit exceptions for health and SSE endpoints only
 *  - Non-API routes are exempt from this API abuse guard
 *  - Custom error body matching the platform error schema
 *  - Uses request.ip which respects Fastify's trustProxy setting
 *    for correct X-Forwarded-For extraction behind reverse proxies
 *
 * @module plugins/rate-limit
 */

import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { createHash } from 'node:crypto';
import { errorResponse } from '../utils/errors';

const EXEMPT_API_PATHS = new Set(['/api/health', '/api/events']);
const AUTH_API_PATH_PREFIXES = [
  '/api/auth/login',
  '/api/auth/entra/login',
  '/api/auth/callback',
  '/api/auth/entra/callback',
  '/api/auth/link/entra',
];

export interface RateLimitPluginOptions {
  /** Maximum requests per window (default: 30). */
  max?: number;
  /** Time window in ms or duration string (default: '1 minute'). */
  timeWindow?: number | string;
  /** Disable the plugin entirely (useful in tests). */
  disabled?: boolean;
  /** Max requests per window for auth endpoints (default: 10). */
  authMax?: number;
  /** Max requests per window for admin endpoints (default: 20). */
  adminMax?: number;
  /** Max requests per window for mutation methods (default: 15). */
  mutationMax?: number;
}

function isMutationMethod(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function hashIdentitySeed(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

function extractIdentitySeed(req: FastifyRequest): string | null {
  const apiKey = req.headers['x-api-key'];
  if (typeof apiKey === 'string' && apiKey.trim()) {
    return `apikey:${apiKey.trim()}`;
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.trim()) {
    return `auth:${authHeader.trim()}`;
  }

  return null;
}

function resolvePath(req: FastifyRequest): string {
  return req.url.split('?')[0];
}

function resolveMaxForRequest(req: FastifyRequest, opts: RateLimitPluginOptions): number {
  const defaultMax = opts.max ?? 30;
  const pathname = resolvePath(req);

  if (AUTH_API_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return opts.authMax ?? 10;
  }

  if (pathname.startsWith('/api/admin/')) {
    return opts.adminMax ?? 20;
  }

  if (pathname.startsWith('/api/') && isMutationMethod(req.method)) {
    return Math.min(defaultMax, opts.mutationMax ?? 15);
  }

  return defaultMax;
}

async function rateLimitPlugin(app: FastifyInstance, opts: RateLimitPluginOptions): Promise<void> {
  if (opts.disabled || process.env.NODE_ENV === 'test') return;

  await app.register(fastifyRateLimit, {
    max: (req) => resolveMaxForRequest(req, opts),
    timeWindow: opts.timeWindow ?? '1 minute',
    keyGenerator: (req: FastifyRequest) => {
      const identitySeed = extractIdentitySeed(req);
      const pathname = resolvePath(req);
      if (identitySeed) {
        return `${req.ip}:${pathname}:${hashIdentitySeed(identitySeed)}`;
      }
      return `${req.ip}:${pathname}`;
    },
    allowList: (req) => {
      const pathname = resolvePath(req);

      // Restrict this guard to API surface only.
      if (!pathname.startsWith('/api')) return true;

      // Explicitly exempt low-risk internal routes.
      return EXEMPT_API_PATHS.has(pathname);
    },
    errorResponseBuilder: (_req, context) => {
      return {
        statusCode: 429,
        ...errorResponse(
          'RATE_LIMITED',
          `Rate limit exceeded, retry in ${Math.ceil(context.ttl / 1000)} seconds.`
        ),
      };
    },
  });
}

export default fp(rateLimitPlugin, {
  name: 'rate-limit',
  fastify: '5.x',
});
