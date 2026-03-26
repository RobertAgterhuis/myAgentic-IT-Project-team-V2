// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── Redis Pub/Sub SSE Manager (M33-003) ──────────────────────── *
 * Extends SSE broadcasting to work across multiple instances.     *
 * Events published to a Redis channel are received by all         *
 * instances and forwarded to their local SSE clients.             *
 * ─────────────────────────────────────────────────────────────── */

import http from 'http';
import type Redis from 'ioredis';
import { randomUUID } from 'crypto';
import type { SSEManager, SSEManagerOptions } from './sse-manager';

const CHANNEL = 'sse:broadcast';

export interface RedisPubSubSSEManagerOptions extends SSEManagerOptions {
  /** Redis publisher connection (shared). */
  publisher: Redis;
  /** Redis subscriber connection (dedicated — required by Redis). */
  subscriber: Redis;
}

/**
 * Create an SSE manager that broadcasts events both locally and
 * through Redis pub/sub for cross-instance delivery.
 */
export function createRedisPubSubSSEManager(options: RedisPubSubSSEManagerOptions): SSEManager {
  const heartbeatMs = options.heartbeatMs ?? 30_000;
  const maxClients = options.maxClients ?? 50;
  const { publisher, subscriber } = options;
  const origin = randomUUID();

  const clients = new Set<http.ServerResponse>();
  const heartbeats = new Map<http.ServerResponse, ReturnType<typeof setInterval>>();

  // Subscribe to the broadcast channel
  subscriber.subscribe(CHANNEL).catch(() => {
    // Silently ignore subscribe errors — local broadcast still works
  });

  const onMessage = (channel: string, message: string) => {
    if (channel !== CHANNEL) return;
    try {
      const { event, data, _origin } = JSON.parse(message);
      if (_origin === origin) return;
      if (typeof event !== 'string' || !event) return;
      if (!data || typeof data !== 'object' || Array.isArray(data)) return;
      // Forward to local SSE clients
      localBroadcast(event, data);
    } catch {
      // Ignore malformed messages
    }
  };

  subscriber.on('message', onMessage);

  function addClient(req: http.IncomingMessage, res: http.ServerResponse): boolean {
    if (clients.size >= maxClients) return false;

    clients.add(res);

    const timer = setInterval(() => {
      try {
        res.write(`:heartbeat ${new Date().toISOString()}\n\n`);
      } catch {
        removeClient(res);
      }
    }, heartbeatMs);

    heartbeats.set(res, timer);
    req.on('close', () => removeClient(res));
    return true;
  }

  function removeClient(res: http.ServerResponse): void {
    const timer = heartbeats.get(res);
    if (timer) clearInterval(timer);
    heartbeats.delete(res);
    clients.delete(res);
  }

  /** Local-only broadcast (no Redis publish). */
  function localBroadcast(event: string, data: Record<string, unknown>): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
      try {
        client.write(payload);
      } catch {
        removeClient(client);
      }
    }
  }

  /** Broadcast via Redis pub/sub (all instances receive it). */
  function broadcast(event: string, data: Record<string, unknown>): void {
    // Always deliver locally first so this instance does not depend on its
    // own subscriber health for user-visible SSE updates.
    localBroadcast(event, data);

    // Publish to Redis so peer instances receive the same event.
    const message = JSON.stringify({ event, data, _origin: origin });
    publisher.publish(CHANNEL, message).catch(() => {
      // Redis unavailable — peers miss the event, but the local node already delivered it.
    });
  }

  function destroy(): void {
    subscriber.removeListener('message', onMessage);
    subscriber.unsubscribe(CHANNEL).catch(() => {});
    for (const timer of heartbeats.values()) clearInterval(timer);
    heartbeats.clear();
    clients.clear();
  }

  return {
    addClient,
    broadcast,
    get size() {
      return clients.size;
    },
    destroy,
  };
}
