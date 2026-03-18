// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Fastify plugin — Body parsing (M30-005).
 *
 * Registers additional content-type parsers beyond Fastify's built-in
 * `application/json` parser:
 *  - `text/plain` — accepted as raw string (max 1 MB)
 *
 * Fastify handles `application/json` natively with a 1 MB body limit,
 * automatic 415 for unknown types, and control-character sanitization
 * via its `onError` hook.
 *
 * @module plugins/body-parser
 */

import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

export interface BodyParserPluginOptions {
  /** Maximum body size in bytes (default: 1 048 576 = 1 MB). */
  bodyLimit?: number;
}

async function bodyParserPlugin(
  app: FastifyInstance,
  opts: BodyParserPluginOptions
): Promise<void> {
  const limit = opts.bodyLimit ?? 1_048_576;

  app.addContentTypeParser(
    'text/plain',
    { parseAs: 'string', bodyLimit: limit },
    function (_req, body, done) {
      done(null, body);
    }
  );
}

export default fp(bodyParserPlugin, {
  name: 'body-parser',
  fastify: '5.x',
});
