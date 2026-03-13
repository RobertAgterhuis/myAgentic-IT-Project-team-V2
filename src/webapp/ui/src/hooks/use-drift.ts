/**
 * Drift detection hook — TanStack Query wrapper for /api/drift.
 */
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { DriftResponse } from '@/lib/api-types';

/** Detect session-state vs GitHub board drift. */
export function useDriftDetection() {
  return useQuery({
    queryKey: queryKeys.drift.all,
    queryFn: () => apiGet<DriftResponse>('/drift'),
    staleTime: 60_000,
  });
}
