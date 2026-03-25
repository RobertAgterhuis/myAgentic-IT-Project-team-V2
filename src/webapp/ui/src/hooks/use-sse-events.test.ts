/**
 * Tests: SSE events hook
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useSSEEvents } from '@/hooks/use-sse-events';
import { useUIStore } from '@/stores/ui-store';

const toastSpies = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  loading: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock('@/components/ui/toast-system', () => ({
  showToast: toastSpies,
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSSEEvents', () => {
  let closeSpy: ReturnType<typeof vi.fn>;
  const originalEventSource = globalThis.EventSource;
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    closeSpy = vi.fn();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    Object.values(toastSpies).forEach((spy) => spy.mockReset());
    useUIStore.setState({
      connectionStatus: 'connecting',
      connectionRecovery: {
        attempt: 0,
        nextRetryAt: null,
        lastDelayMs: null,
      },
      lastSSEEvent: null,
    });

    // Mock EventSource as a constructor class
    class MockEventSource {
      static instances: MockEventSource[] = [];
      url: string;
      close = closeSpy;
      onopen: ((ev: Event) => void) | null = null;
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: Event) => void) | null = null;

      constructor(url: string) {
        this.url = url;
        MockEventSource.instances.push(this);
      }
    }

    Object.defineProperty(globalThis, 'EventSource', {
      value: MockEventSource,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    queryClient.clear();
    Object.defineProperty(globalThis, 'EventSource', {
      value: originalEventSource,
      writable: true,
      configurable: true,
    });
  });

  it('creates an EventSource connection', () => {
    renderHook(() => useSSEEvents(), { wrapper: createWrapper(queryClient) });
    const instances = (globalThis.EventSource as unknown as { instances: { url: string }[] })
      .instances;
    expect(instances.length).toBeGreaterThan(0);
    expect(instances[0].url).toBe('/api/events');
  });

  it('closes connection on unmount', () => {
    const { unmount } = renderHook(() => useSSEEvents(), { wrapper: createWrapper(queryClient) });
    unmount();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('records reconnect attempt and backoff timing when the stream errors', () => {
    renderHook(() => useSSEEvents(), { wrapper: createWrapper(queryClient) });

    const instances = (
      globalThis.EventSource as unknown as {
        instances: Array<{ onerror: ((ev: Event) => void) | null }>;
      }
    ).instances;

    instances[0].onerror?.(new Event('error'));

    const state = useUIStore.getState();
    expect(state.connectionStatus).toBe('disconnected');
    expect(state.connectionRecovery.attempt).toBe(1);
    expect(state.connectionRecovery.lastDelayMs).toBe(1000);
    expect(typeof state.connectionRecovery.nextRetryAt).toBe('number');
  });

  it('reconnects through burst failures with exponential backoff capped at 30 seconds', () => {
    renderHook(() => useSSEEvents(), { wrapper: createWrapper(queryClient) });

    const eventSourceClass = globalThis.EventSource as unknown as {
      instances: Array<{ onerror: ((ev: Event) => void) | null }>;
    };

    const expectedDelays = [1000, 2000, 4000, 8000, 16000, 30000, 30000];

    for (const expectedDelay of expectedDelays) {
      const activeInstance = eventSourceClass.instances.at(-1);
      activeInstance?.onerror?.(new Event('error'));

      const state = useUIStore.getState();
      expect(state.connectionStatus).toBe('disconnected');
      expect(state.connectionRecovery.lastDelayMs).toBe(expectedDelay);

      vi.advanceTimersByTime(expectedDelay);
      expect(eventSourceClass.instances.length).toBeGreaterThan(1);
    }

    expect(eventSourceClass.instances).toHaveLength(expectedDelays.length + 1);
  });

  it('ignores duplicate events replayed during reconnect and invalidates caches only once', () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useSSEEvents(), { wrapper: createWrapper(queryClient) });

    const instances = (
      globalThis.EventSource as unknown as {
        instances: Array<{ onmessage: ((ev: MessageEvent) => void) | null }>;
      }
    ).instances;

    const duplicateEvent = {
      type: 'command_completed',
      command: 'sync-docs',
      timestamp: '2026-03-25T18:00:00.000Z',
      job_id: 'job-42',
    };

    const message = new MessageEvent('message', {
      data: JSON.stringify(duplicateEvent),
    });

    instances[0].onmessage?.(message);
    instances[0].onmessage?.(message);

    expect(invalidateSpy).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenNthCalledWith(1, { queryKey: ['command', 'queue'] });
    expect(invalidateSpy).toHaveBeenNthCalledWith(2, { queryKey: ['dashboard', 'activity'] });
    expect(useUIStore.getState().lastSSEEvent).toEqual(duplicateEvent);
    expect(toastSpies.success).toHaveBeenCalledTimes(1);
    expect(toastSpies.success).toHaveBeenCalledWith('Command completed: sync-docs');
  });
});
