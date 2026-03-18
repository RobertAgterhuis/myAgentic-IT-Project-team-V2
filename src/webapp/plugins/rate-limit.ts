// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Fastify plugin — Rate limiting (M30-005).
 *
 * Wraps `@fastify/rate-limit` with project-specific defaults:
 *  - 30 requests / minute for mutating methods
 *  - GET requests and health checks are exempt
 *  - Custom error body matching the platform error schema
 *
 * @module plugins/rate-limit
 */

import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { errorResponse } from '../utils/errors';

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
    allowList: (req) => {
      // Don't rate-limit GET requests or health checks
      return req.method === 'GET' || req.url === '/api/health';
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
