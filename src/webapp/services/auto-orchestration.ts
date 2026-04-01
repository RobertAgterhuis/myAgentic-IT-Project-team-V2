// Copyright (c) 2026 Robert Agterhuis. MIT License.
// Auto-orchestration coordinator: command-queue dispatch and gate-driven state advancement (M31-006).

import fs from 'fs';
import path from 'path';
import { structuredLog } from '../middleware';
import { withFileLock } from '../file-lock';
import { AgentExecutionService } from './agent-execution-service';
import { toServiceContext } from './context-adapter';
import { PHASE_AGENTS, RUNTIME_STATES_WITH_AGENTS } from '../../../platform/engine/agent-phase-map';

/* ── Computed configuration ───────────────────────────────────── */

export const AUTO_GATE_MODE: GateMode = (() => {
  const raw = String(process.env.ORCHESTRATOR_AUTO_GATE_MODE || process.env.GATE_MODE || '')
    .trim()
    .toLowerCase();
  if (raw === 'strict') return 'strict';
  if (raw === 'advisory') return 'advisory';
  return process.env.NODE_ENV === 'production' ? 'strict' : 'advisory';
})();

/* ── Interfaces & types ───────────────────────────────────────── */

export interface AutoDispatchCommandEntry {
  command: string;
  project?: string | null;
  scope?: string | null;
  description?: string | null;
  execution_mode?: 'SDLC_ONLY' | 'AGENCY_ONLY' | 'HYBRID' | null;
  requested_at?: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR';
  source?: string;
}

export interface ClaimedCommand {
  identity: string;
  entry: AutoDispatchCommandEntry;
}

export interface AutoOrchestratorStatus {
  state: string;
  nextState?: string | null;
  transitionStatus?: string;
  human_override?: {
    paused?: boolean;
  };
}

export type GateMode = 'strict' | 'advisory';

export interface GateViolationSummary {
  severity: string;
  rule: string;
  description: string;
  deliverable?: string;
  remediation?: string;
}

export interface RemediationTask {
  id: string;
  created_at: string;
  status: 'open' | 'done';
  source: 'auto-gate';
  command: string;
  state: string;
  phase: string | null;
  gate_mode: GateMode;
  summary: string;
  suggested_actions: string[];
  violations: GateViolationSummary[];
}

export interface GateFailureDetails {
  mode: GateMode;
  state: string;
  phase: string | null;
  verdict: string;
  violations: number;
  suggestions: string[];
  remediationTaskIds: string[];
  topViolations: GateViolationSummary[];
}

interface AppLike {
  inject(opts: {
    method: string;
    url: string;
    payload?: Record<string, unknown>;
  }): Promise<{ statusCode: number; body: string; json<T>(): T }>;
}

export interface AutoOrchestrationDeps {
  commandQueue: string;
  sessionDir: string;
  sessionFile: string;
  businessDocs: string;
  qIndexFile: string;
  getApp: () => AppLike | null;
  ctx: Record<string, unknown>;
  sseNotify: (event: string, data: Record<string, unknown>) => void;
}

/* ── Error class ──────────────────────────────────────────────── */

export class AutoRunGateError extends Error {
  details: GateFailureDetails;

  constructor(message: string, details: GateFailureDetails) {
    super(message);
    this.name = 'AutoRunGateError';
    this.details = details;
  }
}

/* ── Factory ──────────────────────────────────────────────────── */

export function createAutoOrchestrationCoordinator(deps: AutoOrchestrationDeps) {
  const AUTO_REMEDIATION_TASKS_FILE = path.join(deps.sessionDir, 'remediation-tasks.json');
  const AUTO_AGENT_STATES = new Set<string>(RUNTIME_STATES_WITH_AGENTS);

  let _commandDispatchInFlight = false;
  let _orchestrationAutoRunInFlight = false;
  let _autoAgentExecutionService: AgentExecutionService | null = null;
  let _lastAutoExecutedState: string | null = null;

  /* ── Gate violation helpers ─────────────────────────────────── */

  function normalizeGateViolation(item: unknown): GateViolationSummary {
    const raw = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    return {
      severity: String(raw.severity || 'MAJOR').toUpperCase(),
      rule: String(raw.rule || 'UNKNOWN_RULE'),
      description: String(raw.description || 'Gate rule was violated.'),
      ...(typeof raw.deliverable === 'string' && raw.deliverable.trim()
        ? { deliverable: raw.deliverable.trim() }
        : {}),
    };
  }

  function suggestedActionForViolation(violation: GateViolationSummary): string {
    const prefix = violation.deliverable
      ? `Update ${violation.deliverable}`
      : 'Update affected deliverable(s)';
    switch (violation.rule) {
      case 'MISSING_DELIVERABLE':
        return 'Create the missing deliverable file and include required sections.';
      case 'MISSING_HANDOFF_CHECKLIST':
        return `${prefix} to include a complete HANDOFF CHECKLIST section.`;
      case 'INCOMPLETE_HANDOFF_CHECKLIST':
        return `${prefix} and complete all checklist items before rerunning.`;
      case 'INSUFFICIENT_HANDOFF_ITEMS':
        return `${prefix} and include all mandatory checklist entries.`;
      case 'UNDOCUMENTED_UNCERTAIN':
        return `${prefix} with clear UNCERTAIN context and concrete follow-up.`;
      case 'UNDOCUMENTED_INSUFFICIENT_DATA':
        return `${prefix} with explicit INSUFFICIENT_DATA rationale and sources.`;
      default:
        return `${prefix}: ${violation.description}`;
    }
  }

  function buildGateSuggestions(violations: GateViolationSummary[]): string[] {
    const suggestions = new Set<string>();
    for (const violation of violations.slice(0, 8)) {
      suggestions.add(suggestedActionForViolation(violation));
    }
    return [...suggestions];
  }

  function appendRemediationTask(task: RemediationTask): void {
    const existing = (() => {
      try {
        if (!fs.existsSync(AUTO_REMEDIATION_TASKS_FILE)) return [] as RemediationTask[];
        const raw = JSON.parse(fs.readFileSync(AUTO_REMEDIATION_TASKS_FILE, 'utf8'));
        return Array.isArray(raw) ? (raw as RemediationTask[]) : [];
      } catch {
        return [] as RemediationTask[];
      }
    })();

    existing.push(task);
    fs.mkdirSync(path.dirname(AUTO_REMEDIATION_TASKS_FILE), { recursive: true });
    fs.writeFileSync(AUTO_REMEDIATION_TASKS_FILE, JSON.stringify(existing, null, 2));
  }

  function createRemediationTask(input: {
    command: string;
    state: string;
    phase: string | null;
    mode: GateMode;
    violations: GateViolationSummary[];
  }): RemediationTask {
    const task: RemediationTask = {
      id: `remediation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
      status: 'open',
      source: 'auto-gate',
      command: input.command,
      state: input.state,
      phase: input.phase,
      gate_mode: input.mode,
      summary: `Gate ${input.state} reported ${input.violations.length} violation(s).`,
      suggested_actions: buildGateSuggestions(input.violations),
      violations: input.violations.slice(0, 20),
    };
    appendRemediationTask(task);
    return task;
  }

  /* ── Command queue helpers ──────────────────────────────────── */

  function readCommandQueueUnsafe(): AutoDispatchCommandEntry[] {
    try {
      if (!fs.existsSync(deps.commandQueue)) return [];
      const raw = JSON.parse(fs.readFileSync(deps.commandQueue, 'utf8'));
      return Array.isArray(raw) ? (raw as AutoDispatchCommandEntry[]) : [];
    } catch {
      return [];
    }
  }

  function writeCommandQueueUnsafe(queue: AutoDispatchCommandEntry[]): void {
    fs.mkdirSync(path.dirname(deps.commandQueue), { recursive: true });
    fs.writeFileSync(deps.commandQueue, JSON.stringify(queue, null, 2));
  }

  function commandIdentity(entry: AutoDispatchCommandEntry): string {
    return `${entry.requested_at || ''}|${entry.command}|${entry.source || ''}`;
  }

  async function claimNextPendingCommand(): Promise<ClaimedCommand | null> {
    let claimed: ClaimedCommand | null = null;
    await withFileLock(deps.commandQueue, async () => {
      const queue = readCommandQueueUnsafe();
      if (queue.some((item) => item && item.status === 'PROCESSING')) {
        return;
      }
      const index = queue.findIndex((item) => item && item.status === 'PENDING');
      if (index < 0) return;

      const next = queue[index];
      const updated: AutoDispatchCommandEntry = { ...next, status: 'PROCESSING' };
      queue[index] = updated;
      writeCommandQueueUnsafe(queue);
      claimed = { identity: commandIdentity(updated), entry: updated };
    });
    return claimed;
  }

  function getProcessingCommand(): ClaimedCommand | null {
    const queue = readCommandQueueUnsafe();
    const current = queue.find((item) => item && item.status === 'PROCESSING');
    return current ? { identity: commandIdentity(current), entry: current } : null;
  }

  async function finalizeClaimedCommand(
    claimed: ClaimedCommand,
    status: 'DONE' | 'ERROR',
    error?: string
  ): Promise<void> {
    await withFileLock(deps.commandQueue, async () => {
      const queue = readCommandQueueUnsafe();
      const index = queue.findIndex(
        (item) => item && item.status === 'PROCESSING' && commandIdentity(item) === claimed.identity
      );
      if (index < 0) return;

      const updated: AutoDispatchCommandEntry & {
        completed_at?: string;
        error?: string;
      } = {
        ...queue[index],
        status,
        completed_at: new Date().toISOString(),
      };
      if (status === 'ERROR' && error) {
        updated.error = error.slice(0, 1000);
      }
      queue[index] = updated;
      writeCommandQueueUnsafe(queue);
    });
  }

  /* ── Command dispatch ───────────────────────────────────────── */

  async function dispatchQueuedCommands(): Promise<void> {
    const app = deps.getApp();
    if (_commandDispatchInFlight || !app) return;
    _commandDispatchInFlight = true;
    try {
      const claimed = await claimNextPendingCommand();
      if (!claimed) return;

      const payload = {
        command: claimed.entry.command,
        project: claimed.entry.project || undefined,
        scope: claimed.entry.scope || undefined,
        description: claimed.entry.description || undefined,
        execution_mode: claimed.entry.execution_mode || undefined,
        platform: 'copilot',
        resume: false,
      };

      const commandRes = await app.inject({
        method: 'POST',
        url: '/api/orchestrator/command',
        payload,
      });

      if (commandRes.statusCode >= 400) {
        await finalizeClaimedCommand(
          claimed,
          'ERROR',
          `orchestrator command failed (${commandRes.statusCode})`
        );
        structuredLog('warn', 'command_autodispatch_failed', {
          command: claimed.entry.command,
          statusCode: commandRes.statusCode,
        });
        return;
      }

      const advanceRes = await app.inject({
        method: 'POST',
        url: '/api/orchestrator/advance',
        payload: {},
      });
      if (advanceRes.statusCode >= 400) {
        await finalizeClaimedCommand(
          claimed,
          'ERROR',
          `initial orchestrator advance failed (${advanceRes.statusCode})`
        );
        structuredLog('warn', 'command_autodispatch_failed', {
          command: claimed.entry.command,
          statusCode: advanceRes.statusCode,
        });
        return;
      }

      structuredLog('info', 'command_autodispatch_started', {
        command: claimed.entry.command,
        requested_at: claimed.entry.requested_at || null,
      });
      _lastAutoExecutedState = null;
    } catch (err) {
      structuredLog('error', 'command_autodispatch_error', {
        error: (err as Error).message,
      });
    } finally {
      _commandDispatchInFlight = false;
    }
  }

  /* ── Auto-run helpers ───────────────────────────────────────── */

  function toSessionPhaseKeyFromState(state: string): string | null {
    if (state === 'ONBOARDING') return 'ONBOARDING';
    if (state === 'SYNTHESIS') return 'SYNTHESIS';
    if (state === 'SPRINT_GATE') return 'SPRINT_GATE';

    const phaseMatch = state.match(/^PHASE_(\d+)(?:_|$)/);
    if (phaseMatch) {
      return `PHASE-${phaseMatch[1]}`;
    }

    return null;
  }

  function collectPredecessorPathsForAutoRun(): string[] {
    const paths = new Set<string>();

    const briefPath = path.join(deps.businessDocs, 'project-brief.md');
    if (fs.existsSync(briefPath)) {
      paths.add(briefPath);
    }

    try {
      if (!fs.existsSync(deps.sessionFile)) {
        return [...paths];
      }

      const sessionState = JSON.parse(fs.readFileSync(deps.sessionFile, 'utf8')) as Record<
        string,
        unknown
      >;
      const phaseOutputs =
        sessionState.phase_outputs && typeof sessionState.phase_outputs === 'object'
          ? (sessionState.phase_outputs as Record<string, unknown>)
          : {};

      const collect = (value: unknown) => {
        if (typeof value === 'string' && value.trim()) {
          paths.add(value.trim());
          return;
        }
        if (Array.isArray(value)) {
          for (const entry of value) collect(entry);
          return;
        }
        if (value && typeof value === 'object') {
          for (const entry of Object.values(value as Record<string, unknown>)) {
            collect(entry);
          }
        }
      };

      for (const value of Object.values(phaseOutputs)) {
        collect(value);
      }
    } catch {
      // Best effort only.
    }

    return [...paths];
  }

  function getAutoQuestionnairePath(): string | undefined {
    return fs.existsSync(deps.qIndexFile) ? deps.qIndexFile : undefined;
  }

  function persistAutoPhaseOutput(state: string, agentId: string, outputPath?: string): void {
    if (!outputPath) return;

    const phaseKey = toSessionPhaseKeyFromState(state);
    if (!phaseKey) return;

    try {
      const sessionState = fs.existsSync(deps.sessionFile)
        ? (JSON.parse(fs.readFileSync(deps.sessionFile, 'utf8')) as Record<string, unknown>)
        : {};
      const phaseOutputs =
        sessionState.phase_outputs && typeof sessionState.phase_outputs === 'object'
          ? { ...(sessionState.phase_outputs as Record<string, unknown>) }
          : {};
      const phaseKeyLower = phaseKey.toLowerCase();
      const existingPhaseOutputs =
        phaseOutputs[phaseKeyLower] && typeof phaseOutputs[phaseKeyLower] === 'object'
          ? { ...(phaseOutputs[phaseKeyLower] as Record<string, unknown>) }
          : {};

      existingPhaseOutputs[agentId] = outputPath;
      phaseOutputs[phaseKeyLower] = existingPhaseOutputs;
      sessionState.phase_outputs = phaseOutputs;

      fs.mkdirSync(path.dirname(deps.sessionFile), { recursive: true });
      fs.writeFileSync(deps.sessionFile, JSON.stringify(sessionState, null, 2));
    } catch (err) {
      structuredLog('warn', 'command_autorun_phase_output_persist_failed', {
        state,
        agentId,
        error: (err as Error).message,
      });
    }
  }

  async function getOrchestratorStatusForAutoRun(): Promise<AutoOrchestratorStatus | null> {
    const app = deps.getApp();
    if (!app) return null;
    const response = await app.inject({
      method: 'GET',
      url: '/api/orchestrator/status',
    });
    if (response.statusCode >= 400) {
      structuredLog('warn', 'command_autorun_status_failed', {
        statusCode: response.statusCode,
      });
      return null;
    }
    return response.json() as AutoOrchestratorStatus;
  }

  function getAutoAgentExecutionService(): AgentExecutionService {
    if (_autoAgentExecutionService) return _autoAgentExecutionService;
    _autoAgentExecutionService = new AgentExecutionService(toServiceContext(deps.ctx));
    return _autoAgentExecutionService;
  }

  async function executeAgentsForState(state: string): Promise<void> {
    const service = getAutoAgentExecutionService();
    const agents = PHASE_AGENTS[state] || [];
    const predecessorPaths = collectPredecessorPathsForAutoRun();
    const questionnairePath = getAutoQuestionnairePath();

    for (const agent of agents) {
      const startedAt = new Date().toISOString();
      deps.sseNotify('agent_execution_start', {
        type: 'agent_execution_start',
        agent_id: agent.id,
        agent_name: agent.name,
        phase: state,
        timestamp: startedAt,
      });

      const result = await service.execute({
        agentId: agent.id,
        source: 'orchestrator-auto',
        trackSessionStart: false,
        context: {
          predecessorPaths,
          questionnairePath,
          workspaceId: 'default',
        },
      });

      for (const log of result.logs) {
        deps.sseNotify('agent_execution_log', {
          type: 'agent_execution_log',
          job_id: result.job_id,
          agent_id: result.agent_id,
          level: log.level,
          message: log.message,
          timestamp: log.timestamp,
        });
      }

      if (result.status !== 'completed') {
        deps.sseNotify('agent_execution_failed', {
          type: 'agent_execution_failed',
          job_id: result.job_id,
          agent_id: result.agent_id,
          agent_name: result.agent_name,
          status: result.status,
          error: result.error,
          timestamp: new Date().toISOString(),
        });
        throw new Error(result.error || `Agent ${result.agent_name} did not complete successfully`);
      }

      if (result.output_path) {
        persistAutoPhaseOutput(state, agent.id, result.output_path);
        deps.sseNotify('artifact_created', {
          type: 'artifact_created',
          agent: agent.id,
          artifact_id: result.output_path,
          phase: toSessionPhaseKeyFromState(state) || state,
          timestamp: new Date().toISOString(),
        });
      }

      deps.sseNotify('agent_execution_complete', {
        type: 'agent_execution_complete',
        job_id: result.job_id,
        agent_id: result.agent_id,
        agent_name: result.agent_name,
        status: result.status,
        duration_ms: result.duration_ms,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async function finalizeProcessingCommandForCycle(
    status: 'DONE' | 'ERROR',
    error?: string,
    state?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    const processing = getProcessingCommand();
    if (!processing) return;

    await finalizeClaimedCommand(processing, status, error);
    deps.sseNotify(status === 'DONE' ? 'command_completed' : 'command_failed', {
      type: status === 'DONE' ? 'command_completed' : 'command_failed',
      command: processing.entry.command,
      requested_at: processing.entry.requested_at || null,
      state: state || null,
      error: error || null,
      details: details || null,
      timestamp: new Date().toISOString(),
    });
  }

  async function advanceOrchestratorAutomatically(
    command: ClaimedCommand,
    state: string,
    predecessorPaths: string[]
  ): Promise<void> {
    const app = deps.getApp();
    if (!app) return;

    let payload: Record<string, unknown> = {};
    let gateFailureDetails: GateFailureDetails | null = null;

    if (state.startsWith('CRITIC_') && predecessorPaths.length > 0) {
      const gateRes = await app.inject({
        method: 'POST',
        url: '/api/orchestrator/validate-gate',
        payload: { deliverables: predecessorPaths },
      });

      if (gateRes.statusCode < 400) {
        const gateBody = gateRes.json() as {
          verdict?: string;
          summary?: { totalViolations?: number; phase?: string };
          violations?: unknown[];
        };
        const verdict = String(gateBody.verdict || 'APPROVED').toUpperCase();
        const normalizedViolations = Array.isArray(gateBody.violations)
          ? gateBody.violations.map((v) => normalizeGateViolation(v))
          : [];

        if (verdict !== 'APPROVED') {
          const remediationTask = createRemediationTask({
            command: command.entry.command,
            state,
            phase: gateBody.summary?.phase || null,
            mode: AUTO_GATE_MODE,
            violations: normalizedViolations,
          });

          gateFailureDetails = {
            mode: AUTO_GATE_MODE,
            state,
            phase: gateBody.summary?.phase || null,
            verdict,
            violations: gateBody.summary?.totalViolations || normalizedViolations.length,
            suggestions: remediationTask.suggested_actions,
            remediationTaskIds: [remediationTask.id],
            topViolations: normalizedViolations.slice(0, 5),
          };

          deps.sseNotify('gate_remediation_created', {
            type: 'gate_remediation_created',
            command: command.entry.command,
            state,
            verdict,
            gate_mode: AUTO_GATE_MODE,
            remediation_task_id: remediationTask.id,
            violations: gateFailureDetails.violations,
            timestamp: new Date().toISOString(),
          });
        }

        payload = {
          gateResult: {
            verdict: verdict === 'APPROVED' || AUTO_GATE_MODE === 'strict' ? verdict : 'APPROVED',
            reason:
              verdict === 'APPROVED'
                ? 'Auto-validated gate'
                : AUTO_GATE_MODE === 'advisory'
                  ? `Advisory mode: continuing after ${gateBody.summary?.totalViolations || normalizedViolations.length} violation(s)`
                  : `Auto gate validation reported ${gateBody.summary?.totalViolations || normalizedViolations.length} violation(s)`,
          },
        };

        if (verdict !== 'APPROVED' && AUTO_GATE_MODE === 'advisory') {
          deps.sseNotify('gate_failed_advisory', {
            type: 'gate_failed_advisory',
            command: command.entry.command,
            state,
            phase: gateFailureDetails?.phase || null,
            verdict,
            violations: gateFailureDetails?.violations || 0,
            suggestions: gateFailureDetails?.suggestions || [],
            remediationTaskIds: gateFailureDetails?.remediationTaskIds || [],
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    const advanceRes = await app.inject({
      method: 'POST',
      url: '/api/orchestrator/advance',
      payload,
    });

    if (advanceRes.statusCode >= 400) {
      const body = advanceRes.body || '';
      if (gateFailureDetails) {
        throw new AutoRunGateError(
          `advance failed (${advanceRes.statusCode}): ${body}`,
          gateFailureDetails
        );
      }
      throw new Error(`advance failed (${advanceRes.statusCode}): ${body}`);
    }
  }

  /* ── Main cycle ─────────────────────────────────────────────── */

  async function runAutoOrchestrationCycle(): Promise<void> {
    const app = deps.getApp();
    if (_orchestrationAutoRunInFlight || !app) return;
    _orchestrationAutoRunInFlight = true;

    try {
      const status = await getOrchestratorStatusForAutoRun();
      if (!status) return;
      if (status.human_override?.paused) return;
      if (status.transitionStatus === 'IN_PROGRESS') return;

      if (status.state === 'COMPLETED') {
        _lastAutoExecutedState = null;
        await finalizeProcessingCommandForCycle('DONE', undefined, status.state);
        return;
      }

      if (status.state === 'ERROR') {
        _lastAutoExecutedState = null;
        await finalizeProcessingCommandForCycle(
          'ERROR',
          'Orchestrator entered ERROR state',
          status.state
        );
        return;
      }

      if (status.state === 'IDLE') {
        _lastAutoExecutedState = null;
        return;
      }

      if (AUTO_AGENT_STATES.has(status.state) && _lastAutoExecutedState !== status.state) {
        await executeAgentsForState(status.state);
        _lastAutoExecutedState = status.state;
      }

      const currentCommand = getProcessingCommand();
      if (!currentCommand) return;

      await advanceOrchestratorAutomatically(
        currentCommand,
        status.state,
        collectPredecessorPathsForAutoRun()
      );
    } catch (err) {
      structuredLog('error', 'command_autorun_error', {
        error: (err as Error).message,
      });
      if (err instanceof AutoRunGateError) {
        await finalizeProcessingCommandForCycle('ERROR', err.message, err.details.state, {
          category: 'gate_failure',
          mode: err.details.mode,
          phase: err.details.phase,
          verdict: err.details.verdict,
          violations: err.details.violations,
          suggestions: err.details.suggestions,
          remediationTaskIds: err.details.remediationTaskIds,
          topViolations: err.details.topViolations,
        });
        return;
      }
      await finalizeProcessingCommandForCycle('ERROR', (err as Error).message);
    } finally {
      _orchestrationAutoRunInFlight = false;
    }
  }

  return { dispatchQueuedCommands, runAutoOrchestrationCycle };
}
