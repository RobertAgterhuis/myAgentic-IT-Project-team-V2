/**
 * Decisions CRUD hooks — TanStack Query wrappers for /api/decisions.
 * Supports filtering, create, answer, decide, defer, expire, reopen, edit.
 * Implements optimistic updates for mutations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/components/ui/toast-system';
import type {
  DecisionsResponse,
  DecisionPayload,
  DecisionMutationResponse,
  DecisionSimilarResponse,
  ActivateCategoryPayload,
  ActivateCategoryResponse,
  PromoteLessonPayload,
  PromoteLessonResponse,
} from '@/lib/api-types';

/** Fetch all decisions (open, decided, deferred + categories). */
export function useDecisions() {
  return useQuery({
    queryKey: queryKeys.decisions.all,
    queryFn: () => apiGet<DecisionsResponse>('/decisions'),
  });
}

/** Query semantically related decisions for a decision subject. */
export function useSimilarDecisions(query: string | null | undefined) {
  const normalizedQuery = query?.trim() || '';

  return useQuery({
    queryKey: queryKeys.decisions.similar(normalizedQuery),
    queryFn: () =>
      apiPost<DecisionSimilarResponse>('/v1/decisions/similar', {
        query: normalizedQuery,
        topK: 3,
      }),
    enabled: normalizedQuery.length > 0,
  });
}

/** Derive a single decision by ID from the list cache. */
export function useDecision(id: string | undefined) {
  const { data, ...rest } = useDecisions();
  if (!data || !id) return { data: null, ...rest };

  const found =
    data.open.find((d) => d.id === id) ??
    data.decided.find((d) => d.id === id) ??
    data.deferred.find((d) => d.id === id) ??
    null;

  return { data: found, ...rest };
}

/** Create a new decision. */
export function useCreateDecision() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: DecisionPayload) =>
      apiPost<DecisionMutationResponse>('/decisions', payload),

    onSuccess: (data) => {
      showToast.success(`Decision ${data.id} ${data.action}`);
      qc.invalidateQueries({ queryKey: queryKeys.decisions.all });
    },
  });
}

/** Mutate an existing decision (answer, decide, defer, expire, reopen, edit). */
export function useUpdateDecision() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: DecisionPayload) =>
      apiPost<DecisionMutationResponse>('/decisions', payload),

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.decisions.all });
      const previous = qc.getQueryData<DecisionsResponse>(queryKeys.decisions.all);
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.decisions.all, context.previous);
      }
    },

    onSuccess: (data) => {
      showToast.success(`Decision ${data.id}: ${data.action}`);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.decisions.all });
    },
  });
}

/** Delete / bury a decision — effectively "expire" it. */
export function useDeleteDecision() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiPost<DecisionMutationResponse>('/decisions', { action: 'expire', id }),

    onSuccess: (data) => {
      showToast.success(`Decision ${data.id} expired`);
      qc.invalidateQueries({ queryKey: queryKeys.decisions.all });
    },
  });
}

/** Activate a deferred category file. */
export function useActivateCategory() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: ActivateCategoryPayload) =>
      apiPost<ActivateCategoryResponse>('/decisions/activate-category', payload),

    onSuccess: (data) => {
      showToast.success(`Category "${data.name}" activated`);
      qc.invalidateQueries({ queryKey: queryKeys.decisions.all });
    },
  });
}

/** Promote a lesson flagged with PROMOTE_TO_DECISION to a decision. */
export function usePromoteLesson() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: PromoteLessonPayload) =>
      apiPost<PromoteLessonResponse>('/decisions/promote-lesson', payload),

    onSuccess: (data) => {
      showToast.success(`Lesson ${data.lessonId} promoted to decision ${data.id}`);
      qc.invalidateQueries({ queryKey: queryKeys.decisions.all });
    },
  });
}
