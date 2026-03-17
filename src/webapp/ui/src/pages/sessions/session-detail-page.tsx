/**
 * Session Detail page — core runtime screen showing live session progress.
 * Layout: FlowTimeline (top), AgentActivity (left), Artifacts+Decisions (right),
 * RuntimeLog (bottom), ExplainabilityPanel (contextual).
 * M15 / Issues #M15-029, #M15-034, #M15-035, #M15-036, #M15-037
 */
import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heading, Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ProgressBar } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { FlowTimeline, type FlowPhase } from '@/components/runtime/flow-timeline';
import { AgentActivity, type AgentEntry } from '@/components/runtime/agent-activity';
import { RuntimeLog, type RuntimeLogEvent } from '@/components/runtime/runtime-log';
import { ExplainabilityPanel } from '@/components/runtime/explainability-panel';
import { useSession } from '@/hooks';
import { useRuntimeStore } from '@/stores/runtime-store';
import type {
  SessionStatus,
  AgentDetailEntry,
  TimelineEvent,
  GateFailureInfo,
} from '@/lib/api-types';
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Pause,
  Package,
  Scale,
  Lightbulb,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

/* ── Status badge config ── */
const statusConfig: Record<
  SessionStatus,
  { variant: 'success' | 'warning' | 'error' | 'info' | 'secondary'; icon: React.ReactNode }
> = {
  active: { variant: 'info', icon: <Activity className="size-3" /> },
  completed: { variant: 'success', icon: <CheckCircle className="size-3" /> },
  failed: { variant: 'error', icon: <XCircle className="size-3" /> },
  paused: { variant: 'warning', icon: <Pause className="size-3" /> },
};

/* ── Phase list from timeline + session ── */
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

/* ── Map agent detail to AgentEntry for AgentActivity ── */
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

/* ── Map timeline event to RuntimeLogEvent ── */
function toLogEvent(event: TimelineEvent): RuntimeLogEvent {
  return {
    id: event.id,
    type: event.type as RuntimeLogEvent['type'],
    timestamp: event.timestamp,
    description: event.description,
    agent: event.agent,
    phase: event.phase,
    artifactId: event.artifact_id,
  };
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useSession(id ?? '');
  const [explainAgent, setExplainAgent] = useState<AgentDetailEntry | null>(null);
  const [gateFailure, setGateFailure] = useState<GateFailureInfo | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<string | null>(null);

  // M15-036: Merge query timeline with live SSE events from runtime store
  const storeEvents = useRuntimeStore((s) => s.events);

  const session = data?.session;
  const agents = useMemo(() => data?.agents ?? [], [data?.agents]);
  const timeline = useMemo(() => data?.timeline ?? [], [data?.timeline]);

  const phases = useMemo(
    () => derivePhases(session?.phase ?? '', session?.status ?? 'active', timeline),
    [session?.phase, session?.status, timeline]
  );

  const agentEntries = useMemo(() => agents.map(toAgentEntry), [agents]);

  // M15-036: Merge query timeline events with real-time store events (dedup by id)
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

  // M15-034: Filter log events by selected phase
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

  // M15-037: Detect gate failures from merged events
  const latestGateFailure = useMemo(() => {
    const failures = mergedLogEvents.filter((e) => e.type === 'gate_failed');
    return failures.length > 0 ? failures[failures.length - 1] : null;
  }, [mergedLogEvents]);

  // M15-037: Show gate failure panel automatically when a new gate failure arrives
  const handleGateFailureShow = useCallback(
    (event: RuntimeLogEvent) => {
      setGateFailure({
        phase: event.phase ?? session?.phase ?? '',
        reason: event.description,
        suggestedAction: 'Review gate violations and fix outstanding issues before retrying.',
        violations: 1,
        timestamp: event.timestamp,
        relatedArtifactId: event.artifactId,
      });
      setExplainAgent(null);
    },
    [session?.phase]
  );

  // M15-034: Click on phase filters timeline & highlights phase
  const handlePhaseClick = useCallback(
    (phaseId: string) => {
      setPhaseFilter(phaseFilter === phaseId ? null : phaseId);
    },
    [phaseFilter]
  );

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading session…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load session: {(error as Error).message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3 mr-1.5" /> Retry
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Activity className="size-8" />}
          title="Session not found"
          description="This session may have been removed or the ID is invalid."
        />
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => navigate('/sessions')}>
            <ArrowLeft className="size-4 mr-2" /> Back to Sessions
          </Button>
        </div>
      </div>
    );
  }

  const config = statusConfig[session.status];

  return (
    <div className="p-6 space-y-6" data-testid="session-detail-page">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <Heading level={1} className="truncate">
              {session.project}
            </Heading>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={config.variant} className="gap-1">
                {config.icon}
                {session.status}
              </Badge>
              <Text muted className="text-xs">
                {session.flow} &middot; {session.phase}
              </Text>
            </div>
          </div>
        </div>
        <div className="w-40 shrink-0 hidden sm:block">
          <ProgressBar value={session.progress} showPercentage />
        </div>
      </div>

      {/* Flow Timeline (top) — M15-034: phase click filters log */}
      <section aria-label="Phase timeline">
        <FlowTimeline
          phases={phases}
          activePhaseId={session.phase}
          onPhaseClick={handlePhaseClick}
        />
        {phaseFilter && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Filtering: {phaseFilter}
            </Badge>
            <button
              type="button"
              onClick={() => setPhaseFilter(null)}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Clear filter
            </button>
          </div>
        )}
      </section>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Agent Activity (40%) — M15-035: live agent data */}
        <section aria-label="Agent activity" className="lg:col-span-5">
          <Card elevation="flat" className="p-4">
            <Heading level={2} className="mb-3 text-sm">
              Agent Activity
            </Heading>
            <AgentActivity
              agents={agentEntries}
              onAgentClick={(agentId) => {
                const agent = agents.find((a) => a.id === agentId);
                if (agent) {
                  setExplainAgent(explainAgent?.id === agentId ? null : agent);
                  setGateFailure(null);
                }
              }}
            />
          </Card>
        </section>

        {/* Middle: Artifacts + Decisions (35%) — M15-038: artifact flash */}
        <section aria-label="Artifacts and decisions" className="lg:col-span-4 space-y-4">
          {/* Artifacts */}
          <Card elevation="flat" className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="size-4" />
              <span className="text-sm font-semibold">Artifacts</span>
              <Badge variant="secondary" className="ml-auto">
                {artifactEvents.length}
              </Badge>
            </div>
            {artifactEvents.length === 0 ? (
              <Text muted className="text-xs">
                No artifacts created yet
              </Text>
            ) : (
              <ul className="space-y-1.5">
                {artifactEvents.map((e, i) => (
                  <li
                    key={e.id}
                    className={`text-xs flex items-start gap-2 ${i === artifactEvents.length - 1 ? 'animate-flash' : ''}`}
                  >
                    <Package className="size-3 mt-0.5 shrink-0 text-muted-foreground" />
                    <span>{e.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Decisions */}
          <Card elevation="flat" className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="size-4" />
              <span className="text-sm font-semibold">Decisions</span>
              <Badge variant="secondary" className="ml-auto">
                {decisionEvents.length}
              </Badge>
            </div>
            {decisionEvents.length === 0 ? (
              <Text muted className="text-xs">
                No decisions recorded yet
              </Text>
            ) : (
              <ul className="space-y-1.5">
                {decisionEvents.map((e) => (
                  <li key={e.id} className="text-xs flex items-start gap-2">
                    <Scale className="size-3 mt-0.5 shrink-0 text-muted-foreground" />
                    <span>{e.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        {/* Right: Explainability Panel (25%) — M15-037: gate failure panel */}
        <section className="lg:col-span-3" aria-label="Detail panel">
          {gateFailure ? (
            <ExplainabilityPanel
              title="Gate Failed"
              reason={gateFailure.reason}
              suggestedAction={gateFailure.suggestedAction}
              details={{
                Phase: gateFailure.phase,
                Violations: String(gateFailure.violations),
                Time: new Date(gateFailure.timestamp).toLocaleTimeString(),
                ...(gateFailure.relatedArtifactId
                  ? { Artifact: gateFailure.relatedArtifactId }
                  : {}),
              }}
              onDismiss={() => setGateFailure(null)}
            />
          ) : explainAgent ? (
            <ExplainabilityPanel
              title={`Agent: ${explainAgent.name}`}
              reason={explainAgent.task_description}
              suggestedAction={explainAgent.status === 'failed' ? 'Review error logs' : undefined}
              details={{
                Status: explainAgent.status,
                Phase: explainAgent.phase,
                Retries: String(explainAgent.retry_count),
                ...(explainAgent.duration_ms > 0
                  ? { Duration: `${(explainAgent.duration_ms / 1000).toFixed(1)}s` }
                  : {}),
              }}
              onDismiss={() => setExplainAgent(null)}
            />
          ) : latestGateFailure ? (
            <Card
              elevation="flat"
              className="p-4 border-red-500/30 bg-red-500/5 cursor-pointer hover:shadow-md"
              clickable
              onClick={() => handleGateFailureShow(latestGateFailure)}
            >
              <div className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="size-4" />
                <Text className="text-xs font-medium">Gate failure detected — click to review</Text>
              </div>
            </Card>
          ) : (
            <Card elevation="flat" className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lightbulb className="size-4" />
                <Text muted className="text-xs">
                  Click an agent to view details
                </Text>
              </div>
            </Card>
          )}
        </section>
      </div>

      {/* Bottom: Runtime Log — M15-036: merged query + SSE events */}
      <section aria-label="Runtime log">
        <Card elevation="flat" className="p-4">
          <RuntimeLog events={filteredLogEvents} maxVisible={50} />
        </Card>
      </section>
    </div>
  );
}
