/**
 * SSE event stream hook — connects to /api/events and triggers
 * TanStack Query cache invalidation on relevant server events.
 * Auto-reconnects on disconnect with exponential backoff.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

const SSE_URL = '/api/events';
const MAX_RECONNECT_DELAY = 30_000;

type SSEEvent = {
  type: string;
  data?: string;
};

/** Map SSE event types to the query keys that should be invalidated. */
function getInvalidationKeys(eventType: string): readonly (readonly string[])[] {
  switch (eventType) {
    case 'file_change':
      return [
        queryKeys.questionnaires.all,
        queryKeys.decisions.all,
        queryKeys.progress.all,
        queryKeys.orchestrator.status,
      ];
    case 'questionnaire_save':
      return [queryKeys.questionnaires.all];
    case 'decision_update':
      return [queryKeys.decisions.all];
    default:
      return [];
  }
}

export function useSSEEvents() {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    // SSR / jsdom guard — EventSource is browser-only
    if (typeof EventSource === 'undefined') return;

    // Clean up any existing connection
    esRef.current?.close();

    const es = new EventSource(SSE_URL);
    esRef.current = es;

    es.onopen = () => {
      reconnectAttemptRef.current = 0;
    };

    es.onmessage = (event: MessageEvent) => {
      let parsed: SSEEvent;
      try {
        parsed = JSON.parse(event.data) as SSEEvent;
      } catch {
        return;
      }

      const keys = getInvalidationKeys(parsed.type);
      for (const key of keys) {
        qc.invalidateQueries({ queryKey: [...key] });
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;

      // Exponential backoff reconnect
      const delay = Math.min(
        1000 * 2 ** reconnectAttemptRef.current,
        MAX_RECONNECT_DELAY,
      );
      reconnectAttemptRef.current += 1;

      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, [qc]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimerRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);
}
