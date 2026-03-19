// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

/**
 * Unit Tests: Fastify Plugins (M30-005)
 *
 * Tests the framework plugin pattern for security headers, rate limiting,
 * and body parsing. Uses `fastify.inject()` — no real HTTP server needed.
 */

const Fastify = require('fastify');
const {
  securityHeadersPlugin,
  rateLimitPlugin,
  bodyParserPlugin,
} = require('../../src/webapp/plugins');

/* ── Helpers ──────────────────────────────────────────────────── */

/** Build a minimal Fastify app with the given plugin(s) and a test route. */
async function buildTestApp(plugins = []) {
  const app = Fastify({ logger: false });
  for (const [plugin, opts] of plugins) {
    await app.register(plugin, opts || {});
  }
  // Simple echo route for testing
  app.get('/test', async () => ({ ok: true }));
  app.get('/api/test', async () => ({ ok: true }));
  app.get('/api/health', async () => ({ status: 'ok' }));
  app.post('/test', async (request) => ({ body: request.body }));
  app.post('/api/test', async (request) => ({ body: request.body }));
  await app.ready();
  return app;
}

/* ── Security Headers Plugin ──────────────────────────────────── */

describe('M30-005: securityHeadersPlugin', () => {
  let app;

  beforeAll(async () => {
    app = await buildTestApp([[securityHeadersPlugin, {}]]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options: SAMEORIGIN', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('sets Referrer-Policy', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('sets Content-Security-Policy with defaults', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    const csp = res.headers['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
  });

  it('sets Permissions-Policy', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['permissions-policy']).toBe(
      'camera=(), microphone=(), geolocation=(), payment=()'
    );
  });

  it('sets Cross-Origin-Opener-Policy: same-origin', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
  });

  it('sets Cross-Origin-Embedder-Policy: require-corp', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['cross-origin-embedder-policy']).toBe('require-corp');
  });

  it('sets X-DNS-Prefetch-Control: off', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
  });

  it('sets X-Permitted-Cross-Domain-Policies: none', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['x-permitted-cross-domain-policies']).toBe('none');
  });

  it('sets Cache-Control: no-store', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('applies headers to all routes including POST', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test',
      payload: { x: 1 },
    });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('accepts a custom Content-Security-Policy', async () => {
    const custom = await buildTestApp([
      [securityHeadersPlugin, { contentSecurityPolicy: "default-src 'none'" }],
    ]);
    const res = await custom.inject({ method: 'GET', url: '/test' });
    expect(res.headers['content-security-policy']).toBe("default-src 'none'");
    await custom.close();
  });
});

/* ── Rate Limit Plugin ────────────────────────────────────────── */

describe('M30-005: rateLimitPlugin', () => {
  it('is disabled when { disabled: true }', async () => {
    const app = await buildTestApp([[rateLimitPlugin, { disabled: true }]]);
    // Should respond normally without any rate-limit headers
    const res = await app.inject({ method: 'POST', url: '/test', payload: {} });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    await app.close();
  });

  it('is disabled when NODE_ENV=test', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      const app = await buildTestApp([[rateLimitPlugin, {}]]);
      const res = await app.inject({ method: 'POST', url: '/test', payload: {} });
      expect(res.statusCode).toBe(200);
      await app.close();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('enforces rate limit when enabled', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const app = await buildTestApp([[rateLimitPlugin, { max: 2, timeWindow: '1 minute' }]]);

      // First two POST requests should succeed
      const r1 = await app.inject({ method: 'POST', url: '/api/test', payload: {} });
      expect(r1.statusCode).toBe(200);

      const r2 = await app.inject({ method: 'POST', url: '/api/test', payload: {} });
      expect(r2.statusCode).toBe(200);

      // Third POST should be rate-limited
      const r3 = await app.inject({ method: 'POST', url: '/api/test', payload: {} });
      expect(r3.statusCode).toBe(429);
      const body = JSON.parse(r3.body);
      expect(body.code).toBe('RATE_LIMITED');
      expect(body.error).toContain('Rate limit exceeded');

      await app.close();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('allows non-API GET requests through the allowList', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const app = await buildTestApp([[rateLimitPlugin, { max: 1, timeWindow: '1 minute' }]]);

      // GET requests should not be rate-limited
      const r1 = await app.inject({ method: 'GET', url: '/test' });
      expect(r1.statusCode).toBe(200);

      const r2 = await app.inject({ method: 'GET', url: '/test' });
      expect(r2.statusCode).toBe(200);

      const r3 = await app.inject({ method: 'GET', url: '/test' });
      expect(r3.statusCode).toBe(200);

      await app.close();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('rate-limits GET requests on API routes and exempts /api/health', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const app = await buildTestApp([[rateLimitPlugin, { max: 1, timeWindow: '1 minute' }]]);

      const api1 = await app.inject({ method: 'GET', url: '/api/test' });
      expect(api1.statusCode).toBe(200);

      const api2 = await app.inject({ method: 'GET', url: '/api/test' });
      expect(api2.statusCode).toBe(429);

      const h1 = await app.inject({ method: 'GET', url: '/api/health' });
      const h2 = await app.inject({ method: 'GET', url: '/api/health' });
      const h3 = await app.inject({ method: 'GET', url: '/api/health' });

      expect(h1.statusCode).toBe(200);
      expect(h2.statusCode).toBe(200);
      expect(h3.statusCode).toBe(200);

      await app.close();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});

/* ── Body Parser Plugin ───────────────────────────────────────── */

describe('M30-005: bodyParserPlugin', () => {
  let app;

  beforeAll(async () => {
    app = await buildTestApp([[bodyParserPlugin, {}]]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('parses application/json bodies (built-in)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ key: 'value' }),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.body).toEqual({ key: 'value' });
  });

  it('parses text/plain bodies as string', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test',
      headers: { 'content-type': 'text/plain' },
      payload: 'Hello world',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.body).toBe('Hello world');
  });

  it('rejects unsupported content types', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test',
      headers: { 'content-type': 'application/xml' },
      payload: '<root/>',
    });
    expect(res.statusCode).toBe(415);
  });
});

/* ── Plugin composition (all three together) ──────────────────── */

describe('M30-005: plugin composition', () => {
  let app;

  beforeAll(async () => {
    app = await buildTestApp([
      [bodyParserPlugin, {}],
      [rateLimitPlugin, { disabled: true }],
      [securityHeadersPlugin, {}],
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('applies security headers when all plugins are registered', async () => {
    const res = await app.inject({ method: 'GET', url: '/test' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('parses JSON body with all plugins active', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test',
      payload: { msg: 'composed' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.body.msg).toBe('composed');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('parses text/plain body with all plugins active', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/test',
      headers: { 'content-type': 'text/plain' },
      payload: 'plain text',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.body).toBe('plain text');
  });
});
