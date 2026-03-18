/**
 * Agent hooks — TanStack Query wrappers for /api/agents/*.
 * M15 / Issue #M15-026, M31-001 … M31-009
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
  AgentJobStatusResponse,
  AgentJobResultResponse,
  AgentExecutionHistoryResponse,
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

/** Poll job status (M31-002). Polls every 2s while running. */
export function useAgentJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['agents', 'job', jobId, 'status'],
    queryFn: () =>
      apiGet<AgentJobStatusResponse>(`/agents/jobs/${encodeURIComponent(jobId!)}/status`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'running' ? 2_000 : false;
    },
  });
}

/** Get execution result (M31-004). */
export function useAgentJobResult(jobId: string | null) {
  return useQuery({
    queryKey: ['agents', 'job', jobId, 'result'],
    queryFn: () =>
      apiGet<AgentJobResultResponse>(`/agents/jobs/${encodeURIComponent(jobId!)}/result`),
    enabled: !!jobId,
  });
}

/** Cancel a running execution (M31-005). */
export function useCancelAgentJob() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) =>
      apiPost<{ ok: true; message: string }>(`/agents/jobs/${encodeURIComponent(jobId)}/cancel`),

    onSuccess: (_data, jobId) => {
      showToast.info(`Execution cancelled`);
      qc.invalidateQueries({ queryKey: ['agents', 'job', jobId] });
      qc.invalidateQueries({ queryKey: queryKeys.agents.all });
    },

    onError: (err: Error) => {
      showToast.error(`Cancel failed: ${err.message}`);
    },
  });
}

/** List execution history (M31-009). */
export function useExecutionHistory() {
  return useQuery({
    queryKey: ['agents', 'executions'],
    queryFn: () => apiGet<AgentExecutionHistoryResponse>('/agents/executions'),
    refetchInterval: 10_000,
  });
}
