/**
 * Orchestrator State Machine Engine (FEAT-05-A)
 *
 * Drives the multi-agent pipeline through well-defined states.
 * Reads flow definition, manages transitions, validates gates,
 * and persists current state to session-state.json.
 *
 * Supported command modes: CREATE, AUDIT, FEATURE, SCOPE_CHANGE, HOTFIX
 */

import fs from 'node:fs';
import { FLOWS_PATH, validateCanonicalFlows } from './flow-schema';

// ─── State Definitions ──────────────────────────────────────
const STATES = Object.freeze({
  IDLE: 'IDLE',
  ONBOARDING: 'ONBOARDING',
  PHASE_1: 'PHASE_1',
  CRITIC_1: 'CRITIC_1',
  PHASE_2: 'PHASE_2',
  CRITIC_2: 'CRITIC_2',
  PHASE_3: 'PHASE_3',
  CRITIC_3: 'CRITIC_3',
  PHASE_4: 'PHASE_4',
  CRITIC_4: 'CRITIC_4',
  SYNTHESIS: 'SYNTHESIS',
  SPRINT_GATE: 'SPRINT_GATE',
  PHASE_5_EXECUTING: 'PHASE_5_EXECUTING',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR',
});

type ModeConfig = { phases: string[]; label: string };

interface OrchestrationFlowDefinition {
  source: 'legacy' | 'schema';
  version: string;
  states: string[];
  fullFlow: string[];
  structuralStates: string[];
  modes: Record<string, ModeConfig>;
}

// ─── Transition Table ────────────────────────────────────────
// Full CREATE cycle: IDLE → ONBOARDING → PHASE_1 → CRITIC_1 → … → COMPLETED
const FULL_FLOW = [
  STATES.IDLE,
  STATES.ONBOARDING,
  STATES.PHASE_1,
  STATES.CRITIC_1,
  STATES.PHASE_2,
  STATES.CRITIC_2,
  STATES.PHASE_3,
  STATES.CRITIC_3,
  STATES.PHASE_4,
  STATES.CRITIC_4,
  STATES.SYNTHESIS,
  STATES.SPRINT_GATE,
  STATES.PHASE_5_EXECUTING,
  STATES.COMPLETED,
];

/**
 * Build the set of allowed transitions for a given scope.
 * @param {string[]} phases - Subset of phases to include, e.g. ['PHASE_2','PHASE_3']
 * @returns {Map<string,string>} from-state → to-state
 */
// States always included regardless of selected phases
const STRUCTURAL_STATES: Set<string> = new Set([
  STATES.IDLE,
  STATES.ONBOARDING,
  STATES.SYNTHESIS,
  STATES.SPRINT_GATE,
  STATES.PHASE_5_EXECUTING,
  STATES.COMPLETED,
]);

const LEGACY_FLOW_VERSION = 'legacy-v1';
const FLOW_SOURCE_ENV = 'ORCHESTRATOR_FLOW_SOURCE';
const FLOW_SOURCE_VALUES = ['legacy', 'schema'];

const LEGACY_FLOW_DEFINITION: OrchestrationFlowDefinition = {
  source: 'legacy',
  version: LEGACY_FLOW_VERSION,
  states: [...Object.values(STATES)],
  fullFlow: [...FULL_FLOW],
  structuralStates: [...STRUCTURAL_STATES],
  modes: {},
};

let cachedSchemaFlowDefinition: OrchestrationFlowDefinition | null = null;

function isPhaseOrMatchingCritic(state: string, phaseSet: Set<string>) {
  if (phaseSet.has(state)) return true;
  const criticMatch = state.match(/^CRITIC_(\d)$/);
  return criticMatch ? phaseSet.has(`PHASE_${criticMatch[1]}`) : false;
}

function validateFlowDefinition(definition: OrchestrationFlowDefinition) {
  const stateSet = new Set(definition.states);

  if (!definition.fullFlow.length) {
    throw new Error('Flow definition is invalid: fullFlow must include at least one state.');
  }

  if (definition.fullFlow[0] !== STATES.IDLE) {
    throw new Error(
      `Flow definition is invalid: fullFlow must start with ${STATES.IDLE}, received ${definition.fullFlow[0]}.`
    );
  }

  if (definition.fullFlow[definition.fullFlow.length - 1] !== STATES.COMPLETED) {
    throw new Error(
      `Flow definition is invalid: fullFlow must end with ${STATES.COMPLETED}, received ${definition.fullFlow[definition.fullFlow.length - 1]}.`
    );
  }

  for (const state of definition.fullFlow) {
    if (!stateSet.has(state)) {
      throw new Error(`Flow definition is invalid: fullFlow references unknown state "${state}".`);
    }
  }

  for (const state of definition.structuralStates) {
    if (!stateSet.has(state)) {
      throw new Error(
        `Flow definition is invalid: structuralStates references unknown state "${state}".`
      );
    }
  }
}

function assertSchemaParity(definition: OrchestrationFlowDefinition) {
  const fullFlowMatches = JSON.stringify(definition.fullFlow) === JSON.stringify(FULL_FLOW);
  if (!fullFlowMatches) {
    throw new Error(
      'Schema flow parity check failed: fullFlow does not match legacy FULL_FLOW constants.'
    );
  }

  const legacyModes = MODE_CONFIGS as Record<string, ModeConfig>;
  const schemaModes = definition.modes;
  const legacyModeNames = Object.keys(legacyModes);

  for (const modeName of legacyModeNames) {
    const legacy = legacyModes[modeName];
    const schema = schemaModes[modeName];
    if (!schema) {
      throw new Error(`Schema flow parity check failed: mode "${modeName}" is missing.`);
    }
    const phasesMatch = JSON.stringify(schema.phases || []) === JSON.stringify(legacy.phases || []);
    if (!phasesMatch) {
      throw new Error(
        `Schema flow parity check failed: mode "${modeName}" phases differ from legacy MODE_CONFIGS.`
      );
    }
  }
}

function loadSchemaFlowDefinition(): OrchestrationFlowDefinition {
  if (cachedSchemaFlowDefinition) {
    return cachedSchemaFlowDefinition;
  }

  const validation = validateCanonicalFlows();
  if (!validation.valid) {
    const first = validation.errors[0];
    const detail =
      first && typeof first === 'object' && 'message' in first
        ? String((first as Record<string, unknown>).message)
        : 'unknown validation error';
    throw new Error(`Schema flow validation failed at startup: ${detail}`);
  }

  const raw = JSON.parse(fs.readFileSync(FLOWS_PATH, 'utf8')) as {
    schemaVersion?: string;
    states?: string[];
    fullFlow?: string[];
    structuralStates?: string[];
    modes?: Record<string, { phases?: string[]; label?: string }>;
  };

  const modes: Record<string, ModeConfig> = {};
  for (const [modeName, modeConfig] of Object.entries(raw.modes || {})) {
    modes[modeName] = {
      phases: Array.isArray(modeConfig.phases) ? modeConfig.phases : [],
      label: typeof modeConfig.label === 'string' ? modeConfig.label : modeName,
    };
  }

  const schemaDefinition: OrchestrationFlowDefinition = {
    source: 'schema',
    version: typeof raw.schemaVersion === 'string' ? raw.schemaVersion : 'schema-unknown',
    states: Array.isArray(raw.states) ? raw.states : [],
    fullFlow: Array.isArray(raw.fullFlow) ? raw.fullFlow : [],
    structuralStates: Array.isArray(raw.structuralStates) ? raw.structuralStates : [],
    modes,
  };

  validateFlowDefinition(schemaDefinition);
  assertSchemaParity(schemaDefinition);
  cachedSchemaFlowDefinition = schemaDefinition;
  return schemaDefinition;
}

function resolveFlowSource(requestedSource?: unknown): 'legacy' | 'schema' {
  if (requestedSource !== undefined && requestedSource !== null) {
    const normalized = String(requestedSource).trim().toLowerCase();
    if (normalized === '') return 'legacy';
    if (!FLOW_SOURCE_VALUES.includes(normalized)) {
      throw new Error(
        `Invalid flow source "${String(requestedSource)}". Valid values: ${FLOW_SOURCE_VALUES.join(', ')}.`
      );
    }
    return normalized as 'legacy' | 'schema';
  }

  const envValue = process.env[FLOW_SOURCE_ENV];
  if (!envValue) {
    return 'legacy';
  }

  const normalized = envValue.trim().toLowerCase();
  if (!FLOW_SOURCE_VALUES.includes(normalized)) {
    throw new Error(
      `Invalid ${FLOW_SOURCE_ENV} value "${envValue}". Valid values: ${FLOW_SOURCE_VALUES.join(', ')}.`
    );
  }

  return normalized as 'legacy' | 'schema';
}

function getOrchestrationFlowDefinition(
  options: {
    flowSource?: unknown;
    flowVersion?: unknown;
  } = {}
): OrchestrationFlowDefinition {
  const requestedVersion =
    typeof options.flowVersion === 'string' && options.flowVersion.trim() !== ''
      ? options.flowVersion.trim()
      : null;
  if (requestedVersion) {
    if (requestedVersion === LEGACY_FLOW_DEFINITION.version) {
      return LEGACY_FLOW_DEFINITION;
    }

    const schemaDefinition = loadSchemaFlowDefinition();
    if (requestedVersion === schemaDefinition.version) {
      return schemaDefinition;
    }

    throw new Error(
      `Unknown flow version "${requestedVersion}" in persisted state. Known versions: ${LEGACY_FLOW_DEFINITION.version}, ${schemaDefinition.version}.`
    );
  }

  const source = resolveFlowSource(options.flowSource);
  if (source === 'schema') {
    return loadSchemaFlowDefinition();
  }
  return LEGACY_FLOW_DEFINITION;
}

function buildTransitionMap(phases: string[], flowDefinition = LEGACY_FLOW_DEFINITION) {
  validateFlowDefinition(flowDefinition);
  const phaseSet = new Set(phases);
  const structuralStateSet = new Set(flowDefinition.structuralStates);
  const flow = flowDefinition.fullFlow.filter(
    (s) => structuralStateSet.has(s) || isPhaseOrMatchingCritic(s, phaseSet)
  );

  if (flow.length < 2) {
    throw new Error(
      `Flow definition produced an invalid transition chain for phases [${phases.join(', ')}].`
    );
  }

  const map = new Map();
  for (let i = 0; i < flow.length - 1; i++) {
    map.set(flow[i], flow[i + 1]);
  }
  return map;
}

// ─── Command Mode Configurations ─────────────────────────────
const MODE_CONFIGS = Object.freeze({
  CREATE: {
    phases: ['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4'],
    label: 'Full CREATE cycle',
  },
  AUDIT: {
    phases: ['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4'],
    label: 'Full AUDIT cycle',
  },
  CREATE_BUSINESS: {
    phases: ['PHASE_1'],
    label: 'Business-only CREATE',
  },
  CREATE_TECH: {
    phases: ['PHASE_2'],
    label: 'Tech-only CREATE',
  },
  CREATE_UX: {
    phases: ['PHASE_3'],
    label: 'UX-only CREATE',
  },
  CREATE_MARKETING: {
    phases: ['PHASE_4'],
    label: 'Marketing-only CREATE',
  },
  FEATURE: {
    phases: ['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4'],
    label: 'FEATURE full cycle',
  },
  SCOPE_CHANGE: {
    // Phases determined dynamically based on DIMENSION
    phases: [],
    label: 'Scope change re-analysis',
  },
  HOTFIX: {
    // Bypasses gates, goes straight to implementation
    phases: [],
    label: 'Emergency HOTFIX',
  },
});

LEGACY_FLOW_DEFINITION.modes = Object.freeze({ ...MODE_CONFIGS }) as Record<string, ModeConfig>;

// ─── Events ──────────────────────────────────────────────────
const EVENTS = Object.freeze({
  TRANSITION: 'transition',
  ERROR: 'error',
  GATE_PASSED: 'gate_passed',
  GATE_FAILED: 'gate_failed',
  CRASH_RECOVERY: 'crash_recovery',
});

// ─── Valid State Set (for validation) ─────────────────────────
const VALID_STATES = new Set(Object.values(STATES));

// ─── State Machine Class ─────────────────────────────────────

class StateMachine {
  _mode: string;
  _modeConfigs: Record<string, { phases: string[]; label: string }>;
  _flowDefinition: OrchestrationFlowDefinition;
  _flowVersion: string;
  _flowSource: 'legacy' | 'schema';
  _onTransition: (...args: unknown[]) => void;
  _onError: (...args: unknown[]) => void;
  _history: Array<{ from: string; to: string; timestamp: string; reason?: string }>;
  _gateResults: Map<string, Record<string, unknown>>;
  _transitioning: boolean;
  _startedAt: string;
  _transitionMap: Map<string, string>;
  _state: string;

  /**
   * @param {object} options
   * @param {string} options.mode - Command mode (CREATE, AUDIT, etc.)
   * @param {string[]} [options.phases] - Override phases for partial/combo runs
   * @param {object} [options.sessionState] - Existing session state to resume from
   * @param {Function} [options.onTransition] - Callback for state changes
   * @param {Function} [options.onError] - Callback for errors
   */
  constructor(options: Record<string, unknown> = {}) {
    const {
      mode = 'CREATE',
      phases,
      flowSource,
      flowVersion,
      modeConfigs,
      sessionState,
      onTransition,
      onError,
    } = options as {
      mode?: string;
      phases?: string[];
      flowSource?: string;
      flowVersion?: string;
      modeConfigs?: Record<string, { phases: string[]; label: string }>;
      sessionState?: Record<string, unknown>;
      onTransition?: (...args: unknown[]) => void;
      onError?: (...args: unknown[]) => void;
    };

    this._mode = mode as string;
    this._flowDefinition = getOrchestrationFlowDefinition({ flowSource, flowVersion });
    this._flowVersion = this._flowDefinition.version;
    this._flowSource = this._flowDefinition.source;
    this._modeConfigs = modeConfigs || this._flowDefinition.modes;
    this._onTransition = onTransition || (() => {});
    this._onError = onError || (() => {});
    this._history = [];
    this._gateResults = new Map();
    this._transitioning = false;
    this._startedAt = new Date().toISOString();

    this._transitionMap = StateMachine._buildTransitions(
      mode as string,
      phases,
      this._modeConfigs,
      this._flowDefinition
    );
    this._state = this._recoverOrInit(sessionState as Record<string, unknown>);
  }

  static _buildTransitions(
    mode: string,
    phases: string[] | undefined,
    modeConfigs: Record<string, { phases: string[]; label: string }>,
    flowDefinition: OrchestrationFlowDefinition
  ) {
    const configs = modeConfigs || MODE_CONFIGS;
    const config = configs[mode];
    if (!config) {
      const valid = Object.keys(configs).join(', ');
      throw new Error(`Unknown mode: ${mode}. Valid modes: ${valid}`);
    }
    return buildTransitionMap(phases || config.phases, flowDefinition);
  }

  /** @private Restore from session or start at IDLE */
  _recoverOrInit(sessionState: Record<string, unknown>) {
    if (sessionState && sessionState.status && sessionState.status !== STATES.IDLE) {
      // Validate the persisted state is a known state
      const validStatesForFlow = new Set(this._flowDefinition.states);
      if (!validStatesForFlow.has(sessionState.status as string)) {
        this._emit(EVENTS.ERROR, {
          from: 'UNKNOWN',
          reason: `Corrupt session state: unknown status "${sessionState.status}"`,
        });
        return STATES.IDLE;
      }
      this._history = Array.isArray(sessionState.state_history) ? sessionState.state_history : [];
      if (sessionState.started_at) {
        this._startedAt = sessionState.started_at as string;
      }
      this._emit(EVENTS.CRASH_RECOVERY, {
        recoveredState: sessionState.status,
        timestamp: new Date().toISOString(),
      });
      return sessionState.status as string;
    }
    return STATES.IDLE;
  }

  /** @returns {string} Current state */
  get state() {
    return this._state;
  }

  /** @returns {string} Command mode */
  get mode() {
    return this._mode;
  }

  /** @returns {string} Flow version used by this machine instance */
  get flowVersion() {
    return this._flowVersion;
  }

  /** @returns {'legacy' | 'schema'} Flow source used by this machine instance */
  get flowSource() {
    return this._flowSource;
  }

  /** @returns {Array<{from: string, to: string, timestamp: string}>} Transition history */
  get history() {
    return [...this._history];
  }

  /** @returns {string|null} Next valid state, or null if completed/error */
  get nextState() {
    return this._transitionMap.get(this._state) || null;
  }

  /** @returns {string} ISO timestamp when the machine was started/recovered */
  get startedAt() {
    return this._startedAt;
  }

  /** @returns {number} Elapsed milliseconds since machine was started */
  get elapsedMs() {
    return Date.now() - new Date(this._startedAt).getTime();
  }

  /**
   * Check if a transition to the given state is valid.
   * @param {string} targetState
   * @returns {boolean}
   */
  canTransition(targetState: string) {
    // ERROR state can only go back to the state it came from (via recover)
    if (this._state === STATES.ERROR) return false;
    if (this._state === STATES.COMPLETED) return false;
    return this._transitionMap.get(this._state) === targetState;
  }

  /**
   * Advance to the next state.
   * @param {object} [gateResult] - Optional gate validation result for critic states
   * @returns {{ from: string, to: string, timestamp: string }}
   * @throws {Error} If no valid transition exists or gate fails
   */
  advance(gateResult?: Record<string, unknown>) {
    // Prevent concurrent transitions
    if (this._transitioning) {
      throw new Error('Transition already in progress — concurrent advance() blocked');
    }
    this._transitioning = true;
    try {
      return this._doAdvance(gateResult);
    } finally {
      this._transitioning = false;
    }
  }

  /** @private Performs the actual transition (called inside lock) */
  _doAdvance(gateResult?: Record<string, unknown>) {
    const next = this._transitionMap.get(this._state);
    if (!next) {
      const err = new Error(
        `No valid transition from state "${this._state}". ` +
          (this._state === STATES.COMPLETED ? 'Pipeline is complete.' : 'State machine is stuck.')
      );
      this._handleError(err);
      throw err;
    }

    // Critic states require a passing gate result
    if (this._state.startsWith('CRITIC_') && gateResult) {
      this._gateResults.set(this._state, gateResult);
      if (gateResult.verdict !== 'APPROVED') {
        this._emit(EVENTS.GATE_FAILED, {
          state: this._state,
          verdict: gateResult.verdict,
          reason: gateResult.reason,
        });
        const err = new Error(
          `Gate failed at ${this._state}: ${gateResult.verdict} — ${gateResult.reason || 'no reason given'}`
        );
        this._handleError(err);
        throw err;
      }
      this._emit(EVENTS.GATE_PASSED, {
        state: this._state,
        verdict: gateResult.verdict,
      });
    }

    const from = this._state;
    const timestamp = new Date().toISOString();

    this._state = next;
    this._history.push({ from, to: next, timestamp });

    this._emit(EVENTS.TRANSITION, { from, to: next, timestamp });

    return { from, to: next, timestamp };
  }

  /**
   * Get metadata about all states in the current flow.
   * Returns each state with status (completed/current/pending) and agent info.
   * @returns {Array<{state: string, status: string, timestamp?: string}>}
   */
  stateMetadata() {
    const flow: string[] = [];
    let cursor: string | null = 'IDLE';
    while (cursor) {
      flow.push(cursor);
      cursor = this._transitionMap.get(cursor) || null;
    }

    const completedTransitions = new Map();
    for (const h of this._history) {
      if (h.to !== STATES.ERROR) {
        completedTransitions.set(h.from, h.timestamp);
      }
    }

    return flow.map((s) => {
      if (s === this._state) {
        return { state: s, status: 'current' };
      }
      const ts = completedTransitions.get(s);
      if (ts) {
        return { state: s, status: 'completed', timestamp: ts };
      }
      return { state: s, status: 'pending' };
    });
  }

  /**
   * Force the machine into ERROR state (e.g., unhandled agent failure).
   * @param {string} reason
   */
  error(reason: string) {
    const prev = this._state;
    this._state = STATES.ERROR;
    this._history.push({
      from: prev,
      to: STATES.ERROR,
      timestamp: new Date().toISOString(),
      reason,
    });
    this._emit(EVENTS.ERROR, { from: prev, reason });
  }

  /**
   * Recover from ERROR state back to the last known good state.
   * @returns {string} The state recovered to
   */
  recover() {
    if (this._state !== STATES.ERROR) {
      throw new Error('Can only recover from ERROR state');
    }
    // Find the last non-error state in history
    for (let i = this._history.length - 1; i >= 0; i--) {
      if (this._history[i].to !== STATES.ERROR) {
        this._state = this._history[i].to;
        break;
      }
      if (this._history[i].from !== STATES.ERROR) {
        this._state = this._history[i].from;
        break;
      }
    }
    // If no history, go back to IDLE
    if (this._state === STATES.ERROR) {
      this._state = STATES.IDLE;
    }
    this._emit(EVENTS.CRASH_RECOVERY, {
      recoveredState: this._state,
      timestamp: new Date().toISOString(),
    });
    return this._state;
  }

  /**
   * Serialize the state machine state for persistence.
   * @returns {object} Serializable state object
   */
  serialize() {
    return {
      status: this._state,
      mode: this._mode,
      flow_version: this._flowVersion,
      flow_source: this._flowSource,
      state_history: this._history,
      gate_results: Object.fromEntries(this._gateResults),
      started_at: this._startedAt,
      last_updated: new Date().toISOString(),
    };
  }

  // ─── Internal ────────────────────────────────────────────

  /** @private */
  _emit(event: string, data: Record<string, unknown>) {
    if (event === EVENTS.ERROR) {
      this._onError({ event, ...data });
    } else {
      this._onTransition({ event, ...data });
    }
  }

  /** @private */
  _handleError(err: Error) {
    this._emit(EVENTS.ERROR, {
      from: this._state,
      reason: err.message,
    });
  }
}

// ─── Factory Functions ───────────────────────────────────────

/**
 * Create a new state machine for a CREATE/AUDIT command.
 * @param {string} mode - 'CREATE' | 'AUDIT' | 'CREATE_BUSINESS' | etc.
 * @param {object} [sessionState] - Existing session state for crash recovery
 * @param {object} [callbacks] - { onTransition, onError }
 * @returns {StateMachine}
 */
function createStateMachine(
  mode: string,
  sessionState?: Record<string, unknown>,
  callbacks: Record<string, unknown> = {}
) {
  return new StateMachine({
    mode,
    sessionState,
    flowSource: callbacks.flowSource as string,
    flowVersion:
      (callbacks.flowVersion as string) ||
      (sessionState && typeof sessionState.flow_version === 'string'
        ? (sessionState.flow_version as string)
        : undefined),
    modeConfigs: callbacks.modeConfigs as Record<string, { phases: string[]; label: string }>,
    onTransition: callbacks.onTransition as (...args: unknown[]) => void,
    onError: callbacks.onError as (...args: unknown[]) => void,
  });
}

/**
 * Create a state machine for a combination command (e.g., CREATE TECH UX).
 * @param {string[]} disciplines - e.g. ['TECH', 'UX']
 * @param {object} [sessionState]
 * @param {object} [callbacks]
 * @returns {StateMachine}
 */
function createCombinationMachine(
  disciplines: string[],
  sessionState?: Record<string, unknown>,
  callbacks: Record<string, unknown> = {}
) {
  const DISCIPLINE_TO_PHASE = {
    BUSINESS: 'PHASE_1',
    TECH: 'PHASE_2',
    UX: 'PHASE_3',
    MARKETING: 'PHASE_4',
  };

  // Canonical order: BUSINESS → TECH → UX → MARKETING
  const canonicalOrder = ['BUSINESS', 'TECH', 'UX', 'MARKETING'];
  const sorted = canonicalOrder.filter((d) => disciplines.includes(d));
  const phases = sorted.map((d) => DISCIPLINE_TO_PHASE[d]);

  return new StateMachine({
    mode: 'CREATE',
    phases,
    sessionState,
    flowSource: callbacks.flowSource as string,
    flowVersion:
      (callbacks.flowVersion as string) ||
      (sessionState && typeof sessionState.flow_version === 'string'
        ? (sessionState.flow_version as string)
        : undefined),
    onTransition: callbacks.onTransition as (...args: unknown[]) => void,
    onError: callbacks.onError as (...args: unknown[]) => void,
  });
}

/**
 * Create a HOTFIX state machine (bypasses design phases, goes to implementation).
 * @param {object} [sessionState]
 * @param {object} [callbacks]
 * @returns {StateMachine}
 */
function createHotfixMachine(
  sessionState?: Record<string, unknown>,
  callbacks: Record<string, unknown> = {}
) {
  const machine = new StateMachine({
    mode: 'HOTFIX',
    phases: [],
    sessionState,
    flowSource: callbacks.flowSource as string,
    flowVersion:
      (callbacks.flowVersion as string) ||
      (sessionState && typeof sessionState.flow_version === 'string'
        ? (sessionState.flow_version as string)
        : undefined),
    onTransition: callbacks.onTransition as (...args: unknown[]) => void,
    onError: callbacks.onError as (...args: unknown[]) => void,
  });
  return machine;
}

export {
  STATES,
  EVENTS,
  MODE_CONFIGS,
  VALID_STATES,
  StateMachine,
  buildTransitionMap,
  createStateMachine,
  createCombinationMachine,
  createHotfixMachine,
  getOrchestrationFlowDefinition,
  LEGACY_FLOW_VERSION,
  FLOW_SOURCE_ENV,
};
