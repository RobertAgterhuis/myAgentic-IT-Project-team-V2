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
import { errorResponse } from '../utils/errors';

const EXEMPT_API_PATHS = new Set(['/api/health', '/api/events']);

export interface RateLimitPluginOptions {
  /** Maximum requests per window (default: 30). */
  max?: number;
  /** Time window string (default: '1 minute'). */
  timeWindow?: string;
  /** Disable the plugin entirely (useful in tests). */
  disabled?: boolean;
}

async function rateLimitPlugin(app: FastifyInstance, opts: RateLimitPluginOptions): Promise<void> {
  if (opts.disabled || process.env.NODE_ENV === 'test') return;

  await app.register(fastifyRateLimit, {
    max: opts.max ?? 30,
    timeWindow: opts.timeWindow ?? '1 minute',
    keyGenerator: (req: FastifyRequest) => req.ip, // respects trustProxy / X-Forwarded-For
    allowList: (req) => {
      const pathname = req.url.split('?')[0];

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
