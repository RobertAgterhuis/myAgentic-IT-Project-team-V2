// Copyright (c) 2026 Robert Agterhuis. MIT License.
/**
 * Test adapter: converts Fastify route plugins back to the legacy
 * `{ 'METHOD /path': handler(req, res) }` pattern used by existing unit tests.
 *
 * Usage:
 *   import { createTestableRoutes } from '../helpers/fastify-test-adapter.js';
 *   const routes = createTestableRoutes(registerRoutes, ctx);
 *   await routes['GET /api/foo'](fakeReq(), fakeRes());
 */

/**
 * Creates a mock Fastify app that collects route registrations, then
 * returns a legacy-compatible route table.  Handlers accept (req, res)
 * and translate to Fastify's (request, reply) internally.
 *
 * Note: route registration is always synchronous (app.get/post/etc are
 * mock calls), so this is intentionally NOT async—existing tests can
 * call it without `await`.
 */
export function createTestableRoutes(registerRoutesFn, ctx) {
  const routeTable = {};

  // Collect cross-route wiring set during registration
  const mockApp = createMockApp(routeTable);

  // Registration is synchronous even though registerRoutesFn is async;
  // the route table is populated by side-effect before the promise settles.
  registerRoutesFn(mockApp, ctx);
  return routeTable;
}

function createMockApp(routeTable) {
  function addRoute(method, path, optionsOrHandler, maybeHandler) {
    const handler = typeof optionsOrHandler === 'function' ? optionsOrHandler : maybeHandler;
    const key = `${method} ${path}`;
    routeTable[key] = createWrappedHandler(handler, path);
  }

  return {
    get: (path, ...args) => addRoute('GET', path, ...args),
    post: (path, ...args) => addRoute('POST', path, ...args),
    put: (path, ...args) => addRoute('PUT', path, ...args),
    patch: (path, ...args) => addRoute('PATCH', path, ...args),
    delete: (path, ...args) => addRoute('DELETE', path, ...args),
  };
}

/**
 * Wraps a Fastify handler so it can be called with legacy (req, res).
 * Creates a Fastify-like reply object that delegates to the legacy res.
 */
function createWrappedHandler(fastifyHandler, routePattern) {
  return async function legacyHandler(req, res) {
    // Pre-extract body from real Node.js streams (e.g. Readable.from([buf]))
    // before creating the Fastify-like request, since streams fire data events
    // asynchronously and cannot be drained synchronously.
    if (
      req?.body === undefined &&
      req?._body === undefined &&
      typeof req?.on === 'function' &&
      typeof req?.read === 'function'
    ) {
      await new Promise((resolve) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          if (chunks.length > 0) {
            const raw = Buffer.concat(chunks).toString();
            try {
              req._body = JSON.parse(raw);
            } catch {
              req._body = raw;
            }
          }
          resolve();
        });
      });
    }
    const reply = createFastifyReply(res);
    const request = createFastifyRequest(req, routePattern);
    await fastifyHandler(request, reply);
  };
}

/**
 * Creates a Fastify-compatible request mock that wraps a legacy req.
 */
function createFastifyRequest(req, routePattern) {
  // If already Fastify-like (has .query, .params as own properties), pass through
  if (req && Object.hasOwn(req, 'query') && Object.hasOwn(req, 'params')) return req;

  const request = Object.create(req || {});

  // Parse URL for query params
  let pathname = '';
  if (req && req.url) {
    try {
      const u = new URL(req.url, 'http://localhost');
      request.query = Object.fromEntries(u.searchParams.entries());
      pathname = u.pathname;
    } catch {
      request.query = {};
    }
  } else {
    request.query = {};
  }

  // Extract route params from URL path using route pattern
  request.params = req?.params || extractParams(routePattern, pathname);

  // Extract body: try direct properties first, then attempt sync stream drain
  // (mock req.on('data', cb) calls cb synchronously with buffered chunks)
  let body = req?._body || req?.body;
  if (body === undefined && typeof req?.on === 'function') {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {});
    if (chunks.length > 0) {
      const raw = Buffer.concat(chunks).toString();
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }
  }
  request.body = body;
  request.raw = req;

  return request;
}

/**
 * Extracts route parameters by matching a URL path against a route pattern.
 * e.g., extractParams('/api/milestones/:id', '/api/milestones/abc123')
 * returns { id: 'abc123' }
 */
function extractParams(pattern, pathname) {
  if (!pattern || !pathname) return {};
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  const params = {};
  for (let i = 0; i < patternParts.length && i < pathParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    }
  }
  return params;
}

/**
 * Creates a Fastify-compatible reply mock that delegates to a legacy res.
 */
function createFastifyReply(res) {
  let _statusCode = 200;
  const reply = {
    code(statusCode) {
      _statusCode = statusCode;
      return reply;
    },
    status(statusCode) {
      _statusCode = statusCode;
      return reply;
    },
    send(payload) {
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      if (res.writeHead) {
        res.writeHead(_statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      if (res.end) {
        res.end(body);
      }
    },
    redirect(codeOrUrl, maybeUrl) {
      const code = typeof codeOrUrl === 'number' ? codeOrUrl : 302;
      const url = typeof codeOrUrl === 'string' ? codeOrUrl : maybeUrl;
      if (res.writeHead) res.writeHead(code, { Location: url });
      if (res.end) res.end();
    },
    header(name, value) {
      if (res.setHeader) res.setHeader(name, value);
      return reply;
    },
    type(contentType) {
      if (res.setHeader) res.setHeader('Content-Type', contentType);
      return reply;
    },
    hijack() {
      // no-op in tests
    },
    get raw() {
      return res;
    },
    get statusCode() {
      return _statusCode;
    },
  };
  return reply;
}
