/**
 * Session hooks — TanStack Query wrappers for /api/sessions/*.
 * M15 / Issue #M15-026
 */
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  SessionsListResponse,
  SessionDetailResponse,
  TimelineResponse,
} from '@/lib/api-types';
import { useSSEAwareRefetchInterval } from '@/hooks/use-sse-aware-polling';

/** List all sessions, newest first. */
export function useSessions() {
  const refetchInterval = useSSEAwareRefetchInterval(10_000);
  return useQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: () => apiGet<SessionsListResponse>('/sessions'),
    refetchInterval,
  });
}

/** Get a single session with agents and timeline. */
export function useSession(id: string) {
  const refetchInterval = useSSEAwareRefetchInterval(5_000);
  return useQuery({
    queryKey: queryKeys.sessions.detail(id),
    queryFn: () => apiGet<SessionDetailResponse>(`/sessions/${encodeURIComponent(id)}`),
    enabled: !!id,
    refetchInterval,
  });
}

/** Get timeline events for a session. */
export function useSessionTimeline(id: string) {
  const refetchInterval = useSSEAwareRefetchInterval(5_000);
  return useQuery({
    queryKey: queryKeys.sessions.timeline(id),
    queryFn: () => apiGet<TimelineResponse>(`/sessions/${encodeURIComponent(id)}/timeline`),
    enabled: !!id,
    refetchInterval,
  });
}
