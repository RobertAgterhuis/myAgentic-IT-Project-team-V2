'use strict';

async function loadRedisModule() {
  vi.resetModules();
  return import('../../src/webapp/redis.ts');
}

describe('redis.ts', () => {
  afterEach(async () => {
    delete process.env.REDIS_URL;
    const mod = await loadRedisModule();
    await mod.closeRedisConnection();
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
});
