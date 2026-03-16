/**
 * Governance hooks — TanStack Query wrappers for /api/v1/approvals/*.
 * M10 / Issue #394
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { ApprovalsListResponse, ApprovalDecideResponse } from '@/lib/api-types';

/** List pending approvals. */
export function useApprovals() {
  return useQuery({
    queryKey: queryKeys.governance.approvals,
    queryFn: () => apiGet<ApprovalsListResponse>('/v1/approvals'),
    refetchInterval: 15_000,
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
