// Copyright (c) 2026 Robert Agterhuis. MIT License.
// M33: Scalability Foundation — Unit Tests (offline / mocked)
'use strict';

// Verify BullMQQueue exports correctly and implements JobQueue interface
describe('BullMQQueue — module exports', () => {
  it('exports BullMQQueue class', async () => {
    const mod = await import('../../platform/engine/jobs/bullmq-queue');
    expect(mod.BullMQQueue).toBeDefined();
    expect(typeof mod.BullMQQueue).toBe('function');
  });

  it('BullMQQueue prototype has all JobQueue methods', async () => {
    const { BullMQQueue } = await import('../../platform/engine/jobs/bullmq-queue');
    const proto = BullMQQueue.prototype;
    const requiredMethods = [
      'enqueue',
      'dequeue',
      'complete',
      'fail',
      'cancel',
      'status',
      'list',
      'size',
    ];
    for (const method of requiredMethods) {
      expect(typeof proto[method]).toBe('function');
    }
  });
});

// Verify Redis connection factory
describe('Redis connection factory', () => {
  it('returns null when no REDIS_URL is set', async () => {
    const saved = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    const { getRedisConnection } = await import('../../src/webapp/redis');
    const conn = getRedisConnection(undefined);
    expect(conn).toBeNull();
    if (saved) process.env.REDIS_URL = saved;
  });
});

// Verify config exports
describe('Config — Redis/BullMQ settings (M33-002)', () => {
  it('exports REDIS_URL', async () => {
    const config = await import('../../src/webapp/config');
    expect('REDIS_URL' in config).toBe(true);
  });

  it('exports QUEUE_PROVIDER with valid default', async () => {
    const config = await import('../../src/webapp/config');
    expect(['memory', 'persistent', 'bullmq']).toContain(config.QUEUE_PROVIDER);
  });

  it('exports SESSION_STORE with valid default', async () => {
    const config = await import('../../src/webapp/config');
    expect(['sqlite', 'redis']).toContain(config.SESSION_STORE);
  });
});

// Verify Redis session store factory
describe('Redis session store — module exports', () => {
  it('exports createRedisSessionStore', async () => {
    const mod = await import('../../src/webapp/session-store-redis');
    expect(typeof mod.createRedisSessionStore).toBe('function');
  });
});

// Verify Redis pub/sub SSE manager factory
describe('Redis pub/sub SSE manager — module exports', () => {
  it('exports createRedisPubSubSSEManager', async () => {
    const mod = await import('../../src/webapp/sse-manager-redis');
    expect(typeof mod.createRedisPubSubSSEManager).toBe('function');
  });
});
