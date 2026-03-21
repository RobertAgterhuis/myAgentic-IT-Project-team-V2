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
import { EmptyState } from '@/components/ui/empty-state';
import { PageShell } from '@/components/ui/page-shell';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { SessionStatus, type SessionSummary } from '@/components/runtime/session-status';
import { FlowTimeline, type FlowPhase } from '@/components/runtime/flow-timeline';
import { AgentActivity, type AgentEntry } from '@/components/runtime/agent-activity';
import { HealthCard } from '@/components/dashboard/health-card';
import { WhatsNextGuidance } from '@/components/dashboard/whats-next-guidance';
import { WelcomeWizard } from '@/components/onboarding/welcome-wizard';
import { useWelcomeWizard } from '@/components/onboarding/use-welcome-wizard';
import { OnboardingDiagnosticsWizard } from '@/components/onboarding/onboarding-diagnostics-wizard';
import { useOnboardingDiagnosticsWizard } from '@/components/onboarding/use-onboarding-diagnostics-wizard';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { useSessions, useSession, useDecisions, useDashboardHealth } from '@/hooks';
import { useUIStore } from '@/stores/ui-store';
import type { Session, HealthIndicator, TimelineEvent, AgentDetailEntry } from '@/lib/api-types';
import { Package, Scale, ArrowRight, Rocket, Activity, ShieldCheck } from 'lucide-react';

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
  const { dismissed: diagnosticsDismissed, dismiss: dismissDiagnostics } =
    useOnboardingDiagnosticsWizard();
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useSessions();
  const { data: decisionsData } = useDecisions();
  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useDashboardHealth();

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
  const healthAttentionCount = useMemo(
    () => Object.values(health ?? {}).filter((indicator) => indicator.status !== 'good').length,
    [health]
  );

  const shouldShowDiagnostics = useMemo(() => {
    const totalSessions = sessionsData?.sessions?.length ?? 0;
    const hasActiveOnboarding = activeSession?.phase === 'ONBOARDING';
    return !diagnosticsDismissed && (totalSessions === 0 || hasActiveOnboarding);
  }, [sessionsData?.sessions?.length, activeSession?.phase, diagnosticsDismissed]);

  const headerChips = useMemo(() => {
    const connectionTone =
      connectionStatus === 'connected'
        ? 'success'
        : connectionStatus === 'connecting'
          ? 'warning'
          : 'critical';

    return [
      {
        id: 'connection',
        label: connectionStatus === 'connected' ? 'Live telemetry' : 'Connection degraded',
        tone: connectionTone,
      },
      {
        id: 'session',
        label: activeSession ? `Session ${activeSession.status}` : 'No active session',
        tone: activeSession ? 'info' : 'default',
      },
      {
        id: 'decisions',
        label: `${openDecisions.length} open decisions`,
        tone: openDecisions.length > 0 ? 'warning' : 'success',
      },
    ] as const;
  }, [connectionStatus, activeSession, openDecisions.length]);

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      {
        id: 'workspace',
        label: 'Workspace',
        value: activeSession?.project ?? 'No active workspace',
      },
      {
        id: 'phase',
        label: 'Phase',
        value: activeSession?.phase ?? 'Idle',
        tone: activeSession ? 'info' : 'neutral',
      },
      {
        id: 'active-agent',
        label: 'Active agent',
        value: activeSession?.current_agent ?? 'Not assigned',
        tone: activeSession?.current_agent ? 'success' : 'neutral',
      },
      {
        id: 'health',
        label: 'Health alerts',
        value: String(healthAttentionCount),
        tone: healthAttentionCount > 0 ? 'warning' : 'success',
      },
    ],
    [activeSession, healthAttentionCount]
  );

  return (
    <PageShell
      isLoading={sessionsLoading || healthLoading}
      loadingLabel="Loading overview…"
      error={(sessionsError || healthError) as Error | null}
      onRetry={() => {
        refetchSessions();
        refetchHealth();
      }}
    >
      <div className="p-6 space-y-6" data-testid="overview-page">
        <PageHeader
          title="Overview"
          subtitle="Track runtime flow, governance checkpoints, and health signals from one operational control surface."
          chips={[...headerChips]}
          actions={
            activeSession ? (
              <Button
                variant="outline"
                size="sm"
                className="motion-transition-base"
                onClick={() => navigate(`/sessions/${encodeURIComponent(activeSession.id)}`)}
              >
                Open Session <ArrowRight className="ml-1 size-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="motion-transition-base"
                onClick={() => navigate('/commands')}
              >
                Start Command <Rocket className="ml-1 size-3" />
              </Button>
            )
          }
        />

        <ContextStrip items={contextItems} />

        <MissionControlHero
          eyebrow="Executive overview"
          title="See governed delivery, live agent motion, and human checkpoints in one view"
          description="Overview acts as the operator summary for the whole product: what is active now, what needs judgment next, and what evidence is accumulating behind each cycle."
          badges={
            <>
              <ControlSignalBadge signal="governed" />
              {activeSession?.current_agent && <ControlSignalBadge signal="active-agent" />}
              {openDecisions.length > 0 && <ControlSignalBadge signal="needs-human-input" />}
            </>
          }
          metrics={[
            {
              label: 'Active session',
              value: activeSession?.project ?? 'None',
              detail: 'Current primary workstream',
            },
            {
              label: 'Current phase',
              value: activeSession?.phase ?? 'Idle',
              detail: 'Latest visible runtime phase',
            },
            {
              label: 'Open decisions',
              value: String(openDecisions.length),
              detail: 'Human choices still pending',
            },
            {
              label: 'Health signals',
              value: String(healthAttentionCount),
              detail: 'Non-green health indicators',
            },
          ]}
          motifs={
            <>
              <StatusMotif
                kind="governance"
                title="Governance remains in the foreground"
                description="Decision count, health signals, and next steps are visible before users dive into lower-level detail."
              />
              <StatusMotif
                kind="agent"
                title="Agent activity stays legible"
                description="The active session, phase flow, and current executor are readable as one operational story."
              />
              <StatusMotif
                kind="human-loop"
                title="Human checkpoints are prioritized"
                description="Open decisions and guidance keep the operator focused on interventions that unlock progress."
              />
            </>
          }
          asideTitle="Operator focus"
          asideDescription="Start here when you need the fastest possible understanding of current delivery state and the next action that needs a human response."
          asideContent={
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="size-4 text-info" /> What this page answers
                </div>
                <Text muted className="mt-1 text-xs">
                  What is running, what is blocked, and what you should review next.
                </Text>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="size-4 text-info" /> Why it matters
                </div>
                <Text muted className="mt-1 text-xs">
                  It keeps strategic oversight and runtime evidence together instead of splitting
                  them across disconnected screens.
                </Text>
              </div>
            </div>
          }
        />

        {/* Welcome Wizard — first-time users (M15-040) */}
        {!wizardDismissed && <WelcomeWizard onDismiss={dismissWizard} />}

        {shouldShowDiagnostics && (
          <OnboardingDiagnosticsWizard
            sessionId={activeSession?.id ?? null}
            onDismiss={dismissDiagnostics}
          />
        )}

        {/* What's Next — contextual guidance (M21-002) */}
        <WhatsNextGuidance />

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
                <div className="flex items-center gap-2">
                  {openDecisions.length > 0 && (
                    <ControlSignalBadge
                      signal="needs-human-input"
                      className="hidden sm:inline-flex"
                    />
                  )}
                  <Badge variant="secondary">{openDecisions.length}</Badge>
                </div>
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
    </PageShell>
  );
}
