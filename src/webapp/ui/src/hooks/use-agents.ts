/**
 * Agent hooks — TanStack Query wrappers for /api/agents/*.
 * M15 / Issue #M15-026
 */
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { AgentsListResponse, AgentDetailResponse } from '@/lib/api-types';

/** List all tracked agents. */
export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents.all,
    queryFn: () => apiGet<AgentsListResponse>('/agents'),
    refetchInterval: 10_000,
  });
}

/** Get a single agent detail. */
export function useAgent(id: string) {
  return useQuery({
    queryKey: queryKeys.agents.detail(id),
    queryFn: () => apiGet<AgentDetailResponse>(`/agents/${encodeURIComponent(id)}`),
    enabled: !!id,
  });
}
