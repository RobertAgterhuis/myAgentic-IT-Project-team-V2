// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Barrel export for Fastify plugins (M30-005).
 *
 * ## Middleware / Plugin ordering
 *
 * Plugins are registered in the following order inside `buildApp()`:
 *
 * | #  | Plugin              | Hook / Phase        | Purpose                                   |
 * |----|---------------------|---------------------|-------------------------------------------|
 * | 1  | body-parser         | contentTypeParser   | Parse text/plain bodies (JSON is built-in) |
 * | 2  | @fastify/cookie     | onRequest (preparse)| Parse cookies for auth session tokens      |
 * | 3  | rate-limit          | onRequest           | Reject abusive clients early               |
 * | 4  | Auth + RBAC hook    | onRequest           | Authenticate and authorize API requests    |
 * | 5  | security-headers    | onSend              | Set OWASP security headers on responses    |
 * | 6  | Metrics hook        | onResponse          | Record request duration & status metrics   |
 * | 7  | @fastify/swagger    | onReady             | Generate OpenAPI 3.1 spec                  |
 * | 8  | @fastify/swagger-ui | onReady             | Serve Swagger UI at /docs                  |
 * | 9  | @fastify/static     | preHandler          | Serve SPA build output                     |
 *
 * This ordering ensures:
 * - Body parsing and cookies are available before rate limiting checks
 * - Rate limiting runs before expensive auth/RBAC logic
 * - Security headers are applied to every response (including errors)
 * - Metrics capture the full request lifecycle including auth overhead
 *
 * @module plugins
 */

export { default as securityHeadersPlugin } from './security-headers';
export type { SecurityHeadersOptions } from './security-headers';

export { default as rateLimitPlugin } from './rate-limit';
export type { RateLimitPluginOptions } from './rate-limit';

export { default as bodyParserPlugin } from './body-parser';
export type { BodyParserPluginOptions } from './body-parser';
