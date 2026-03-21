import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { WorkspacesListResponse, WorkspaceDetailResponse } from '@/lib/api-types';

/** List all registered workspaces. */
export function useWorkspaces() {
  return useQuery({
    queryKey: queryKeys.workspaces.all,
    queryFn: () => apiGet<WorkspacesListResponse>('/workspaces'),
  });
}

/** Fetch workspace details and projects by workspace id. */
export function useWorkspaceDetail(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceId
      ? queryKeys.workspaces.detail(workspaceId)
      : queryKeys.workspaces.detail('_'),
    queryFn: () =>
      apiGet<WorkspaceDetailResponse>(`/workspaces/${encodeURIComponent(workspaceId ?? '')}`),
    enabled: Boolean(workspaceId),
  });
}
