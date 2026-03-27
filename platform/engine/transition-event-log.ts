// Copyright (c) 2026 Robert Agterhuis. MIT License.

import path from 'node:path';

interface EngineStore {
  exists(p: string): boolean;
  readFile(p: string): string;
  writeFile(p: string, d: string): void;
  mkdirp(p: string): void;
}

export type TransitionEventStatus = 'intent' | 'applied' | 'failed';

export interface TransitionEvent {
  transition_id: string;
  from: string;
  to: string;
  status: TransitionEventStatus;
  timestamp: string;
  reason?: string;
}

interface ReplayResult {
  state: string;
  history: Array<{ from: string; to: string; timestamp: string }>;
}

function ensureDir(store: EngineStore, targetPath: string): void {
  const dir = path.dirname(targetPath);
  if (dir && dir !== '.' && !store.exists(dir)) {
    store.mkdirp(dir);
  }
}

export function defaultTransitionEventLogPath(sessionPath?: string): string {
  if (sessionPath && sessionPath.trim() !== '') {
    const replaced = sessionPath.replace(/session-state\.json$/, 'transition-events.json');
    if (replaced !== sessionPath) return replaced;
    return path.join(path.dirname(sessionPath), 'transition-events.json');
  }
  return path.resolve(process.cwd(), 'BusinessDocs', 'session', 'transition-events.json');
}

export function readTransitionEvents(store: EngineStore, eventLogPath: string): TransitionEvent[] {
  if (!store.exists(eventLogPath)) return [];
  try {
    const parsed = JSON.parse(store.readFile(eventLogPath)) as TransitionEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendTransitionEvent(
  store: EngineStore,
  eventLogPath: string,
  event: TransitionEvent
): { appended: boolean } {
  const existing = readTransitionEvents(store, eventLogPath);
  const duplicate = existing.some(
    (item) => item.transition_id === event.transition_id && item.status === event.status
  );
  if (duplicate) {
    return { appended: false };
  }

  const next = [...existing, event];
  ensureDir(store, eventLogPath);
  store.writeFile(eventLogPath, JSON.stringify(next, null, 2));
  return { appended: true };
}

export function replayStateFromTransitionEvents(
  events: TransitionEvent[],
  initialState = 'IDLE'
): ReplayResult {
  const appliedIds = new Set<string>();
  const history: Array<{ from: string; to: string; timestamp: string }> = [];
  let state = initialState;

  for (const event of events) {
    if (event.status !== 'applied') continue;
    if (appliedIds.has(event.transition_id)) continue;
    appliedIds.add(event.transition_id);

    // Deterministic replay: only accept transitions that connect from current state.
    if (event.from !== state) continue;

    state = event.to;
    history.push({
      from: event.from,
      to: event.to,
      timestamp: event.timestamp,
    });
  }

  return { state, history };
}
