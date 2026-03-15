/**
 * Dashboard Home page — live status hero, health cards, metric summaries,
 * quick actions, and enriched activity feed with real-time SSE updates.
 * Issue #244 (S9G-37)
 */
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heading, Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard, ActivityFeed, type ActivityItem } from '@/components/ui/metric-card';
import { ProgressBar } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useDashboardHealth,
  useDashboardMetrics,
  useDashboardActivity,
  useDashboardStats,
  useOrchestratorStatus,
  useOrchestratorQueue,
  useProgress,
} from '@/hooks';
import { useUIStore } from '@/stores/ui-store';
import { routes } from '@/lib/routes';
import type { HealthIndicator, DashboardMetrics } from '@/lib/api-types';
import {
  Heart,
  ShieldCheck,
  Hammer,
  Rocket,
  Activity,
  BarChart3,
  Clock,
  FileText,
  Users,
  Target,
  Star,
  ArrowRight,
  Terminal,
  GitBranch,
  Scale,
  Zap,
  Radio,
  CircleDot,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';

/* ── Health status badge ── */
const healthBadge: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  healthy: 'success',
  good: 'success',
  degraded: 'warning',
  critical: 'error',
};

const healthIcons: Record<string, React.ReactNode> = {
  quality: <Heart className="size-4" />,
  coverage: <ShieldCheck className="size-4" />,
  builds: <Hammer className="size-4" />,
  deployment: <Rocket className="size-4" />,
};

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

/* ── Relative time formatting ── */
function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── Live Status Hero Section ── */
function LiveStatusHero() {
  const { data: status } = useOrchestratorStatus();
  const { data: progress } = useProgress();
  const { data: queue } = useOrchestratorQueue();
  const connectionStatus = useUIStore((s) => s.connectionStatus);

  const phases = progress?.phases ?? [];
  const totalAgents = phases.reduce((a, p) => a + p.total, 0);
  const doneAgents = phases.reduce((a, p) => a + p.done, 0);
  const overallPct = totalAgents > 0 ? Math.round((doneAgents / totalAgents) * 100) : 0;
  const activePhase = phases.find((p) => p.status === 'active');
  const pendingCommands = queue?.queue?.filter((c) => c.status === 'PENDING').length ?? 0;

  const stateColor =
    status?.state === 'ERROR'
      ? 'from-red-500/10 to-red-600/5 border-red-500/20'
      : status?.state === 'IDLE'
        ? 'from-slate-500/10 to-slate-600/5 border-slate-500/20'
        : 'from-blue-500/10 to-blue-600/5 border-blue-500/20';

  return (
    <section
      aria-label="Live system status"
      className={`rounded-xl border bg-gradient-to-br ${stateColor} p-6 transition-all duration-500`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Left: State + Indicators */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            {status?.state !== 'IDLE' && status?.state !== 'ERROR' ? (
              <span className="relative flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-blue-500" />
              </span>
            ) : status?.state === 'ERROR' ? (
              <XCircle className="size-5 text-red-500" />
            ) : (
              <CircleDot className="size-5 text-muted-foreground" />
            )}
            <Heading level={2} className="!mb-0">
              {status?.state === 'IDLE'
                ? 'System Ready'
                : status?.state === 'ERROR'
                  ? 'System Error'
                  : 'Pipeline Active'}
            </Heading>
            <Badge
              variant={
                status?.state === 'ERROR'
                  ? 'error'
                  : status?.state === 'IDLE'
                    ? 'secondary'
                    : 'info'
              }
            >
              {status?.state ?? 'UNKNOWN'}
            </Badge>
          </div>

          {/* Pipeline progress */}
          {progress?.active && (
            <div className="space-y-2">
              <ProgressBar
                value={overallPct}
                label={`Pipeline: ${doneAgents}/${totalAgents} agents complete`}
                showPercentage
              />
              {activePhase && (
                <div className="flex items-center gap-2 text-sm">
                  <GitBranch className="size-4 text-blue-500" />
                  <span className="font-medium">{activePhase.label}</span>
                  <span className="text-muted-foreground">
                    ({activePhase.done}/{activePhase.total} agents)
                  </span>
                </div>
              )}
              {progress.session?.current_agent && (
                <div className="flex items-center gap-2 text-sm">
                  <Radio className="size-4 text-blue-500 animate-pulse" />
                  <span className="text-muted-foreground">Active agent:</span>
                  <span className="font-medium">{progress.session.current_agent}</span>
                </div>
              )}
            </div>
          )}

          {/* Idle state encouragement */}
          {status?.state === 'IDLE' && (
            <Text muted className="mt-1">
              No active pipeline. Use the Command Center to start a CREATE, AUDIT, or FEATURE cycle.
            </Text>
          )}
        </div>

        {/* Right: Quick stats strip */}
        <div className="flex flex-wrap lg:flex-col gap-3 lg:min-w-40">
          <div className="flex items-center gap-2 text-sm">
            {connectionStatus === 'connected' ? (
              <Wifi className="size-4 text-green-500" />
            ) : (
              <WifiOff className="size-4 text-red-500" />
            )}
            <span className={connectionStatus === 'connected' ? 'text-green-600' : 'text-red-500'}>
              {connectionStatus === 'connected' ? 'Real-time' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Terminal className="size-4 text-muted-foreground" />
            <span>{pendingCommands} pending</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-muted-foreground" />
            <span>{doneAgents} completed</span>
          </div>
          {status?.mode && (
            <div className="flex items-center gap-2 text-sm">
              <Zap className="size-4 text-muted-foreground" />
              <span className="capitalize">{status.mode}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Health Card ── */
function HealthCard({ name, indicator }: { name: string; indicator: HealthIndicator }) {
  return (
    <Card elevation="flat" className="p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-md bg-muted">{healthIcons[name]}</span>
          <span className="text-sm font-medium capitalize">{indicator.label}</span>
        </div>
        <Badge variant={healthBadge[indicator.status] ?? 'info'} className="text-xs">
          {indicator.status}
        </Badge>
      </div>
      <p className="text-2xl font-bold">{indicator.value}</p>
      <p className="text-xs text-muted-foreground mt-1">{indicator.details}</p>
    </Card>
  );
}

/* ── Quick Links ── */
function QuickLinks() {
  const navigate = useNavigate();
  const links = [
    {
      ...routes.commandCenter,
      icon: <Terminal className="size-5" />,
      desc: 'Queue commands and manage the pipeline',
    },
    {
      ...routes.pipeline,
      icon: <GitBranch className="size-5" />,
      desc: 'View pipeline phases and agent progress',
    },
    {
      ...routes.questionnaires,
      icon: <FileText className="size-5" />,
      desc: 'Answer project intake questions',
    },
    {
      ...routes.decisions,
      icon: <Scale className="size-5" />,
      desc: 'Review and manage architectural decisions',
    },
    {
      ...routes.metrics,
      icon: <BarChart3 className="size-5" />,
      desc: 'Monitor drift, KPIs, and quality metrics',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {links.map((link) => (
        <button
          key={link.path}
          type="button"
          onClick={() => navigate(link.path)}
          className="text-left rounded-lg border bg-card p-4 hover:bg-accent hover:border-primary/30 hover:shadow-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none group"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              {link.icon}
            </span>
            <span className="font-semibold text-sm">{link.label}</span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{link.desc}</p>
          <div className="flex justify-end mt-2">
            <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Recent Commands Widget ── */
function RecentCommands() {
  const { data: queue } = useOrchestratorQueue();
  const recentCommands = useMemo(() => (queue?.queue ?? []).slice(-5).reverse(), [queue]);

  if (recentCommands.length === 0) return null;

  const statusIcon: Record<string, React.ReactNode> = {
    PENDING: <Clock className="size-3.5 text-amber-500" />,
    PROCESSING: <Radio className="size-3.5 text-blue-500 animate-pulse" />,
    DONE: <CheckCircle2 className="size-3.5 text-green-500" />,
    ERROR: <XCircle className="size-3.5 text-red-500" />,
  };

  return (
    <Card elevation="flat" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">Recent Commands</span>
        <Link to="/command-center" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {recentCommands.map((cmd, i) => (
          <div
            key={`${cmd.command}-${cmd.requested_at}-${i}`}
            className="flex items-center gap-3 text-sm"
          >
            {statusIcon[cmd.status] ?? <CircleDot className="size-3.5" />}
            <span className="font-mono text-xs font-medium">{cmd.command}</span>
            {cmd.project && (
              <span className="text-muted-foreground text-xs truncate">{cmd.project}</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
              {relativeTime(cmd.requested_at)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Main Page ── */
export default function DashboardPage() {
  const { data: health, isLoading: healthLoading } = useDashboardHealth();
  const { data: metrics } = useDashboardMetrics();
  const { data: activity } = useDashboardActivity();
  const { data: stats } = useDashboardStats();

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

  if (healthLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading dashboard…" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <Heading level={1}>Dashboard</Heading>
        <Text muted>Real-time project overview and system health</Text>
      </div>

      {/* Live Status Hero */}
      <LiveStatusHero />

      {/* Two-column layout: Health + Commands */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Cards — 2 cols */}
        <div className="lg:col-span-2">
          {health && (
            <section aria-label="Health indicators">
              <Heading level={2} className="mb-3">
                Health
              </Heading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
  );
}
