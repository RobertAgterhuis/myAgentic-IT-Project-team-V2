/**
 * Runtime events hook — bridges SSE timeline events to the Zustand runtime store.
 * Listens for session/phase/agent/gate events from the SSE stream and feeds
 * them into the runtime store's event buffer.
 *
 * M15 / Issue #M15-026
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores/ui-store';
import { useRuntimeStore } from '@/stores/runtime-store';
import { queryKeys } from '@/lib/query-keys';
import type { SSEEvent } from './use-sse-events';

/** SSE event types that should be forwarded to the runtime store. */
const RUNTIME_EVENT_TYPES = new Set([
  'session_start',
  'session_complete',
  'phase_start',
  'phase_complete',
  'agent_start',
  'agent_complete',
  'artifact_created',
  'gate_passed',
  'gate_failed',
]);

/** Map runtime SSE events to query keys that need invalidation. */
function getRuntimeInvalidationKeys(eventType: string): readonly (readonly string[])[] {
  switch (eventType) {
    case 'session_start':
    case 'session_complete':
      return [queryKeys.sessions.all];
    case 'phase_start':
    case 'phase_complete':
      return [queryKeys.sessions.all, queryKeys.progress.all];
    case 'agent_start':
    case 'agent_complete':
      return [queryKeys.agents.all, queryKeys.sessions.all];
    case 'artifact_created':
      return [queryKeys.artifacts.all];
    case 'gate_passed':
    case 'gate_failed':
      return [queryKeys.sessions.all, queryKeys.progress.all];
    default:
      return [];
  }
}

/**
 * Subscribes to the UI store's last SSE event and forwards runtime-related
 * events into the Zustand runtime store. Also invalidates relevant query keys.
 */
export function useRuntimeEvents() {
  const qc = useQueryClient();
  const addEvent = useRuntimeStore((s) => s.addEvent);
  const setActiveSession = useRuntimeStore((s) => s.setActiveSession);
  const lastProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    // Subscribe to UI store SSE events (set by use-sse-events.ts)
    const unsub = useUIStore.subscribe((state) => {
      const event = state.lastSSEEvent as SSEEvent | null;
      if (!event || !event.type) return;

      // Skip duplicates
      const eventKey = `${event.type}-${event.timestamp ?? ''}`;
      if (eventKey === lastProcessedRef.current) return;
      lastProcessedRef.current = eventKey;

      if (!RUNTIME_EVENT_TYPES.has(event.type)) return;

      // Forward to runtime store
      addEvent({
        id: `sse-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        type: event.type as import('@/components/runtime/runtime-event').TimelineEventType,
        timestamp: (event.timestamp as string) ?? new Date().toISOString(),
        description: (event.description as string) ?? event.type,
        agent: event.agent as string | undefined,
        phase: event.phase as string | undefined,
        artifactId: event.artifact_id as string | undefined,
      });

      // Track active session
      if (event.type === 'session_start' && event.session_id) {
        setActiveSession(event.session_id as string);
      } else if (event.type === 'session_complete') {
        setActiveSession(null);
      }

      // Invalidate relevant queries
      const keys = getRuntimeInvalidationKeys(event.type);
      for (const key of keys) {
        qc.invalidateQueries({ queryKey: [...key] });
      }
    });

    return unsub;
  }, [qc, addEvent, setActiveSession]);
}
