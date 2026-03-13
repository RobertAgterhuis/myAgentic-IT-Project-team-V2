/**
 * Dashboard Home page — health cards, metric summaries, activity feed.
 * Issue #244 (S9G-37)
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heading, Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard, ActivityFeed, type ActivityItem } from '@/components/ui/metric-card';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  useDashboardHealth,
  useDashboardMetrics,
  useDashboardActivity,
  useDashboardStats,
} from '@/hooks';
import { routes } from '@/lib/routes';
import type { HealthIndicator, DashboardMetrics } from '@/lib/api-types';
import {
  Heart,
  ShieldCheck,
  Hammer,
  Rocket,
  Activity,
  BarChart3,
  AlertTriangle,
  Clock,
  FileText,
  Users,
  Target,
  Star,
  ArrowRight,
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

/* ── Health Card ── */
function HealthCard({ name, indicator }: { name: string; indicator: HealthIndicator }) {
  return (
    <Card elevation="flat" className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {healthIcons[name]}
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
  const links = [
    { ...routes.commandCenter, icon: <Activity className="size-4" /> },
    { ...routes.pipeline, icon: <BarChart3 className="size-4" /> },
    { ...routes.questionnaires, icon: <FileText className="size-4" /> },
    { ...routes.decisions, icon: <AlertTriangle className="size-4" /> },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {links.map((link) => (
        <Link key={link.path} to={link.path} className="no-underline">
          <Card elevation="outlined" className="p-4 hover:bg-accent transition-colors">
            <div className="flex items-center gap-2">
              {link.icon}
              <span className="text-sm font-medium">{link.label}</span>
              <ArrowRight className="size-3 ml-auto text-muted-foreground" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

/* ── Main Page ── */
export default function DashboardPage() {
  const { data: health, isLoading: healthLoading } = useDashboardHealth();
  const { data: metrics } = useDashboardMetrics();
  const { data: activity } = useDashboardActivity();
  const { data: stats } = useDashboardStats();

  // Map API activity to ActivityFeed shape
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
        <Text muted>Project health at a glance</Text>
      </div>

      {/* Health Cards */}
      {health && (
        <section aria-label="Health indicators">
          <Heading level={2} className="mb-3">Health</Heading>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(health) as [string, HealthIndicator][]).map(([name, indicator]) => (
              <HealthCard key={name} name={name} indicator={indicator} />
            ))}
          </div>
        </section>
      )}

      {/* Key Metrics */}
      {metricEntries.length > 0 && (
        <section aria-label="Key metrics">
          <Heading level={2} className="mb-3">Metrics</Heading>
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
          <Heading level={2} className="mb-3">Stats</Heading>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(stats) as [string, { value: number | string; label: string; icon: string; details: string }][]).map(
              ([key, stat]) => (
                <MetricCard
                  key={key}
                  label={stat.label}
                  value={String(stat.value)}
                  icon={statIcons[key] ?? <Clock className="size-4" />}
                />
              ),
            )}
          </div>
        </section>
      )}

      {/* Quick Links */}
      <section aria-label="Quick links">
        <Heading level={2} className="mb-3">Quick Links</Heading>
        <QuickLinks />
      </section>

      {/* Activity Feed */}
      <section aria-label="Recent activity">
        <Heading level={2} className="mb-3">Recent Activity</Heading>
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
