// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Orchestrator route handlers — GET/POST /api/orchestrator/*
 * Exposes the state machine engine to the webapp UI.
 *
 * Endpoints:
 *   GET  /api/orchestrator/status   — Current engine state
 *   POST /api/orchestrator/advance  — Advance to next state
 *   POST /api/orchestrator/error    — Force ERROR state
 *   POST /api/orchestrator/recover  — Recover from ERROR
 *   POST /api/orchestrator/reset    — Reset with a new mode
 *
 * @module routes/orchestrator
 * @param {object} ctx - Shared server context.
 * @returns {object} Route map { 'METHOD /path': handler }.
 */

import fs from 'fs';
import path from 'path';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ServerContext } from '../context';
import { getStore } from '../store';
import { createEngine } from '../../../platform/engine/engine';
import { PHASE_AGENTS } from '../../../platform/engine/dispatcher';
import { listTemplates, seedDecisions } from '../../../platform/engine/template-loader';
import { errorResponse } from '../utils/errors';
import { structuredLog } from '../middleware';
import { sessionTracker } from '../session-tracker';
import {
  GovernanceService,
  PolicyService,
  ServiceNotAvailableError,
  toServiceContext,
} from '../services';
import * as RS from '../route-schemas';
import {
  HOST,
  STORAGE_PROVIDER,
  QUEUE_PROVIDER,
  SESSION_STORE,
  REDIS_URL,
  TRUST_PROXY,
  AGENT_TOOL_ISOLATION_LEVEL,
  TOOL_EXEC_MAX_TIMEOUT_MS,
  TOOL_EXEC_MAX_OUTPUT_BYTES,
  TOOL_EXEC_MAX_MEMORY_MB,
  TOOL_EXEC_REQUIRE_WORKSPACE_CWD,
  resolvePredecessorContractContinuityMode,
} from '../config';
import { validateProfile, hasAuthConfigured, PROFILE_CONTRACTS } from '../runtime-profiles';

type OrchestratorEngine = ReturnType<typeof createEngine>;
type OrchestratorStatus = ReturnType<OrchestratorEngine['status']>;
type PhaseAgent = { id: string; name: string };

type TrackedPhaseAgent = PhaseAgent & { trackedId: string };

type HumanOverrideEventType = 'pause' | 'override' | 'resume';

type HumanOverrideEvent = {
  type: HumanOverrideEventType;
  rationale: string;
  requested_by: string;
  timestamp: string;
  state: string;
  mode: string;
  phases?: string[];
};

type DependencyStatus = 'healthy' | 'degraded' | 'unavailable';

type DependencyHealth = {
  status: DependencyStatus;
  detail: string;
  checked_at: string;
  metadata?: Record<string, unknown>;
};

type ControlPlaneAlertSeverity = 'warning' | 'critical';

type ControlPlaneAlert = {
  code: string;
  severity: ControlPlaneAlertSeverity;
  message: string;
};

const CONTROL_PLANE_SLO_TARGETS = {
  maxUnavailableDependencies: 0,
  maxDegradedDependencies: 0,
  maxProbeLatencyMs: 500,
} as const;

const PARALLEL_SESSION_STATES = new Set(['PHASE_1']);

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function shouldEnforceReviewGate(profile: string): boolean {
  return profile.startsWith('production-');
}

function toSessionPhase(state: string): string | null {
  switch (state) {
    case 'ONBOARDING':
      return 'ONBOARDING';
    case 'PHASE_1':
    case 'CRITIC_1':
      return 'PHASE-1';
    case 'PHASE_2':
    case 'CRITIC_2':
      return 'PHASE-2';
    case 'PHASE_3':
    case 'CRITIC_3':
      return 'PHASE-3';
    case 'PHASE_4':
    case 'CRITIC_4':
      return 'PHASE-4';
    case 'SYNTHESIS':
      return 'SYNTHESIS';
    case 'SPRINT_GATE':
      return 'SPRINT_GATE';
    case 'PHASE_5_EXECUTING':
      return 'PHASE-5';
    default:
      return null;
  }
}

function toTrackedAgentId(agent: PhaseAgent): string {
  return `${agent.id}-${agent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function getTrackedAgentsForState(state: string): TrackedPhaseAgent[] {
  const agents = PHASE_AGENTS[state as keyof typeof PHASE_AGENTS] as PhaseAgent[] | undefined;
  return (agents || []).map((agent) => ({
    ...agent,
    trackedId: toTrackedAgentId(agent),
  }));
}

function isParallelTrackedState(state: string): boolean {
  return PARALLEL_SESSION_STATES.has(state);
}

function getTrackedAgentName(state: string, trackedId: string | null): string | null {
  if (!trackedId) return null;
  const agent = getTrackedAgentsForState(state).find((entry) => entry.trackedId === trackedId);
  return agent?.name || trackedId;
}

function buildParallelGroupTelemetry(
  state: string,
  trackedAgents: TrackedPhaseAgent[],
  trackedId?: string
): Record<string, unknown> {
  const groupAgents = trackedAgents.map((agent) => agent.trackedId);
  const payload: Record<string, unknown> = {
    parallel_group: true,
    parallel_group_id: state.toLowerCase(),
    parallel_group_state: state,
    parallel_group_size: groupAgents.length,
    parallel_group_agents: groupAgents,
  };

  if (trackedId) {
    payload.parallel_group_index = Math.max(groupAgents.indexOf(trackedId), 0) + 1;
  }

  return payload;
}

function buildParallelStateTelemetry(state: string): Record<string, unknown> {
  const trackedAgents = getTrackedAgentsForState(state);
  return {
    parallel_group: buildParallelGroupTelemetry(state, trackedAgents),
    active_agents: trackedAgents.map((agent) => agent.trackedId),
  };
}

function getPrimaryAgent(state: string): string | null {
  const agents = getTrackedAgentsForState(state);
  return agents.length > 0 ? agents[0].trackedId : null;
}

function getSessionRuntime(status: OrchestratorStatus): {
  phase: string | null;
  agent: string | null;
} {
  return {
    phase: toSessionPhase(status.state),
    agent: getPrimaryAgent(status.state),
  };
}

function startParallelTrackedAgents(
  sessionId: string,
  state: string,
  phase: string,
  sseNotify: ServerContext['sseNotify']
): string[] {
  const trackedAgents = getTrackedAgentsForState(state);
  const startedIds: string[] = [];

  for (const agent of trackedAgents) {
    const telemetry = buildParallelGroupTelemetry(state, trackedAgents, agent.trackedId);
    sessionTracker.startAgent(sessionId, agent.trackedId, agent.name, phase, `Processing ${phase}`);
    sessionTracker.addTimelineEvent(sessionId, {
      type: 'agent_start',
      description: `Agent started: ${agent.name}`,
      agent: agent.trackedId,
      phase,
      metadata: { agent_name: agent.name, ...telemetry },
    });
    sseNotify('agent_start', {
      type: 'agent_start',
      session_id: sessionId,
      agent: agent.trackedId,
      agent_name: agent.name,
      phase,
      ...telemetry,
      timestamp: new Date().toISOString(),
    });
    startedIds.push(agent.trackedId);
  }

  return startedIds;
}

function completeParallelTrackedAgents(
  sessionId: string,
  state: string,
  phase: string,
  sseNotify: ServerContext['sseNotify']
): string[] {
  const trackedAgents = getTrackedAgentsForState(state);
  const completedIds: string[] = [];

  for (const agent of trackedAgents) {
    const telemetry = buildParallelGroupTelemetry(state, trackedAgents, agent.trackedId);
    const current = sessionTracker.getAgent(agent.trackedId);
    if (!current || current.session_id !== sessionId || current.status === 'completed') {
      continue;
    }

    sessionTracker.completeAgent(agent.trackedId);
    sessionTracker.addTimelineEvent(sessionId, {
      type: 'agent_complete',
      description: `Agent completed: ${agent.name}`,
      agent: agent.trackedId,
      phase,
      metadata: { agent_name: agent.name, ...telemetry },
    });
    sseNotify('agent_complete', {
      type: 'agent_complete',
      session_id: sessionId,
      agent: agent.trackedId,
      agent_name: agent.name,
      phase,
      ...telemetry,
      timestamp: new Date().toISOString(),
    });
    completedIds.push(agent.trackedId);
  }

  return completedIds;
}

function getRepoRoot(ctx: Record<string, unknown>): string {
  return (ctx?.PROJECT_ROOT as string) || path.resolve(__dirname, '..', '..', '..');
}

function isHumanOverrideEvent(value: unknown): value is HumanOverrideEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.type === 'string' &&
    typeof row.rationale === 'string' &&
    typeof row.requested_by === 'string' &&
    typeof row.timestamp === 'string' &&
    typeof row.state === 'string' &&
    typeof row.mode === 'string'
  );
}

function readHumanOverrideEvents(filePath: string): HumanOverrideEvent[] {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(raw)) return [];
    return raw.filter(isHumanOverrideEvent);
  } catch {
    return [];
  }
}

function toOverallDependencyStatus(statuses: DependencyStatus[]): DependencyStatus {
  if (statuses.some((status) => status === 'unavailable')) {
    return 'unavailable';
  }
  if (statuses.some((status) => status === 'degraded')) {
    return 'degraded';
  }
  return 'healthy';
}

function buildControlPlaneAlerts(
  unavailableDependencies: number,
  degradedDependencies: number,
  probeLatencyMs: number
): ControlPlaneAlert[] {
  const alerts: ControlPlaneAlert[] = [];

  if (unavailableDependencies > CONTROL_PLANE_SLO_TARGETS.maxUnavailableDependencies) {
    alerts.push({
      code: 'CP_UNAVAILABLE_DEPENDENCIES_BREACH',
      severity: 'critical',
      message: `Unavailable dependencies: ${unavailableDependencies} (target <= ${CONTROL_PLANE_SLO_TARGETS.maxUnavailableDependencies})`,
    });
  }

  if (degradedDependencies > CONTROL_PLANE_SLO_TARGETS.maxDegradedDependencies) {
    alerts.push({
      code: 'CP_DEGRADED_DEPENDENCIES_BREACH',
      severity: 'warning',
      message: `Degraded dependencies: ${degradedDependencies} (target <= ${CONTROL_PLANE_SLO_TARGETS.maxDegradedDependencies})`,
    });
  }

  if (probeLatencyMs > CONTROL_PLANE_SLO_TARGETS.maxProbeLatencyMs) {
    alerts.push({
      code: 'CP_PROBE_LATENCY_BREACH',
      severity: 'warning',
      message: `Dependency probe latency ${probeLatencyMs}ms exceeded target <= ${CONTROL_PLANE_SLO_TARGETS.maxProbeLatencyMs}ms`,
    });
  }

  return alerts;
}

export async function registerRoutes(app: FastifyInstance, ctx: ServerContext): Promise<void> {
  const { sseNotify } = ctx;
  const legacyCtx = ctx as unknown as Record<string, unknown>;
  const governanceService = new GovernanceService(
    toServiceContext(ctx as unknown as Record<string, unknown>)
  );
  const humanOverridePath = path.join(
    getRepoRoot(legacyCtx),
    'BusinessDocs',
    'session',
    'human-override-events.json'
  );

  // Lazy-initialized engine (created on first request)
  let _engine: OrchestratorEngine | null = null;
  let _templateName: string | undefined = undefined;
  const initialHumanOverrideEvents = readHumanOverrideEvents(humanOverridePath);
  const lastInitialOverride =
    initialHumanOverrideEvents.length > 0
      ? initialHumanOverrideEvents[initialHumanOverrideEvents.length - 1]
      : null;
  const _humanOverride = {
    paused: lastInitialOverride
      ? lastInitialOverride.type === 'pause' || lastInitialOverride.type === 'override'
      : false,
    events: initialHumanOverrideEvents,
  };

  function persistHumanOverrideEvents(): void {
    fs.mkdirSync(path.dirname(humanOverridePath), { recursive: true });
    fs.writeFileSync(humanOverridePath, JSON.stringify(_humanOverride.events, null, 2), 'utf8');
  }

  function getEngine(): OrchestratorEngine {
    if (!_engine) {
      const engine = createEngine({
        store: getStore(),
        sseNotify,
        templateName: _templateName,
      });
      _engine = engine;
      structuredLog('info', 'orchestrator_engine_initialized', {
        state: engine.status().state,
        mode: engine.status().mode,
        templateName: engine.status().templateName,
      });
    }
    return _engine;
  }

  // ── GET /api/orchestrator/templates ───────────────────────

  app.get(
    '/api/orchestrator/templates',
    { schema: { tags: ['orchestrator'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const templates = listTemplates();
        return reply.send({ ok: true, templates });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_templates_error', { error: message });
        return reply.code(500).send(errorResponse('TEMPLATE_ERROR', message));
      }
    }
  );

  // ── GET /api/orchestrator/onboarding-diagnostics ─────────────

  app.get(
    '/api/orchestrator/onboarding-diagnostics',
    { schema: { tags: ['orchestrator'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authConfigured = hasAuthConfigured({
          githubClientId: process.env.GITHUB_CLIENT_ID,
          apiKey: process.env.API_KEY,
        });

        const validation = validateProfile({
          nodeEnv: process.env.NODE_ENV,
          host: HOST,
          storageProvider: STORAGE_PROVIDER,
          queueProvider: QUEUE_PROVIDER,
          sessionStore: SESSION_STORE,
          redisUrl: REDIS_URL,
          hasAuth: authConfigured,
          trustProxy: TRUST_PROXY,
          toolIsolationLevel: AGENT_TOOL_ISOLATION_LEVEL,
          toolExecMaxTimeoutMs: TOOL_EXEC_MAX_TIMEOUT_MS,
          toolExecMaxOutputBytes: TOOL_EXEC_MAX_OUTPUT_BYTES,
          toolExecMaxMemoryMb: TOOL_EXEC_MAX_MEMORY_MB,
          toolExecRequireWorkspaceCwd: TOOL_EXEC_REQUIRE_WORKSPACE_CWD,
        });

        const contract = PROFILE_CONTRACTS[validation.profile];
        const continuity = resolvePredecessorContractContinuityMode(validation.profile);

        return reply.send({
          ok: true,
          generatedAt: new Date().toISOString(),
          profile: validation.profile,
          contract,
          validation: {
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
          },
          predecessorContractContinuity: {
            mode: continuity.mode,
            source: continuity.source,
          },
          environment: {
            nodeEnv: process.env.NODE_ENV ?? 'development',
            host: HOST,
            storageProvider: STORAGE_PROVIDER,
            queueProvider: QUEUE_PROVIDER,
            sessionStore: SESSION_STORE,
            redisConfigured: Boolean(REDIS_URL),
            authConfigured,
            trustProxy: TRUST_PROXY,
          },
        });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_onboarding_diagnostics_error', { error: message });
        return reply.code(500).send(errorResponse('ONBOARDING_DIAGNOSTICS_ERROR', message));
      }
    }
  );

  // ── GET /api/orchestrator/status ──────────────────────────

  app.get(
    '/api/orchestrator/status',
    { schema: { tags: ['orchestrator'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const engine = getEngine();
        const status = engine.status();
        const lastEvent = _humanOverride.events[_humanOverride.events.length - 1] || null;
        return reply.send({
          ...status,
          human_override: {
            paused: _humanOverride.paused,
            last_event: lastEvent,
          },
        });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_status_error', { error: message });
        return reply.code(500).send(errorResponse('ENGINE_ERROR', message));
      }
    }
  );

  // ── GET /api/orchestrator/dependencies/health ─────────────

  app.get(
    '/api/orchestrator/dependencies/health',
    { schema: { tags: ['orchestrator'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const startedAt = Date.now();
      const checkedAt = new Date().toISOString();

      const dependencies: Record<string, DependencyHealth> = {
        state_machine: {
          status: 'unavailable',
          detail: 'state machine probe failed',
          checked_at: checkedAt,
        },
        dispatcher: {
          status: 'unavailable',
          detail: 'dispatcher probe failed',
          checked_at: checkedAt,
        },
        policy_service: {
          status: 'unavailable',
          detail: 'policy service probe failed',
          checked_at: checkedAt,
        },
      };

      try {
        const engine = getEngine();
        const status = engine.status();
        const transitionStatus =
          typeof status.transitionStatus === 'string' ? status.transitionStatus : null;

        dependencies.state_machine = {
          status: transitionStatus === 'IN_PROGRESS' ? 'degraded' : 'healthy',
          detail:
            transitionStatus === 'IN_PROGRESS'
              ? 'transition in progress; checkpoint recovery may be active'
              : 'state machine operational',
          checked_at: checkedAt,
          metadata: {
            state: status.state,
            mode: status.mode,
            transition_status: transitionStatus,
          },
        };

        const trackedAgents = getTrackedAgentsForState(status.state);
        const isExecutionState =
          status.state === 'ONBOARDING' ||
          status.state.startsWith('PHASE_') ||
          status.state.startsWith('CRITIC_') ||
          status.state === 'SYNTHESIS' ||
          status.state === 'SPRINT_GATE';
        const dispatcherStatus: DependencyStatus =
          isExecutionState && trackedAgents.length === 0 ? 'degraded' : 'healthy';

        dependencies.dispatcher = {
          status: dispatcherStatus,
          detail:
            dispatcherStatus === 'degraded'
              ? 'no phase agents mapped for active execution state'
              : 'dispatcher mappings available',
          checked_at: checkedAt,
          metadata: {
            state: status.state,
            tracked_agents: trackedAgents.map((agent) => agent.trackedId),
          },
        };
      } catch (err) {
        dependencies.state_machine = {
          status: 'unavailable',
          detail: 'state machine probe failed',
          checked_at: checkedAt,
          metadata: { error: getErrorMessage(err) },
        };
        dependencies.dispatcher = {
          status: 'unavailable',
          detail: 'dispatcher probe failed because state machine is unavailable',
          checked_at: checkedAt,
          metadata: { error: getErrorMessage(err) },
        };
      }

      try {
        const policyService = new PolicyService(toServiceContext(ctx as Record<string, unknown>));
        const packs = policyService.listPolicyPacks();
        const policyStatus: DependencyStatus = packs.count > 0 ? 'healthy' : 'degraded';
        dependencies.policy_service = {
          status: policyStatus,
          detail:
            policyStatus === 'healthy'
              ? 'policy packs loaded'
              : 'no policy packs loaded from configured context',
          checked_at: checkedAt,
          metadata: {
            pack_count: packs.count,
          },
        };
      } catch (err) {
        dependencies.policy_service = {
          status: 'unavailable',
          detail: 'policy service probe failed',
          checked_at: checkedAt,
          metadata: { error: getErrorMessage(err) },
        };
      }

      const dependencyStatuses = Object.values(dependencies).map((d) => d.status);
      const overallStatus = toOverallDependencyStatus(dependencyStatuses);
      const unavailableDependencies = dependencyStatuses.filter((s) => s === 'unavailable').length;
      const degradedDependencies = dependencyStatuses.filter((s) => s === 'degraded').length;
      const probeLatencyMs = Date.now() - startedAt;
      const alerts = buildControlPlaneAlerts(
        unavailableDependencies,
        degradedDependencies,
        probeLatencyMs
      );

      if (alerts.length > 0) {
        const severity = alerts.some((alert) => alert.severity === 'critical') ? 'error' : 'warn';
        structuredLog(severity, 'orchestrator_dependency_health_alert', {
          overall_status: overallStatus,
          unavailable_dependencies: unavailableDependencies,
          degraded_dependencies: degradedDependencies,
          probe_latency_ms: probeLatencyMs,
          alerts,
        });
      }

      return reply.status(overallStatus === 'unavailable' ? 503 : 200).send({
        ok: true,
        overall_status: overallStatus,
        dependencies,
        slos: {
          targets: {
            unavailable_dependencies_max: CONTROL_PLANE_SLO_TARGETS.maxUnavailableDependencies,
            degraded_dependencies_max: CONTROL_PLANE_SLO_TARGETS.maxDegradedDependencies,
            dependency_probe_latency_ms_max: CONTROL_PLANE_SLO_TARGETS.maxProbeLatencyMs,
          },
          observed: {
            unavailable_dependencies: unavailableDependencies,
            degraded_dependencies: degradedDependencies,
            dependency_probe_latency_ms: probeLatencyMs,
          },
          alerts,
        },
        timestamp: checkedAt,
      });
    }
  );

  // ── POST /api/orchestrator/advance ────────────────────────

  app.post(
    '/api/orchestrator/advance',
    { schema: RS.orchestratorAdvance },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = isRecord(request.body) ? request.body : {};
        if (_humanOverride.paused) {
          return reply
            .code(409)
            .send(errorResponse('ORCHESTRATOR_PAUSED', 'Orchestrator is paused. Resume first.'));
        }

        const profile = validateProfile({
          nodeEnv: process.env.NODE_ENV,
          host: HOST,
          storageProvider: STORAGE_PROVIDER,
          queueProvider: QUEUE_PROVIDER,
          sessionStore: SESSION_STORE,
          redisUrl: REDIS_URL,
          hasAuth: hasAuthConfigured({
            githubClientId: process.env.GITHUB_CLIENT_ID,
            apiKey: process.env.API_KEY,
          }),
          trustProxy: TRUST_PROXY,
          toolIsolationLevel: AGENT_TOOL_ISOLATION_LEVEL,
          toolExecMaxTimeoutMs: TOOL_EXEC_MAX_TIMEOUT_MS,
          toolExecMaxOutputBytes: TOOL_EXEC_MAX_OUTPUT_BYTES,
          toolExecMaxMemoryMb: TOOL_EXEC_MAX_MEMORY_MB,
          toolExecRequireWorkspaceCwd: TOOL_EXEC_REQUIRE_WORKSPACE_CWD,
        }).profile;

        let pendingApprovals = 0;
        try {
          pendingApprovals = governanceService.listApprovals().count;
        } catch (err) {
          if (!(err instanceof ServiceNotAvailableError)) {
            structuredLog('warn', 'orchestrator_review_gate_check_failed', {
              error: getErrorMessage(err),
            });
          }
        }

        if (shouldEnforceReviewGate(profile) && pendingApprovals > 0) {
          const timestamp = new Date().toISOString();
          structuredLog('warn', 'orchestrator_transition_blocked_review_gate', {
            profile,
            pendingApprovals,
          });
          sseNotify('orchestrator_transition_blocked', {
            type: 'orchestrator_transition_blocked',
            reason: 'pending_approvals',
            profile,
            pending_approvals: pendingApprovals,
            timestamp,
          });
          return reply.code(409).send({
            ...errorResponse(
              'REVIEW_GATE_BLOCKED',
              `Transition blocked: ${pendingApprovals} pending approval(s) require human decision.`
            ),
            profile,
            pending_approvals: pendingApprovals,
          });
        }

        const engine = getEngine();
        const prevStatus = engine.status();
        const prevState = prevStatus.state;
        const prevRuntime = getSessionRuntime(prevStatus);
        const gateResult = isRecord(body.gateResult) ? body.gateResult : undefined;
        const result = engine.advance(gateResult);
        const newStatus = engine.status();
        const nextRuntime = getSessionRuntime(newStatus);

        // Session tracking: start session on first advance from IDLE/READY
        const activeSession = sessionTracker.listSessions().find((s) => s.status === 'active');
        if (!activeSession && (prevState === 'IDLE' || prevState === 'READY')) {
          const project = newStatus.templateName ?? 'default';
          const flow = newStatus.mode || 'CREATE';
          sessionTracker.startSession(project, flow);
        }

        // Track phase transitions
        const currentSession = sessionTracker.listSessions().find((s) => s.status === 'active');
        if (currentSession) {
          if (prevRuntime.phase !== nextRuntime.phase && nextRuntime.phase) {
            if (prevRuntime.phase) {
              sessionTracker.addTimelineEvent(currentSession.id, {
                type: 'phase_complete',
                description: `Phase completed: ${prevRuntime.phase}`,
                phase: prevRuntime.phase,
              });
              sseNotify('phase_complete', {
                type: 'phase_complete',
                session_id: currentSession.id,
                phase: prevRuntime.phase,
                timestamp: new Date().toISOString(),
              });
            }
            sessionTracker.addTimelineEvent(currentSession.id, {
              type: 'phase_start',
              description: `Phase started: ${nextRuntime.phase}`,
              phase: nextRuntime.phase,
            });
            sseNotify('phase_start', {
              type: 'phase_start',
              session_id: currentSession.id,
              phase: nextRuntime.phase,
              timestamp: new Date().toISOString(),
            });
            sessionTracker.updateSession(currentSession.id, { phase: nextRuntime.phase });
          }

          if (
            isParallelTrackedState(prevState) &&
            prevState !== newStatus.state &&
            prevRuntime.phase
          ) {
            completeParallelTrackedAgents(
              currentSession.id,
              prevState,
              prevRuntime.phase,
              sseNotify
            );
          }

          if (
            isParallelTrackedState(newStatus.state) &&
            prevState !== newStatus.state &&
            nextRuntime.phase
          ) {
            const activeAgents = startParallelTrackedAgents(
              currentSession.id,
              newStatus.state,
              nextRuntime.phase,
              sseNotify
            );
            sessionTracker.updateSession(currentSession.id, {
              current_agent: activeAgents[0] || null,
              current_agents: activeAgents,
            });
          }

          // Track agent transitions
          if (!isParallelTrackedState(newStatus.state) && prevRuntime.agent !== nextRuntime.agent) {
            if (prevRuntime.agent && !isParallelTrackedState(prevState)) {
              const prevAgentName =
                getTrackedAgentName(prevState, prevRuntime.agent) || prevRuntime.agent;
              sessionTracker.completeAgent(prevRuntime.agent);
              sessionTracker.addTimelineEvent(currentSession.id, {
                type: 'agent_complete',
                description: `Agent completed: ${prevAgentName}`,
                agent: prevRuntime.agent,
                phase: prevRuntime.phase || undefined,
                metadata: { agent_name: prevAgentName },
              });
              sseNotify('agent_complete', {
                type: 'agent_complete',
                session_id: currentSession.id,
                agent: prevRuntime.agent,
                agent_name: prevAgentName,
                timestamp: new Date().toISOString(),
              });
            }
            if (nextRuntime.agent) {
              const nextAgentName =
                getTrackedAgentName(newStatus.state, nextRuntime.agent) || nextRuntime.agent;
              sessionTracker.startAgent(
                currentSession.id,
                nextRuntime.agent,
                nextAgentName,
                nextRuntime.phase || 'UNKNOWN',
                `Processing ${nextRuntime.phase || 'unknown'}`
              );
              sessionTracker.addTimelineEvent(currentSession.id, {
                type: 'agent_start',
                description: `Agent started: ${nextAgentName}`,
                agent: nextRuntime.agent,
                phase: nextRuntime.phase || undefined,
                metadata: { agent_name: nextAgentName },
              });
              sseNotify('agent_start', {
                type: 'agent_start',
                session_id: currentSession.id,
                agent: nextRuntime.agent,
                agent_name: nextAgentName,
                timestamp: new Date().toISOString(),
              });
              sessionTracker.updateSession(currentSession.id, {
                current_agent: nextRuntime.agent,
                current_agents: [nextRuntime.agent],
              });
            } else {
              sessionTracker.updateSession(currentSession.id, {
                current_agent: null,
                current_agents: [],
              });
            }
          } else if (!isParallelTrackedState(newStatus.state) && prevState !== newStatus.state) {
            sessionTracker.updateSession(currentSession.id, { current_agents: [] });
          }

          // Session completion on DONE/COMPLETE
          if (newStatus.state === 'DONE' || newStatus.state === 'COMPLETE') {
            sessionTracker.completeSession(currentSession.id, 'completed');
            sseNotify('session_complete', {
              type: 'session_complete',
              session_id: currentSession.id,
              status: 'completed',
              timestamp: new Date().toISOString(),
            });
          }
        }

        sseNotify('orchestrator_state', {
          type: 'orchestrator_state',
          transition: true,
          from: prevState,
          to: newStatus.state,
          phase: nextRuntime.phase || undefined,
          agent: nextRuntime.agent || undefined,
          ...(isParallelTrackedState(newStatus.state)
            ? buildParallelStateTelemetry(newStatus.state)
            : {
                active_agents: nextRuntime.agent ? [nextRuntime.agent] : [],
                parallel_group: null,
              }),
          timestamp: new Date().toISOString(),
        });
        return reply.send({ ok: true, transition: result, status: newStatus });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('warn', 'orchestrator_advance_failed', { error: message });
        return reply.code(400).send(errorResponse('ADVANCE_FAILED', message));
      }
    }
  );

  // ── POST /api/orchestrator/error ──────────────────────────

  app.post(
    '/api/orchestrator/error',
    { schema: RS.orchestratorError },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        const engine = getEngine();
        engine.error(String(body.reason).slice(0, 2000));
        const errorStatus = engine.status();

        // Track session error
        const activeSession = sessionTracker.listSessions().find((s) => s.status === 'active');
        if (activeSession) {
          sessionTracker.addTimelineEvent(activeSession.id, {
            type: 'error',
            description: `Error: ${String(body.reason).slice(0, 200)}`,
            metadata: { reason: String(body.reason).slice(0, 200) },
          });
          sessionTracker.updateSession(activeSession.id, { status: 'failed' });
          sseNotify('session_complete', {
            type: 'session_complete',
            session_id: activeSession.id,
            status: 'failed',
            timestamp: new Date().toISOString(),
          });
        }

        sseNotify('orchestrator_state', {
          type: 'orchestrator_state',
          state: 'ERROR',
          reason: String(body.reason).slice(0, 200),
          timestamp: new Date().toISOString(),
        });
        return reply.send({ ok: true, status: errorStatus });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_error_failed', { error: message });
        return reply.code(500).send(errorResponse('ENGINE_ERROR', message));
      }
    }
  );

  // ── POST /api/orchestrator/recover ────────────────────────

  app.post(
    '/api/orchestrator/recover',
    { schema: { tags: ['orchestrator'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const engine = getEngine();
        const recoveredState = engine.recover();
        const recoverStatus = engine.status();
        sseNotify('orchestrator_state', {
          type: 'orchestrator_state',
          state: recoverStatus.state,
          recovered: true,
          timestamp: new Date().toISOString(),
        });
        return reply.send({ ok: true, recoveredState, status: recoverStatus });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('warn', 'orchestrator_recover_failed', { error: message });
        return reply.code(400).send(errorResponse('RECOVER_FAILED', message));
      }
    }
  );

  // ── POST /api/orchestrator/pause ──────────────────────────

  app.post(
    '/api/orchestrator/pause',
    { schema: RS.orchestratorPause },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        if (_humanOverride.paused) {
          return reply
            .code(409)
            .send(errorResponse('ALREADY_PAUSED', 'Orchestrator is already paused'));
        }

        const rationale = String(body.rationale).slice(0, 2000);
        const requestedBy = body.requested_by
          ? String(body.requested_by).slice(0, 200)
          : 'operator';
        const engine = getEngine();
        const status = engine.pauseAtCheckpoint();

        const event: HumanOverrideEvent = {
          type: 'pause',
          rationale,
          requested_by: requestedBy,
          timestamp: new Date().toISOString(),
          state: status.state,
          mode: status.mode,
        };
        _humanOverride.paused = true;
        _humanOverride.events.push(event);
        persistHumanOverrideEvents();

        sseNotify('orchestrator_state', {
          type: 'orchestrator_state',
          paused: true,
          rationale: rationale.slice(0, 200),
          requested_by: requestedBy,
          timestamp: event.timestamp,
        });

        return reply.send({ ok: true, paused: true, status, event });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_pause_failed', { error: message });
        return reply.code(500).send(errorResponse('PAUSE_FAILED', message));
      }
    }
  );

  // ── POST /api/orchestrator/override ───────────────────────

  app.post(
    '/api/orchestrator/override',
    { schema: RS.orchestratorOverride },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        const rationale = String(body.rationale).slice(0, 2000);
        const requestedBy = body.requested_by
          ? String(body.requested_by).slice(0, 200)
          : 'operator';
        const mode = body.mode ? String(body.mode).slice(0, 50) : undefined;
        const phases = Array.isArray(body.phases) ? body.phases.map((p) => String(p)) : undefined;
        const engine = getEngine();
        const before = engine.status();

        if (!mode && (!phases || phases.length === 0)) {
          return reply
            .code(400)
            .send(errorResponse('INVALID_OVERRIDE', 'Provide mode and/or phases to override.'));
        }

        const nextMode = mode || before.mode;
        const status = engine.reset(nextMode, phases);

        const event: HumanOverrideEvent = {
          type: 'override',
          rationale,
          requested_by: requestedBy,
          timestamp: new Date().toISOString(),
          state: status.state,
          mode: status.mode,
          phases,
        };
        _humanOverride.paused = true;
        _humanOverride.events.push(event);
        persistHumanOverrideEvents();

        sseNotify('orchestrator_state', {
          type: 'orchestrator_state',
          override: true,
          paused: true,
          from_state: before.state,
          to_mode: status.mode,
          phases,
          rationale: rationale.slice(0, 200),
          requested_by: requestedBy,
          timestamp: event.timestamp,
        });

        return reply.send({ ok: true, paused: true, status, event });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_override_failed', { error: message });
        return reply.code(500).send(errorResponse('OVERRIDE_FAILED', message));
      }
    }
  );

  // ── POST /api/orchestrator/resume ─────────────────────────

  app.post(
    '/api/orchestrator/resume',
    { schema: RS.orchestratorResume },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        if (!_humanOverride.paused) {
          return reply.code(409).send(errorResponse('NOT_PAUSED', 'Orchestrator is not paused'));
        }

        const rationale = String(body.rationale).slice(0, 2000);
        const requestedBy = body.requested_by
          ? String(body.requested_by).slice(0, 200)
          : 'operator';
        const engine = getEngine();
        const status = engine.status();

        const event: HumanOverrideEvent = {
          type: 'resume',
          rationale,
          requested_by: requestedBy,
          timestamp: new Date().toISOString(),
          state: status.state,
          mode: status.mode,
        };
        _humanOverride.paused = false;
        _humanOverride.events.push(event);
        persistHumanOverrideEvents();

        sseNotify('orchestrator_state', {
          type: 'orchestrator_state',
          resumed: true,
          paused: false,
          rationale: rationale.slice(0, 200),
          requested_by: requestedBy,
          timestamp: event.timestamp,
        });

        return reply.send({ ok: true, resumed: true, status, event });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_resume_failed', { error: message });
        return reply.code(500).send(errorResponse('RESUME_FAILED', message));
      }
    }
  );

  // ── POST /api/orchestrator/reset ──────────────────────────

  app.post(
    '/api/orchestrator/reset',
    { schema: RS.orchestratorReset },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        const mode = String(body.mode).slice(0, 50);
        const phases = Array.isArray(body.phases) ? body.phases.map((p) => String(p)) : undefined;
        const template = body.template ? String(body.template).slice(0, 100) : undefined;

        // Force re-creation of engine (possibly with new template)
        if (template) {
          _templateName = template;
        }
        _engine = null;
        const newEngine = getEngine();
        const result = newEngine.reset(mode, phases);
        return reply.send({ ok: true, status: result });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_reset_failed', { error: message });
        return reply.code(500).send(errorResponse('RESET_FAILED', message));
      }
    }
  );

  // ── POST /api/orchestrator/validate-gate ──────────────────

  app.post(
    '/api/orchestrator/validate-gate',
    { schema: { tags: ['orchestrator'] } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        if (!body || !Array.isArray(body.deliverables) || body.deliverables.length === 0) {
          return reply
            .code(400)
            .send(
              errorResponse('INVALID_INPUT', 'deliverables array is required and must not be empty')
            );
        }
        const deliverables = body.deliverables.map((d) => String(d));
        const engine = getEngine();
        const result = engine.validateGate(deliverables);

        // Emit gate timeline event (M15-025)
        const activeSession = sessionTracker.listSessions().find((s) => s.status === 'active');
        if (activeSession) {
          const gateType = result.verdict === 'APPROVED' ? 'gate_passed' : 'gate_failed';
          const gatePhase = result.summary.phase || undefined;
          const unmetCriteria =
            (result.summary as { exitCriteria?: { unmet?: unknown[] } }).exitCriteria?.unmet || [];
          sessionTracker.addTimelineEvent(activeSession.id, {
            type: gateType,
            description: `Gate ${result.verdict}: ${result.summary.phase}`,
            phase: gatePhase,
            metadata: {
              verdict: result.verdict,
              violations: result.summary.totalViolations,
              unmetCriteria,
            },
          });
          sseNotify(gateType, {
            type: gateType,
            session_id: activeSession.id,
            phase: gatePhase,
            verdict: result.verdict,
            violations: result.summary.totalViolations,
            unmetCriteriaCount: Array.isArray(unmetCriteria) ? unmetCriteria.length : 0,
            timestamp: new Date().toISOString(),
          });
        }

        structuredLog(result.verdict === 'APPROVED' ? 'info' : 'warn', 'orchestrator_gate_result', {
          verdict: result.verdict,
          phase: result.summary.phase,
          violations: result.summary.totalViolations,
        });
        return reply.send({ ok: true, ...result });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_validate_gate_error', { error: message });
        return reply.code(500).send(errorResponse('GATE_VALIDATION_ERROR', message));
      }
    }
  );

  // ── GET /api/orchestrator/gate-diagnostics/:sessionId ─────

  app.get(
    '/api/orchestrator/gate-diagnostics/:sessionId',
    { schema: { tags: ['orchestrator'] } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const params = (request.params as Record<string, unknown>) || {};
        const sessionId = String(params.sessionId || '').trim();
        if (!sessionId) {
          return reply.code(400).send(errorResponse('INVALID_INPUT', 'sessionId is required'));
        }

        const timeline = sessionTracker.getTimeline(sessionId);
        if (!timeline || timeline.length === 0) {
          return reply.code(404).send(errorResponse('NOT_FOUND', 'Session timeline not found'));
        }

        const gateFailures = timeline.filter((event) => event.type === 'gate_failed');
        const diagnostics = gateFailures.map((event) => {
          const metadata = (event.metadata || {}) as Record<string, unknown>;
          return {
            eventId: event.id,
            timestamp: event.timestamp,
            phase: event.phase || null,
            description: event.description,
            verdict: metadata.verdict || 'FAILED',
            violations: metadata.violations || 0,
            unmetCriteria: Array.isArray(metadata.unmetCriteria) ? metadata.unmetCriteria : [],
          };
        });

        const latest = diagnostics.length > 0 ? diagnostics[diagnostics.length - 1] : null;
        return reply.send({
          ok: true,
          sessionId,
          totalFailures: diagnostics.length,
          latest,
          diagnostics,
        });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_gate_diagnostics_error', { error: message });
        return reply.code(500).send(errorResponse('GATE_DIAGNOSTICS_ERROR', message));
      }
    }
  );

  // ── POST /api/orchestrator/command ─────────────────────────

  app.post(
    '/api/orchestrator/command',
    { schema: { tags: ['orchestrator'] } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        if (!body || !body.command) {
          return reply.code(400).send(errorResponse('INVALID_INPUT', 'command is required'));
        }

        const VALID_COMMANDS = [
          'CREATE',
          'CREATE_BUSINESS',
          'CREATE_TECH',
          'CREATE_UX',
          'CREATE_MARKETING',
          'AUDIT',
          'FEATURE',
          'SCOPE_CHANGE',
          'HOTFIX',
          'REEVALUATE',
        ];
        const command = String(body.command)
          .toUpperCase()
          .replace(/[\s-]+/g, '_');
        if (!VALID_COMMANDS.includes(command)) {
          return reply
            .code(400)
            .send(
              errorResponse(
                'INVALID_COMMAND',
                `Unknown command "${body.command}". Valid: ${VALID_COMMANDS.join(', ')}`
              )
            );
        }

        const platform = body.platform ? String(body.platform).toLowerCase() : 'copilot';
        const validPlatforms = ['copilot', 'claude', 'codex'];
        if (!validPlatforms.includes(platform)) {
          return reply
            .code(400)
            .send(
              errorResponse(
                'INVALID_PLATFORM',
                `Unknown platform "${body.platform}". Valid: ${validPlatforms.join(', ')}`
              )
            );
        }

        const resume = Boolean(body.resume);
        const project = body.project ? String(body.project).slice(0, 200) : undefined;
        const template = body.template ? String(body.template).slice(0, 100) : undefined;

        // Apply template selection when starting fresh
        if (template && !resume) {
          _templateName = template;
          _engine = null;
        }
        const engine = getEngine();

        if (!resume) {
          engine.reset(command);

          // Seed decision templates into BusinessDocs/ if decisions/ doesn't exist yet
          const businessDocsDir = path.resolve(process.cwd(), 'BusinessDocs');
          try {
            const seedResult = seedDecisions(_templateName, businessDocsDir);
            if (seedResult.seeded) {
              structuredLog('info', 'orchestrator_decisions_seeded', {
                files: seedResult.files.length,
                indexFile: seedResult.indexFile,
              });
            }
          } catch (seedErr) {
            structuredLog('warn', 'orchestrator_decisions_seed_failed', {
              error: getErrorMessage(seedErr),
            });
          }
        }

        const st = engine.status();
        structuredLog('info', 'orchestrator_command', {
          command,
          platform,
          project,
          resume,
          state: st.state,
          mode: st.mode,
        });

        return reply.send({
          ok: true,
          command,
          project,
          platform,
          resume,
          status: st,
        });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_command_error', { error: message });
        return reply.code(500).send(errorResponse('COMMAND_ERROR', message));
      }
    }
  );

  // ── GET /api/orchestrator/run-history ────────────────────────

  app.get(
    '/api/orchestrator/run-history',
    { schema: { tags: ['orchestrator'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const engine = getEngine();
        const runs = engine.runHistory();
        return reply.send({ ok: true, runs });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_run_history_error', { error: message });
        return reply.code(500).send(errorResponse('RUN_HISTORY_ERROR', message));
      }
    }
  );

  // ── POST /api/orchestrator/stop ─────────────────────────────

  app.post(
    '/api/orchestrator/stop',
    { schema: { tags: ['orchestrator'] } },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const engine = getEngine();
        const st = engine.stop();
        return reply.send({ ok: true, stopped: true, status: st });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_stop_failed', { error: message });
        return reply.code(500).send(errorResponse('STOP_FAILED', message));
      }
    }
  );

  // ── POST /api/orchestrator/sprint-gate ────────────────────

  app.post(
    '/api/orchestrator/sprint-gate',
    { schema: { tags: ['orchestrator'] } },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Record<string, unknown>) || {};
        if (!body || !body.sprintId) {
          return reply.code(400).send(errorResponse('INVALID_INPUT', 'sprintId is required'));
        }
        const engine = getEngine();
        const result = engine.sprintGate({
          sprintId: String(body.sprintId).slice(0, 50),
          stories: Array.isArray(body.stories) ? body.stories : [],
          plannedItems: body.plannedItems != null ? Number(body.plannedItems) : undefined,
          paths: body.paths || {},
        });
        structuredLog(result.verdict === 'READY' ? 'info' : 'warn', 'orchestrator_sprint_gate', {
          verdict: result.verdict,
          sprintId: result.summary.sprintId,
          blockers: result.summary.totalBlockers,
        });
        return reply.send({ ok: true, ...result });
      } catch (err) {
        const message = getErrorMessage(err);
        structuredLog('error', 'orchestrator_sprint_gate_error', { error: message });
        return reply.code(500).send(errorResponse('SPRINT_GATE_ERROR', message));
      }
    }
  );

  // Expose getEngine for cross-route wiring
  ctx._getEngine = getEngine;
  ctx._getHumanOverrideEvents = () => [..._humanOverride.events];
}
