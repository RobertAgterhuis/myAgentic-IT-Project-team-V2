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

/** List all sessions, newest first. */
export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions.all,
    queryFn: () => apiGet<SessionsListResponse>('/sessions'),
    refetchInterval: 10_000,
  });
}

/** Get a single session with agents and timeline. */
export function useSession(id: string) {
  return useQuery({
    queryKey: queryKeys.sessions.detail(id),
    queryFn: () => apiGet<SessionDetailResponse>(`/sessions/${encodeURIComponent(id)}`),
    enabled: !!id,
    refetchInterval: 5_000,
  });
}

/** Get timeline events for a session. */
export function useSessionTimeline(id: string) {
  return useQuery({
    queryKey: queryKeys.sessions.timeline(id),
    queryFn: () => apiGet<TimelineResponse>(`/sessions/${encodeURIComponent(id)}/timeline`),
    enabled: !!id,
    refetchInterval: 5_000,
  });
}
