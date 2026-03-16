import { describe, it, expect, beforeEach } from 'vitest';
import { useRuntimeStore, type RuntimeStoreEvent } from './runtime-store';

function mkEvent(i: number): RuntimeStoreEvent {
  return {
    id: `evt-${i}`,
    type: 'agent_start',
    timestamp: new Date(i * 1000).toISOString(),
    description: `Event ${i}`,
  };
}

describe('runtime-store', () => {
  beforeEach(() => {
    // Reset store between tests
    useRuntimeStore.setState({ events: [], activeSessionId: null });
  });

  describe('event buffer', () => {
    it('adds events', () => {
      useRuntimeStore.getState().addEvent(mkEvent(1));
      useRuntimeStore.getState().addEvent(mkEvent(2));
      expect(useRuntimeStore.getState().events).toHaveLength(2);
    });

    it('enforces max 500 events (ring buffer)', () => {
      for (let i = 0; i < 510; i++) {
        useRuntimeStore.getState().addEvent(mkEvent(i));
      }
      const events = useRuntimeStore.getState().events;
      expect(events).toHaveLength(500);
      // First event should be #10 (the 510 - 500 oldest were dropped)
      expect(events[0].id).toBe('evt-10');
      expect(events[499].id).toBe('evt-509');
    });

    it('clears events', () => {
      useRuntimeStore.getState().addEvent(mkEvent(1));
      useRuntimeStore.getState().clearEvents();
      expect(useRuntimeStore.getState().events).toHaveLength(0);
    });
  });

  describe('session tracking', () => {
    it('starts with null session', () => {
      expect(useRuntimeStore.getState().activeSessionId).toBeNull();
    });

    it('sets active session', () => {
      useRuntimeStore.getState().setActiveSession('session-42');
      expect(useRuntimeStore.getState().activeSessionId).toBe('session-42');
    });

    it('clears active session', () => {
      useRuntimeStore.getState().setActiveSession('session-42');
      useRuntimeStore.getState().setActiveSession(null);
      expect(useRuntimeStore.getState().activeSessionId).toBeNull();
    });
  });
});
