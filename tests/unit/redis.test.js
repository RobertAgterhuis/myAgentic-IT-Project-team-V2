'use strict';

// Track the module loaded per-test so afterEach closes the correct instance.
let _currentMod;

async function loadRedisModule() {
  vi.resetModules();
  _currentMod = await import('../../src/webapp/redis.ts');
  return _currentMod;
}

describe('redis.ts', () => {
  afterEach(async () => {
    delete process.env.REDIS_URL;
    if (_currentMod) {
      await _currentMod.closeRedisConnection();
      _currentMod = null;
    }
  });

  afterAll(async () => {
    // Allow any in-flight ioredis retry timers and console-log callbacks to
    // drain before Vitest closes the worker RPC channel (prevents
    // EnvironmentTeardownError: Closing rpc while onUserConsoleLog was pending).
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  it('returns null when no redis url is configured', async () => {
    const mod = await loadRedisModule();

    expect(mod.getRedisConnection()).toBeNull();
    expect(mod.createRedisConnection()).toBeNull();
  });

  it('reuses the shared redis connection', async () => {
    const mod = await loadRedisModule();

    const first = mod.getRedisConnection('redis://shared');
    const second = mod.getRedisConnection('redis://shared');

    expect(first).toBe(second);
    expect(first).not.toBeNull();
    expect(typeof first.quit).toBe('function');
  });

  it('creates independent redis connections', async () => {
    const mod = await loadRedisModule();

    const first = mod.createRedisConnection('redis://one');
    const second = mod.createRedisConnection('redis://one');

    expect(first).not.toBe(second);
    await first.quit();
    await second.quit();
  });

  it('closes and resets the shared redis connection', async () => {
    const mod = await loadRedisModule();

    const first = mod.getRedisConnection('redis://shared');
    await mod.closeRedisConnection();
    const second = mod.getRedisConnection('redis://shared');

    expect(typeof first.quit).toBe('function');
    expect(second).not.toBe(first);
  });

  it('uses REDIS_URL fallback when url argument is omitted', async () => {
    process.env.REDIS_URL = 'redis://shared-env';
    const mod = await loadRedisModule();

    const shared = mod.getRedisConnection();
    const dedicated = mod.createRedisConnection();

    expect(shared).not.toBeNull();
    expect(dedicated).not.toBeNull();
    await dedicated.quit();
  });

  it('reports healthy and unhealthy redis health checks', async () => {
    const mod = await loadRedisModule();
    const redis = {
      ping: vi.fn().mockResolvedValue('PONG'),
    };

    await expect(mod.redisHealthCheck(redis)).resolves.toMatchObject({ status: 'ok' });

    redis.ping.mockRejectedValueOnce(new Error('down'));
    await expect(mod.redisHealthCheck(redis)).resolves.toMatchObject({ status: 'unhealthy' });
  });

  it('handles multiple concurrent redis operations', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const mod = await loadRedisModule();

    const conn1 = mod.getRedisConnection();
    const conn2 = mod.getRedisConnection();
    const conn3 = mod.createRedisConnection();

    expect(conn1).toBe(conn2);
    expect(conn3).not.toBe(conn1);

    await conn3.quit();
  });

  it('switches shared connection when REDIS_URL changes', async () => {
    process.env.REDIS_URL = 'redis://first';
    const mod1 = await loadRedisModule();
    const first = mod1.getRedisConnection();

    await mod1.closeRedisConnection();

    process.env.REDIS_URL = 'redis://second';
    const mod2 = await loadRedisModule();
    const second = mod2.getRedisConnection();

    expect(first).not.toBe(second);
  });

  it('handles connection errors gracefully', async () => {
    const mod = await loadRedisModule();

    const conn = mod.createRedisConnection('redis://invalid-host:9999');
    expect(conn).not.toBeNull();

    if (conn && typeof conn.quit === 'function') {
      await conn.quit().catch(() => {});
    }
  });

  it('getRedisConnection returns consistent instance for same url', async () => {
    const mod = await loadRedisModule();

    const c1 = mod.getRedisConnection('redis://test-url');
    const c2 = mod.getRedisConnection('redis://test-url');

    expect(c1).toBe(c2);

    if (c1) {
      await c1.quit();
    }
  });
});
