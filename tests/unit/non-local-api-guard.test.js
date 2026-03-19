// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const path = require('path');
const { buildApp } = require('../../src/webapp/app.ts');

function makeCtx(host) {
  return {
    HOST: host,
    PORT: 3000,
    WEBAPP_DIR: path.join(__dirname, '..', '..', 'src', 'webapp'),
    _authMiddleware: null,
    recordMetric() {},
  };
}

describe('non-local API guard', () => {
  const originalApiKey = process.env.API_KEY;

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = originalApiKey;
  });

  it('rejects non-local API GET when auth middleware is absent and API key missing', async () => {
    delete process.env.API_KEY;
    const app = await buildApp({
      ctx: makeCtx('0.0.0.0'),
      disableRequestLogging: true,
      disableRateLimit: true,
      disableSwaggerUi: true,
    });
    app.get('/api/ping', async () => ({ ok: true }));

    const res = await app.inject({ method: 'GET', url: '/api/ping' });
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('UNAUTHORIZED');

    await app.close();
  });

  it('allows non-local API requests with matching API key', async () => {
    process.env.API_KEY = 'abcdefghijklmnopqrstuvwxyz123456';
    const app = await buildApp({
      ctx: makeCtx('0.0.0.0'),
      disableRequestLogging: true,
      disableRateLimit: true,
      disableSwaggerUi: true,
    });
    app.get('/api/ping', async () => ({ ok: true }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/ping',
      headers: { 'x-api-key': process.env.API_KEY },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    await app.close();
  });

  it('does not guard non-API routes', async () => {
    delete process.env.API_KEY;
    const app = await buildApp({
      ctx: makeCtx('0.0.0.0'),
      disableRequestLogging: true,
      disableRateLimit: true,
      disableSwaggerUi: true,
    });
    app.get('/ping', async () => ({ ok: true }));

    const res = await app.inject({ method: 'GET', url: '/ping' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    await app.close();
  });
});
