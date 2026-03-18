/**
 * Agent hooks — TanStack Query wrappers for /api/agents/*.
 * M15 / Issue #M15-026, M31-001
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/components/ui/toast-system';
import type {
  AgentsListResponse,
  AgentDetailResponse,
  AgentExecutePayload,
  AgentExecuteResponse,
} from '@/lib/api-types';

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

/** Execute an agent on demand (M31-001). */
export function useExecuteAgent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, payload }: { agentId: string; payload?: AgentExecutePayload }) =>
      apiPost<AgentExecuteResponse>(`/agents/${encodeURIComponent(agentId)}/execute`, payload),

    onSuccess: (data) => {
      const name = data.execution.agent_name;
      if (data.execution.status === 'completed') {
        showToast.success(`Agent "${name}" executed successfully`);
      } else {
        showToast.error(`Agent "${name}" execution failed: ${data.execution.error ?? 'unknown'}`);
      }
      qc.invalidateQueries({ queryKey: queryKeys.agents.all });
      qc.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },

    onError: (err: Error) => {
      showToast.error(`Agent execution failed: ${err.message}`);
    },
  });
}
