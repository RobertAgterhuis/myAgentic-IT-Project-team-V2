// Copyright (c) 2026 Robert Agterhuis. MIT License.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

type StorageProviderLike = {
  name?: string;
  health: () => Promise<{
    status: string;
    provider?: string;
    latencyMs?: number;
  }>;
};

type StoreFactory = {
  exists: (filePath: string) => boolean;
};

export interface RegisterHealthRoutesOptions {
  app: FastifyInstance;
  version: string;
  sessionDir: string;
  storageProviderType?: string;
  sseConnections: () => number;
  getStore: () => StoreFactory;
  getStorageProvider?: () => StorageProviderLike | null;
  getSemanticMemorySweeperStatus?: () => {
    enabled: boolean;
    running: boolean;
    intervalMs: number;
  };
}

export function registerHealthRoutes(options: RegisterHealthRoutesOptions): void {
  const {
    app,
    version,
    sessionDir,
    storageProviderType,
    sseConnections,
    getStore,
    getStorageProvider,
    getSemanticMemorySweeperStatus,
  } = options;

  /** Readiness probe — used by Docker HEALTHCHECK and Playwright webServer. */
  app.get('/api/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    let store_status = 'ok';
    try {
      const store = getStore();
      store.exists(sessionDir);
    } catch {
      store_status = 'degraded';
    }

    let storage_health: Record<string, unknown> | undefined;
    const sp = typeof getStorageProvider === 'function' ? getStorageProvider() : null;
    if (sp) {
      try {
        const h = await sp.health();
        storage_health = {
          status: h.status,
          provider: h.provider,
          latencyMs: h.latencyMs,
        };
      } catch {
        storage_health = { status: 'unhealthy', provider: storageProviderType || 'unknown' };
      }
    }

    reply.send({
      status: 'ok',
      version,
      uptime: Math.round(process.uptime()),
      store_status,
      sse_connections: sseConnections(),
      timestamp: new Date().toISOString(),
      ...(typeof getSemanticMemorySweeperStatus === 'function'
        ? { semantic_memory_sweeper: getSemanticMemorySweeperStatus() }
        : {}),
      ...(storage_health ? { storage: storage_health } : {}),
    });
  });

  /** Liveness probe — lightweight check that the process is running (M33-006). */
  app.get('/health/live', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.send({ status: 'ok' });
  });

  /** Readiness probe — checks DB + broker connectivity (M33-006). */
  app.get('/health/ready', async (_request: FastifyRequest, reply: FastifyReply) => {
    const checks: Record<string, unknown> = {};
    let ready = true;

    const sp = typeof getStorageProvider === 'function' ? getStorageProvider() : null;
    if (sp) {
      try {
        const h = await sp.health();
        checks.storage = { status: h.status, latencyMs: h.latencyMs };
        if (h.status !== 'healthy') ready = false;
      } catch {
        checks.storage = { status: 'unhealthy' };
        ready = false;
      }
    }

    try {
      const { getRedisConnection, redisHealthCheck } = await import('../redis');
      const redis = getRedisConnection();
      if (redis) {
        const rh = await redisHealthCheck(redis);
        checks.redis = rh;
        if (rh.status !== 'ok') ready = false;
      }
    } catch {
      // Redis module not available — not a failure if not configured
    }

    reply.status(ready ? 200 : 503).send({
      status: ready ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  });

  /** Legacy liveness probe — lightweight check that the process is running. */
  app.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    let store_status = 'ok';
    try {
      getStore().exists(sessionDir);
    } catch {
      store_status = 'degraded';
    }

    const sp = typeof getStorageProvider === 'function' ? getStorageProvider() : null;
    reply.send({
      status: 'ok',
      version,
      uptime: Math.round(process.uptime()),
      store_status,
      storage_provider: sp ? sp.name || 'unknown' : 'none',
    });
  });
}
