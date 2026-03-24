/**
 * Controller hook for SessionDetailPage — encapsulates data fetching and derived state.
 * P1-UI-E1-I1 — Decompose monolithic operational pages
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/hooks';
import { useRuntimeStore } from '@/stores/runtime-store';
import type {
  SessionStatus,
  AgentDetailEntry,
  TimelineEvent,
  GateFailureInfo,
} from '@/lib/api-types';
import type { FlowPhase } from '@/components/runtime/flow-timeline';
import type { AgentEntry } from '@/components/runtime/agent-activity';
import type { RuntimeLogEvent } from '@/components/runtime/runtime-log';

const PHASE_ORDER = ['PHASE-1', 'PHASE-2', 'PHASE-3', 'PHASE-4', 'PHASE-5'];

function derivePhases(
  currentPhase: string,
  sessionStatus: SessionStatus,
  timeline: TimelineEvent[]
): FlowPhase[] {
  const completedPhases = new Set<string>();
  const startedPhases = new Set<string>();
  for (const event of timeline) {
    if (event.type === 'phase_complete' && event.phase) completedPhases.add(event.phase);
    if (event.type === 'phase_start' && event.phase) startedPhases.add(event.phase);
  }
  return PHASE_ORDER.map((id) => {
    let status: 'completed' | 'running' | 'pending' | 'failed' = 'pending';
    if (completedPhases.has(id)) {
      status = 'completed';
    } else if (id === currentPhase) {
      status = sessionStatus === 'failed' ? 'failed' : 'running';
    } else if (startedPhases.has(id)) {
      status = 'running';
    }
    return { id, label: id.replace('-', ' '), status };
  });
}

function toAgentEntry(agent: AgentDetailEntry): AgentEntry {
  return {
    id: agent.id,
    name: agent.name,
    status: agent.status === 'retrying' ? 'retrying' : agent.status,
    taskDescription: agent.task_description,
    startedAt: agent.started_at,
    retryCount: agent.retry_count,
  };
}

function toLogEvent(event: TimelineEvent): RuntimeLogEvent {
  return {
    id: event.id,
    type: event.type as RuntimeLogEvent['type'],
    timestamp: event.timestamp,
    description: event.description,
    agent: event.agent,
    phase: event.phase,
    artifactId: event.artifact_id,
    metadata: event.metadata,
  };
}

export function useSessionDetailController(sessionId: string) {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSession(sessionId);
  const [explainAgent, setExplainAgent] = useState<AgentDetailEntry | null>(null);
  const [gateFailure, setGateFailure] = useState<GateFailureInfo | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<string | null>(null);

  const storeEvents = useRuntimeStore((s) => s.events);

  const session = data?.session;
  const agents = useMemo(() => data?.agents ?? [], [data?.agents]);
  const timeline = useMemo(() => data?.timeline ?? [], [data?.timeline]);

  const phases = useMemo(
    () => derivePhases(session?.phase ?? '', session?.status ?? 'active', timeline),
    [session?.phase, session?.status, timeline]
  );

  const agentEntries = useMemo(() => agents.map(toAgentEntry), [agents]);

  const mergedLogEvents = useMemo(() => {
    const queryEvents = timeline.map(toLogEvent);
    const seenIds = new Set(queryEvents.map((e) => e.id));
    const liveEvents: RuntimeLogEvent[] = storeEvents
      .filter((e) => !seenIds.has(e.id))
      .map((e) => ({
        id: e.id,
        type: e.type,
        timestamp: e.timestamp,
        description: e.description,
        agent: e.agent,
        phase: e.phase,
        artifactId: e.artifactId,
      }));
    return [...queryEvents, ...liveEvents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [timeline, storeEvents]);

  const filteredLogEvents = useMemo(
    () => (phaseFilter ? mergedLogEvents.filter((e) => e.phase === phaseFilter) : mergedLogEvents),
    [mergedLogEvents, phaseFilter]
  );

  const artifactEvents = useMemo(
    () => timeline.filter((e) => e.type === 'artifact_created'),
    [timeline]
  );
  const decisionEvents = useMemo(
    () => timeline.filter((e) => e.type === 'decision_created'),
    [timeline]
  );

  const latestGateFailure = useMemo(() => {
    const timelineFailures = timeline.filter((e) => e.type === 'gate_failed');
    if (timelineFailures.length > 0) {
      return toLogEvent(timelineFailures[timelineFailures.length - 1]);
    }
    const failures = mergedLogEvents.filter((e) => e.type === 'gate_failed');
    return failures.length > 0 ? failures[failures.length - 1] : null;
  }, [timeline, mergedLogEvents]);

  const handleGateFailureShow = useCallback(
    (event: RuntimeLogEvent) => {
      const metadata = (event.metadata || {}) as Record<string, unknown>;
      const unmetCriteriaRaw = Array.isArray(metadata.unmetCriteria)
        ? metadata.unmetCriteria
        : ([] as unknown[]);
      const unmetCriteria = unmetCriteriaRaw
        .map((criterion) => {
          if (
            criterion &&
            typeof criterion === 'object' &&
            'id' in criterion &&
            'title' in criterion
          ) {
            const c = criterion as { id: string; title: string };
            return `${c.id}: ${c.title}`;
          }
          return null;
        })
        .filter((item): item is string => !!item);
      setGateFailure({
        phase: event.phase ?? session?.phase ?? '',
        reason: event.description,
        suggestedAction: 'Review gate violations and fix outstanding issues before retrying.',
        violations: Number(metadata.violations) || 1,
        timestamp: event.timestamp,
        relatedArtifactId: event.artifactId,
        unmetCriteria,
      });
      setExplainAgent(null);
    },
    [session?.phase]
  );

  const handlePhaseClick = useCallback(
    (phaseId: string) => {
      setPhaseFilter(phaseFilter === phaseId ? null : phaseId);
    },
    [phaseFilter]
  );

  const gateFailuresCount = mergedLogEvents.filter((e) => e.type === 'gate_failed').length;

  return {
    navigate,
    data,
    isLoading,
    error,
    refetch,
    session,
    agents,
    agentEntries,
    phases,
    filteredLogEvents,
    mergedLogEvents,
    artifactEvents,
    decisionEvents,
    latestGateFailure,
    gateFailuresCount,
    explainAgent,
    setExplainAgent,
    gateFailure,
    setGateFailure,
    phaseFilter,
    handleGateFailureShow,
    handlePhaseClick,
  };
}
