/**
 * Overview page — replaces Dashboard as the landing page.
 * Answers: what's happening, where, what's next.
 * M15-039
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading, Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { SessionStatus, type SessionSummary } from '@/components/runtime/session-status';
import { FlowTimeline, type FlowPhase } from '@/components/runtime/flow-timeline';
import { AgentActivity, type AgentEntry } from '@/components/runtime/agent-activity';
import { HealthCard } from '@/components/dashboard/health-card';
import { WelcomeWizard } from '@/components/onboarding/welcome-wizard';
import { useWelcomeWizard } from '@/components/onboarding/use-welcome-wizard';
import { useSessions, useSession, useDecisions, useDashboardHealth } from '@/hooks';
import { useUIStore } from '@/stores/ui-store';
import type { Session, HealthIndicator, TimelineEvent, AgentDetailEntry } from '@/lib/api-types';
import { Package, Scale, ArrowRight, Rocket } from 'lucide-react';

/* ── Phase derivation (shared logic with session-detail) ── */
const PHASE_ORDER = ['PHASE-1', 'PHASE-2', 'PHASE-3', 'PHASE-4', 'PHASE-5'];

function derivePhases(
  currentPhase: string,
  sessionStatus: Session['status'],
  timeline: TimelineEvent[]
): FlowPhase[] {
  const completedPhases = new Set<string>();
  const startedPhases = new Set<string>();
  for (const event of timeline) {
    if (event.type === 'phase_complete' && event.phase) completedPhases.add(event.phase);
    if (event.type === 'phase_start' && event.phase) startedPhases.add(event.phase);
  }

  return PHASE_ORDER.map((id) => {
    let status: FlowPhase['status'] = 'pending';
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

/* ── Map AgentDetailEntry → AgentEntry ── */
function toAgentEntry(a: AgentDetailEntry): AgentEntry {
  return {
    id: a.id,
    name: a.name,
    status: a.status === 'retrying' ? 'retrying' : a.status,
    taskDescription: a.task_description,
    startedAt: a.started_at,
    retryCount: a.retry_count,
  };
}

export default function OverviewPage() {
  const navigate = useNavigate();
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const { dismissed: wizardDismissed, dismiss: dismissWizard } = useWelcomeWizard();
  const { data: sessionsData, isLoading: sessionsLoading } = useSessions();
  const { data: decisionsData } = useDecisions();
  const { data: health, isLoading: healthLoading } = useDashboardHealth();

  // Pick the active session (first active, or most recent)
  const activeSession: Session | null = useMemo(() => {
    if (!sessionsData?.sessions?.length) return null;
    return sessionsData.sessions.find((s) => s.status === 'active') ?? sessionsData.sessions[0];
  }, [sessionsData]);

  // Fetch detail for the active session (agents + timeline)
  const { data: detailData } = useSession(activeSession?.id ?? '');

  const timeline = useMemo(() => detailData?.timeline ?? [], [detailData?.timeline]);
  const agents = useMemo(() => detailData?.agents ?? [], [detailData?.agents]);

  const sessionSummary: SessionSummary | null = useMemo(() => {
    if (!activeSession) return null;
    return {
      id: activeSession.id,
      command: activeSession.flow,
      project: activeSession.project,
    };
  }, [activeSession]);

  const phases = useMemo(
    () => (activeSession ? derivePhases(activeSession.phase, activeSession.status, timeline) : []),
    [activeSession, timeline]
  );

  const agentEntries = useMemo(() => agents.map(toAgentEntry), [agents]);

  const artifactEvents = useMemo(
    () => timeline.filter((e) => e.type === 'artifact_created'),
    [timeline]
  );

  const openDecisions = useMemo(() => decisionsData?.open ?? [], [decisionsData]);

  if (sessionsLoading || healthLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading overview…" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="overview-page">
      {/* Header */}
      <div>
        <Heading level={1}>Overview</Heading>
        <Text muted>What&rsquo;s happening, where, and what&rsquo;s next</Text>
      </div>

      {/* Welcome Wizard — first-time users (M15-040) */}
      {!wizardDismissed && <WelcomeWizard onDismiss={dismissWizard} />}

      {/* Active Session Hero */}
      <section aria-label="Active session">
        <SessionStatus
          session={sessionSummary}
          progress={activeSession?.progress ?? 0}
          activePhase={activeSession?.phase}
          activeAgent={activeSession?.current_agent ?? undefined}
          connectionStatus={connectionStatus}
        />
      </section>

      {/* Mini FlowTimeline */}
      {phases.length > 0 && (
        <section aria-label="Phase timeline">
          <FlowTimeline
            phases={phases}
            activePhaseId={activeSession?.phase}
            onPhaseClick={(phaseId) => {
              if (activeSession) {
                navigate(`/sessions/${encodeURIComponent(activeSession.id)}`);
              }
              // phaseId consumed by navigation
              void phaseId;
            }}
          />
        </section>
      )}

      {/* Agent Activity Strip */}
      {agentEntries.length > 0 && (
        <section aria-label="Agent activity">
          <Card elevation="flat" className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Heading level={2} className="text-sm">
                Agent Activity
              </Heading>
              <Button variant="ghost" size="xs" onClick={() => navigate('/agents')}>
                View all <ArrowRight className="size-3 ml-1" />
              </Button>
            </div>
            <AgentActivity
              agents={agentEntries}
              onAgentClick={() => {
                if (activeSession) {
                  navigate(`/sessions/${encodeURIComponent(activeSession.id)}`);
                }
              }}
            />
          </Card>
        </section>
      )}

      {/* Two-column: Open Decisions + Latest Artifacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Decisions */}
        <section aria-label="Open decisions">
          <Card elevation="flat" className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Scale className="size-4" />
                <span className="text-sm font-semibold">Open Decisions</span>
              </div>
              <Badge variant="secondary">{openDecisions.length}</Badge>
            </div>
            {openDecisions.length === 0 ? (
              <Text muted className="text-xs">
                No open decisions
              </Text>
            ) : (
              <ul className="space-y-2">
                {openDecisions.slice(0, 5).map((d) => (
                  <li key={d.id} className="text-xs flex items-start gap-2">
                    <Badge
                      variant={
                        d.priority === 'HIGH'
                          ? 'error'
                          : d.priority === 'MEDIUM'
                            ? 'warning'
                            : 'secondary'
                      }
                      className="shrink-0 text-[10px]"
                    >
                      {d.priority}
                    </Badge>
                    <span className="min-w-0 truncate">{d.question}</span>
                  </li>
                ))}
              </ul>
            )}
            {openDecisions.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="mt-3"
                onClick={() => navigate('/decisions')}
              >
                View all decisions <ArrowRight className="size-3 ml-1" />
              </Button>
            )}
          </Card>
        </section>

        {/* Latest Artifacts */}
        <section aria-label="Latest artifacts">
          <Card elevation="flat" className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="size-4" />
                <span className="text-sm font-semibold">Latest Artifacts</span>
              </div>
              <Badge variant="secondary">{artifactEvents.length}</Badge>
            </div>
            {artifactEvents.length === 0 ? (
              <Text muted className="text-xs">
                No artifacts created yet
              </Text>
            ) : (
              <ul className="space-y-1.5">
                {artifactEvents.slice(-5).map((e) => (
                  <li key={e.id} className="text-xs flex items-start gap-2">
                    <Package className="size-3 mt-0.5 shrink-0 text-muted-foreground" />
                    <span>{e.description}</span>
                  </li>
                ))}
              </ul>
            )}
            {artifactEvents.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="mt-3"
                onClick={() => navigate('/artifacts')}
              >
                Browse artifacts <ArrowRight className="size-3 ml-1" />
              </Button>
            )}
          </Card>
        </section>
      </div>

      {/* System Health Compact Strip */}
      {health && (
        <section aria-label="System health">
          <Heading level={2} className="mb-3 text-sm">
            System Health
          </Heading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(Object.entries(health) as [string, HealthIndicator][]).map(([name, indicator]) => (
              <HealthCard key={name} name={name} indicator={indicator} />
            ))}
          </div>
        </section>
      )}

      {/* Idle CTA */}
      {!activeSession && (
        <section aria-label="Call to action">
          <EmptyState
            icon={<Rocket className="size-10" />}
            title="No active session"
            description="Start a CREATE or AUDIT command to begin."
            action={{ label: 'Go to Commands', onClick: () => navigate('/commands') }}
          />
        </section>
      )}
    </div>
  );
}
