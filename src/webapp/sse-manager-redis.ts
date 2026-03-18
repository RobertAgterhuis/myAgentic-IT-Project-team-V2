// Copyright (c) 2026 Robert Agterhuis. MIT License.

/* ── Redis Pub/Sub SSE Manager (M33-003) ──────────────────────── *
 * Extends SSE broadcasting to work across multiple instances.     *
 * Events published to a Redis channel are received by all         *
 * instances and forwarded to their local SSE clients.             *
 * ─────────────────────────────────────────────────────────────── */

import http from 'http';
import type Redis from 'ioredis';
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

  const clients = new Set<http.ServerResponse>();
  const heartbeats = new Map<http.ServerResponse, ReturnType<typeof setInterval>>();

  // Subscribe to the broadcast channel
  subscriber.subscribe(CHANNEL).catch(() => {
    // Silently ignore subscribe errors — local broadcast still works
  });

  subscriber.on('message', (channel: string, message: string) => {
    if (channel !== CHANNEL) return;
    try {
      const { event, data, _origin } = JSON.parse(message);
      // Forward to local SSE clients
      localBroadcast(event, data);
    } catch {
      // Ignore malformed messages
    }
  });

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
    // Publish to Redis — all instances (including this one) receive it
    const message = JSON.stringify({ event, data });
    publisher.publish(CHANNEL, message).catch(() => {
      // Redis unavailable — fall back to local-only broadcast
      localBroadcast(event, data);
    });
  }

  function destroy(): void {
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
