'use strict';

const Fastify = require('fastify');
const rateLimitPlugin = require('../../src/webapp/plugins/rate-limit').default;

describe('rate-limit plugin hardening', () => {
  async function createApp(opts = {}) {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const app = Fastify({ trustProxy: true });
    await app.register(rateLimitPlugin, {
      max: 5,
      timeWindow: 60_000,
      authMax: 2,
      adminMax: 2,
      mutationMax: 2,
      ...opts,
    });

    app.get('/api/auth/login', async () => ({ ok: true }));
    app.get('/api/admin/users', async () => ({ ok: true }));
    app.post('/api/decisions', async () => ({ ok: true }));
    app.get('/healthz', async () => ({ ok: true }));

    await app.ready();
    process.env.NODE_ENV = previousNodeEnv;
    return app;
  }

  it('applies stricter auth endpoint throttling', async () => {
    const app = await createApp();

    const r1 = await app.inject({ method: 'GET', url: '/api/auth/login' });
    const r2 = await app.inject({ method: 'GET', url: '/api/auth/login' });
    const r3 = await app.inject({ method: 'GET', url: '/api/auth/login' });

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(r3.statusCode).toBe(429);

    await app.close();
  });

  it('applies stricter admin endpoint throttling', async () => {
    const app = await createApp();

    const r1 = await app.inject({ method: 'GET', url: '/api/admin/users' });
    const r2 = await app.inject({ method: 'GET', url: '/api/admin/users' });
    const r3 = await app.inject({ method: 'GET', url: '/api/admin/users' });

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(r3.statusCode).toBe(429);

    await app.close();
  });

  it('rate-limits mutation routes more aggressively than read routes', async () => {
    const app = await createApp();

    const m1 = await app.inject({ method: 'POST', url: '/api/decisions' });
    const m2 = await app.inject({ method: 'POST', url: '/api/decisions' });
    const m3 = await app.inject({ method: 'POST', url: '/api/decisions' });

    expect(m1.statusCode).toBe(200);
    expect(m2.statusCode).toBe(200);
    expect(m3.statusCode).toBe(429);

    await app.close();
  });

  it('keeps non-api routes exempt from API abuse throttling', async () => {
    const app = await createApp();

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => app.inject({ method: 'GET', url: '/healthz' }))
    );

    expect(responses.every((res) => res.statusCode === 200)).toBe(true);

    await app.close();
  });

  it('keys limits by identity seed when API keys differ', async () => {
    const app = await createApp({ authMax: 1 });

    const a1 = await app.inject({
      method: 'GET',
      url: '/api/auth/login',
      headers: { 'x-api-key': 'key-a' },
    });
    const b1 = await app.inject({
      method: 'GET',
      url: '/api/auth/login',
      headers: { 'x-api-key': 'key-b' },
    });
    const a2 = await app.inject({
      method: 'GET',
      url: '/api/auth/login',
      headers: { 'x-api-key': 'key-a' },
    });

    expect(a1.statusCode).toBe(200);
    expect(b1.statusCode).toBe(200);
    expect(a2.statusCode).toBe(429);

    await app.close();
  });
});
