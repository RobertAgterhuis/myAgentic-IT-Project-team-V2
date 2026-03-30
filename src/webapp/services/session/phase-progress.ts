// Copyright (c) 2026 Robert Agterhuis. MIT License.

import type { ProgressInfo, SessionState } from '../types';
import {
  PHASE_AGENTS as RUNTIME_PHASE_AGENTS,
  assertRuntimeSchemaParity,
} from '../../../../platform/engine/dispatcher';
import { STATES } from '../../../../platform/engine/state-machine';

type AgentAutomationLevel = 'autonomous' | 'supervised' | 'human_required';

type AgentDef = { id: string; name: string; automation_level: AgentAutomationLevel };

type PhaseProgressItem = {
  key: string;
  label: string;
  status: string;
  agents: Array<{
    id: string;
    name: string;
    status: string;
    automation_level: AgentAutomationLevel;
  }>;
  done: number;
  total: number;
};

const SUPERVISED_AGENT_IDS = new Set(['00', '18', '19', '21', '22', '29', '38']);
const HUMAN_REQUIRED_AGENT_IDS = new Set(['33', '36']);

function resolveAutomationLevel(agentId: string): AgentAutomationLevel {
  if (HUMAN_REQUIRED_AGENT_IDS.has(agentId)) return 'human_required';
  if (SUPERVISED_AGENT_IDS.has(agentId)) return 'supervised';
  return 'autonomous';
}

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

function toProgressPhaseFromRuntimeState(runtimeState: string): string | null {
  return PROGRESS_PHASE_FROM_RUNTIME_STATE[runtimeState] || null;
}

function compileProgressPhaseAgents(runtimePhaseAgents: Record<string, AgentDef[]>) {
  const phaseAgents: Record<string, AgentDef[]> = Object.fromEntries(
    PHASE_ORDER.map((key) => [key, [] as AgentDef[]])
  );

  for (const [runtimeState, progressPhase] of Object.entries(PROGRESS_PHASE_FROM_RUNTIME_STATE)) {
    phaseAgents[progressPhase] = (runtimePhaseAgents[runtimeState] || []).map((agent) => ({
      id: agent.id,
      name: agent.name,
      automation_level: resolveAutomationLevel(agent.id),
    }));
  }

  // Preserve critic gate visibility in phase progress while keeping phase
  // specialists sourced from canonical runtime schema.
  const criticRollup: AgentDef = {
    id: 'critic_risk',
    name: 'Critic + Risk',
    automation_level: 'supervised',
  };
  for (const phaseKey of ['PHASE-1', 'PHASE-2', 'PHASE-3', 'PHASE-4']) {
    phaseAgents[phaseKey].push({ ...criticRollup });
  }

  return phaseAgents;
}

assertRuntimeSchemaParity(RUNTIME_PHASE_AGENTS);
const PHASE_AGENTS: Record<string, AgentDef[]> = compileProgressPhaseAgents(
  RUNTIME_PHASE_AGENTS as Record<string, AgentDef[]>
);

function buildDynamicPhaseAgents(session: SessionState): Record<string, AgentDef[]> {
  const phaseAgents: Record<string, AgentDef[]> = Object.fromEntries(
    PHASE_ORDER.map((key) => [key, [...(PHASE_AGENTS[key] || [])]])
  );

  const executionMode = String(session.execution_mode || session.mode || '')
    .trim()
    .toUpperCase();
  const executionPlan = session.execution_plan;
  if (!executionPlan || typeof executionPlan !== 'object') {
    return phaseAgents;
  }

  const addUniqueAgent = (phaseKey: string, agentId: string, agentName: string) => {
    if (!phaseAgents[phaseKey]) return;
    if (phaseAgents[phaseKey].some((entry) => entry.id === agentId)) return;
    phaseAgents[phaseKey].push({
      id: agentId,
      name: agentName,
      automation_level: 'autonomous',
    });
  };

  if (executionMode === 'HYBRID' && Array.isArray(executionPlan.hybridInjections)) {
    for (const injection of executionPlan.hybridInjections) {
      const runtimeState = typeof injection?.atState === 'string' ? injection.atState : '';
      const phaseKey = toProgressPhaseFromRuntimeState(runtimeState);
      if (!phaseKey || !Array.isArray(injection?.agents)) continue;

      for (const agent of injection.agents) {
        const agentId = typeof agent?.id === 'string' ? agent.id.trim() : '';
        const agentName = typeof agent?.name === 'string' ? agent.name.trim() : '';
        if (!agentId || !agentName) continue;
        addUniqueAgent(phaseKey, agentId, agentName);
      }
    }
  }

  if (executionMode === 'AGENCY_ONLY' && Array.isArray(executionPlan.selectedAgencyAgents)) {
    // AGENCY_ONLY bypasses SDLC lanes, so display the selected agency roster
    // in ONBOARDING as the launch lane to keep the run dashboard informative.
    for (const agent of executionPlan.selectedAgencyAgents) {
      const agentId = typeof agent?.id === 'string' ? agent.id.trim() : '';
      const agentName = typeof agent?.name === 'string' ? agent.name.trim() : '';
      if (!agentId || !agentName) continue;
      addUniqueAgent('ONBOARDING', agentId, agentName);
    }
  }

  return phaseAgents;
}

function isAgentCompleted(agent: AgentDef, completedAgents: string[]): boolean {
  const agentFile = agent.id + '-' + agent.name.toLowerCase().replace(/[^a-z]+/g, '-');
  return completedAgents.includes(agentFile) || completedAgents.includes(agent.id);
}

function isAgentActive(
  agent: AgentDef,
  phaseKey: string,
  currentPhase: string | null,
  currentAgent: string | null,
  currentAgents: string[]
): boolean {
  const activeAgents =
    currentAgents.length > 0 ? currentAgents : currentAgent ? [currentAgent] : [];
  return (
    currentPhase === phaseKey &&
    activeAgents.some(
      (entry) =>
        entry.startsWith(agent.id + '-') ||
        entry.endsWith(`-${agent.id}`) ||
        entry === agent.id
    )
  );
}

function resolveAgentStatus(
  agent: AgentDef,
  phaseKey: string,
  completedAgents: string[],
  currentPhase: string | null,
  currentAgent: string | null,
  currentAgents: string[],
  phaseOutputs: Record<string, unknown>
): string {
  if (isAgentCompleted(agent, completedAgents)) return 'done';
  if (isAgentActive(agent, phaseKey, currentPhase, currentAgent, currentAgents)) return 'active';

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
      currentAgents: [],
      phases: [],
      activeSprint: null,
    };
  }

  const currentAgents = session.currentAgents || session.current_agents || [];

  return {
    projectName: session.projectName || null,
    mode: session.mode || null,
    currentPhase: session.currentPhase || session.current_phase || null,
    currentAgent: session.currentAgent || session.current_agent || null,
    currentAgents,
    phases: session.phases || [],
    activeSprint: session.activeSprint || null,
  };
}

export function buildPhaseProgress(session: SessionState): PhaseProgressItem[] {
  const completedPhases = session.completed_phases || [];
  const completedAgents = session.completed_agents || [];
  const currentPhase = session.current_phase || null;
  const currentAgents = session.currentAgents || session.current_agents || [];
  const phaseOutputs = session.phase_outputs || {};
  const phaseAgents = buildDynamicPhaseAgents(session);

  return PHASE_ORDER.map((phaseKey) => {
    const agents = (phaseAgents[phaseKey] || []).map((a) => ({
      id: a.id,
      name: a.name,
      status: resolveAgentStatus(
        a,
        phaseKey,
        completedAgents,
        currentPhase,
        session.current_agent || null,
        currentAgents,
        phaseOutputs
      ),
      automation_level: a.automation_level,
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
      automation_level: a.automation_level,
    })),
    done: 0,
    total: (PHASE_AGENTS[key] || []).length,
  }));
}
