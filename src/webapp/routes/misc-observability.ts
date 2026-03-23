// Copyright (c) 2026 Robert Agterhuis. MIT License.

import fs from 'node:fs';
import path from 'node:path';
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

interface ChatGroundingMetricsSummary {
  environment: string;
  total_chat_requests: number;
  retrieval_latency_p95_ms: number;
  first_token_latency_p95_ms: number;
  avg_citation_count: number;
  fallback_rate: number;
  no_match_rate: number;
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
  addClient(request: unknown, response: unknown): void;
}

interface RagStoreLike {
  listCollections?: () => Array<{ id: string }>;
  getCollectionFreshnessStats?: (collectionId: string) => {
    indexedFiles: number;
    lastIndexedAt: string | null;
  };
}

interface RagFreshnessCollection {
  collection_id: string;
  status: 'healthy' | 'stale' | 'missing' | 'unknown';
  indexed_files: number;
  last_indexed_at: string | null;
  source_paths: string[];
  source_newest_mtime: string | null;
  lag_seconds: number | null;
}

export interface RegisterObservabilityRoutesOptions {
  app: FastifyInstance;
  sseManager: SseManagerLike;
  metrics: MetricsState;
  cache: CacheLike;
  computePercentiles: (times: number[]) => { p50: number; p95: number; p99: number };
  flushMetrics: () => void;
  projectRoot: string;
  businessDocs: string;
  ragStore?: RagStoreLike;
}

export function registerObservabilityRoutes(options: RegisterObservabilityRoutesOptions): void {
  const { app, sseManager, metrics, cache, computePercentiles, flushMetrics } = options;
  const ragFreshnessThresholdSec = Number(process.env.RAG_FRESHNESS_STALE_SEC || 3600);

  function newestMtimeIso(paths: string[]): string | null {
    let newestMs = 0;
    for (const p of paths) {
      try {
        if (!fs.existsSync(p)) continue;
        const stat = fs.statSync(p);
        const currentMs = stat.mtimeMs;
        if (currentMs > newestMs) newestMs = currentMs;
      } catch {
        // Ignore inaccessible path and continue best-effort.
      }
    }
    return newestMs > 0 ? new Date(newestMs).toISOString() : null;
  }

  function buildRagFreshnessCollections(workspaceId: string): RagFreshnessCollection[] {
    const businessDocs = options.businessDocs;
    const monitored: Array<{ id: string; sourcePaths: string[] }> = [
      {
        id: 'decisions',
        sourcePaths: [
          path.join(businessDocs, 'decisions.md'),
          path.join(businessDocs, 'decisions'),
        ],
      },
      {
        id: 'codebase',
        sourcePaths: [path.join(options.projectRoot, 'src')],
      },
      {
        id: 'phase-outputs',
        sourcePaths: [
          path.join(businessDocs, 'Phase1-Business'),
          path.join(businessDocs, 'Phase2-Tech'),
          path.join(businessDocs, 'Phase3-UX'),
          path.join(businessDocs, 'session'),
          path.join(businessDocs, 'synthesis'),
        ],
      },
      {
        id: `sprint-artifacts--${workspaceId}`,
        sourcePaths: [path.join(businessDocs, 'session'), path.join(businessDocs, 'metrics')],
      },
    ];

    const available = new Set((options.ragStore?.listCollections?.() || []).map((c) => c.id));

    return monitored.map((entry) => {
      const sourceNewest = newestMtimeIso(entry.sourcePaths);
      const freshness = options.ragStore?.getCollectionFreshnessStats?.(entry.id) || {
        indexedFiles: 0,
        lastIndexedAt: null,
      };

      const present = available.has(entry.id);
      const lagSeconds =
        sourceNewest && freshness.lastIndexedAt
          ? Math.max(
              0,
              Math.round((Date.parse(sourceNewest) - Date.parse(freshness.lastIndexedAt)) / 1000)
            )
          : null;

      const status: RagFreshnessCollection['status'] = !present
        ? 'missing'
        : lagSeconds === null
          ? 'unknown'
          : lagSeconds > ragFreshnessThresholdSec
            ? 'stale'
            : 'healthy';

      return {
        collection_id: entry.id,
        status,
        indexed_files: freshness.indexedFiles,
        last_indexed_at: freshness.lastIndexedAt,
        source_paths: entry.sourcePaths.map((p) =>
          path.relative(options.projectRoot, p).replace(/\\/g, '/')
        ),
        source_newest_mtime: sourceNewest,
        lag_seconds: lagSeconds,
      };
    });
  }

  function buildChatGroundingMetricsSummary(
    perEndpoint: MetricsState['perEndpoint']
  ): ChatGroundingMetricsSummary {
    const environment = process.env.NODE_ENV || 'development';
    const retrieval = perEndpoint['CHAT /grounding/retrieval'];
    const firstToken = perEndpoint['CHAT /message/first-token-latency'];
    const citationCount = perEndpoint['CHAT /message/citation-count'];

    const fallbackCount = Object.entries(perEndpoint)
      .filter(([endpoint]) => endpoint.startsWith('CHAT /message/fallback/'))
      .reduce((sum, [, value]) => sum + value.count, 0);

    const noMatchCount = perEndpoint['CHAT /message/no-match']?.count || 0;
    const totalChatRequests = firstToken?.count || 0;
    const retrievalPcts = computePercentiles(retrieval?.times || []);
    const firstTokenPcts = computePercentiles(firstToken?.times || []);
    const citations = citationCount?.times || [];
    const avgCitationCount =
      citations.length > 0
        ? citations.reduce((sum, value) => sum + value, 0) / citations.length
        : 0;

    return {
      environment,
      total_chat_requests: totalChatRequests,
      retrieval_latency_p95_ms: retrievalPcts.p95,
      first_token_latency_p95_ms: firstTokenPcts.p95,
      avg_citation_count: +avgCitationCount.toFixed(3),
      fallback_rate: totalChatRequests > 0 ? +(fallbackCount / totalChatRequests).toFixed(4) : 0,
      no_match_rate: totalChatRequests > 0 ? +(noMatchCount / totalChatRequests).toFixed(4) : 0,
    };
  }

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
      chat_grounding: {
        active_environment: string;
        per_environment: Record<string, ChatGroundingMetricsSummary>;
      };
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
      chat_grounding: {
        active_environment: process.env.NODE_ENV || 'development',
        per_environment: {},
      },
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

    const chatSummary = buildChatGroundingMetricsSummary(metrics.perEndpoint);
    result.chat_grounding.active_environment = chatSummary.environment;
    result.chat_grounding.per_environment[chatSummary.environment] = chatSummary;

    reply.send(result);
  });

  app.post('/api/metrics/flush', async (_request: FastifyRequest, reply: FastifyReply) => {
    flushMetrics();
    reply.send({ ok: true, flushed_at: new Date().toISOString() });
  });

  app.get(
    '/api/v1/observability/rag-freshness',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const workspaceId =
        String((request.query as { workspace_id?: string })?.workspace_id || 'default')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, '-') || 'default';

      const collections = buildRagFreshnessCollections(workspaceId);
      const missing = collections.filter((c) => c.status === 'missing').length;
      const stale = collections.filter((c) => c.status === 'stale').length;
      const healthy = collections.filter((c) => c.status === 'healthy').length;

      return reply.send({
        ok: true,
        generated_at: new Date().toISOString(),
        workspace_id: workspaceId,
        summary: {
          total_collections: collections.length,
          healthy_collections: healthy,
          stale_collections: stale,
          missing_collections: missing,
          stale_threshold_seconds: ragFreshnessThresholdSec,
        },
        collections,
      });
    }
  );
}
