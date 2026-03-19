/**
 * State Persistence — File-based session-state.json I/O (FEAT-05-A / AC-1, AC-7)
 *
 * Reads and writes the orchestrator state to disk via the store abstraction.
 * Provides crash recovery by loading the last committed state on startup.
 *
 * Zero external dependencies.
 *
 * @module orchestrator/state-persistence
 */

import path from 'path';

// Default session-state.json location
const DEFAULT_SESSION_DIR = path.resolve(__dirname, '..', '..', 'BusinessDocs', 'session');
const DEFAULT_SESSION_FILE = path.join(DEFAULT_SESSION_DIR, 'session-state.json');
const DEFAULT_HISTORY_FILE = path.join(DEFAULT_SESSION_DIR, 'run-history.json');

/**
 * @typedef {object} PersistedState
 * @property {string} status - Current state machine state
 * @property {string} mode - Command mode
 * @property {Array<{from: string, to: string, timestamp: string}>} state_history
 * @property {object} gate_results - Map of critic state → gate result
 * @property {string} last_updated - ISO timestamp
 */

/**
 * Load the persisted session state from disk.
 * Returns null if the file doesn't exist or is unparseable.
 *
 * @param {object} store - Store abstraction (exists, readFile)
 * @param {string} [filePath] - Override path to session-state.json
 * @returns {object|null} Parsed session state, or null
 */
function loadSessionState(store, filePath) {
  const target = filePath || DEFAULT_SESSION_FILE;

  if (!store.exists(target)) {
    return null;
  }

  try {
    const raw = store.readFile(target);
    const parsed = JSON.parse(raw);

    // Basic validation — must have at least a status field
    if (!parsed || typeof parsed.status !== 'string') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persist the state machine state to disk.
 * Merges the serialized state into the existing session-state.json
 * to preserve non-engine fields (project_name, scope, phase_outputs, etc.).
 *
 * @param {object} store - Store abstraction (exists, readFile, writeFile, mkdirp)
 * @param {object} serializedState - Output of StateMachine.serialize()
 * @param {string} [filePath] - Override path to session-state.json
 */
function saveSessionState(store, serializedState, filePath) {
  const target = filePath || DEFAULT_SESSION_FILE;

  // Ensure directory exists
  const dir = path.dirname(target);
  store.mkdirp(dir);

  // Merge with existing content to preserve non-engine fields
  let existing: Record<string, unknown> = {};
  if (store.exists(target)) {
    try {
      existing = JSON.parse(store.readFile(target));
    } catch {
      existing = {};
    }
  }

  const merged = {
    ...existing,
    status: serializedState.status,
    mode: serializedState.mode,
    state_history: serializedState.state_history,
    gate_results: serializedState.gate_results,
    last_updated: serializedState.last_updated,
    governance_mode: serializedState.governance_mode || existing.governance_mode || undefined,
    degradation_log: existing.degradation_log || [],
  };

  store.writeFile(target, JSON.stringify(merged, null, 2));
}

/**
 * Create an auto-persist wrapper that saves state on every transition.
 * Returns callback functions suitable for StateMachine's onTransition/onError.
 *
 * @param {object} store - Store abstraction
 * @param {function} getStateMachine - Returns the StateMachine instance (lazy)
 * @param {string} [filePath] - Override path to session-state.json
 * @param {function} [onPersist] - Optional callback after each persist
 * @returns {{ onTransition: Function, onError: Function }}
 */
function createAutoPersist(store, getStateMachine, filePath, onPersist) {
  const persist = () => {
    const machine = getStateMachine();
    if (!machine) return;
    const serialized = machine.serialize();
    saveSessionState(store, serialized, filePath);
    if (onPersist) onPersist(serialized);
  };

  return {
    onTransition: (event) => {
      persist();
      return event;
    },
    onError: (event) => {
      persist();
      return event;
    },
  };
}

/**
 * Append a completed/stopped run to the run history log.
 * Keeps at most 50 entries (FIFO).
 *
 * @param {object} store
 * @param {object} runEntry - { mode, status, started_at, ended_at, state_history, gate_results }
 * @param {string} [filePath]
 */
function saveRunHistory(store, runEntry, filePath) {
  const target = filePath || DEFAULT_HISTORY_FILE;
  const dir = path.dirname(target);
  store.mkdirp(dir);

  let runs: Array<Record<string, unknown>> = [];
  if (store.exists(target)) {
    try {
      runs = JSON.parse(store.readFile(target));
      if (!Array.isArray(runs)) runs = [];
    } catch {
      runs = [];
    }
  }

  runs.push(runEntry as Record<string, unknown>);
  if (runs.length > 50) runs = runs.slice(runs.length - 50);

  store.writeFile(target, JSON.stringify(runs, null, 2));
}

/**
 * Load the run history log.
 * @param {object} store
 * @param {string} [filePath]
 * @returns {Array<object>}
 */
function loadRunHistory(store, filePath) {
  const target = filePath || DEFAULT_HISTORY_FILE;
  if (!store.exists(target)) return [];
  try {
    const data = JSON.parse(store.readFile(target));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Write transition intent before execution (write-ahead pattern).
 * Marks the session as IN_PROGRESS so crash recovery knows the
 * previous agent execution may have been interrupted.
 *
 * @param {object} store - Store abstraction
 * @param {string} targetState - The state being transitioned to
 * @param {string} [filePath] - Override path to session-state.json
 */
function saveTransitionIntent(store, targetState, filePath) {
  const target = filePath || DEFAULT_SESSION_FILE;
  const dir = path.dirname(target);
  store.mkdirp(dir);

  let existing: Record<string, unknown> = {};
  if (store.exists(target)) {
    try {
      existing = JSON.parse(store.readFile(target));
    } catch {
      existing = {};
    }
  }

  const updated = {
    ...existing,
    transition_status: 'IN_PROGRESS',
    transition_target: targetState,
    transition_started_at: new Date().toISOString(),
  };

  store.writeFile(target, JSON.stringify(updated, null, 2));
}

/**
 * Mark the current transition as complete (write-ahead pattern).
 * Clears the IN_PROGRESS marker after successful execution.
 *
 * @param {object} store - Store abstraction
 * @param {string} [filePath] - Override path to session-state.json
 */
function saveTransitionComplete(store, filePath) {
  const target = filePath || DEFAULT_SESSION_FILE;

  let existing: Record<string, unknown> = {};
  if (store.exists(target)) {
    try {
      existing = JSON.parse(store.readFile(target));
    } catch {
      existing = {};
    }
  }

  existing.transition_status = 'COMPLETE';
  delete existing.transition_target;
  delete existing.transition_started_at;

  store.writeFile(target, JSON.stringify(existing, null, 2));
}

/**
 * Add a degradation event to the session state.
 * Tracks components operating in degraded mode after recoverable errors.
 *
 * @param {object} store - Store abstraction
 * @param {{ component: string, reason: string, state?: string }} entry
 * @param {string} [filePath] - Override path to session-state.json
 */
function addDegradationEntry(store, entry, filePath) {
  const target = filePath || DEFAULT_SESSION_FILE;
  const dir = path.dirname(target);
  store.mkdirp(dir);

  let existing: Record<string, unknown> = {};
  if (store.exists(target)) {
    try {
      existing = JSON.parse(store.readFile(target));
    } catch {
      existing = {};
    }
  }

  const log: Array<{ timestamp: string; component: string; reason: string; state: string | null }> =
    Array.isArray(existing.degradation_log)
      ? (existing.degradation_log as Array<{
          timestamp: string;
          component: string;
          reason: string;
          state: string | null;
        }>)
      : [];
  log.push({
    timestamp: new Date().toISOString(),
    component: entry.component,
    reason: entry.reason,
    state: entry.state || null,
  });
  existing.degradation_log = log;

  store.writeFile(target, JSON.stringify(existing, null, 2));
}

export {
  DEFAULT_SESSION_FILE,
  DEFAULT_HISTORY_FILE,
  loadSessionState,
  saveSessionState,
  createAutoPersist,
  saveRunHistory,
  loadRunHistory,
  saveTransitionIntent,
  saveTransitionComplete,
  addDegradationEntry,
};
