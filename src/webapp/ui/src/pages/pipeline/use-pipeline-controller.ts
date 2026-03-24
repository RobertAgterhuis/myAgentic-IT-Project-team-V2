/**
 * Controller hook for PipelinePage — encapsulates data fetching and swimlane derivation.
 * P1-UI-E1-I1 — Decompose monolithic operational pages
 */
import { useNavigate } from 'react-router-dom';
import { useOrchestratorStatus, useProgress } from '@/hooks';
import type { AgentEntry, PhaseEntry, SessionInfo } from '@/lib/api-types';

export type SwimlaneStatus = PhaseEntry['status'] | 'needs-input';
export type SwimlaneAgentStatus = AgentEntry['status'] | 'needs-input';

export interface SwimlaneAgent extends AgentEntry {
  swimlaneStatus: SwimlaneAgentStatus;
}

export interface SwimlanePhase extends Omit<PhaseEntry, 'agents' | 'status'> {
  status: SwimlaneStatus;
  agents: SwimlaneAgent[];
  activeAgentName: string | null;
  openEscalations: number;
  humanBlockers: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHumanRequiredBlocker(blocker: unknown): boolean {
  return isRecord(blocker) && blocker.type === 'HUMAN_REQUIRED';
}

function isCurrentAgent(session: SessionInfo | null, phaseKey: string, agentId: string): boolean {
  const currentPhase = session?.current_phase ?? null;
  const currentAgent = session?.current_agent ?? null;
  if (!currentAgent || currentPhase !== phaseKey) return false;
  return currentAgent === agentId || currentAgent.startsWith(`${agentId}-`);
}

function currentAgentMatch(
  agent: AgentEntry,
  session: SessionInfo | null,
  phaseKey: string
): boolean {
  return isCurrentAgent(session, phaseKey, agent.id);
}

function buildSwimlanes(phases: PhaseEntry[], session: SessionInfo | null): SwimlanePhase[] {
  const openEscalations = Array.isArray(session?.open_human_escalations)
    ? session.open_human_escalations
    : [];
  const blockers = Array.isArray(session?.blockers) ? session.blockers : [];
  const humanBlockers = blockers.filter(isHumanRequiredBlocker).length;
  const awaitingHuman =
    session?.status === 'AWAITING_HUMAN' || openEscalations.length > 0 || humanBlockers > 0;

  return phases.map((phase) => {
    const laneNeedsInput = awaitingHuman && session?.current_phase === phase.key;
    const agents = phase.agents.map((agent) => {
      const current = isCurrentAgent(session, phase.key, agent.id);
      const swimlaneStatus: SwimlaneAgentStatus =
        laneNeedsInput && current ? 'needs-input' : agent.status;
      return { ...agent, swimlaneStatus };
    });
    const laneStatus: SwimlaneStatus = laneNeedsInput ? 'needs-input' : phase.status;

    return {
      ...phase,
      status: laneStatus,
      agents,
      activeAgentName:
        agents.find((agent) => currentAgentMatch(agent, session, phase.key))?.name ?? null,
      openEscalations: laneNeedsInput ? openEscalations.length : 0,
      humanBlockers: laneNeedsInput ? humanBlockers : 0,
    };
  });
}

const laneStatusLabel: Record<SwimlaneStatus, string> = {
  pending: 'Queued',
  active: 'Active',
  done: 'Completed',
  'needs-input': 'Needs input',
};

function getPipelineGuidance(
  swimlanes: SwimlanePhase[],
  session: SessionInfo | null,
  openEscalations: number,
  humanBlockers: number
) {
  const activeLane = swimlanes.find(
    (lane) => lane.status === 'active' || lane.status === 'needs-input'
  );

  if (!session) {
    return {
      title: 'Start a command first',
      description:
        'This page becomes useful after you launch CREATE, AUDIT, FEATURE, or HOTFIX from Commands.',
      actionLabel: 'Go to Commands',
      actionHref: '/commands',
      badge: 'Idle',
    };
  }

  if (openEscalations > 0 || humanBlockers > 0) {
    return {
      title: 'Answer the blocked question first',
      description:
        'The pipeline is waiting for more information. Open the current session to see the exact escalation and continue execution.',
      actionLabel: 'Open Session',
      actionHref: session.session_id
        ? `/sessions/${encodeURIComponent(session.session_id)}`
        : '/sessions',
      badge: 'Needs input',
    };
  }

  if (activeLane) {
    return {
      title: `Follow ${activeLane.label}`,
      description: activeLane.activeAgentName
        ? `${activeLane.activeAgentName} is currently active. Use this page to see which phase is live and which agents are next.`
        : 'A phase is active. Follow the highlighted lane and its agents to track what is happening now.',
      actionLabel: 'Open Session',
      actionHref: session.session_id
        ? `/sessions/${encodeURIComponent(session.session_id)}`
        : '/sessions',
      badge: laneStatusLabel[activeLane.status],
    };
  }

  return {
    title: 'Review the full delivery flow',
    description:
      'All lanes are visible here. Use this page to understand which phases are complete and what remains before the cycle finishes.',
    actionLabel: 'Open Sessions',
    actionHref: '/sessions',
    badge: 'Overview',
  };
}

export function usePipelineController() {
  const navigate = useNavigate();
  const { data: status } = useOrchestratorStatus();
  const { data: progress, isLoading, error, refetch } = useProgress();

  const phases = progress?.phases ?? [];
  const session = progress?.session ?? null;
  const swimlanes = buildSwimlanes(phases, session);

  const openEscalations = Array.isArray(session?.open_human_escalations)
    ? session.open_human_escalations.length
    : 0;
  const humanBlockers = Array.isArray(session?.blockers)
    ? session.blockers.filter(isHumanRequiredBlocker).length
    : 0;

  const nextStep = getPipelineGuidance(swimlanes, session, openEscalations, humanBlockers);

  return {
    navigate,
    status,
    progress,
    isLoading,
    error,
    refetch,
    swimlanes,
    session,
    openEscalations,
    humanBlockers,
    nextStep,
  };
}
