/**
 * Cockpit hooks — TanStack Query wrappers for /api/v1/cockpit/* endpoints.
 * M27 / Operational Cockpit UI
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  CockpitHealthResponse,
  DependencyGraphResponse,
  ProvenanceResponse,
  ProvenanceQueryParams,
  RootCauseResponse,
  ApprovalDetailResponse,
  ApprovalHistoryResponse,
  ApprovalDecideResponse,
} from '@/lib/api-types';

/** Confidence scores — session health, sprint readiness, agent confidence. */
export function useCockpitHealth() {
  return useQuery({
    queryKey: queryKeys.cockpit.health,
    queryFn: () => apiGet<CockpitHealthResponse>('/v1/cockpit/health'),
    refetchInterval: 15_000,
  });
}

/** Dependency graph — decisions → gates → sprints. */
export function useDependencyGraph() {
  return useQuery({
    queryKey: queryKeys.cockpit.dependencies,
    queryFn: () => apiGet<DependencyGraphResponse>('/v1/cockpit/dependencies'),
    refetchInterval: 30_000,
  });
}

/** Decision provenance feed across human overrides and machine governance events. */
export function useDecisionProvenance(params?: ProvenanceQueryParams) {
  const queryParams = params
    ? {
        actor_type: params.actor_type,
        decision_type: params.decision_type,
        source: params.source,
        from: params.from,
        to: params.to,
        page: params.page,
        page_size: params.page_size,
      }
    : undefined;

  return useQuery({
    queryKey: queryKeys.cockpit.provenance(
      params
        ? {
            actorType: params.actor_type,
            decisionType: params.decision_type,
            source: params.source,
            from: params.from,
            to: params.to,
            page: params.page,
            pageSize: params.page_size,
          }
        : undefined
    ),
    queryFn: () => apiGet<ProvenanceResponse>('/v1/cockpit/provenance', queryParams),
    refetchInterval: 30_000,
  });
}

/** Root-cause analysis items, optionally scoped to a session. */
export function useRootCause(sessionId?: string) {
  const params = sessionId ? { session_id: sessionId } : undefined;
  return useQuery({
    queryKey: queryKeys.cockpit.rootCause(sessionId),
    queryFn: () => apiGet<RootCauseResponse>('/v1/cockpit/root-cause', params),
    refetchInterval: 30_000,
  });
}

/** Single approval detail with context and risk. */
export function useApprovalDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.cockpit.approvalDetail(id),
    queryFn: () => apiGet<ApprovalDetailResponse>(`/v1/approvals/${encodeURIComponent(id)}/detail`),
    enabled: !!id,
  });
}

/** Full approval history across all items. */
export function useApprovalHistory() {
  return useQuery({
    queryKey: queryKeys.cockpit.approvalHistory,
    queryFn: () => apiGet<ApprovalHistoryResponse>('/v1/approvals/history'),
  });
}

/** Approve with required comment (M27-005). */
export function useApproveWithComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, user }: { id: string; reason: string; user?: string }) =>
      apiPost<ApprovalDecideResponse>(`/v1/approvals/${encodeURIComponent(id)}/approve`, {
        reason,
        user: user ?? 'web-user',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.governance.approvals });
      queryClient.invalidateQueries({ queryKey: queryKeys.cockpit.approvalHistory });
    },
  });
}

/** Reject with required comment (M27-005). */
export function useRejectWithComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, user }: { id: string; reason: string; user?: string }) =>
      apiPost<ApprovalDecideResponse>(`/v1/approvals/${encodeURIComponent(id)}/reject`, {
        reason,
        user: user ?? 'web-user',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.governance.approvals });
      queryClient.invalidateQueries({ queryKey: queryKeys.cockpit.approvalHistory });
    },
  });
}
