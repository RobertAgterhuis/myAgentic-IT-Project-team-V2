/**
 * Progress hook — TanStack Query wrapper for /api/progress.
 */
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { ProgressResponse } from '@/lib/api-types';
import { useSSEAwareRefetchInterval } from '@/hooks/use-sse-aware-polling';

/** Pipeline progress — phase/agent status, sprint statuses. */
export function useProgress() {
  const refetchInterval = useSSEAwareRefetchInterval(5_000);
  return useQuery({
    queryKey: queryKeys.progress.all,
    queryFn: () => apiGet<ProgressResponse>('/progress'),
    refetchInterval,
  });
}
