/**
 * SSE event stream hook — connects to /api/events and triggers
 * TanStack Query cache invalidation on relevant server events.
 * Auto-reconnects on disconnect with exponential backoff.
 * Tracks connection status and exposes last event for real-time UI.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useUIStore } from '@/stores/ui-store';
import { showToast } from '@/components/ui/toast-system';

const SSE_URL = '/api/events';
const MAX_RECONNECT_DELAY = 30_000;
const EVENT_DEDUP_WINDOW_MS = 5_000;

export type SSEEvent = {
  type: string;
  timestamp?: string;
  [key: string]: unknown;
};

function createEventFingerprint(event: SSEEvent): string {
  return JSON.stringify(
    Object.entries(event)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, value ?? null])
  );
}

function pruneProcessedEvents(cache: Map<string, number>, now: number) {
  for (const [fingerprint, seenAt] of cache.entries()) {
    if (now - seenAt > EVENT_DEDUP_WINDOW_MS) {
      cache.delete(fingerprint);
    }
  }
}

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
    case 'orchestrator_state':
      return [queryKeys.orchestrator.status, queryKeys.progress.all];
    case 'command_queued':
    case 'command_completed':
      return [queryKeys.orchestrator.queue, queryKeys.dashboard.activity];
    case 'pipeline_update':
      return [queryKeys.progress.all, queryKeys.orchestrator.status];
    case 'agent_progress':
      return [queryKeys.progress.all];
    case 'metric_update':
      return [queryKeys.dashboard.metrics, queryKeys.serverMetrics.all];
    case 'session_start':
    case 'session_complete':
      return [queryKeys.sessions.all, queryKeys.progress.all];
    case 'phase_start':
    case 'phase_complete':
      return [queryKeys.sessions.all, queryKeys.progress.all];
    case 'agent_start':
    case 'agent_complete':
      return [queryKeys.agents.all, queryKeys.sessions.all];
    case 'agent_execution_start':
    case 'agent_execution_complete':
    case 'agent_execution_failed':
    case 'agent_execution_cancelled':
    case 'agent_execution_log':
      return [queryKeys.agents.all, queryKeys.sessions.all];
    case 'chat_stream_complete':
    case 'chat_action_executed':
      return [['chat', 'history'] as const];
    case 'gate_passed':
    case 'gate_failed':
      return [queryKeys.sessions.all, queryKeys.progress.all];
    case 'artifact_created':
      return [queryKeys.artifacts.all, queryKeys.sessions.all];
    default:
      return [];
  }
}

/** User-visible toast messages for important events. */
function notifyUser(event: SSEEvent) {
  switch (event.type) {
    case 'orchestrator_state':
      if (event.state === 'ERROR') {
        showToast.error(`Orchestrator entered ERROR state`);
      } else if (event.transition) {
        showToast.info(`Pipeline: ${String(event.from ?? '?')} → ${String(event.to ?? '?')}`);
      }
      break;
    case 'command_completed':
      showToast.success(`Command completed: ${String(event.command ?? 'unknown')}`);
      break;
    case 'command_queued':
      showToast.info(`Command queued: ${String(event.command ?? 'unknown')}`);
      break;
    case 'agent_execution_complete':
      showToast.success(
        `Agent executed: ${String(event.agent_name ?? event.agent_id ?? 'unknown')}`
      );
      break;
    case 'agent_execution_failed':
      showToast.error(`Agent failed: ${String(event.agent_name ?? event.agent_id ?? 'unknown')}`);
      break;
    case 'agent_execution_cancelled':
      showToast.info(`Agent execution cancelled: ${String(event.job_id ?? 'unknown')}`);
      break;
    case 'chat_action_executed':
      showToast.success(`Chat action executed: ${String(event.action_type ?? 'action')}`);
      break;
  }
}

export function useSSEEvents() {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const processedEventsRef = useRef<Map<string, number>>(new Map());

  const connect = useCallback(() => {
    // SSR / jsdom guard — EventSource is browser-only
    if (typeof EventSource === 'undefined') {
      useUIStore.getState().setConnectionStatus('disconnected');
      return;
    }

    // Clean up any existing connection
    esRef.current?.close();

    useUIStore.getState().setConnectionStatus('connecting');

    const es = new EventSource(SSE_URL);
    esRef.current = es;

    es.onopen = () => {
      reconnectAttemptRef.current = 0;
      useUIStore.getState().setConnectionStatus('connected');
      useUIStore.getState().resetConnectionRecovery();
    };

    es.onmessage = (event: MessageEvent) => {
      let parsed: SSEEvent;
      try {
        parsed = JSON.parse(event.data) as SSEEvent;
      } catch {
        return;
      }

      const now = Date.now();
      pruneProcessedEvents(processedEventsRef.current, now);
      const fingerprint = createEventFingerprint(parsed);
      const previousSeenAt = processedEventsRef.current.get(fingerprint);
      if (previousSeenAt && now - previousSeenAt <= EVENT_DEDUP_WINDOW_MS) {
        return;
      }
      processedEventsRef.current.set(fingerprint, now);

      // Update last event for live status widgets
      useUIStore.getState().setLastSSEEvent(parsed);

      // Invalidate relevant query caches
      const keys = getInvalidationKeys(parsed.type);
      for (const key of keys) {
        qc.invalidateQueries({ queryKey: [...key] });
      }

      // Show toast for important events
      notifyUser(parsed);
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      useUIStore.getState().setConnectionStatus('disconnected');

      // Exponential backoff reconnect
      const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, MAX_RECONNECT_DELAY);
      const nextAttempt = reconnectAttemptRef.current + 1;
      useUIStore.getState().setConnectionRecovery({
        attempt: nextAttempt,
        nextRetryAt: Date.now() + delay,
        lastDelayMs: delay,
      });
      reconnectAttemptRef.current += 1;

      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, [qc]);

  useEffect(() => {
    connect();
    const processedEvents = processedEventsRef.current;

    return () => {
      clearTimeout(reconnectTimerRef.current);
      esRef.current?.close();
      esRef.current = null;
      processedEvents.clear();
      useUIStore.getState().setConnectionStatus('disconnected');
      useUIStore.getState().resetConnectionRecovery();
    };
  }, [connect]);
}
