/**
 * Milestones CRUD hooks — TanStack Query wrappers for /api/milestones.
 * Full CRUD with optimistic updates and template support.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/components/ui/toast-system';
import type {
  Milestone,
  MilestonesListResponse,
  MilestoneResponse,
  CreateMilestonePayload,
  UpdateMilestonePayload,
  TimestampedResponse,
  MilestoneTemplate,
  CreateMilestoneTemplatePayload,
  ApplyTemplatePayload,
  OkResponse,
} from '@/lib/api-types';

/* ── Milestones ── */

/** List all milestones (optionally including archived). */
export function useMilestones(includeArchived = false) {
  return useQuery({
    queryKey: [...queryKeys.milestones.all, { includeArchived }] as const,
    queryFn: () =>
      apiGet<MilestonesListResponse>(
        '/milestones',
        includeArchived ? { include_archived: 'true' } : undefined,
      ),
    select: (res) => res.data,
  });
}

/** Fetch a single milestone by ID. */
export function useMilestone(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.milestones.detail(id!),
    queryFn: () => apiGet<MilestoneResponse>(`/milestones/${id}`),
    enabled: !!id,
    select: (res) => res.data,
  });
}

/** Create a new milestone. */
export function useCreateMilestone() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMilestonePayload) =>
      apiPost<MilestoneResponse>('/milestones', payload),

    onSuccess: (data) => {
      showToast.success(`Milestone "${data.data.name}" created`);
      qc.invalidateQueries({ queryKey: queryKeys.milestones.all });
    },
  });
}

/** Update an existing milestone (partial update). */
export function useUpdateMilestone() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateMilestonePayload & { id: string }) =>
      apiPut<MilestoneResponse>(`/milestones/${id}`, payload),

    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: queryKeys.milestones.all });
      const previous = qc.getQueryData<MilestonesListResponse>([...queryKeys.milestones.all, { includeArchived: false }]);

      if (previous) {
        const updated: MilestonesListResponse = {
          ...previous,
          data: previous.data.map((m: Milestone) =>
            m.id === id ? { ...m, ...updates } : m,
          ),
        };
        qc.setQueryData([...queryKeys.milestones.all, { includeArchived: false }], updated);
      }

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData([...queryKeys.milestones.all, { includeArchived: false }], context.previous);
      }
    },

    onSuccess: (data) => {
      showToast.success(`Milestone "${data.data.name}" updated`);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.milestones.all });
    },
  });
}

/** Archive a milestone. */
export function useArchiveMilestone() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiPatch<MilestoneResponse>(`/milestones/${id}/archive`),

    onSuccess: (data) => {
      showToast.success(`Milestone "${data.data.name}" archived`);
      qc.invalidateQueries({ queryKey: queryKeys.milestones.all });
    },
  });
}

/** Delete a milestone — not directly supported by API, archive instead. */
export function useDeleteMilestone() {
  return useArchiveMilestone();
}

/* ── Milestone Templates ── */

/** List all milestone templates. */
export function useMilestoneTemplates() {
  return useQuery({
    queryKey: queryKeys.milestones.templates,
    queryFn: () => apiGet<TimestampedResponse<MilestoneTemplate[]>>('/milestone-templates'),
    select: (res) => res.data,
  });
}

/** Create a milestone template. */
export function useCreateMilestoneTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMilestoneTemplatePayload) =>
      apiPost<TimestampedResponse<MilestoneTemplate>>('/milestone-templates', payload),

    onSuccess: () => {
      showToast.success('Template created');
      qc.invalidateQueries({ queryKey: queryKeys.milestones.templates });
    },
  });
}

/** Delete a milestone template. */
export function useDeleteMilestoneTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiDelete<OkResponse>(`/milestone-templates/${id}`),

    onSuccess: () => {
      showToast.success('Template deleted');
      qc.invalidateQueries({ queryKey: queryKeys.milestones.templates });
    },
  });
}

/** Apply a template to create a milestone. */
export function useApplyMilestoneTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, ...payload }: ApplyTemplatePayload & { templateId: string }) =>
      apiPost<MilestoneResponse>(`/milestone-templates/${templateId}/apply`, payload),

    onSuccess: (data) => {
      showToast.success(`Milestone "${data.data.name}" created from template`);
      qc.invalidateQueries({ queryKey: queryKeys.milestones.all });
    },
  });
}
