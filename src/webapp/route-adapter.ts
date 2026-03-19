// @ts-nocheck
// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Legacy route adapter — bridges old `(ctx) => RouteTable` modules to Fastify (M30-004).
 *
 * During the incremental migration from raw http.createServer() to Fastify,
 * existing route modules still export the legacy pattern:
 *
 *   module.exports = function(ctx) { return { 'GET /api/foo': handler, ... } }
 *
 * This adapter converts that RouteTable into Fastify route registrations,
 * wrapping each handler to bridge raw IncomingMessage/ServerResponse to
 * Fastify's request/reply lifecycle.
 *
 * @module route-adapter
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type http from 'http';
import { PassThrough } from 'stream';
import { handleRouteError } from './middleware';

export type LegacyRouteTable = Record<
  string,
  (req: http.IncomingMessage, res: http.ServerResponse) => void | Promise<void>
>;

/**
 * Build a request proxy that replays Fastify's buffered body as a readable
 * stream. Legacy handlers call `readBody(req)` which reads via
 * `req.on('data')` / `req.on('end')`. Since Fastify already consumed the
 * raw stream, we create a PassThrough fed with the buffer and redirect
 * stream-read calls to it while inheriting all other IncomingMessage props.
 */
function createLegacyReq(request: FastifyRequest): http.IncomingMessage {
  const raw = request.raw;
  if (!(request.body instanceof Buffer) || request.body.length === 0) {
    return raw;
  }
  const bodyStream = new PassThrough();
  bodyStream.end(request.body);

  // Inherit all IncomingMessage properties; override stream methods
  const proxy = Object.create(raw) as http.IncomingMessage;
  proxy.on = bodyStream.on.bind(bodyStream) as typeof raw.on;
  proxy.once = bodyStream.once.bind(bodyStream) as typeof raw.once;
  proxy.removeListener = bodyStream.removeListener.bind(bodyStream) as typeof raw.removeListener;
  (proxy as { destroy: typeof raw.destroy }).destroy = (err?: Error) => {
    bodyStream.destroy(err);
    return raw.destroy(err);
  };
  return proxy;
}

/**
 * Register a legacy route table as Fastify routes.
 *
 * @param app - Fastify instance (or plugin scope)
 * @param routes - The `{ 'METHOD /path': handler }` map
 * @param tag - OpenAPI tag for all routes in this module
 */
export function registerLegacyRoutes(
  app: FastifyInstance,
  routes: LegacyRouteTable,
  tag?: string
): void {
  for (const [key, handler] of Object.entries(routes)) {
    // Skip internal/private keys
    if (key.startsWith('_')) continue;

    const spaceIdx = key.indexOf(' ');
    if (spaceIdx < 0) continue;

    const method = key.slice(0, spaceIdx).toLowerCase() as
      | 'get'
      | 'post'
      | 'put'
      | 'delete'
      | 'patch'
      | 'options'
      | 'head';
    const routePath = key.slice(spaceIdx + 1);

    // Convert Express-style :param to Fastify :param (same syntax, no-op)
    // Both use `:id` — no conversion needed

    const schema = tag ? { tags: [tag] } : undefined;

    app.route({
      method: method.toUpperCase() as
        | 'GET'
        | 'POST'
        | 'PUT'
        | 'DELETE'
        | 'PATCH'
        | 'OPTIONS'
        | 'HEAD',
      url: routePath,
      schema,
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        // Bridge: legacy handlers write directly to res (ServerResponse)
        // We hijack Fastify's reply to let the legacy handler own the response
        reply.hijack();
        try {
          const legacyReq = createLegacyReq(request);
          await handler(legacyReq, reply.raw);
        } catch (err) {
          // If the legacy handler throws and hasn't sent a response,
          // use the same error handler as the old server
          if (!reply.raw.writableEnded) {
            handleRouteError(err as Error & { status?: number; errorCode?: string }, reply.raw);
          }
        }
      },
    });
  }
}
