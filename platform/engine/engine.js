'use strict';

/**
 * Orchestrator Engine — Integrates state machine, flow loader,
 * persistence, and SSE events (FEAT-05-A / AC-1, AC-6, AC-7)
 *
 * This is the top-level entry point for the orchestrator subsystem.
 * It wires together:
 *   - flow-loader.js (reads flows.yaml)
 *   - state-machine.js (drives transitions)
 *   - state-persistence.js (reads/writes session-state.json)
 *   - SSE notifications (pushes events to connected UI clients)
 *
 * @module orchestrator/engine
 */

const { loadFlows } = require('./flow-loader');
const {
  _STATES,
  _EVENTS,
  StateMachine,
  _buildTransitionMap,
  createStateMachine,
  _createCombinationMachine,
  _createHotfixMachine,
} = require('./state-machine');
const {
  loadSessionState,
  saveSessionState,
  createAutoPersist,
  saveRunHistory,
  loadRunHistory,
} = require('./state-persistence');
const { runGate } = require('./gate-validator');
const { runSprintGate } = require('./sprint-gate');
const { loadTemplate } = require('./template-loader');

/**
 * @typedef {object} EngineOptions
 * @property {object} store - File store abstraction (read/write/exists/mkdirp)
 * @property {Function} [sseNotify] - SSE broadcast function (eventType, data)
 * @property {string} [flowsPath] - Override path to flows.yaml
 * @property {string} [sessionPath] - Override path to session-state.json
 * @property {string} [templateName] - Template to load (default: 'sdlc')
 * @property {string} [templatesDir] - Override templates base directory
 */

/**
 * Create and initialize the orchestrator engine.
 *
 * 1. Loads template manifest and resolves template paths
 * 2. Loads flows.yaml (AC-1)
 * 3. Loads persisted session state for crash recovery (AC-7)
 * 4. Creates a StateMachine with auto-persist and SSE wiring (AC-6)
 *
 * @param {EngineOptions} options
 * @returns {{ machine: StateMachine, flows: object, template: object, advance: Function, error: Function, recover: Function, status: Function }}
 */
function createEngine(options) {
  const { store, sseNotify, flowsPath, sessionPath, templateName, templatesDir } = options;

  if (!store) throw new Error('Engine requires a store');

  // Load template manifest (defaults to 'sdlc')
  let template = null;
  try {
    template = loadTemplate(templateName, templatesDir);
  } catch (_err) {
    // Template loading is optional — fall back to hardcoded defaults
    template = null;
  }

  // AC-1: Load declarative flow definition
  const flows = loadFlows(store, flowsPath);

  // AC-7: Load persisted state for crash recovery
  const sessionState = loadSessionState(store, sessionPath);

  // Determine mode from persisted state or default to CREATE
  const mode = (sessionState && sessionState.mode) || 'CREATE';

  // Variable to hold the machine reference for autopersist closure
  let machine = null;

  // SSE bridge: forward state machine events to connected UI clients
  const sseForward = sseNotify || (() => {});
  const onTransition = (event) => {
    sseForward('orchestrator:transition', event);
  };
  const onError = (event) => {
    sseForward('orchestrator:error', event);
  };

  // Auto-persist: save to session-state.json on every transition/error
  const autoPersist = createAutoPersist(
    store,
    () => machine,
    sessionPath,
    (serialized) => {
      sseForward('orchestrator:state_saved', {
        status: serialized.status,
        last_updated: serialized.last_updated,
      });
    }
  );

  // Combined callbacks: SSE + auto-persist
  const combinedOnTransition = (event) => {
    onTransition(event);
    autoPersist.onTransition(event);
  };
  const combinedOnError = (event) => {
    onError(event);
    autoPersist.onError(event);
  };

  // Create the state machine (crash recovery is handled by constructor)
  const smOptions = {
    onTransition: combinedOnTransition,
    onError: combinedOnError,
  };
  if (template && template.modes) {
    smOptions.modeConfigs = template.modes;
  }
  machine = createStateMachine(mode, sessionState, smOptions);

  // ── Public API ──────────────────────────────────────────

  /**
   * Advance the state machine to the next state.
   * @param {object} [gateResult] - Gate validation result for critic states
   * @returns {{ from: string, to: string, timestamp: string }}
   */
  function advance(gateResult) {
    return machine.advance(gateResult);
  }

  /**
   * Force the machine into ERROR state.
   * @param {string} reason
   */
  function error(reason) {
    machine.error(reason);
  }

  /**
   * Recover from ERROR state.
   * @returns {string} The state recovered to
   */
  function recover() {
    return machine.recover();
  }

  /**
   * Get current engine status.
   * @returns {object}
   */
  function status() {
    return {
      state: machine.state,
      mode: machine.mode,
      nextState: machine.nextState,
      history: machine.history,
      elapsedMs: machine.elapsedMs,
      phaseMetadata: machine.stateMetadata(),
      serialized: machine.serialize(),
      templateName: template ? template.name : null,
    };
  }

  /**
   * Stop the running pipeline. Sets the machine to ERROR with a USER_STOPPED reason.
   * @returns {object} Updated engine status
   */
  function stop() {
    archiveCurrentRun('STOPPED');
    machine.error('USER_STOPPED');
    sseForward('orchestrator:stopped', { state: machine.state, mode: machine.mode });
    return status();
  }

  /** Archive the current run into run-history.json (if non-trivial). */
  function archiveCurrentRun(endStatus) {
    if (machine.history.length === 0) return; // nothing to archive
    const serialized = machine.serialize();
    saveRunHistory(
      store,
      {
        mode: serialized.mode,
        status: endStatus,
        started_at: serialized.started_at || serialized.last_updated,
        ended_at: new Date().toISOString(),
        state_history: serialized.state_history,
        gate_results: serialized.gate_results,
      },
      sessionPath ? sessionPath.replace(/session-state\.json$/, 'run-history.json') : undefined
    );
  }

  /**
   * Reset the engine with a new mode.
   * Creates a fresh state machine and persists the new state.
   *
   * @param {string} newMode - Command mode
   * @param {string[]} [phases] - Override phases for combination runs
   * @returns {object} New engine status
   */
  function reset(newMode, phases) {
    archiveCurrentRun('RESET');
    const smOpts = {
      mode: newMode,
      onTransition: combinedOnTransition,
      onError: combinedOnError,
    };
    if (template && template.modes) {
      smOpts.modeConfigs = template.modes;
    }
    if (phases && phases.length > 0) {
      smOpts.phases = phases;
      machine = new StateMachine(smOpts);
    } else {
      machine = createStateMachine(newMode, null, smOpts);
    }

    // Persist the fresh state
    saveSessionState(store, machine.serialize(), sessionPath);
    sseForward('orchestrator:reset', { mode: newMode, state: machine.state });

    return status();
  }

  /**
   * Run gate validation for the current critic state (FEAT-05-C).
   * Validates deliverables against contracts and guardrails,
   * emits SSE events, and returns a structured result.
   *
   * @param {string[]} deliverables - Paths to deliverable files to validate
   * @param {object} [opts] - Override contractsDir / guardrailsDir
   * @returns {{verdict: string, violations: Array, questionnaireRequests: Array, summary: object}}
   */
  function validateGate(deliverables, opts = {}) {
    const criticState = machine.state;
    const gateOpts = { criticState, deliverables, ...opts };
    if (template) {
      if (!opts.contractsDir && template.contractsDir) {
        gateOpts.contractsDir = template.contractsDir;
      }
      if (!opts.guardrailsDir && template.guardrailsDir) {
        gateOpts.guardrailsDir = template.guardrailsDir;
      }
      if (!opts.criticToPhase && template.criticToPhase) {
        gateOpts.criticToPhase = template.criticToPhase;
      }
      if (!opts.phaseContracts && template.phaseContracts) {
        gateOpts.phaseContracts = template.phaseContracts;
      }
      if (!opts.phaseGuardrails && template.phaseGuardrails) {
        gateOpts.phaseGuardrails = template.phaseGuardrails;
      }
    }
    const result = runGate(store, gateOpts);

    // AC-7: Emit SSE events for gate results
    if (result.verdict === 'APPROVED') {
      sseForward('orchestrator:gate_passed', {
        criticState,
        phase: result.summary.phase,
        deliverableCount: result.summary.deliverableCount,
        timestamp: result.summary.timestamp,
      });
    } else {
      sseForward('orchestrator:gate_failed', {
        criticState,
        phase: result.summary.phase,
        violationCount: result.summary.totalViolations,
        bySeverity: result.summary.bySeverity,
        questionnaireRequestCount: result.summary.questionnaireRequestCount,
        timestamp: result.summary.timestamp,
      });
    }

    return result;
  }

  /**
   * Run the Sprint Gate readiness check (FEAT-05-D).
   * Validates Definition of Ready, loads decisions, injects lessons-learned,
   * checks velocity capacity, and scans for open blockers.
   *
   * @param {object} opts
   * @param {string} opts.sprintId - e.g. 'SP-5'
   * @param {Array<object>} opts.stories - Sprint backlog items
   * @param {number} [opts.plannedItems] - Override planned item count
   * @param {object} [opts.paths] - Override file paths
   * @returns {{verdict: string, blockers: Array, steps: object, summary: object}}
   */
  function sprintGate(opts = {}) {
    const result = runSprintGate(store, opts);

    if (result.verdict === 'READY') {
      sseForward('orchestrator:sprint_gate_ready', {
        sprintId: result.summary.sprintId,
        storyCount: result.summary.storyCount,
        lessonsInjected: result.summary.lessonsInjected,
        velocityRatio: result.summary.velocityRatio,
        timestamp: result.summary.timestamp,
      });
    } else {
      sseForward('orchestrator:sprint_gate_blocked', {
        sprintId: result.summary.sprintId,
        blockerCount: result.summary.totalBlockers,
        openBlockerCount: result.summary.openBlockerCount,
        timestamp: result.summary.timestamp,
      });
    }

    return result;
  }

  /**
   * Load historical run records.
   * @returns {Array<object>}
   */
  function runHistory() {
    return loadRunHistory(
      store,
      sessionPath ? sessionPath.replace(/session-state\.json$/, 'run-history.json') : undefined
    );
  }

  return {
    machine,
    flows,
    template,
    advance,
    error,
    recover,
    status,
    stop,
    reset,
    validateGate,
    sprintGate,
    runHistory,
  };
}

module.exports = { createEngine };
