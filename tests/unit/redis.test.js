'use strict';

async function loadRedisModule() {
  vi.resetModules();

  const instances = [];
  const RedisCtorSpy = vi.fn();
  class RedisMock {
    constructor(url, options) {
      RedisCtorSpy(url, options);
      this.url = url;
      this.options = options;
      this.quit = vi.fn().mockResolvedValue(undefined);
      this.ping = vi.fn().mockResolvedValue('PONG');
      instances.push(this);
    }
  }

  vi.doMock('ioredis', () => ({ __esModule: true, default: RedisMock }));
  const mod = await import('../../src/webapp/redis.ts');
  return { mod, RedisCtorSpy, instances };
}

describe('redis.ts', () => {
  afterEach(() => {
    delete process.env.REDIS_URL;
    vi.doUnmock('ioredis');
  });

  it('returns null when no redis url is configured', async () => {
    const { mod, RedisCtorSpy } = await loadRedisModule();

    expect(mod.getRedisConnection()).toBeNull();
    expect(mod.createRedisConnection()).toBeNull();
    expect(RedisCtorSpy).not.toHaveBeenCalled();
  });

  it('reuses the shared redis connection', async () => {
    const { mod } = await loadRedisModule();

    const first = mod.getRedisConnection('redis://shared');
    const second = mod.getRedisConnection('redis://shared');

    expect(first).toBe(second);
    expect(first.url).toBe('redis://shared');
    expect(first.options).toEqual({
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
  });

  it('creates independent redis connections', async () => {
    const { mod } = await loadRedisModule();

    const first = mod.createRedisConnection('redis://one');
    const second = mod.createRedisConnection('redis://one');

    expect(first).not.toBe(second);
  });

  it('closes and resets the shared redis connection', async () => {
    const { mod } = await loadRedisModule();

    const first = mod.getRedisConnection('redis://shared');
    await mod.closeRedisConnection();
    const second = mod.getRedisConnection('redis://shared');

    expect(typeof first.quit).toBe('function');
    expect(second).not.toBe(first);
  });

  it('reports healthy and unhealthy redis health checks', async () => {
    vi.resetModules();
    vi.doUnmock('ioredis');
    const mod = await import('../../src/webapp/redis.ts');
    const redis = {
      ping: vi.fn().mockResolvedValue('PONG'),
    };

    await expect(mod.redisHealthCheck(redis)).resolves.toMatchObject({ status: 'ok' });

    redis.ping.mockRejectedValueOnce(new Error('down'));
    await expect(mod.redisHealthCheck(redis)).resolves.toMatchObject({ status: 'unhealthy' });
  });
});
