'use strict';

async function loadRedisModule() {
  vi.resetModules();

  const instances = [];
  const RedisMock = vi.fn(function (url, options) {
    this.url = url;
    this.options = options;
    this.quit = vi.fn().mockResolvedValue(undefined);
    this.ping = vi.fn().mockResolvedValue('PONG');
    instances.push(this);
  });

  vi.doMock('ioredis', () => ({ default: RedisMock }));
  const mod = await import('../../src/webapp/redis.ts');
  return { mod, RedisMock, instances };
}

describe('redis.ts', () => {
  afterEach(() => {
    delete process.env.REDIS_URL;
    vi.doUnmock('ioredis');
  });

  it('returns null when no redis url is configured', async () => {
    const { mod, RedisMock } = await loadRedisModule();

    expect(mod.getRedisConnection()).toBeNull();
    expect(mod.createRedisConnection()).toBeNull();
    expect(RedisMock).not.toHaveBeenCalled();
  });

  it('reuses the shared redis connection', async () => {
    const { mod, RedisMock } = await loadRedisModule();

    const first = mod.getRedisConnection('redis://shared');
    const second = mod.getRedisConnection('redis://shared');

    expect(first).toBe(second);
    expect(RedisMock).toHaveBeenCalledTimes(1);
    expect(RedisMock).toHaveBeenCalledWith('redis://shared', {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: false,
    });
  });

  it('creates independent redis connections', async () => {
    const { mod, RedisMock } = await loadRedisModule();

    const first = mod.createRedisConnection('redis://one');
    const second = mod.createRedisConnection('redis://one');

    expect(first).not.toBe(second);
    expect(RedisMock).toHaveBeenCalledTimes(2);
  });

  it('closes and resets the shared redis connection', async () => {
    const { mod, RedisMock } = await loadRedisModule();

    const first = mod.getRedisConnection('redis://shared');
    await mod.closeRedisConnection();
    const second = mod.getRedisConnection('redis://shared');

    expect(first.quit).toHaveBeenCalledTimes(1);
    expect(second).not.toBe(first);
    expect(RedisMock).toHaveBeenCalledTimes(2);
  });

  it('reports healthy and unhealthy redis health checks', async () => {
    const { mod, instances } = await loadRedisModule();

    const redis = mod.createRedisConnection('redis://health');
    await expect(mod.redisHealthCheck(redis)).resolves.toMatchObject({ status: 'ok' });

    instances[0].ping.mockRejectedValueOnce(new Error('down'));
    await expect(mod.redisHealthCheck(redis)).resolves.toMatchObject({ status: 'unhealthy' });
  });
});
