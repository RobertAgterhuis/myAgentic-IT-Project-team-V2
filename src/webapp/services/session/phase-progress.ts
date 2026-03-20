// Copyright (c) 2026 Robert Agterhuis. MIT License.

import type { ProgressInfo, SessionState } from '../types';
import {
  PHASE_AGENTS as RUNTIME_PHASE_AGENTS,
  assertRuntimeSchemaParity,
} from '../../../../platform/engine/dispatcher';
import { STATES } from '../../../../platform/engine/state-machine';

type AgentDef = { id: string; name: string };

type PhaseProgressItem = {
  key: string;
  label: string;
  status: string;
  agents: Array<{ id: string; name: string; status: string }>;
  done: number;
  total: number;
};

const PHASE_ORDER = [
  'ONBOARDING',
  'PHASE-1',
  'PHASE-2',
  'PHASE-3',
  'PHASE-4',
  'SYNTHESIS',
  'PHASE-5',
];

const PHASE_LABELS: Record<string, string> = {
  ONBOARDING: 'Onboarding',
  'PHASE-1': 'Phase 1 — Requirements & Strategy',
  'PHASE-2': 'Phase 2 — Architecture & Design',
  'PHASE-3': 'Phase 3 — Experience Design',
  'PHASE-4': 'Phase 4 — Brand & Growth',
  SYNTHESIS: 'Synthesis',
  'PHASE-5': 'Phase 5 — Implementation',
};

const PROGRESS_PHASE_FROM_RUNTIME_STATE = Object.freeze({
  [STATES.ONBOARDING]: 'ONBOARDING',
  [STATES.PHASE_1]: 'PHASE-1',
  [STATES.PHASE_2]: 'PHASE-2',
  [STATES.PHASE_3]: 'PHASE-3',
  [STATES.PHASE_4]: 'PHASE-4',
  [STATES.SYNTHESIS]: 'SYNTHESIS',
  [STATES.PHASE_5_EXECUTING]: 'PHASE-5',
} as Record<string, string>);

function compileProgressPhaseAgents(runtimePhaseAgents: Record<string, AgentDef[]>) {
  const phaseAgents: Record<string, AgentDef[]> = Object.fromEntries(
    PHASE_ORDER.map((key) => [key, [] as AgentDef[]])
  );

  for (const [runtimeState, progressPhase] of Object.entries(PROGRESS_PHASE_FROM_RUNTIME_STATE)) {
    phaseAgents[progressPhase] = (runtimePhaseAgents[runtimeState] || []).map((agent) => ({
      id: agent.id,
      name: agent.name,
    }));
  }

  // Preserve critic gate visibility in phase progress while keeping phase
  // specialists sourced from canonical runtime schema.
  const criticRollup: AgentDef = { id: 'critic_risk', name: 'Critic + Risk' };
  for (const phaseKey of ['PHASE-1', 'PHASE-2', 'PHASE-3', 'PHASE-4']) {
    phaseAgents[phaseKey].push({ ...criticRollup });
  }

  return phaseAgents;
}

assertRuntimeSchemaParity(RUNTIME_PHASE_AGENTS);
const PHASE_AGENTS: Record<string, AgentDef[]> = compileProgressPhaseAgents(
  RUNTIME_PHASE_AGENTS as Record<string, AgentDef[]>
);

function isAgentCompleted(agent: AgentDef, completedAgents: string[]): boolean {
  const agentFile = agent.id + '-' + agent.name.toLowerCase().replace(/[^a-z]+/g, '-');
  return completedAgents.includes(agentFile) || completedAgents.includes(agent.id);
}

function isAgentActive(
  agent: AgentDef,
  phaseKey: string,
  currentPhase: string | null,
  currentAgent: string | null
): boolean {
  return (
    currentPhase === phaseKey &&
    !!currentAgent &&
    (currentAgent.startsWith(agent.id + '-') || currentAgent === agent.id)
  );
}

function resolveAgentStatus(
  agent: AgentDef,
  phaseKey: string,
  completedAgents: string[],
  currentPhase: string | null,
  currentAgent: string | null,
  phaseOutputs: Record<string, unknown>
): string {
  if (isAgentCompleted(agent, completedAgents)) return 'done';
  if (isAgentActive(agent, phaseKey, currentPhase, currentAgent)) return 'active';

  const po = phaseOutputs[phaseKey.toLowerCase()];
  if (
    (po &&
      typeof po === 'object' &&
      (po as Record<string, unknown>)[agent.id] &&
      (po as Record<string, unknown>)[agent.id] !== 'null') ||
    (po && typeof po === 'string' && po !== 'null' && phaseKey === 'ONBOARDING')
  ) {
    return 'done';
  }

  return 'pending';
}

function resolvePhaseStatus(
  phaseKey: string,
  completedPhases: string[],
  currentPhase: string | null,
  session: SessionState
): string {
  if (completedPhases.includes(phaseKey)) return 'done';
  if (currentPhase === phaseKey) return 'active';

  if (
    phaseKey === 'PHASE-5' &&
    session.sprint_backlog &&
    (session.sprint_backlog.total_sprints || 0) > 0
  ) {
    return 'active';
  }

  return 'pending';
}

export function buildProgressMcp(session: SessionState | null): ProgressInfo {
  if (!session) {
    return {
      projectName: null,
      mode: null,
      currentPhase: null,
      currentAgent: null,
      phases: [],
      activeSprint: null,
    };
  }

  return {
    projectName: session.projectName || null,
    mode: session.mode || null,
    currentPhase: session.currentPhase || session.current_phase || null,
    currentAgent: session.currentAgent || session.current_agent || null,
    phases: session.phases || [],
    activeSprint: session.activeSprint || null,
  };
}

export function buildPhaseProgress(session: SessionState): PhaseProgressItem[] {
  const completedPhases = session.completed_phases || [];
  const completedAgents = session.completed_agents || [];
  const currentPhase = session.current_phase || null;
  const phaseOutputs = session.phase_outputs || {};

  return PHASE_ORDER.map((phaseKey) => {
    const agents = (PHASE_AGENTS[phaseKey] || []).map((a) => ({
      id: a.id,
      name: a.name,
      status: resolveAgentStatus(
        a,
        phaseKey,
        completedAgents,
        currentPhase,
        session.current_agent || null,
        phaseOutputs
      ),
    }));

    const phaseStatus = resolvePhaseStatus(phaseKey, completedPhases, currentPhase, session);
    const done = agents.filter((a) => a.status === 'done').length;

    return {
      key: phaseKey,
      label: PHASE_LABELS[phaseKey],
      status: phaseStatus,
      agents,
      done,
      total: agents.length,
    };
  });
}

export function buildEmptyPhases(): PhaseProgressItem[] {
  return PHASE_ORDER.map((key) => ({
    key,
    label: PHASE_LABELS[key],
    status: 'pending',
    agents: (PHASE_AGENTS[key] || []).map((a) => ({
      id: a.id,
      name: a.name,
      status: 'pending',
    })),
    done: 0,
    total: (PHASE_AGENTS[key] || []).length,
  }));
}
