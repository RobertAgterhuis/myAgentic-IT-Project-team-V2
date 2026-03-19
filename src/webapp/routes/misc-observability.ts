// Copyright (c) 2026 Robert Agterhuis. MIT License.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { errorResponse } from '../utils/errors';
import { structuredLog, setSecurityHeaders } from '../middleware';

const MAX_SSE_CLIENTS = 50;

interface MetricsEndpointData {
  count: number;
  times: number[];
}

interface MetricsState {
  startedAt: number;
  requestCount: number;
  errorCount: number;
  responseTimes: number[];
  fileOpsCount: number;
  perEndpoint: Record<string, MetricsEndpointData>;
}

interface CacheStats {
  hits?: number;
  misses?: number;
}

interface CacheLike {
  stats?: () => CacheStats;
}

interface SseManagerLike {
  size: number;
  addClient: (request: unknown, response: unknown) => void;
}

export interface RegisterObservabilityRoutesOptions {
  app: FastifyInstance;
  sseManager: SseManagerLike;
  metrics: MetricsState;
  cache: CacheLike;
  computePercentiles: (times: number[]) => { p50: number; p95: number; p99: number };
  flushMetrics: () => void;
}

export function registerObservabilityRoutes(options: RegisterObservabilityRoutesOptions): void {
  const { app, sseManager, metrics, cache, computePercentiles, flushMetrics } = options;

  app.get('/api/events', async (request: FastifyRequest, reply: FastifyReply) => {
    if (sseManager.size >= MAX_SSE_CLIENTS) {
      return reply.code(503).send(errorResponse('SSE_LIMIT', 'Too many SSE connections'));
    }

    const res = reply.raw;
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(
      `event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`
    );
    sseManager.addClient(request.raw, res);
    structuredLog('info', 'sse_client_connected', { clients: sseManager.size });
    reply.hijack();
  });

  app.get('/api/metrics', async (_request: FastifyRequest, reply: FastifyReply) => {
    const uptimeS = Math.round((Date.now() - metrics.startedAt) / 1000);
    const pcts = computePercentiles(metrics.responseTimes);
    const cacheStats = cache.stats ? cache.stats() : { hits: 0, misses: 0 };
    const totalCache = (cacheStats.hits || 0) + (cacheStats.misses || 0);

    const result: {
      uptime_seconds: number;
      request_count: number;
      error_count: number;
      error_rate: number;
      response_time_p50: number;
      response_time_p95: number;
      response_time_p99: number;
      sse_connections: number;
      file_ops_count: number;
      cache_hit_ratio: number;
      per_endpoint: Record<string, { count: number; p50: number; p95: number; p99: number }>;
    } = {
      uptime_seconds: uptimeS,
      request_count: metrics.requestCount,
      error_count: metrics.errorCount,
      error_rate:
        metrics.requestCount > 0 ? +(metrics.errorCount / metrics.requestCount).toFixed(4) : 0,
      response_time_p50: pcts.p50,
      response_time_p95: pcts.p95,
      response_time_p99: pcts.p99,
      sse_connections: sseManager.size,
      file_ops_count: metrics.fileOpsCount,
      cache_hit_ratio: totalCache > 0 ? +((cacheStats.hits || 0) / totalCache).toFixed(4) : 0,
      per_endpoint: {},
    };

    for (const [ep, data] of Object.entries(metrics.perEndpoint)) {
      const epPcts = computePercentiles(data.times);
      result.per_endpoint[ep] = {
        count: data.count,
        p50: epPcts.p50,
        p95: epPcts.p95,
        p99: epPcts.p99,
      };
    }

    reply.send(result);
  });

  app.post('/api/metrics/flush', async (_request: FastifyRequest, reply: FastifyReply) => {
    flushMetrics();
    reply.send({ ok: true, flushed_at: new Date().toISOString() });
  });
}
