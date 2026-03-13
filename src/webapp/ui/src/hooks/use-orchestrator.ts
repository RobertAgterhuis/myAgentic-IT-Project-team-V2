/**
 * Orchestrator hooks — TanStack Query wrappers for /api/orchestrator/*.
 * Covers status, advance, gates, errors, queue, and run history.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/components/ui/toast-system';
import type {
  OrchestratorStatus,
  AdvanceOrchestratorPayload,
  AdvanceOrchestratorResponse,
  OrchestratorErrorPayload,
  OrchestratorResetPayload,
  ValidateGatePayload,
  ValidateGateResponse,
  OrchestratorCommandPayload,
  SprintGatePayload,
  SprintGateResponse,
  CommandQueueResponse,
  OkResponse,
} from '@/lib/api-types';

/** Current orchestrator state — polled frequently. */
export function useOrchestratorStatus() {
  return useQuery({
    queryKey: queryKeys.orchestrator.status,
    queryFn: () => apiGet<OrchestratorStatus>('/orchestrator/status'),
    refetchInterval: 5_000,
  });
}

/** Run history. */
export function useOrchestratorRunHistory() {
  return useQuery({
    queryKey: queryKeys.orchestrator.runHistory,
    queryFn: () => apiGet<unknown[]>('/orchestrator/run-history'),
  });
}

/** Advance the state machine. */
export function useAdvanceOrchestrator() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload?: AdvanceOrchestratorPayload) =>
      apiPost<AdvanceOrchestratorResponse>('/orchestrator/advance', payload),

    onSuccess: () => {
      showToast.success('Orchestrator advanced');
      qc.invalidateQueries({ queryKey: queryKeys.orchestrator.status });
      qc.invalidateQueries({ queryKey: queryKeys.progress.all });
    },
  });
}

/** Force error state. */
export function useOrchestratorError() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: OrchestratorErrorPayload) =>
      apiPost<OkResponse>('/orchestrator/error', payload),

    onSuccess: () => {
      showToast.warning('Orchestrator forced to ERROR state');
      qc.invalidateQueries({ queryKey: queryKeys.orchestrator.status });
    },
  });
}

/** Recover from error. */
export function useOrchestratorRecover() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost<OkResponse>('/orchestrator/recover'),

    onSuccess: () => {
      showToast.success('Orchestrator recovered');
      qc.invalidateQueries({ queryKey: queryKeys.orchestrator.status });
    },
  });
}

/** Reset orchestrator with a new mode. */
export function useOrchestratorReset() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: OrchestratorResetPayload) =>
      apiPost<OkResponse>('/orchestrator/reset', payload),

    onSuccess: () => {
      showToast.success('Orchestrator reset');
      qc.invalidateQueries({ queryKey: queryKeys.orchestrator.status });
      qc.invalidateQueries({ queryKey: queryKeys.progress.all });
    },
  });
}

/** Stop orchestrator. */
export function useOrchestratorStop() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost<OkResponse>('/orchestrator/stop'),

    onSuccess: () => {
      showToast.info('Orchestrator stopped');
      qc.invalidateQueries({ queryKey: queryKeys.orchestrator.status });
    },
  });
}

/** Validate a phase gate. */
export function useValidateGate() {
  return useMutation({
    mutationFn: (payload: ValidateGatePayload) =>
      apiPost<ValidateGateResponse>('/orchestrator/validate-gate', payload),

    onSuccess: (data) => {
      const label = data.verdict === 'APPROVED' ? 'Gate approved' : `Gate: ${data.verdict}`;
      showToast.info(label);
    },
  });
}

/** Execute an orchestrator command. */
export function useOrchestratorCommand() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: OrchestratorCommandPayload) =>
      apiPost<OkResponse>('/orchestrator/command', payload),

    onSuccess: () => {
      showToast.success('Command sent');
      qc.invalidateQueries({ queryKey: queryKeys.orchestrator.status });
      qc.invalidateQueries({ queryKey: queryKeys.orchestrator.queue });
    },
  });
}

/** Sprint gate check. */
export function useSprintGate() {
  return useMutation({
    mutationFn: (payload: SprintGatePayload) =>
      apiPost<SprintGateResponse>('/orchestrator/sprint-gate', payload),

    onSuccess: (data) => {
      const label =
        data.verdict === 'READY'
          ? `Sprint ${data.summary.sprintId} ready`
          : `Sprint gate: ${data.verdict} (${data.summary.totalBlockers} blockers)`;
      showToast.info(label);
    },
  });
}

/** Command queue (latest command + full queue). */
export function useOrchestratorQueue() {
  return useQuery({
    queryKey: queryKeys.orchestrator.queue,
    queryFn: () => apiGet<CommandQueueResponse>('/command'),
    refetchInterval: 5_000,
  });
}

/** Queue a new command. */
export function useQueueCommand() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      command: string;
      project?: string;
      description?: string;
      scope?: string;
      brief?: string;
    }) =>
      apiPost<OkResponse & { clipboard_text: string; brief_saved: boolean }>('/command', payload),

    onSuccess: (data) => {
      showToast.success('Command queued');
      if (data.brief_saved) showToast.info('Project brief saved');
      qc.invalidateQueries({ queryKey: queryKeys.orchestrator.queue });
    },
  });
}

/** Fetch all gates (used by Gates page). */
export function useGates() {
  // Gates data comes from orchestrator status + sprint gate checks.
  // We poll the orchestrator status which includes gate info.
  return useOrchestratorStatus();
}

/** Errors — derived from orchestrator status (error messages are part of status). */
export function useOrchestratorErrors() {
  return useOrchestratorStatus();
}
