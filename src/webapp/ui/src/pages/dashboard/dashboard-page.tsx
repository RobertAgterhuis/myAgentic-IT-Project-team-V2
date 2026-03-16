/**
 * Dashboard Home page — live status hero, health cards, metric summaries,
 * quick actions, and enriched activity feed with real-time SSE updates.
 * Issue #244 (S9G-37)
 */
import { useMemo } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { MetricCard, ActivityFeed, type ActivityItem } from '@/components/ui/metric-card';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { LiveStatusHero } from '@/components/runtime/live-status-hero';
import { HealthCard } from '@/components/dashboard/health-card';
import { QuickLinks } from '@/components/dashboard/quick-links';
import { RecentCommands } from '@/components/dashboard/recent-commands';
import {
  useDashboardHealth,
  useDashboardMetrics,
  useDashboardActivity,
  useDashboardStats,
} from '@/hooks';
import type { HealthIndicator, DashboardMetrics } from '@/lib/api-types';
import { Activity, BarChart3, Clock, FileText, Users, Target, Star } from 'lucide-react';

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
