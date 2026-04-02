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
import { getDurableDataStore } from '../../src/webapp/services/durable-data-store';

// Default session-state.json location
const DEFAULT_SESSION_DIR = path.resolve(__dirname, '..', '..', 'BusinessDocs', 'session');
const DEFAULT_SESSION_FILE = path.join(DEFAULT_SESSION_DIR, 'session-state.json');
const DEFAULT_HISTORY_FILE = path.join(DEFAULT_SESSION_DIR, 'run-history.json');

const LEGACY_STATUS_ALIASES = Object.freeze({
  'PHASE-1': 'PHASE_1',
  'PHASE-2': 'PHASE_2',
  'PHASE-3': 'PHASE_3',
  'PHASE-4': 'PHASE_4',
  'CRITIC-1': 'CRITIC_1',
  'CRITIC-2': 'CRITIC_2',
  'CRITIC-3': 'CRITIC_3',
  'CRITIC-4': 'CRITIC_4',
  'SPRINT-GATE': 'SPRINT_GATE',
  'PHASE-5': 'PHASE_5_EXECUTING',
  'PHASE-5-EXECUTING': 'PHASE_5_EXECUTING',
  ONBOARDING_COMPLETE: 'PHASE_1',
  'ONBOARDING-COMPLETE': 'PHASE_1',
  COMPLETE: 'COMPLETED',
});

const LEGACY_MODE_ALIASES = Object.freeze({
  'CREATE-BUSINESS': 'CREATE_BUSINESS',
  'CREATE BUSINESS': 'CREATE_BUSINESS',
  'CREATE-TECH': 'CREATE_TECH',
  'CREATE TECH': 'CREATE_TECH',
  'CREATE-UX': 'CREATE_UX',
  'CREATE UX': 'CREATE_UX',
  'CREATE-MARKETING': 'CREATE_MARKETING',
  'CREATE MARKETING': 'CREATE_MARKETING',
  'SCOPE-CHANGE': 'SCOPE_CHANGE',
  'SCOPE CHANGE': 'SCOPE_CHANGE',
});

function normalizeLegacyStatus(status: unknown): unknown {
  if (typeof status !== 'string') {
    return status;
  }

  const trimmed = status.trim();
  if (trimmed === '') {
    return status;
  }

  const upper = trimmed.toUpperCase();
  const alias = LEGACY_STATUS_ALIASES[upper as keyof typeof LEGACY_STATUS_ALIASES];
  if (alias) {
    return alias;
  }

  return upper;
}

function normalizeLegacyMode(mode: unknown): unknown {
  if (typeof mode !== 'string') {
    return mode;
  }

  const trimmed = mode.trim();
  if (trimmed === '') {
    return mode;
  }

  const upper = trimmed.toUpperCase();
  const alias = LEGACY_MODE_ALIASES[upper as keyof typeof LEGACY_MODE_ALIASES];
  if (alias) {
    return alias;
  }

  return upper.replace(/[\s-]+/g, '_');
}

function migrateLegacySessionSnapshot(parsed: Record<string, unknown>): Record<string, unknown> {
  const migrated: Record<string, unknown> = {
    ...parsed,
    status: normalizeLegacyStatus(parsed.status),
    mode: normalizeLegacyMode(parsed.mode),
  };

  if (Array.isArray(parsed.state_history)) {
    migrated.state_history = parsed.state_history.map((item) => {
      if (!item || typeof item !== 'object') {
        return item;
      }

      const event = item as Record<string, unknown>;
      return {
        ...event,
        from: normalizeLegacyStatus(event.from),
        to: normalizeLegacyStatus(event.to),
      };
    });
  }

  return migrated;
}

function resolveDurableProjectRoot(target: string): string | null {
  const normalized = target.replace(/\\/g, '/');
  const marker = '/BusinessDocs/';
  const idx = normalized.lastIndexOf(marker);
  if (idx < 0) {
    return null;
  }
  return target.slice(0, idx);
}

function syncDurableStateSnapshot(target: string, payload: Record<string, unknown>): void {
  const projectRoot = resolveDurableProjectRoot(target);
  if (!projectRoot) return;

  const durableStore = getDurableDataStore(projectRoot);
  durableStore.syncWorkflowRunFromState(payload);
  durableStore.saveControlPlaneSnapshot({
    snapshotType: 'session_state',
    scope: path.relative(projectRoot, target).replace(/\\/g, '/'),
    payload,
  });
}

function syncDurableRunHistory(target: string, runEntry: Record<string, unknown>): void {
  const projectRoot = resolveDurableProjectRoot(target);
  if (!projectRoot) return;

  const durableStore = getDurableDataStore(projectRoot);
  durableStore.syncWorkflowRunFromState({
    mode: runEntry.mode,
    status: runEntry.status,
    state_history: runEntry.state_history,
    gate_results: runEntry.gate_results,
    initiated_at: runEntry.started_at,
    last_updated: runEntry.ended_at || runEntry.started_at,
  });
  durableStore.saveControlPlaneSnapshot({
    snapshotType: 'run_history_entry',
    scope: `${String(runEntry.mode || 'unknown')}:${String(runEntry.started_at || 'unknown')}`,
    payload: runEntry,
  });
}

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
    const parsed = migrateLegacySessionSnapshot(JSON.parse(raw));

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
    flow_version:
      serializedState.flow_version ||
      (typeof existing.flow_version === 'string' ? existing.flow_version : undefined),
    flow_source:
      serializedState.flow_source ||
      (typeof existing.flow_source === 'string' ? existing.flow_source : undefined),
    flow_manifest_version:
      serializedState.flow_manifest_version ||
      (typeof existing.flow_manifest_version === 'string'
        ? existing.flow_manifest_version
        : undefined),
    flow_pack_id:
      serializedState.flow_pack_id ||
      (typeof existing.flow_pack_id === 'string' ? existing.flow_pack_id : undefined),
    flow_pack_name:
      serializedState.flow_pack_name ||
      (typeof existing.flow_pack_name === 'string' ? existing.flow_pack_name : undefined),
    flow_pack_version:
      serializedState.flow_pack_version ||
      (typeof existing.flow_pack_version === 'string' ? existing.flow_pack_version : undefined),
    state_history: serializedState.state_history,
    gate_results: serializedState.gate_results,
    last_updated: serializedState.last_updated,
    governance_mode: serializedState.governance_mode || existing.governance_mode || undefined,
    degradation_log: existing.degradation_log || [],
  };

  store.writeFile(target, JSON.stringify(merged, null, 2));
  syncDurableStateSnapshot(target, merged as Record<string, unknown>);
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
function createAutoPersist(store, getStateMachine, filePath, onPersist, augmentSerializedState) {
  const persist = () => {
    const machine = getStateMachine();
    if (!machine) return;
    const serialized = machine.serialize();
    const augmented =
      typeof augmentSerializedState === 'function'
        ? { ...serialized, ...augmentSerializedState(serialized) }
        : serialized;
    saveSessionState(store, augmented, filePath);
    if (onPersist) onPersist(augmented);
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
  syncDurableRunHistory(target, runEntry as Record<string, unknown>);
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
function saveTransitionIntent(store, targetState, filePath, transitionId) {
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
    transition_id: transitionId || existing.transition_id || undefined,
  };

  store.writeFile(target, JSON.stringify(updated, null, 2));
  syncDurableStateSnapshot(target, updated);
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
  delete existing.transition_id;

  store.writeFile(target, JSON.stringify(existing, null, 2));
  syncDurableStateSnapshot(target, existing);
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
  syncDurableStateSnapshot(target, existing);
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
