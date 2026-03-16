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

import { loadFlows } from './flow-loader';
import {
  STATES as _STATES,
  EVENTS as _EVENTS,
  StateMachine,
  buildTransitionMap as _buildTransitionMap,
  createStateMachine,
  createCombinationMachine as _createCombinationMachine,
  createHotfixMachine as _createHotfixMachine,
} from './state-machine';
import {
  loadSessionState,
  saveSessionState,
  createAutoPersist,
  saveRunHistory,
  loadRunHistory,
  saveTransitionIntent,
  saveTransitionComplete,
} from './state-persistence';
import { runGate } from './gate-validator';
import { runSprintGate } from './sprint-gate';
import { loadTemplate } from './template-loader';

/**
 * Engine hook callbacks for extensibility without modifying the core loop.
 * beforeTransition hooks fire synchronously before the FSM advances.
 * afterTransition hooks fire after the FSM has advanced and state is persisted.
 * Failures in afterTransition/onError hooks are logged but do not roll back.
 */
interface EngineHooks {
  beforeTransition?: ((from: string, to: string) => void)[];
  afterTransition?: ((event: { from: string; to: string; timestamp: string }) => void)[];
  onGateResult?: ((state: string, result: Record<string, unknown>) => void)[];
  onError?: ((event: { from: string; reason: string }) => void)[];
}

/**
 * @typedef {object} EngineOptions
 * @property {object} store - File store abstraction (read/write/exists/mkdirp)
 * @property {Function} [sseNotify] - SSE broadcast function (eventType, data)
 * @property {string} [flowsPath] - Override path to flows.yaml
 * @property {string} [sessionPath] - Override path to session-state.json
 * @property {string} [templateName] - Template to load (default: 'sdlc')
 * @property {string} [templatesDir] - Override templates base directory
 * @property {EngineHooks} [hooks] - Transition hook callbacks
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
function createEngine(options: Record<string, unknown>) {
  const {
    store,
    sseNotify,
    flowsPath,
    sessionPath,
    templateName,
    templatesDir,
    hooks: userHooks,
  } = options as {
    store: {
      exists(p: string): boolean;
      readFile(p: string): string;
      writeFile(p: string, d: string): void;
      mkdirp(p: string): void;
    };
    sseNotify?: (event: string, data: Record<string, unknown>) => void;
    flowsPath?: string;
    sessionPath?: string;
    templateName?: string;
    templatesDir?: string;
    hooks?: EngineHooks;
  };

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
  const sseForward =
    sseNotify || ((() => {}) as (event: string, data: Record<string, unknown>) => void);

  // Build resolved hooks — SSE transition/error broadcasts are now hooks
  const resolvedHooks = {
    beforeTransition: (userHooks && userHooks.beforeTransition) || [],
    afterTransition: [
      ...(sseNotify
        ? [
            (event: { from: string; to: string; timestamp: string }) =>
              sseForward('orchestrator:transition', { event: 'transition', ...event }),
          ]
        : []),
      ...((userHooks && userHooks.afterTransition) || []),
    ],
    onGateResult: (userHooks && userHooks.onGateResult) || [],
    onError: [
      ...(sseNotify
        ? [
            (event: { from: string; reason: string }) =>
              sseForward('orchestrator:error', { event: 'error', ...event }),
          ]
        : []),
      ...((userHooks && userHooks.onError) || []),
    ],
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

  // Combined callbacks: hooks + auto-persist
  const combinedOnTransition = (event: Record<string, unknown>) => {
    // Non-transition events (gate_passed, crash_recovery) still use SSE directly
    if (event.event !== 'transition') {
      sseForward('orchestrator:transition', event);
    }
    // 'transition' events are handled by afterTransition hooks in advance()
    autoPersist.onTransition(event);
  };
  const combinedOnError = (event: Record<string, unknown>) => {
    // Error SSE is handled by onError hooks in advance()/error()
    autoPersist.onError(event);
  };

  // Track transition status for write-ahead persistence
  let transitionStatus: string | null =
    (sessionState && ((sessionState as Record<string, unknown>).transition_status as string)) ||
    null;

  // Create the state machine (crash recovery is handled by constructor)
  const smOptions: Record<string, unknown> = {
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
   * Fires beforeTransition hooks, persists write-ahead intent,
   * executes the transition, fires afterTransition hooks, then
   * marks the transition complete.
   *
   * @param {object} [gateResult] - Gate validation result for critic states
   * @returns {{ from: string, to: string, timestamp: string }}
   */
  function advance(gateResult?: Record<string, unknown>) {
    const from = machine.state;
    const to = machine.nextState;

    // Fire beforeTransition hooks (if any throws, abort + ERROR)
    for (const hook of resolvedHooks.beforeTransition) {
      try {
        hook(from, to);
      } catch (hookErr) {
        machine.error(`beforeTransition hook failed: ${(hookErr as Error).message}`);
        for (const h of resolvedHooks.onError) {
          try {
            h({ from, reason: (hookErr as Error).message });
          } catch {
            /* logged, not fatal */
          }
        }
        throw hookErr;
      }
    }

    // Write-ahead: persist transition intent
    saveTransitionIntent(store, to, sessionPath);
    transitionStatus = 'IN_PROGRESS';

    try {
      const result = machine.advance(gateResult);

      // Fire afterTransition hooks (errors logged, no rollback)
      for (const hook of resolvedHooks.afterTransition) {
        try {
          hook(result);
        } catch {
          /* logged, not fatal */
        }
      }

      // Write-ahead: mark transition complete
      saveTransitionComplete(store, sessionPath);
      transitionStatus = 'COMPLETE';

      return result;
    } catch (err) {
      transitionStatus = null;
      // Fire onError hooks
      for (const hook of resolvedHooks.onError) {
        try {
          hook({ from, reason: (err as Error).message });
        } catch {
          /* logged, not fatal */
        }
      }
      throw err;
    }
  }

  /**
   * Force the machine into ERROR state.
   * @param {string} reason
   */
  function error(reason: string) {
    const prevState = machine.state;
    machine.error(reason);
    for (const hook of resolvedHooks.onError) {
      try {
        hook({ from: prevState, reason });
      } catch {
        /* logged, not fatal */
      }
    }
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
      transitionStatus: transitionStatus,
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
  function archiveCurrentRun(endStatus: string) {
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
  function reset(newMode: string, phases?: string[]) {
    archiveCurrentRun('RESET');
    const smOpts: Record<string, unknown> = {
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
  function validateGate(deliverables: string[], opts: Record<string, unknown> = {}) {
    const criticState = machine.state;
    const gateOpts: Record<string, unknown> = { criticState, deliverables, ...opts };
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

    // Fire onGateResult hooks
    for (const hook of resolvedHooks.onGateResult) {
      try {
        hook(criticState, result);
      } catch {
        /* logged, not fatal */
      }
    }

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
  function sprintGate(opts: Record<string, unknown> = {}) {
    if (template && template.decisionCategories && !opts.templateConfig) {
      opts = { ...opts, templateConfig: { decisionCategories: template.decisionCategories } };
    }
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

export { createEngine };
