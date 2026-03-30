/**
 * Dashboard Home page — live status hero, health cards, metric summaries,
 * quick actions, and enriched activity feed with real-time SSE updates.
 * Issue #244 (S9G-37)
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading, Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard, ActivityFeed, type ActivityItem } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/ui/page-shell';
import { LiveStatusHero } from '@/components/runtime/live-status-hero';
import { HealthCard } from '@/components/dashboard/health-card';
import { QuickLinks } from '@/components/dashboard/quick-links';
import { RecentCommands } from '@/components/dashboard/recent-commands';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import {
  useDashboardHealth,
  useDashboardMetrics,
  useDashboardActivity,
  useDashboardStats,
  useCockpitHealth,
  useSessions,
} from '@/hooks';
import type { HealthIndicator, DashboardMetrics } from '@/lib/api-types';
import { ConfidencePanel } from '@/components/cockpit/confidence-indicators';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock,
  FileText,
  ShieldCheck,
  Users,
  Target,
  Star,
} from 'lucide-react';

/* ── Metric trend derivation ── */
function deriveTrend(t: string): 'up' | 'down' | 'neutral' {
  if (t === 'up' || t === 'increasing') return 'up';
  if (t === 'down' || t === 'decreasing') return 'down';
  return 'neutral';
}

/* ── Stat icons ── */
const statIcons: Record<string, React.ReactNode> = {
  active_files: <FileText className="size-4" />,
  team_members: <Users className="size-4" />,
  sprint_progress: <Target className="size-4" />,
  github_stars: <Star className="size-4" />,
};

/* ── Main Page ── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useDashboardHealth();
  const { data: metrics } = useDashboardMetrics();
  const { data: activity } = useDashboardActivity();
  const { data: stats } = useDashboardStats();
  const { data: cockpitHealth } = useCockpitHealth();
  const { data: sessionsData } = useSessions();

  // Map API activity to ActivityFeed shape with relative time
  const feedItems: ActivityItem[] = useMemo(() => {
    if (!activity) return [];
    return activity.map((a, i) => ({
      id: `${a.timestamp}-${i}`,
      timestamp: a.timestamp,
      actor: a.user ?? 'system',
      action: a.action,
      target: a.details,
    }));
  }, [activity]);

  // Metrics cards data
  const metricEntries = useMemo(() => {
    if (!metrics) return [];
    return (Object.keys(metrics) as (keyof DashboardMetrics)[]).map((key) => {
      const m = metrics[key];
      return {
        key,
        label: m.label,
        value: m.value,
        delta: m.period,
        trend: deriveTrend(m.trend),
      };
    });
  }, [metrics]);

  const activeSessions =
    sessionsData?.sessions?.filter((session) => session.status === 'active').length ?? 0;
  const openAttentionItems =
    Object.values(health ?? {}).filter((indicator) => indicator.status !== 'good').length ?? 0;
  const confidenceScore = cockpitHealth
    ? `${Math.round(cockpitHealth.session_health.score)}%`
    : 'Live';
  const contextItems: ContextStripItem[] = [
    {
      id: 'active-sessions',
      label: 'Active sessions',
      value: String(activeSessions),
      tone: activeSessions > 0 ? 'info' : 'neutral',
    },
    {
      id: 'attention-items',
      label: 'Attention items',
      value: String(openAttentionItems),
      tone: openAttentionItems > 0 ? 'warning' : 'success',
    },
    {
      id: 'activity-feed',
      label: 'Activity feed',
      value: String(feedItems.length),
      tone: feedItems.length > 0 ? 'info' : 'neutral',
    },
    {
      id: 'confidence',
      label: 'Confidence',
      value: confidenceScore,
      tone: cockpitHealth ? 'success' : 'neutral',
    },
  ];

  return (
    <PageShell
      isLoading={healthLoading}
      loadingLabel="Loading dashboard…"
      error={healthError as Error | null}
      onRetry={() => refetchHealth()}
    >
      <div className="page-container-wide space-y-6 p-6" data-testid="dashboard-page">
        <PageHeader
          title="Dashboard"
          subtitle="Monitor orchestration health, runtime motion, and delivery signals from a single control surface."
          chips={[
            {
              id: 'dashboard-chip-active',
              label: `${activeSessions} active`,
              tone: activeSessions > 0 ? 'info' : 'default',
            },
            {
              id: 'dashboard-chip-attention',
              label: `${openAttentionItems} attention`,
              tone: openAttentionItems > 0 ? 'warning' : 'success',
            },
            {
              id: 'dashboard-chip-confidence',
              label: `Confidence ${confidenceScore}`,
              tone: cockpitHealth ? 'success' : 'default',
            },
          ]}
        />

        <ContextStrip items={contextItems} />

        <MissionControlHero
          heroId="dashboard"
          eyebrow="Runtime command deck"
          title="Governed AI SDLC mission control"
          description="Track delivery health, agent movement, and human checkpoints from a single control surface designed for evidence-backed execution."
          badges={<Badge variant="outline">Dashboard</Badge>}
          metrics={[
            {
              label: 'Active sessions',
              value: String(activeSessions),
              detail: 'Live orchestrations in motion',
            },
            {
              label: 'Attention items',
              value: String(openAttentionItems),
              detail: 'Signals needing review',
            },
            {
              label: 'Activity feed',
              value: String(feedItems.length),
              detail: 'Recent system events',
            },
            { label: 'Confidence', value: confidenceScore, detail: 'Current session health' },
          ]}
          motifs={
            <>
              <StatusMotif
                kind="governance"
                title="Guardrails stay visible"
                description="Approvals, decisions, and quality signals remain present while delivery moves forward."
              />
              <StatusMotif
                kind="agent"
                title="Agent work is observable"
                description="Execution status, runtime changes, and command flow read like an operating system, not a black box."
              />
              <StatusMotif
                kind="human-loop"
                title="Humans intervene with intent"
                description="The interface highlights where judgment is required, so operators know exactly when to step in."
              />
            </>
          }
          asideTitle="Operator brief"
          asideDescription="Use the deck below to inspect system health, jump into commands, and resume the most relevant workstream."
          asideContent={
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="size-4 text-info" /> Human oversight remains active
                </div>
                <Text muted className="mt-1 text-xs">
                  Decisions, questionnaires, and governance steps still define release readiness.
                </Text>
              </div>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate('/observability')}
              >
                Review operational signals
                <ArrowRight className="size-4" />
              </Button>
            </div>
          }
        />

        {/* Live Status Hero */}
        <LiveStatusHero />

        {/* Two-column layout: Health + Commands */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Health Cards — 2 cols */}
          <div className="lg:col-span-2">
            {health && (
              <section aria-label="Health indicators">
                <Heading level={2} className="mb-3">
                  Health
                </Heading>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(Object.entries(health) as [string, HealthIndicator][]).map(
                    ([name, indicator]) => (
                      <HealthCard key={name} name={name} indicator={indicator} />
                    )
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Recent Commands — 1 col */}
          <div>
            <Heading level={2} className="mb-3">
              Commands
            </Heading>
            <RecentCommands />
          </div>
        </div>

        {/* M27-004: Confidence Scores */}
        {cockpitHealth && (
          <section aria-label="Confidence scores">
            <Heading level={2} className="mb-3">
              Confidence
            </Heading>
            <ConfidencePanel
              sessionHealth={cockpitHealth.session_health}
              sprintReadiness={cockpitHealth.sprint_readiness}
              agentConfidence={cockpitHealth.agent_confidence}
            />
          </section>
        )}

        {/* Key Metrics */}
        {metricEntries.length > 0 && (
          <section aria-label="Key metrics">
            <Heading level={2} className="mb-3">
              Metrics
            </Heading>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {metricEntries.map((m) => (
                <MetricCard
                  key={m.key}
                  label={m.label}
                  value={String(m.value)}
                  delta={m.delta}
                  trend={m.trend}
                  icon={<BarChart3 className="size-4" />}
                />
              ))}
            </div>
          </section>
        )}

        {/* Stats */}
        {stats && (
          <section aria-label="Quick stats">
            <Heading level={2} className="mb-3">
              Stats
            </Heading>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(
                Object.entries(stats) as [
                  string,
                  { value: number | string; label: string; icon: string; details: string },
                ][]
              ).map(([key, stat]) => (
                <MetricCard
                  key={key}
                  label={stat.label}
                  value={String(stat.value)}
                  icon={statIcons[key] ?? <Clock className="size-4" />}
                  details={stat.details || undefined}
                />
              ))}
            </div>
          </section>
        )}

        {/* Quick Links */}
        <section aria-label="Quick links">
          <Heading level={2} className="mb-3">
            Navigate
          </Heading>
          <QuickLinks />
        </section>

        {/* Activity Feed */}
        <section aria-label="Recent activity">
          <Heading level={2} className="mb-3">
            Recent Activity
          </Heading>
          {feedItems.length > 0 ? (
            <Card elevation="flat" className="p-4">
              <ActivityFeed items={feedItems} pageSize={10} />
            </Card>
          ) : (
            <EmptyState
              icon={<Activity className="size-10" />}
              title="No recent activity"
              description="Activity will appear here as events occur."
            />
          )}
        </section>
      </div>
    </PageShell>
  );
}
