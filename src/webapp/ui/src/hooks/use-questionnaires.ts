/**
 * Questionnaires CRUD hooks — TanStack Query wrappers for /api/questionnaires and /api/save.
 * Implements optimistic updates for save mutations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { showToast } from '@/components/ui/toast-system';
import type {
  QuestionnairesResponse,
  SaveQuestionnairesPayload,
  SaveQuestionnairesResponse,
} from '@/lib/api-types';

/** Fetch all questionnaires with parsed sections and questions. */
export function useQuestionnaires() {
  return useQuery({
    queryKey: queryKeys.questionnaires.all,
    queryFn: () => apiGet<QuestionnairesResponse>('/questionnaires'),
  });
}

/** Get a single questionnaire by file path (derived from the list). */
export function useQuestionnaire(file: string | undefined) {
  const { data, ...rest } = useQuestionnaires();
  const questionnaire = data?.questionnaires.find((q) => q.file === file) ?? null;
  return { data: questionnaire, ...rest };
}

/** Save answers to a questionnaire with optimistic cache update. */
export function useSaveQuestionnaire() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveQuestionnairesPayload) =>
      apiPost<SaveQuestionnairesResponse>('/save', payload),

    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: queryKeys.questionnaires.all });
      const previous = qc.getQueryData<QuestionnairesResponse>(queryKeys.questionnaires.all);

      if (previous) {
        const updated: QuestionnairesResponse = {
          ...previous,
          questionnaires: previous.questionnaires.map((q) => {
            if (q.file !== payload.file) return q;
            return {
              ...q,
              questions: q.questions.map((question) => {
                const update = payload.updates.find((u) => u.questionId === question.id);
                if (!update) return question;
                return { ...question, answer: update.answer, status: update.status };
              }),
            };
          }),
        };
        qc.setQueryData(queryKeys.questionnaires.all, updated);
      }

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.questionnaires.all, context.previous);
      }
    },

    onSuccess: (data) => {
      showToast.success(`Saved ${data.saved} answer(s)`);
      if (data.secretWarnings?.length) {
        data.secretWarnings.forEach((w) => showToast.warning(w));
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.questionnaires.all });
    },
  });
}
