// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Fastify plugin — Security headers (M30-005).
 *
 * Sets OWASP-recommended security headers on every HTTP response.
 * Replaces the legacy `setSecurityHeaders(res)` helper with a
 * framework-native `onSend` hook that runs automatically.
 *
 * @module plugins/security-headers
 */

import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export interface SecurityHeadersOptions {
  /** Override the default Content-Security-Policy directive. */
  contentSecurityPolicy?: string;
}

const DEFAULT_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'self'; base-uri 'self'; object-src 'none'";

async function securityHeadersPlugin(
  app: FastifyInstance,
  opts: SecurityHeadersOptions
): Promise<void> {
  const csp = opts.contentSecurityPolicy ?? DEFAULT_CSP;

  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'SAMEORIGIN');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Content-Security-Policy', csp);
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    reply.header('Cross-Origin-Opener-Policy', 'same-origin');
    reply.header('Cross-Origin-Embedder-Policy', 'require-corp');
    reply.header('X-DNS-Prefetch-Control', 'off');
    reply.header('X-Permitted-Cross-Domain-Policies', 'none');
    reply.header('Cache-Control', 'no-store');
  });
}

export default fp(securityHeadersPlugin, {
  name: 'security-headers',
  fastify: '5.x',
});
