/**
 * Governance hooks — TanStack Query wrappers for /api/v1/approvals/* and /api/v1/policies/*.
 * M10 / Issue #394, M22 / Policy-as-Code Governance
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  ApprovalsListResponse,
  ApprovalDecideResponse,
  PolicyListResponse,
  PolicyEvaluationResponse,
  ExceptionCreateResponse,
  PolicyUpdatePayload,
  PolicyUpdateResponse,
  PolicyPacksResponse,
  PolicySignalsResponse,
} from '@/lib/api-types';
import { useSSEAwareRefetchInterval } from '@/hooks/use-sse-aware-polling';

/** List pending approvals. */
export function useApprovals() {
  const refetchInterval = useSSEAwareRefetchInterval(15_000);
  return useQuery({
    queryKey: queryKeys.governance.approvals,
    queryFn: () => apiGet<ApprovalsListResponse>('/v1/approvals'),
    refetchInterval,
  });
}

/** Approve a pending request. */
export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, user }: { id: string; reason?: string; user?: string }) =>
      apiPost<ApprovalDecideResponse>(`/v1/approvals/${encodeURIComponent(id)}/approve`, {
        reason: reason ?? 'Approved via UI',
        user: user ?? 'web-user',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.governance.approvals }),
  });
}

/** Reject a pending request. */
export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, user }: { id: string; reason: string; user?: string }) =>
      apiPost<ApprovalDecideResponse>(`/v1/approvals/${encodeURIComponent(id)}/reject`, {
        reason,
        user: user ?? 'web-user',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.governance.approvals }),
  });
}

/* ── Policy hooks (M22) ── */

/** List all active policies. */
export function usePolicies() {
  return useQuery({
    queryKey: queryKeys.governance.policies,
    queryFn: () => apiGet<PolicyListResponse>('/v1/policies'),
  });
}

/** List policy packs. */
export function usePolicyPacks() {
  return useQuery({
    queryKey: queryKeys.governance.policyPacks,
    queryFn: () => apiGet<PolicyPacksResponse>('/v1/policies/packs'),
  });
}

/** Fetch policy signal checks. */
export function usePolicySignals() {
  return useQuery({
    queryKey: queryKeys.governance.policySignals,
    queryFn: () => apiGet<PolicySignalsResponse>('/v1/policies/signals'),
  });
}

/** Evaluate policies against the current context. */
export function usePolicyEvaluation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (context: {
      context_type: string;
      scope: string;
      checks: Record<string, boolean>;
    }) => apiPost<PolicyEvaluationResponse>('/v1/policies/evaluate', context),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.governance.policyEvaluation }),
  });
}

/** Create a policy exception. */
export function useCreateException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      policy_id: string;
      reason: string;
      approved_by: string;
      expires: string;
      scope_override?: string;
    }) => apiPost<ExceptionCreateResponse>('/v1/policies/exceptions', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.governance.policies }),
  });
}

export function useUpdatePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PolicyUpdatePayload) =>
      apiPost<PolicyUpdateResponse>('/v1/policies/update', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.governance.policies }),
  });
}
