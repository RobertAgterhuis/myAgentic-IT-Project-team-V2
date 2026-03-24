import { useMemo } from 'react';
import { useUIStore } from '@/stores/ui-store';

/**
 * Return a fallback polling interval when SSE is not healthy.
 * Once SSE is connected and at least one event was received, polling is disabled.
 */
export function useSSEAwareRefetchInterval(fallbackMs: number): number | false {
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const hasSeenEvent = useUIStore((s) => !!s.lastSSEEvent);

  return useMemo(() => {
    if (import.meta.env.MODE === 'test') return fallbackMs;
    if (connectionStatus === 'connected' && hasSeenEvent) return false;
    return fallbackMs;
  }, [connectionStatus, hasSeenEvent, fallbackMs]);
}
