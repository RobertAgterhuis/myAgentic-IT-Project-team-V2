/**
 * Tests: SSE events hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { TestWrapper } from '@/test/test-wrapper';
import { useSSEEvents } from '@/hooks/use-sse-events';

describe('useSSEEvents', () => {
  let closeSpy: ReturnType<typeof vi.fn>;
  const originalEventSource = globalThis.EventSource;

  beforeEach(() => {
    closeSpy = vi.fn();

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
    Object.defineProperty(globalThis, 'EventSource', {
      value: originalEventSource,
      writable: true,
      configurable: true,
    });
  });

  it('creates an EventSource connection', () => {
    renderHook(() => useSSEEvents(), { wrapper: TestWrapper });
    const instances = (globalThis.EventSource as unknown as { instances: { url: string }[] }).instances;
    expect(instances.length).toBeGreaterThan(0);
    expect(instances[0].url).toBe('/api/events');
  });

  it('closes connection on unmount', () => {
    const { unmount } = renderHook(() => useSSEEvents(), { wrapper: TestWrapper });
    unmount();
    expect(closeSpy).toHaveBeenCalled();
  });
});
