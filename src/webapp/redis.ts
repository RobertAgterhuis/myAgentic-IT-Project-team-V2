// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── Redis Connection Factory (M33-002) ───────────────────────── *
 * Shared lazy Redis connection for BullMQ, pub/sub, and sessions. *
 * Returns null when REDIS_URL is not configured (graceful fallback). *
 * ─────────────────────────────────────────────────────────────── */

import Redis from 'ioredis';

let _redis: Redis | null = null;

/**
 * Get or create a shared Redis connection.
 * Returns null when REDIS_URL is not set.
 */
export function getRedisConnection(url?: string): Redis | null {
  const redisUrl = url ?? process.env.REDIS_URL;
  if (!redisUrl) return null;
  if (_redis) return _redis;

  _redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: true,
    lazyConnect: false,
  });

  return _redis;
}

/**
 * Create a new independent Redis connection (for pub/sub subscribers
 * that need a dedicated connection).
 */
export function createRedisConnection(url?: string): Redis | null {
  const redisUrl = url ?? process.env.REDIS_URL;
  if (!redisUrl) return null;

  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  });
}

/** Close the shared connection (for graceful shutdown). */
export async function closeRedisConnection(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}

/** Health check — ping Redis and return latency. */
export async function redisHealthCheck(
  redis: Redis
): Promise<{ status: string; latencyMs: number }> {
  const start = Date.now();
  try {
    await redis.ping();
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch {
    return { status: 'unhealthy', latencyMs: Date.now() - start };
  }
}
