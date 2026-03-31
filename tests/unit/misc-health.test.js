// Copyright (c) 2026 Robert Agterhuis. MIT License.
'use strict';

const { registerHealthRoutes } = require('../../src/webapp/routes/misc-health');

function createFakeApp() {
  const routes = new Map();
  return {
    routes,
    get(path, handler) {
      routes.set(path, handler);
    },
  };
}

function createReply() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.payload = body;
      return this;
    },
  };
}

describe('registerHealthRoutes', () => {
  it('registers all health endpoints', () => {
    const app = createFakeApp();

    registerHealthRoutes({
      app,
      version: '1.2.3',
      sessionDir: '/tmp/session',
      storageProviderType: 'sqlite',
      sseConnections: () => 0,
      getStore: () => ({ exists: () => true }),
      getStorageProvider: () => null,
    });

    expect(app.routes.has('/api/health')).toBe(true);
    expect(app.routes.has('/health/live')).toBe(true);
    expect(app.routes.has('/health/ready')).toBe(true);
    expect(app.routes.has('/health')).toBe(true);
  });

  it('returns api health payload with storage details when provider exists', async () => {
    const app = createFakeApp();

    registerHealthRoutes({
      app,
      version: '1.2.3',
      sessionDir: '/tmp/session',
      storageProviderType: 'sqlite',
      sseConnections: () => 4,
      getStore: () => ({ exists: () => true }),
      getSemanticMemorySweeperStatus: () => ({ enabled: true, running: true, intervalMs: 300000 }),
      getStorageProvider: () => ({
        name: 'sqlite',
        health: async () => ({ status: 'healthy', provider: 'sqlite', latencyMs: 8 }),
      }),
    });

    const handler = app.routes.get('/api/health');
    const reply = createReply();
    await handler({}, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.status).toBe('ok');
    expect(reply.payload.version).toBe('1.2.3');
    expect(reply.payload.sse_connections).toBe(4);
    expect(reply.payload.semantic_memory_sweeper).toEqual({
      enabled: true,
      running: true,
      intervalMs: 300000,
    });
    expect(reply.payload.storage).toEqual({ status: 'healthy', provider: 'sqlite', latencyMs: 8 });
  });

  it('returns legacy /health payload with provider name', async () => {
    const app = createFakeApp();

    registerHealthRoutes({
      app,
      version: '1.2.3',
      sessionDir: '/tmp/session',
      storageProviderType: 'sqlite',
      sseConnections: () => 0,
      getStore: () => ({ exists: () => true }),
      getStorageProvider: () => ({
        name: 'sqlite',
        health: async () => ({ status: 'healthy', provider: 'sqlite', latencyMs: 2 }),
      }),
    });

    const handler = app.routes.get('/health');
    const reply = createReply();
    await handler({}, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.status).toBe('ok');
    expect(reply.payload.version).toBe('1.2.3');
    expect(reply.payload.storage_provider).toBe('sqlite');
  });

  it('marks store as degraded when store.exists throws', async () => {
    const app = createFakeApp();

    registerHealthRoutes({
      app,
      version: '1.2.3',
      sessionDir: '/tmp/session',
      storageProviderType: 'sqlite',
      sseConnections: () => 0,
      getStore: () => ({
        exists: () => {
          throw new Error('store failed');
        },
      }),
      getStorageProvider: () => null,
    });

    const handler = app.routes.get('/api/health');
    const reply = createReply();
    await handler({}, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.store_status).toBe('degraded');
  });

  it('returns unhealthy storage payload when provider health throws', async () => {
    const app = createFakeApp();

    registerHealthRoutes({
      app,
      version: '1.2.3',
      sessionDir: '/tmp/session',
      storageProviderType: 'sqlite',
      sseConnections: () => 0,
      getStore: () => ({ exists: () => true }),
      getStorageProvider: () => ({
        name: 'sqlite',
        health: async () => {
          throw new Error('health failed');
        },
      }),
    });

    const handler = app.routes.get('/api/health');
    const reply = createReply();
    await handler({}, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.storage.status).toBe('unhealthy');
  });

  it('returns ready on /health/ready when dependencies are healthy or absent', async () => {
    const app = createFakeApp();

    registerHealthRoutes({
      app,
      version: '1.2.3',
      sessionDir: '/tmp/session',
      storageProviderType: 'sqlite',
      sseConnections: () => 0,
      getStore: () => ({ exists: () => true }),
      getStorageProvider: () => ({
        health: async () => ({ status: 'healthy', provider: 'sqlite', latencyMs: 3 }),
      }),
    });

    const handler = app.routes.get('/health/ready');
    const reply = createReply();
    await handler({}, reply);

    expect(reply.statusCode).toBe(200);
    expect(reply.payload.status).toBe('ready');
    expect(reply.payload.checks.storage.status).toBe('healthy');
  });

  it('returns not_ready on /health/ready when storage health is not healthy', async () => {
    const app = createFakeApp();

    registerHealthRoutes({
      app,
      version: '1.2.3',
      sessionDir: '/tmp/session',
      storageProviderType: 'sqlite',
      sseConnections: () => 0,
      getStore: () => ({ exists: () => true }),
      getStorageProvider: () => ({
        health: async () => ({ status: 'degraded', provider: 'sqlite', latencyMs: 9 }),
      }),
    });

    const handler = app.routes.get('/health/ready');
    const reply = createReply();
    await handler({}, reply);

    expect(reply.statusCode).toBe(503);
    expect(reply.payload.status).toBe('not_ready');
  });

  it('returns not_ready on /health/ready when storageProvider.health() throws (line 107)', async () => {
    const app = createFakeApp();

    registerHealthRoutes({
      app,
      version: '1.2.3',
      sessionDir: '/tmp/session',
      storageProviderType: 'sqlite',
      sseConnections: () => 0,
      getStore: () => ({ exists: () => true }),
      getStorageProvider: () => ({
        health: async () => {
          throw new Error('storage unreachable');
        },
      }),
    });

    const handler = app.routes.get('/health/ready');
    const reply = createReply();
    await handler({}, reply);

    expect(reply.statusCode).toBe(503);
    expect(reply.payload.status).toBe('not_ready');
    expect(reply.payload.checks.storage.status).toBe('unhealthy');
  });

  it('returns status ok on /health/live', async () => {
    const app = createFakeApp();
    registerHealthRoutes({
      app,
      version: '1.2.3',
      sessionDir: '/tmp/session',
      sseConnections: () => 0,
      getStore: () => ({ exists: () => true }),
      getStorageProvider: () => null,
    });
    const handler = app.routes.get('/health/live');
    const reply = createReply();
    await handler({}, reply);
    expect(reply.payload).toEqual({ status: 'ok' });
  });

  it('returns degraded store on /health (legacy) when getStore throws', async () => {
    const app = createFakeApp();
    registerHealthRoutes({
      app,
      version: '2.0.0',
      sessionDir: '/tmp/s',
      sseConnections: () => 0,
      getStore: () => ({
        exists: () => {
          throw new Error('disk io error');
        },
      }),
      getStorageProvider: () => null,
    });
    const handler = app.routes.get('/health');
    const reply = createReply();
    await handler({}, reply);
    expect(reply.payload.store_status).toBe('degraded');
  });
});
