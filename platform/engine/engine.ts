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
  addDegradationEntry,
} from './state-persistence';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { runGate } from './gate-validator';
import { runSprintGate } from './sprint-gate';
import { loadTemplate } from './template-loader';
import { TransitionLeaseManager } from './transition-lease';
import { resolveRuntimeGateForCriticState, type RuntimePackGraph } from './runtime-pack';
import {
  appendTransitionEvent,
  defaultTransitionEventLogPath,
  readTransitionEvents,
  replayStateFromTransitionEvents,
} from './transition-event-log';
import {
  createArtifactRegistrationHook,
  type ArtifactDeclaration,
  type PhaseLineageConfig,
} from './artifact-registration';
import { ArtifactRegistry } from '../sdlc/artifacts';
import { loadGovernancePolicies, type GovernancePoliciesConfig } from './governance-config';
import { resolveIdentity, type ResolvedIdentity } from './identity';
import type { ProjectContext } from './workspace/types';
import { resolveExecutionMode, type ExecutionMode } from './execution-mode';

interface TemplateConfig {
  name?: string;
  modes?: Record<string, unknown>;
  phaseArtifacts?: Record<string, ArtifactDeclaration[]>;
  phaseLineage?: Record<string, PhaseLineageConfig>;
  contractsDir?: string;
  guardrailsDir?: string;
  criticToPhase?: Record<string, unknown>;
  phaseContracts?: Record<string, unknown>;
  phaseGuardrails?: Record<string, unknown>;
  decisionCategories?: Array<Record<string, unknown>>;
}

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

interface GitCommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

type GitCommandRunner = (args: string[], cwd: string) => GitCommandResult;

interface GateCommitMetadata {
  gateId: string;
  phaseId: string;
}

const PHASE_GATE_TRANSITION_MAP: Record<string, GateCommitMetadata> = {
  'CRITIC_1->PHASE_2': { gateId: 'gate.critic-risk-1', phaseId: 'PHASE_1' },
  'CRITIC_2->PHASE_3': { gateId: 'gate.critic-risk-2', phaseId: 'PHASE_2' },
  'CRITIC_3->PHASE_4': { gateId: 'gate.critic-risk-3', phaseId: 'PHASE_3' },
  'CRITIC_4->SYNTHESIS': { gateId: 'gate.critic-risk-4', phaseId: 'PHASE_4' },
};

function defaultGitRunner(args: string[], cwd: string): GitCommandResult {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
  };
}

function resolveGateCommitMetadata(
  from: string,
  to: string,
  runtimePackGraph?: RuntimePackGraph
): GateCommitMetadata | null {
  const runtimeGate = resolveRuntimeGateForCriticState(runtimePackGraph, from);
  if (runtimeGate && runtimeGate.before === to) {
    return {
      gateId: runtimeGate.id,
      phaseId: runtimeGate.evaluatedPhase,
    };
  }

  return PHASE_GATE_TRANSITION_MAP[`${from}->${to}`] || null;
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
 * @property {ProjectContext} [projectContext] - Multi-repo project context (M25-003)
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
    governancePoliciesPath,
    projectContext: inputProjectContext,
    transitionEventLogPath: customTransitionEventLogPath,
    transitionLeasePath: customTransitionLeasePath,
    transitionLeaseOwnerId: customTransitionLeaseOwnerId,
    transitionLeaseTtlMs: customTransitionLeaseTtlMs,
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
    governancePoliciesPath?: string;
    projectContext?: ProjectContext;
    artifactOutputDir?: string;
    gitRunner?: GitCommandRunner;
    autoCommitPhaseGates?: boolean;
    transitionEventLogPath?: string;
    transitionLeasePath?: string;
    transitionLeaseOwnerId?: string;
    transitionLeaseTtlMs?: number;
    executionMode?: string;
  };

  if (!store) throw new Error('Engine requires a store');

  // M25-003: Resolve project context (defaults to single-repo local mode)
  const projectContext: ProjectContext = inputProjectContext ?? {
    projectId: 'default',
    projectName: 'Local Project',
    workspaceId: 'default',
    repositories: [
      {
        repoId: 'local',
        repoName: 'current',
        provider: 'local',
        url: '.',
        defaultBranch: 'main',
        services: [],
        tags: [],
      },
    ],
  };

  const resolvedExecutionMode: ExecutionMode = resolveExecutionMode(
    typeof options.executionMode === 'string' ? options.executionMode : undefined
  );

  const artifactOutputDir =
    typeof options.artifactOutputDir === 'string' && options.artifactOutputDir.trim() !== ''
      ? options.artifactOutputDir.trim()
      : 'BusinessDocs';
  const gitRunner = (options.gitRunner as GitCommandRunner) || defaultGitRunner;
  const autoCommitPhaseGates =
    typeof options.autoCommitPhaseGates === 'boolean'
      ? options.autoCommitPhaseGates
      : process.env.NODE_ENV !== 'test';

  // Load template manifest (defaults to 'sdlc')
  let template: TemplateConfig | null = null;
  try {
    template = loadTemplate(templateName, templatesDir) as unknown as TemplateConfig;
  } catch (_err) {
    // Template loading is optional — fall back to hardcoded defaults
    template = null;
  }

  // AC-1: Load declarative flow definition
  const flows = loadFlows(store, flowsPath);
  const runtimePackGraph = flows.runtimeGraph;
  const runtimeFlowPack = {
    manifest_version:
      typeof (flows as Record<string, unknown>).manifest_version === 'string'
        ? ((flows as Record<string, unknown>).manifest_version as string)
        : '2.0',
    pack_id:
      typeof (flows as Record<string, unknown>).pack_id === 'string'
        ? ((flows as Record<string, unknown>).pack_id as string)
        : 'core-runtime',
    pack_name:
      typeof (flows as Record<string, unknown>).pack_name === 'string'
        ? ((flows as Record<string, unknown>).pack_name as string)
        : 'Core Runtime Pack',
    version:
      typeof (flows as Record<string, unknown>).version === 'string'
        ? ((flows as Record<string, unknown>).version as string)
        : '1.0.0',
  };

  // M4: Load governance policies (defaults to mode=off if file missing)
  const governanceConfig: GovernancePoliciesConfig = loadGovernancePolicies(
    store,
    governancePoliciesPath
  );

  // M4: Resolve current user identity for governance audit
  let resolvedIdentity: ResolvedIdentity | null = null;
  if (governanceConfig.governance_mode !== 'off') {
    resolvedIdentity = resolveIdentity(governanceConfig.identity);
  }

  // AC-7: Load persisted state for crash recovery
  const sessionState = (loadSessionState(store, sessionPath) || {}) as Record<string, unknown>;
  const transitionEventLogPath =
    typeof customTransitionEventLogPath === 'string' && customTransitionEventLogPath.trim() !== ''
      ? customTransitionEventLogPath.trim()
      : defaultTransitionEventLogPath(sessionPath);
  const transitionLeasePath =
    typeof customTransitionLeasePath === 'string' && customTransitionLeasePath.trim() !== ''
      ? customTransitionLeasePath.trim()
      : sessionPath
        ? (() => {
            const replaced = sessionPath.replace(/session-state\.json$/, 'transition-lease.json');
            return replaced === sessionPath
              ? path.join(path.dirname(sessionPath), 'transition-lease.json')
              : replaced;
          })()
        : undefined;
  const transitionLeaseOwnerId =
    typeof customTransitionLeaseOwnerId === 'string' && customTransitionLeaseOwnerId.trim() !== ''
      ? customTransitionLeaseOwnerId.trim()
      : `worker-${process.pid}`;
  const transitionLeaseTtlMs =
    typeof customTransitionLeaseTtlMs === 'number' && Number.isFinite(customTransitionLeaseTtlMs)
      ? Math.max(1000, customTransitionLeaseTtlMs)
      : 30_000;

  // Deterministic replay is only applied during recovery after an interrupted transition.
  const shouldReplayFromEventLog = sessionState.transition_status === 'IN_PROGRESS';
  if (shouldReplayFromEventLog) {
    const replayed = replayStateFromTransitionEvents(
      readTransitionEvents(store, transitionEventLogPath),
      'IDLE'
    );
    if (replayed.history.length > 0) {
      sessionState.status = replayed.state;
      sessionState.state_history = replayed.history;
    }
  }

  // Determine mode from persisted state or default to CREATE
  const mode = typeof sessionState.mode === 'string' ? sessionState.mode : 'CREATE';
  const persistedFlowVersion =
    typeof sessionState.flow_version === 'string' && sessionState.flow_version.trim() !== ''
      ? sessionState.flow_version.trim()
      : undefined;

  // Variable to hold the machine reference for autopersist closure
  let machine: StateMachine | null = null;

  // SSE bridge: forward state machine events to connected UI clients
  const sseForward =
    sseNotify || ((() => {}) as (event: string, data: Record<string, unknown>) => void);

  // Build resolved hooks — SSE transition/error broadcasts are now hooks
  // Wire artifact registration if template declares phaseArtifacts
  const artifactStore = {
    read: async (p: string) => (store.exists(p) ? store.readFile(p) : null),
    write: async (p: string, d: string) => {
      const dir = p.replace(/[/\\][^/\\]+$/, '');
      if (dir && !store.exists(dir)) store.mkdirp(dir);
      store.writeFile(p, d);
    },
  };
  const artifactRegistry = new ArtifactRegistry(artifactStore);

  const artifactHooks: ((event: { from: string; to: string; timestamp: string }) => void)[] = [];
  if (template && template.phaseArtifacts) {
    artifactHooks.push(
      createArtifactRegistrationHook(
        artifactRegistry,
        store,
        template.phaseArtifacts,
        template.phaseLineage || {},
        runtimePackGraph
      )
    );
  }

  const resolvedHooks = {
    beforeTransition: (userHooks && userHooks.beforeTransition) || [],
    afterTransition: [
      ...(sseNotify
        ? [
            (event: { from: string; to: string; timestamp: string }) =>
              sseForward('orchestrator:transition', { event: 'transition', ...event }),
          ]
        : []),
      ...artifactHooks,
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

  function readSessionId(): string {
    const target =
      typeof sessionPath === 'string' && sessionPath.trim() !== ''
        ? sessionPath
        : path.resolve(process.cwd(), 'BusinessDocs', 'session', 'session-state.json');
    if (!store.exists(target)) {
      return 'unknown';
    }

    try {
      const raw = JSON.parse(store.readFile(target)) as Record<string, unknown>;
      const candidate = raw.session_id || raw.sessionId || raw.id;
      if (typeof candidate === 'string' && candidate.trim() !== '') {
        return candidate.trim();
      }
    } catch {
      // Best-effort session id lookup; fallback below.
    }

    return 'unknown';
  }

  function maybeAutoCommitGateArtifacts(event: {
    from: string;
    to: string;
    timestamp: string;
  }): void {
    if (!autoCommitPhaseGates) return;

    const gate = resolveGateCommitMetadata(event.from, event.to, runtimePackGraph);
    if (!gate) return;

    const repoRoot = process.cwd();
    const statusResult = gitRunner(['status', '--porcelain', '--', artifactOutputDir], repoRoot);
    if (statusResult.status !== 0) return;
    if (statusResult.stdout.trim() === '') return;

    const sessionId = readSessionId();
    const message = `chore(orchestrator): gate passed [pack=${runtimeFlowPack.pack_id}] [phase=${gate.phaseId}] [session=${sessionId}] [gate=${gate.gateId}]`;

    const addResult = gitRunner(['add', '--', artifactOutputDir], repoRoot);
    if (addResult.status !== 0) return;

    gitRunner(['commit', '-m', message, '--', artifactOutputDir], repoRoot);
  }

  // Auto-persist: save to session-state.json on every transition/error
  const autoPersist = createAutoPersist(
    store,
    () => machine,
    sessionPath,
    (serialized: Record<string, unknown>) => {
      sseForward('orchestrator:state_saved', {
        status: serialized.status,
        last_updated: serialized.last_updated,
      });
    },
    () => ({
      flow_manifest_version: runtimeFlowPack.manifest_version,
      flow_pack_id: runtimeFlowPack.pack_id,
      flow_pack_name: runtimeFlowPack.pack_name,
      flow_pack_version: runtimeFlowPack.version,
    })
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

  // Track transition status for write-ahead persistence.
  // Corrupt/unknown markers are ignored to keep resume behavior deterministic.
  const persistedTransitionStatus =
    sessionState && typeof (sessionState as Record<string, unknown>).transition_status === 'string'
      ? ((sessionState as Record<string, unknown>).transition_status as string)
      : null;
  let transitionStatus: string | null =
    persistedTransitionStatus === 'IN_PROGRESS' || persistedTransitionStatus === 'COMPLETE'
      ? persistedTransitionStatus
      : null;
  const leaseManager = new TransitionLeaseManager(store, transitionLeasePath);

  // Create the state machine (crash recovery is handled by constructor)
  const smOptions: Record<string, unknown> = {
    onTransition: combinedOnTransition,
    onError: combinedOnError,
    flowVersion: persistedFlowVersion,
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
    if (!machine) {
      throw new Error('Engine machine is not initialized');
    }
    const from = machine.state;
    const to = machine.nextState;
    if (!to) {
      throw new Error(`No valid transition target from state ${from}`);
    }

    const transitionId =
      sessionState.transition_status === 'IN_PROGRESS' &&
      sessionState.transition_target === to &&
      typeof sessionState.transition_id === 'string'
        ? (sessionState.transition_id as string)
        : randomUUID();
    const lease = leaseManager.acquire({
      ownerId: transitionLeaseOwnerId,
      from,
      to,
      ttlMs: transitionLeaseTtlMs,
    });
    if (!lease.acquired || !lease.token) {
      throw new Error(
        `Transition lease acquisition failed (${lease.reason || 'unknown'}) owner=${lease.ownerId || 'n/a'}`
      );
    }

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
    saveTransitionIntent(store, to, sessionPath, transitionId);
    appendTransitionEvent(store, transitionEventLogPath, {
      transition_id: transitionId,
      from,
      to,
      status: 'intent',
      timestamp: new Date().toISOString(),
    });
    transitionStatus = 'IN_PROGRESS';

    try {
      leaseManager.renew(transitionLeaseOwnerId, lease.token, transitionLeaseTtlMs);
      const result = machine.advance(gateResult);

      // Fire afterTransition hooks (errors logged, no rollback)
      for (const hook of resolvedHooks.afterTransition) {
        try {
          hook(result);
        } catch {
          /* logged, not fatal */
        }
      }

      try {
        maybeAutoCommitGateArtifacts(result);
      } catch {
        // Auto-commit is best effort and must never block state progression.
      }

      // Write-ahead: mark transition complete
      saveTransitionComplete(store, sessionPath);
      appendTransitionEvent(store, transitionEventLogPath, {
        transition_id: transitionId,
        from,
        to,
        status: 'applied',
        timestamp: result.timestamp,
      });
      transitionStatus = 'COMPLETE';
      sessionState.transition_status = 'COMPLETE';
      delete sessionState.transition_target;
      delete sessionState.transition_id;
      delete sessionState.transition_started_at;

      return result;
    } catch (err) {
      transitionStatus = null;
      appendTransitionEvent(store, transitionEventLogPath, {
        transition_id: transitionId,
        from,
        to,
        status: 'failed',
        timestamp: new Date().toISOString(),
        reason: (err as Error).message,
      });
      // Fire onError hooks
      for (const hook of resolvedHooks.onError) {
        try {
          hook({ from, reason: (err as Error).message });
        } catch {
          /* logged, not fatal */
        }
      }
      throw err;
    } finally {
      leaseManager.release(transitionLeaseOwnerId, lease.token);
    }
  }

  /**
   * Force the machine into ERROR state.
   * @param {string} reason
   */
  function error(reason: string) {
    if (!machine) {
      throw new Error('Engine machine is not initialized');
    }
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
    if (!machine) {
      throw new Error('Engine machine is not initialized');
    }
    return machine.recover();
  }

  /**
   * Get current engine status.
   * @returns {object}
   */
  function status() {
    if (!machine) {
      throw new Error('Engine machine is not initialized');
    }
    return {
      state: machine.state,
      mode: machine.mode,
      flowVersion: machine.flowVersion,
      flowSource: machine.flowSource,
      flowPack: runtimeFlowPack,
      nextState: machine.nextState,
      history: machine.history,
      elapsedMs: machine.elapsedMs,
      phaseMetadata: machine.stateMetadata(),
      serialized: machine.serialize(),
      templateName: template ? template.name : null,
      transitionStatus: transitionStatus,
      transitionLeaseOwnerId,
      transitionEventLogPath,
      governanceMode: governanceConfig.governance_mode,
      identity: resolvedIdentity,
      projectContext,
      executionMode: resolvedExecutionMode,
    };
  }

  /**
   * Stop the running pipeline. Sets the machine to ERROR with a USER_STOPPED reason.
   * @returns {object} Updated engine status
   */
  function stop() {
    if (!machine) {
      throw new Error('Engine machine is not initialized');
    }
    archiveCurrentRun('STOPPED');
    machine.error('USER_STOPPED');
    sseForward('orchestrator:stopped', { state: machine.state, mode: machine.mode });
    return status();
  }

  /**
   * Record a degradation event in the session state (M5 / Evolution 5).
   * Called when a RECOVERABLE error allows the pipeline to continue
   * with reduced functionality.
   *
   * @param {{ component: string, reason: string, state?: string }} entry
   */
  function logDegradation(entry: { component: string; reason: string; state?: string }) {
    if (!machine) {
      throw new Error('Engine machine is not initialized');
    }
    addDegradationEntry(store, { ...entry, state: entry.state || machine.state }, sessionPath);
    sseForward('orchestrator:degradation', { ...entry, state: entry.state || machine.state });
  }

  /**
   * Gracefully pause the engine at the current state boundary (M5 / Evolution 6).
   * Writes a checkpoint so the engine can resume without duplicate work.
   *
   * @returns {object} Updated engine status
   */
  function pauseAtCheckpoint() {
    if (!machine) {
      throw new Error('Engine machine is not initialized');
    }
    const serialized = machine.serialize();
    saveSessionState(
      store,
      {
        ...serialized,
        flow_manifest_version: runtimeFlowPack.manifest_version,
        flow_pack_id: runtimeFlowPack.pack_id,
        flow_pack_name: runtimeFlowPack.pack_name,
        flow_pack_version: runtimeFlowPack.version,
      },
      sessionPath
    );
    saveTransitionComplete(store, sessionPath);
    sseForward('orchestrator:paused', {
      state: machine.state,
      mode: machine.mode,
      checkpoint: true,
    });
    return status();
  }

  /** Archive the current run into run-history.json (if non-trivial). */
  function archiveCurrentRun(endStatus: string) {
    if (!machine || machine.history.length === 0) return; // nothing to archive
    const serialized = machine.serialize();
    saveRunHistory(
      store,
      {
        mode: serialized.mode,
        flow_version:
          typeof serialized.flow_version === 'string' ? serialized.flow_version : undefined,
        flow_source:
          typeof serialized.flow_source === 'string' ? serialized.flow_source : undefined,
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
      machine = createStateMachine(newMode, undefined, smOpts);
    }

    // Persist the fresh state
    saveSessionState(
      store,
      {
        ...machine.serialize(),
        flow_manifest_version: runtimeFlowPack.manifest_version,
        flow_pack_id: runtimeFlowPack.pack_id,
        flow_pack_name: runtimeFlowPack.pack_name,
        flow_pack_version: runtimeFlowPack.version,
      },
      sessionPath
    );
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
    if (!machine) {
      throw new Error('Engine machine is not initialized');
    }
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

    // M4: Inject governance config + identity into gate options
    if (governanceConfig.governance_mode !== 'off') {
      gateOpts.governanceConfig = governanceConfig;
      gateOpts.identity = resolvedIdentity;
    }
    gateOpts.runtimePackGraph = runtimePackGraph;
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

    // M4: Emit governance audit event when governance is active
    const governanceReport = result.governance_report as
      | {
          mode?: string;
          identity?: { user?: string } | null;
          policies_evaluated?: number;
          unsatisfied_count?: number;
          timestamp?: string;
        }
      | undefined;
    if (governanceReport && governanceConfig.audit.log_governance_checks) {
      sseForward('orchestrator:governance_check', {
        criticState,
        mode: governanceReport.mode,
        identity: governanceReport.identity?.user || 'unknown',
        policies_evaluated: governanceReport.policies_evaluated,
        unsatisfied_count: governanceReport.unsatisfied_count,
        verdict: result.verdict,
        timestamp: governanceReport.timestamp,
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
    artifactRegistry,
    governanceConfig,
    resolvedIdentity,
    projectContext,
    advance,
    error,
    recover,
    status,
    stop,
    logDegradation,
    pauseAtCheckpoint,
    reset,
    validateGate,
    sprintGate,
    runHistory,
  };
}

export { createEngine };
