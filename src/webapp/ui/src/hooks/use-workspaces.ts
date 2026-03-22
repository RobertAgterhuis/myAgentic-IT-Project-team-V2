/**
 * Workspaces CRUD hooks — TanStack Query wrappers for /api/workspaces/* (M25-014).
 *
 * Queries:
 *   - useWorkspaces() — List all workspaces
 *   - useWorkspaceDetail() — Get workspace + projects
 *
 * Mutations:
 *   - useCreateWorkspace() — Create new workspace
 *   - useUpdateWorkspace() — Update workspace name/owner
 *   - useDeleteWorkspace() — Delete workspace
 *   - useAddRepository() — Add repository to workspace
 *   - useRemoveRepository() — Remove repository from workspace
 *   - useCreateProject() — Create project in workspace
 *   - useUpdateProject() — Update project
 *   - useDeleteProject() — Delete project
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/components/ui/toast-system';
import type {
  WorkspacesListResponse,
  WorkspaceDetailResponse,
  WorkspaceSummary,
  WorkspaceProject,
  OkResponse,
} from '@/lib/api-types';

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

/** Create a new workspace. */
export function useCreateWorkspace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: { id: string; name: string; owner: string }) =>
      apiPost<OkResponse & { workspace: WorkspaceSummary }>('/workspaces', payload),

    onSuccess: (data) => {
      showToast.success(`Workspace "${data.workspace.name}" created`);
      qc.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });
}

/** Update workspace name or owner. */
export function useUpdateWorkspace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: { workspaceId: string; updates: { name?: string; owner?: string } }) =>
      apiPut<OkResponse & { workspace: WorkspaceSummary }>(
        `/workspaces/${encodeURIComponent(payload.workspaceId)}`,
        payload.updates
      ),

    onSuccess: (data) => {
      showToast.success('Workspace updated');
      qc.invalidateQueries({ queryKey: queryKeys.workspaces.all });
      qc.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(data.workspace.id),
      });
    },
  });
}

/** Delete a workspace. */
export function useDeleteWorkspace() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) =>
      apiDelete<OkResponse>(`/workspaces/${encodeURIComponent(workspaceId)}`),

    onSuccess: () => {
      showToast.success('Workspace deleted');
      qc.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });
}

/** Add a repository to a workspace. */
export function useAddRepository() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      workspaceId: string;
      repository: {
        id: string;
        name: string;
        provider: 'github' | 'azure-devops' | 'gitlab' | 'local';
        url: string;
        defaultBranch: string;
        tags?: string[];
      };
    }) =>
      apiPost<OkResponse & { workspace: WorkspaceSummary }>(
        `/workspaces/${encodeURIComponent(payload.workspaceId)}/repositories`,
        payload.repository
      ),

    onSuccess: (_data, variables) => {
      showToast.success('Repository added');
      qc.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.workspaceId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });
}

/** Remove a repository from a workspace. */
export function useRemoveRepository() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: { workspaceId: string; repositoryId: string }) =>
      apiDelete<OkResponse>(
        `/workspaces/${encodeURIComponent(payload.workspaceId)}/repositories/${encodeURIComponent(payload.repositoryId)}`
      ),

    onSuccess: (_data, variables) => {
      showToast.success('Repository removed');
      qc.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.workspaceId),
      });
      qc.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
  });
}

/** Create a project in a workspace. */
export function useCreateProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      workspaceId: string;
      project: { id: string; name: string; repositories?: string[] };
    }) =>
      apiPost<OkResponse & { project: WorkspaceProject }>(
        `/workspaces/${encodeURIComponent(payload.workspaceId)}/projects`,
        payload.project
      ),

    onSuccess: (_data, variables) => {
      showToast.success('Project created');
      qc.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.workspaceId),
      });
    },
  });
}

/** Update a project. */
export function useUpdateProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      projectId: string;
      workspaceId: string;
      updates: { name?: string; status?: 'active' | 'archived' | 'draft' };
    }) =>
      apiPut<OkResponse & { project: WorkspaceProject }>(
        `/projects/${encodeURIComponent(payload.projectId)}`,
        payload.updates
      ),

    onSuccess: (_data, variables) => {
      showToast.success('Project updated');
      qc.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.workspaceId),
      });
    },
  });
}

/** Delete a project. */
export function useDeleteProject() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: { projectId: string; workspaceId: string }) =>
      apiDelete<OkResponse>(`/projects/${encodeURIComponent(payload.projectId)}`),

    onSuccess: (_data, variables) => {
      showToast.success('Project deleted');
      qc.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.workspaceId),
      });
    },
  });
}
