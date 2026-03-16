/**
 * Analytics hooks — TanStack Query wrappers for /api/v1/analytics/*.
 * M7 / Issue #376
 */
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  TimestampedResponse,
  AnalyticsTrendsData,
  AgentPerformanceStats,
  MetricSummary,
} from '@/lib/api-types';

/** Velocity + DORA + sprint trend data. */
export function useAnalyticsTrends() {
  return useQuery({
    queryKey: queryKeys.analytics.trends,
    queryFn: () => apiGet<TimestampedResponse<AnalyticsTrendsData>>('/v1/analytics/trends'),
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}

/** Agent performance statistics. */
export function useAnalyticsAgents() {
  return useQuery({
    queryKey: queryKeys.analytics.agents,
    queryFn: () =>
      apiGet<{ ok: true; data: AgentPerformanceStats[]; count: number; timestamp: string }>(
        '/v1/analytics/agents'
      ),
    select: (res) => res.data,
  });
}

/** List all available metric series. */
export function useAnalyticsMetrics() {
  return useQuery({
    queryKey: queryKeys.analytics.metrics,
    queryFn: () =>
      apiGet<{ ok: true; data: MetricSummary[]; count: number; timestamp: string }>(
        '/v1/analytics/metrics'
      ),
    select: (res) => res.data,
  });
}
