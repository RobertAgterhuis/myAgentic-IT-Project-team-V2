/**
 * Sessions page — list all orchestrator sessions with status and progress.
 * M15 / Issue #M15-028
 */
import { useNavigate } from 'react-router-dom';
import { Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ProgressBar } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { useSessions } from '@/hooks';
import type { SessionStatus } from '@/lib/api-types';
import {
  Activity,
  ArrowRight,
  CheckCircle,
  Clock,
  Pause,
  RefreshCw,
  Sparkles,
  XCircle,
} from 'lucide-react';

const statusConfig: Record<
  SessionStatus,
  { variant: 'success' | 'warning' | 'error' | 'info' | 'secondary'; icon: React.ReactNode }
> = {
  active: { variant: 'info', icon: <Activity className="size-3" /> },
  completed: { variant: 'success', icon: <CheckCircle className="size-3" /> },
  failed: { variant: 'error', icon: <XCircle className="size-3" /> },
  paused: { variant: 'warning', icon: <Pause className="size-3" /> },
};

function getSessionGuidance(
  sessions: Array<{
    id: string;
    project: string;
    status: SessionStatus;
    progress: number;
  }>
) {
  const activeSession = sessions.find((session) => session.status === 'active');

  if (!sessions.length) {
    return {
      title: 'No sessions yet',
      description:
        'Start from Commands first. Once a cycle is queued, it will appear here and you can open its details.',
      actionLabel: 'Go to Commands',
      actionHref: '/commands',
      badge: 'Idle',
    };
  }

  if (activeSession) {
    return {
      title: `Open ${activeSession.project}`,
      description:
        'There is an active session. Open it to see the current agent, recent timeline, and the next handoff.',
      actionLabel: 'Open Active Session',
      actionHref: `/sessions/${encodeURIComponent(activeSession.id)}`,
      badge: `${Math.round(activeSession.progress)}%`,
    };
  }

  return {
    title: 'Review the latest completed work',
    description:
      'No session is active right now. Use this page to inspect recent cycles and reopen the most relevant one for context.',
    actionLabel: 'Review Sessions',
    actionHref: `/sessions/${encodeURIComponent(sessions[0].id)}`,
    badge: 'History',
  };
}

export default function SessionsPage() {
  const { data, isLoading, error, refetch } = useSessions();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading sessions…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load sessions: {(error as Error).message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3 mr-1.5" /> Retry
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }

  const sessions = data?.sessions ?? [];
  const nextStep = getSessionGuidance(sessions);
  const activeSessions = sessions.filter((session) => session.status === 'active').length;
  const completedSessions = sessions.filter((session) => session.status === 'completed').length;
  const attentionSessions = sessions.filter(
    (session) => session.status === 'paused' || session.status === 'failed'
  ).length;

  const contextItems: ContextStripItem[] = [
    {
      id: 'total',
      label: 'Total runs',
      value: String(sessions.length),
      tone: sessions.length > 0 ? 'info' : 'neutral',
    },
    {
      id: 'active',
      label: 'Active',
      value: String(activeSessions),
      tone: activeSessions > 0 ? 'success' : 'neutral',
    },
    {
      id: 'attention',
      label: 'Needs attention',
      value: String(attentionSessions),
      tone: attentionSessions > 0 ? 'warning' : 'success',
    },
    {
      id: 'recommended',
      label: 'Recommended',
      value: nextStep.title,
      tone: 'info',
    },
  ];

  const topProgress =
    sessions.length > 0
      ? `${Math.round(Math.max(...sessions.map((session) => session.progress)))}%`
      : '0%';

  return (
    <div className="p-6 space-y-6" data-testid="sessions-page">
      <PageHeader
        title="Runs"
        subtitle="Inspect active and historical orchestration sessions with clear runtime status and next-step guidance."
        chips={[
          {
            id: 'runs-total',
            label: `${sessions.length} total`,
            tone: sessions.length > 0 ? 'info' : 'default',
          },
          { id: 'runs-active', label: `${activeSessions} active`, tone: 'success' },
          {
            id: 'runs-attention',
            label: `${attentionSessions} need attention`,
            tone: attentionSessions > 0 ? 'warning' : 'success',
          },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="motion-transition-base"
            onClick={() => navigate(nextStep.actionHref)}
          >
            {nextStep.actionLabel}
            <ArrowRight className="ml-1 size-3" />
          </Button>
        }
      />

      <ContextStrip items={contextItems} />

      <MissionControlHero
        eyebrow="Execution archive"
        title="Sessions turn orchestration into reviewable evidence"
        description="Use this page as the runtime ledger for active and completed cycles, with clear signals for where work is live, stalled, or ready for review."
        badges={<Badge variant="outline">Sessions</Badge>}
        metrics={[
          {
            label: 'Active runs',
            value: String(activeSessions),
            detail: 'Current workstreams in progress',
          },
          {
            label: 'Completed',
            value: String(completedSessions),
            detail: 'Finished orchestration cycles',
          },
          {
            label: 'Needs attention',
            value: String(attentionSessions),
            detail: 'Paused or failed runs',
          },
          { label: 'Top progress', value: topProgress, detail: 'Highest visible completion level' },
        ]}
        motifs={
          <>
            <StatusMotif
              kind="governance"
              title="Sessions preserve traceability"
              description="Every cycle can be reopened to review decisions, outcomes, and the path taken through the SDLC."
            />
            <StatusMotif
              kind="agent"
              title="Execution remains attributable"
              description="Current agent ownership stays visible so the operator knows who is acting in each run."
            />
            <StatusMotif
              kind="human-loop"
              title="Escalated work stays recoverable"
              description="Paused and failed sessions remain easy to find, inspect, and resume with the right human intervention."
            />
          </>
        }
        asideTitle="Selection logic"
        asideDescription="Start with active runs, then inspect paused or failed sessions before using completed sessions for context and evidence."
        asideContent={
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Recommended now
              </div>
              <div className="mt-2 text-sm font-medium">{nextStep.title}</div>
              <Text muted className="mt-1 text-xs">
                {nextStep.description}
              </Text>
            </div>
            <Button
              className="w-full justify-between"
              variant="outline"
              onClick={() => navigate(nextStep.actionHref)}
            >
              {nextStep.actionLabel}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
        <Card elevation="flat" className="border border-border/70 px-5 py-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-5 text-info" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">How to use Sessions</span>
                <Badge variant="outline">Session guide</Badge>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <Badge variant="secondary">1</Badge>
                  <div className="mt-3 font-medium">Find the active run</div>
                  <Text muted className="mt-1 text-xs">
                    Sessions marked `active` are the best starting point when you want to continue
                    ongoing work.
                  </Text>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <Badge variant="secondary">2</Badge>
                  <div className="mt-3 font-medium">Open the detail view</div>
                  <Text muted className="mt-1 text-xs">
                    Click a session card to inspect current agent, timeline, and deeper execution
                    context.
                  </Text>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <Badge variant="secondary">3</Badge>
                  <div className="mt-3 font-medium">Use progress to prioritize</div>
                  <Text muted className="mt-1 text-xs">
                    A higher completion percentage usually means you are closer to a decision, gate,
                    or release moment.
                  </Text>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card elevation="flat" className="border border-border/70 px-5 py-5">
          <div className="flex items-start gap-3">
            <Activity className="mt-0.5 size-5 text-info" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">Recommended next step</span>
                <Badge variant="info">{nextStep.badge}</Badge>
              </div>
              <div className="mt-3 text-sm font-medium">{nextStep.title}</div>
              <Text muted className="mt-1 text-sm">
                {nextStep.description}
              </Text>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => navigate(nextStep.actionHref)}
              >
                {nextStep.actionLabel}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Session list */}
      {sessions.length === 0 ? (
        <EmptyState
          icon={<Activity className="size-8" />}
          title="No sessions"
          description="Sessions appear after you start a command. Use Commands to launch a cycle, then come back here to follow it."
        />
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const config = statusConfig[session.status];
            return (
              <Card
                key={session.id}
                clickable
                onClick={() => navigate(`/sessions/${encodeURIComponent(session.id)}`)}
                elevation="outlined"
                className="transition-colors hover:border-primary/50"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={config.variant} className="gap-1 shrink-0">
                      {config.icon}
                      {session.status}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{session.project}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.flow} &middot; {session.phase}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-32 hidden sm:block">
                      <ProgressBar value={session.progress} showPercentage />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <time dateTime={session.started_at}>
                        {new Date(session.started_at).toLocaleDateString()}
                      </time>
                    </div>
                  </div>
                </div>
                {session.current_agent && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Current agent: <span className="font-medium">{session.current_agent}</span>
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
