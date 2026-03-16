/**
 * Zustand runtime store — runtime event buffer and active session tracking.
 * Server state lives in TanStack Query; this store handles transient
 * runtime events and the active session identifier.
 */
import { create } from 'zustand';
import type { TimelineEventType } from '@/components/runtime/runtime-event';

export interface RuntimeStoreEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  description: string;
  agent?: string;
  phase?: string;
  artifactId?: string;
}

const MAX_EVENTS = 500;

export interface RuntimeState {
  /** Circular buffer of the last MAX_EVENTS runtime events */
  events: RuntimeStoreEvent[];
  addEvent: (event: RuntimeStoreEvent) => void;
  clearEvents: () => void;

  /** Currently active session ID */
  activeSessionId: string | null;
  setActiveSession: (id: string | null) => void;
}

export const useRuntimeStore = create<RuntimeState>((set) => ({
  events: [],
  addEvent: (event) =>
    set((state) => {
      const next = [...state.events, event];
      // Ring buffer: keep only the last MAX_EVENTS entries
      return { events: next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next };
    }),
  clearEvents: () => set({ events: [] }),

  activeSessionId: null,
  setActiveSession: (id) => set({ activeSessionId: id }),
}));
