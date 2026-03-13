/**
 * Progress hook — TanStack Query wrapper for /api/progress.
 */
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { ProgressResponse } from '@/lib/api-types';

/** Pipeline progress — phase/agent status, sprint statuses. */
export function useProgress() {
  return useQuery({
    queryKey: queryKeys.progress.all,
    queryFn: () => apiGet<ProgressResponse>('/progress'),
    refetchInterval: 5_000,
  });
}
