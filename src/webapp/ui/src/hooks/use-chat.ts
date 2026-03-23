import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import type {
  ChatActionResponse,
  ChatHistoryResponse,
  ChatMessageResponse,
  ChatProposedAction,
} from '@/lib/api-types';
import { queryKeys } from '@/lib/query-keys';

export function useChatHistory(sessionId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.history(sessionId),
    queryFn: () =>
      apiGet<ChatHistoryResponse>('/v1/chat/history', { session_id: sessionId, limit: 100 }),
    enabled,
  });
}

export function useSendChatMessage(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { message: string; context_hints?: string[] }) =>
      apiPost<ChatMessageResponse>('/v1/chat/message', {
        session_id: sessionId,
        message: input.message,
        context_hints: input.context_hints ?? [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chat.history(sessionId) });
    },
  });
}

export function useExecuteChatAction(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: ChatProposedAction; confirmed?: boolean }) =>
      apiPost<ChatActionResponse>('/v1/chat/action', {
        session_id: sessionId,
        actionId: input.action.id,
        confirmed: input.confirmed === true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chat.history(sessionId) });
    },
  });
}

export function useClearChatSession(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/v1/chat/session', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!response.ok) {
        throw new Error('Failed to clear chat session');
      }
      return (await response.json()) as { ok: boolean; session_id: string; cleared: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chat.history(sessionId) });
    },
  });
}
