/**
 * Dashboard hooks — TanStack Query wrappers for /api/dashboard/*.
 * Covers health, metrics, activity, and stats cards.
 */
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  TimestampedResponse,
  DashboardHealth,
  DashboardMetrics,
  ActivityEntry,
  DashboardStats,
} from '@/lib/api-types';

/** Project health indicators — quality, coverage, builds, deployment. */
export function useDashboardHealth() {
  return useQuery({
    queryKey: queryKeys.dashboard.health,
    queryFn: () => apiGet<TimestampedResponse<DashboardHealth>>('/dashboard/health'),
    select: (res) => res.data,
  });
}

/** Key metrics — HTTP requests, error rate, response time. */
export function useDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics,
    queryFn: () => apiGet<TimestampedResponse<DashboardMetrics>>('/dashboard/metrics'),
    select: (res) => res.data,
    refetchInterval: 30_000,
  });
}

/** Recent activity timeline. */
export function useDashboardActivity() {
  return useQuery({
    queryKey: queryKeys.dashboard.activity,
    queryFn: () => apiGet<TimestampedResponse<ActivityEntry[]>>('/dashboard/activity'),
    select: (res) => res.data,
  });
}

/** Quick stats — files, team, sprint, stars. */
export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: () => apiGet<TimestampedResponse<DashboardStats>>('/dashboard/stats'),
    select: (res) => res.data,
  });
}
