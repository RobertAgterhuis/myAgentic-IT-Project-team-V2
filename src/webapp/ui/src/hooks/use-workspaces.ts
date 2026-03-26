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
import { applyOptimisticPatches, rollbackOptimisticPatches } from '@/lib/optimistic-updates';
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

    onMutate: async (payload) => {
      const now = new Date().toISOString();
      const optimisticWorkspace: WorkspaceSummary = {
        id: payload.id,
        name: payload.name,
        owner: payload.owner,
        repositories: [],
        created_at: now,
        updated_at: now,
      };

      const snapshots = await applyOptimisticPatches(qc, [
        {
          queryKey: queryKeys.workspaces.all,
          updater: (current) => {
            const previous = current as WorkspacesListResponse | undefined;
            if (!previous) return previous;
            return {
              ...previous,
              count: previous.count + 1,
              workspaces: [...previous.workspaces, optimisticWorkspace],
            } satisfies WorkspacesListResponse;
          },
        },
      ]);

      return { snapshots };
    },

    onError: (_err, _variables, context) => {
      rollbackOptimisticPatches(qc, context?.snapshots);
    },

    onSuccess: (data) => {
      showToast.success(`Workspace "${data.workspace.name}" created`);
    },

    onSettled: () => {
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

    onMutate: async (payload) => {
      const snapshots = await applyOptimisticPatches(qc, [
        {
          queryKey: queryKeys.workspaces.all,
          updater: (current) => {
            const previous = current as WorkspacesListResponse | undefined;
            if (!previous) return previous;
            return {
              ...previous,
              workspaces: previous.workspaces.map((workspace) =>
                workspace.id === payload.workspaceId
                  ? { ...workspace, ...payload.updates }
                  : workspace
              ),
            } satisfies WorkspacesListResponse;
          },
        },
        {
          queryKey: queryKeys.workspaces.detail(payload.workspaceId),
          updater: (current) => {
            const previous = current as WorkspaceDetailResponse | undefined;
            if (!previous) return previous;
            return {
              ...previous,
              workspace: {
                ...previous.workspace,
                ...payload.updates,
              },
            } satisfies WorkspaceDetailResponse;
          },
        },
      ]);

      return { snapshots };
    },

    onError: (_err, _variables, context) => {
      rollbackOptimisticPatches(qc, context?.snapshots);
    },

    onSuccess: () => {
      showToast.success('Workspace updated');
    },

    onSettled: (_data, _error, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.workspaces.all });
      qc.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.workspaceId),
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

    onMutate: async (workspaceId) => {
      const snapshots = await applyOptimisticPatches(qc, [
        {
          queryKey: queryKeys.workspaces.all,
          updater: (current) => {
            const previous = current as WorkspacesListResponse | undefined;
            if (!previous) return previous;

            const nextWorkspaces = previous.workspaces.filter(
              (workspace) => workspace.id !== workspaceId
            );
            return {
              ...previous,
              count: nextWorkspaces.length,
              workspaces: nextWorkspaces,
            } satisfies WorkspacesListResponse;
          },
        },
      ]);

      return { snapshots };
    },

    onError: (_err, _variables, context) => {
      rollbackOptimisticPatches(qc, context?.snapshots);
    },

    onSuccess: () => {
      showToast.success('Workspace deleted');
    },

    onSettled: () => {
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

    onMutate: async (payload) => {
      const snapshots = await applyOptimisticPatches(qc, [
        {
          queryKey: queryKeys.workspaces.detail(payload.workspaceId),
          updater: (current) => {
            const previous = current as WorkspaceDetailResponse | undefined;
            if (!previous) return previous;

            return {
              ...previous,
              workspace: {
                ...previous.workspace,
                repositories: [...previous.workspace.repositories, payload.repository],
              },
            } satisfies WorkspaceDetailResponse;
          },
        },
        {
          queryKey: queryKeys.workspaces.all,
          updater: (current) => {
            const previous = current as WorkspacesListResponse | undefined;
            if (!previous) return previous;

            return {
              ...previous,
              workspaces: previous.workspaces.map((workspace) =>
                workspace.id === payload.workspaceId
                  ? {
                      ...workspace,
                      repositories: [...workspace.repositories, payload.repository],
                    }
                  : workspace
              ),
            } satisfies WorkspacesListResponse;
          },
        },
      ]);

      return { snapshots };
    },

    onError: (_err, _variables, context) => {
      rollbackOptimisticPatches(qc, context?.snapshots);
    },

    onSuccess: () => {
      showToast.success('Repository added');
    },

    onSettled: (_data, _error, variables) => {
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

    onMutate: async (payload) => {
      const snapshots = await applyOptimisticPatches(qc, [
        {
          queryKey: queryKeys.workspaces.detail(payload.workspaceId),
          updater: (current) => {
            const previous = current as WorkspaceDetailResponse | undefined;
            if (!previous) return previous;

            return {
              ...previous,
              workspace: {
                ...previous.workspace,
                repositories: previous.workspace.repositories.filter(
                  (repository) => repository.id !== payload.repositoryId
                ),
              },
            } satisfies WorkspaceDetailResponse;
          },
        },
        {
          queryKey: queryKeys.workspaces.all,
          updater: (current) => {
            const previous = current as WorkspacesListResponse | undefined;
            if (!previous) return previous;

            return {
              ...previous,
              workspaces: previous.workspaces.map((workspace) =>
                workspace.id === payload.workspaceId
                  ? {
                      ...workspace,
                      repositories: workspace.repositories.filter(
                        (repository) => repository.id !== payload.repositoryId
                      ),
                    }
                  : workspace
              ),
            } satisfies WorkspacesListResponse;
          },
        },
      ]);

      return { snapshots };
    },

    onError: (_err, _variables, context) => {
      rollbackOptimisticPatches(qc, context?.snapshots);
    },

    onSuccess: () => {
      showToast.success('Repository removed');
    },

    onSettled: (_data, _error, variables) => {
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

    onMutate: async (payload) => {
      const now = new Date().toISOString();
      const optimisticProject: WorkspaceProject = {
        id: payload.project.id,
        workspaceId: payload.workspaceId,
        name: payload.project.name,
        repositories: payload.project.repositories ?? [],
        sessions: [],
        status: 'draft',
        created_at: now,
        updated_at: now,
      };

      const snapshots = await applyOptimisticPatches(qc, [
        {
          queryKey: queryKeys.workspaces.detail(payload.workspaceId),
          updater: (current) => {
            const previous = current as WorkspaceDetailResponse | undefined;
            if (!previous) return previous;
            return {
              ...previous,
              projects: [...previous.projects, optimisticProject],
            } satisfies WorkspaceDetailResponse;
          },
        },
      ]);

      return { snapshots };
    },

    onError: (_err, _variables, context) => {
      rollbackOptimisticPatches(qc, context?.snapshots);
    },

    onSuccess: () => {
      showToast.success('Project created');
    },

    onSettled: (_data, _error, variables) => {
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

    onMutate: async (payload) => {
      const snapshots = await applyOptimisticPatches(qc, [
        {
          queryKey: queryKeys.workspaces.detail(payload.workspaceId),
          updater: (current) => {
            const previous = current as WorkspaceDetailResponse | undefined;
            if (!previous) return previous;
            return {
              ...previous,
              projects: previous.projects.map((project) =>
                project.id === payload.projectId ? { ...project, ...payload.updates } : project
              ),
            } satisfies WorkspaceDetailResponse;
          },
        },
      ]);

      return { snapshots };
    },

    onError: (_err, _variables, context) => {
      rollbackOptimisticPatches(qc, context?.snapshots);
    },

    onSuccess: () => {
      showToast.success('Project updated');
    },

    onSettled: (_data, _error, variables) => {
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

    onMutate: async (payload) => {
      const snapshots = await applyOptimisticPatches(qc, [
        {
          queryKey: queryKeys.workspaces.detail(payload.workspaceId),
          updater: (current) => {
            const previous = current as WorkspaceDetailResponse | undefined;
            if (!previous) return previous;
            return {
              ...previous,
              projects: previous.projects.filter((project) => project.id !== payload.projectId),
            } satisfies WorkspaceDetailResponse;
          },
        },
      ]);

      return { snapshots };
    },

    onError: (_err, _variables, context) => {
      rollbackOptimisticPatches(qc, context?.snapshots);
    },

    onSuccess: () => {
      showToast.success('Project deleted');
    },

    onSettled: (_data, _error, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.workspaces.detail(variables.workspaceId),
      });
    },
  });
}
