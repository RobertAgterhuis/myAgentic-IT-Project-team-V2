// Copyright (c) 2026 Robert Agterhuis. MIT License.
// M33: Scalability Foundation — Unit Tests (offline / mocked)
'use strict';

const { EventEmitter } = require('events');

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

  function createRedisSessionDouble() {
    const values = new Map();
    const sets = new Map();

    return {
      values,
      sets,
      redis: {
        setex: vi.fn(async (key, ttlSeconds, value) => {
          values.set(key, { ttlSeconds, value });
        }),
        sadd: vi.fn(async (key, value) => {
          const set = sets.get(key) || new Set();
          set.add(value);
          sets.set(key, set);
        }),
        get: vi.fn(async (key) => values.get(key)?.value ?? null),
        del: vi.fn(async (...keys) => {
          for (const key of keys) values.delete(key);
          return keys.length;
        }),
        srem: vi.fn(async (key, value) => {
          const set = sets.get(key);
          if (set) set.delete(value);
        }),
        smembers: vi.fn(async (key) => Array.from(sets.get(key) || [])),
      },
    };
  }

  it('creates, finds, touches, and destroys sessions', async () => {
    const { createRedisSessionStore } = await import('../../src/webapp/session-store-redis');
    const { redis, values, sets } = createRedisSessionDouble();
    const store = createRedisSessionStore(redis);

    const session = await store.createSession('user-1', 5_000);
    const sessionKey = `session:${session.id}`;
    const userSessionsKey = 'user-sessions:user-1';

    expect(session.user_id).toBe('user-1');
    expect(values.get(sessionKey).ttlSeconds).toBe(5);
    expect(sets.get(userSessionsKey).has(session.id)).toBe(true);
    await expect(store.findSession(session.id)).resolves.toMatchObject({ id: session.id });

    const previousExpiresAt = JSON.parse(values.get(sessionKey).value).expires_at;
    await store.touchSession(session.id, 10_000);
    const touched = JSON.parse(values.get(sessionKey).value);
    expect(values.get(sessionKey).ttlSeconds).toBe(10);
    expect(touched.last_active).toBeTruthy();
    expect(new Date(touched.expires_at).getTime()).toBeGreaterThan(
      new Date(previousExpiresAt).getTime()
    );

    await store.destroySession(session.id);
    expect(values.has(sessionKey)).toBe(false);
    expect(sets.get(userSessionsKey)?.has(session.id)).toBe(false);
  });

  it('drops expired sessions and destroys all sessions for a user', async () => {
    const { createRedisSessionStore } = await import('../../src/webapp/session-store-redis');
    const { redis, values, sets } = createRedisSessionDouble();
    const store = createRedisSessionStore(redis);

    values.set('session:expired', {
      ttlSeconds: 1,
      value: JSON.stringify({
        id: 'expired',
        user_id: 'user-1',
        csrf_token: 'csrf',
        created_at: '2026-03-19T00:00:00.000Z',
        expires_at: '2026-03-19T00:00:01.000Z',
        last_active: '2026-03-19T00:00:00.000Z',
      }),
    });

    await expect(store.findSession('expired')).resolves.toBeNull();
    expect(redis.del).toHaveBeenCalledWith('session:expired');

    sets.set('user-sessions:user-2', new Set(['s1', 's2']));
    values.set('session:s1', { ttlSeconds: 60, value: '{}' });
    values.set('session:s2', { ttlSeconds: 60, value: '{}' });

    await store.destroyUserSessions('user-2');
    expect(redis.del).toHaveBeenCalledWith('session:s1', 'session:s2');
    expect(redis.del).toHaveBeenCalledWith('user-sessions:user-2');
    await expect(store.cleanExpired()).resolves.toBe(0);
  });
});

// Verify Redis pub/sub SSE manager factory
describe('Redis pub/sub SSE manager — module exports', () => {
  it('exports createRedisPubSubSSEManager', async () => {
    const mod = await import('../../src/webapp/sse-manager-redis');
    expect(typeof mod.createRedisPubSubSSEManager).toBe('function');
  });

  function createPubSubDouble() {
    const subscriber = new EventEmitter();
    subscriber.subscribe = vi.fn().mockResolvedValue(undefined);
    subscriber.unsubscribe = vi.fn().mockResolvedValue(undefined);

    const publisher = {
      publish: vi.fn().mockResolvedValue(1),
    };

    return { publisher, subscriber };
  }

  function createSseClient() {
    const req = new EventEmitter();
    const res = {
      write: vi.fn(),
    };
    return { req, res };
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('subscribes, enforces max clients, sends heartbeats, and removes closed clients', async () => {
    vi.useFakeTimers();
    const { createRedisPubSubSSEManager } = await import('../../src/webapp/sse-manager-redis');
    const { publisher, subscriber } = createPubSubDouble();
    const manager = createRedisPubSubSSEManager({
      publisher,
      subscriber,
      heartbeatMs: 100,
      maxClients: 1,
    });

    const first = createSseClient();
    const second = createSseClient();

    expect(manager.addClient(first.req, first.res)).toBe(true);
    expect(manager.addClient(second.req, second.res)).toBe(false);
    expect(manager.size).toBe(1);
    expect(subscriber.subscribe).toHaveBeenCalledWith('sse:broadcast');

    await vi.advanceTimersByTimeAsync(100);
    expect(first.res.write).toHaveBeenCalledWith(expect.stringContaining(':heartbeat'));

    first.req.emit('close');
    expect(manager.size).toBe(0);

    manager.destroy();
  });

  it('forwards redis messages to local clients and ignores malformed or unrelated events', async () => {
    const { createRedisPubSubSSEManager } = await import('../../src/webapp/sse-manager-redis');
    const { publisher, subscriber } = createPubSubDouble();
    const manager = createRedisPubSubSSEManager({ publisher, subscriber, heartbeatMs: 1_000 });
    const client = createSseClient();

    manager.addClient(client.req, client.res);
    subscriber.emit(
      'message',
      'sse:broadcast',
      JSON.stringify({ event: 'progress', data: { step: 2 }, _origin: 'other-node' })
    );
    subscriber.emit('message', 'other-channel', JSON.stringify({ event: 'ignored', data: {} }));
    subscriber.emit('message', 'sse:broadcast', '{bad-json');

    expect(client.res.write).toHaveBeenCalledTimes(1);
    expect(client.res.write).toHaveBeenCalledWith('event: progress\ndata: {"step":2}\n\n');

    manager.destroy();
  });

  it('broadcasts locally immediately, publishes with origin metadata, and ignores loopback redis messages', async () => {
    const { createRedisPubSubSSEManager } = await import('../../src/webapp/sse-manager-redis');
    const { publisher, subscriber } = createPubSubDouble();
    const manager = createRedisPubSubSSEManager({ publisher, subscriber, heartbeatMs: 1_000 });
    const client = createSseClient();

    manager.addClient(client.req, client.res);
    manager.broadcast('status', { ok: true });
    await Promise.resolve();

    expect(client.res.write).toHaveBeenCalledTimes(1);
    expect(client.res.write).toHaveBeenCalledWith('event: status\ndata: {"ok":true}\n\n');
    expect(publisher.publish).toHaveBeenCalledTimes(1);

    const [, publishedMessage] = publisher.publish.mock.calls[0];
    const parsed = JSON.parse(publishedMessage);
    expect(parsed).toMatchObject({ event: 'status', data: { ok: true } });
    expect(typeof parsed._origin).toBe('string');
    expect(parsed._origin.length).toBeGreaterThan(0);

    subscriber.emit('message', 'sse:broadcast', publishedMessage);
    expect(client.res.write).toHaveBeenCalledTimes(1);

    manager.destroy();
  });

  it('falls back to local broadcast when redis publish fails and cleans up on destroy', async () => {
    const { createRedisPubSubSSEManager } = await import('../../src/webapp/sse-manager-redis');
    const { publisher, subscriber } = createPubSubDouble();
    publisher.publish.mockRejectedValueOnce(new Error('redis down'));
    const manager = createRedisPubSubSSEManager({ publisher, subscriber, heartbeatMs: 1_000 });
    const client = createSseClient();

    manager.addClient(client.req, client.res);
    manager.broadcast('status', { ok: true });
    await Promise.resolve();

    expect(publisher.publish).toHaveBeenCalledWith(
      'sse:broadcast',
      expect.stringContaining('"event":"status"')
    );
    expect(client.res.write).toHaveBeenCalledWith('event: status\ndata: {"ok":true}\n\n');

    manager.destroy();
    expect(subscriber.unsubscribe).toHaveBeenCalledWith('sse:broadcast');
    expect(manager.size).toBe(0);
  });
});
