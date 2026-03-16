// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Server-Sent Events (SSE) connection manager.
 * @module sse-manager
 */

import http from 'http';

export interface SSEManagerOptions {
  /** Heartbeat interval in milliseconds (default: 30000). */
  heartbeatMs?: number;
  /** Maximum concurrent SSE connections (default: 50). */
  maxClients?: number;
}

export interface SSEManager {
  /** Add a client response to the SSE pool. Sets up heartbeat and cleanup. */
  addClient(req: http.IncomingMessage, res: http.ServerResponse): boolean;
  /** Broadcast an event to all connected clients. */
  broadcast(event: string, data: Record<string, unknown>): void;
  /** Number of currently connected clients. */
  readonly size: number;
  /** Stop heartbeats and disconnect all clients. */
  destroy(): void;
}

export function createSSEManager(options?: SSEManagerOptions): SSEManager {
  const heartbeatMs = options?.heartbeatMs ?? 30_000;
  const maxClients = options?.maxClients ?? 50;

  const clients = new Set<http.ServerResponse>();
  const heartbeats = new Map<http.ServerResponse, ReturnType<typeof setInterval>>();

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

  function broadcast(event: string, data: Record<string, unknown>): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
      try {
        client.write(payload);
      } catch {
        removeClient(client);
      }
    }
  }

  function destroy(): void {
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
