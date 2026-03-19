// Copyright (c) 2026 Robert Agterhuis. MIT License.

import type { ProgressInfo, SessionState } from '../types';

type AgentDef = { id: string; name: string };

type PhaseProgressItem = {
  key: string;
  label: string;
  status: string;
  agents: Array<{ id: string; name: string; status: string }>;
  done: number;
  total: number;
};

const PHASE_AGENTS: Record<string, AgentDef[]> = {
  ONBOARDING: [{ id: '25', name: 'Onboarding Agent' }],
  'PHASE-1': [
    { id: '01', name: 'Business Analyst' },
    { id: '02', name: 'Domain Expert' },
    { id: '03', name: 'Sales Strategist' },
    { id: '04', name: 'Financial Analyst' },
    { id: '34', name: 'Product Manager' },
    { id: 'critic_risk', name: 'Critic + Risk' },
  ],
  'PHASE-2': [
    { id: '05', name: 'Software Architect' },
    { id: '06', name: 'Senior Developer' },
    { id: '07', name: 'DevOps Engineer' },
    { id: '08', name: 'Security Architect' },
    { id: '09', name: 'Data Architect' },
    { id: '33', name: 'Legal Counsel' },
    { id: 'critic_risk', name: 'Critic + Risk' },
  ],
  'PHASE-3': [
    { id: '10', name: 'UX Researcher' },
    { id: '11', name: 'UX Designer' },
    { id: '12', name: 'UI Designer' },
    { id: '13', name: 'Accessibility Specialist' },
    { id: '32', name: 'Content Strategist' },
    { id: '35', name: 'Localization Specialist' },
    { id: 'critic_risk', name: 'Critic + Risk' },
  ],
  'PHASE-4': [
    { id: '14', name: 'Brand Strategist' },
    { id: '15', name: 'Growth Marketer' },
    { id: '16', name: 'CRO Specialist' },
    { id: 'critic_risk', name: 'Critic + Risk' },
    { id: '30', name: 'Brand & Assets Agent' },
    { id: '31', name: 'Storybook Agent' },
  ],
  SYNTHESIS: [
    { id: '17', name: 'Synthesis Agent' },
    { id: '27', name: 'GitHub Integration' },
  ],
  'PHASE-5': [
    { id: '20', name: 'Implementation Agent' },
    { id: '21', name: 'Test Agent' },
    { id: '22', name: 'PR/Review Agent' },
    { id: '29', name: 'KPI Agent' },
    { id: '26', name: 'Documentation Agent' },
    { id: '27', name: 'GitHub Integration' },
    { id: '28', name: 'Retrospective Agent' },
  ],
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
