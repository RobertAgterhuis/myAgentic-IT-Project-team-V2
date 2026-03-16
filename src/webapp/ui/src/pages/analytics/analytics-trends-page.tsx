/**
 * Analytics trend charts page — velocity, DORA metrics, agent performance.
 * Enhances the metrics page with dedicated trend visualizations.
 * M10 / Issue #395
 */
import { useState, useMemo } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { useAnalyticsTrends, useAnalyticsAgents } from '@/hooks';
import type { VelocityTrendEntry, AgentPerformanceStats, MetricDataPoint } from '@/lib/api-types';
import { TrendingUp, Activity, BarChart3, Clock, Zap, AlertTriangle, Gauge } from 'lucide-react';

/* ── Time range ── */
type TimeRange = '7d' | '30d' | '90d' | 'all';

/* ── Inline bar chart (CSS-based) ── */
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      className="h-6 w-full bg-muted rounded-sm overflow-hidden"
      role="meter"
      aria-valuenow={value}
      aria-valuemax={max}
    >
      <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Velocity chart (table + bars) ── */
function VelocityChart({ data }: { data: VelocityTrendEntry[] }) {
  const maxPoints = Math.max(...data.map((d) => Math.max(d.planned_points, d.completed_points)), 1);

  return (
    <div className="space-y-2">
      {data.map((entry) => (
        <div key={entry.sprint_id} className="grid grid-cols-[120px_1fr_80px] items-center gap-3">
          <span className="text-xs font-mono truncate">{entry.sprint_id}</span>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-16">Planned</span>
              <MiniBar value={entry.planned_points} max={maxPoints} color="bg-blue-400/60" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-16">Done</span>
              <MiniBar value={entry.completed_points} max={maxPoints} color="bg-green-500" />
            </div>
          </div>
          <span className="text-xs font-semibold text-right">
            {(entry.velocity_ratio * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Agent performance chart (horizontal bars) ── */
function AgentChart({ data }: { data: AgentPerformanceStats[] }) {
  const maxInvocations = Math.max(...data.map((d) => d.total_invocations), 1);

  return (
    <div className="space-y-3">
      {data.map((agent) => (
        <div key={agent.agent_id} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{agent.agent_name}</span>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  agent.success_rate_pct >= 90
                    ? 'success'
                    : agent.success_rate_pct >= 70
                      ? 'warning'
                      : 'error'
                }
                className="text-[10px]"
              >
                {agent.success_rate_pct.toFixed(1)}%
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {agent.avg_duration_ms.toFixed(0)} ms avg
              </span>
            </div>
          </div>
          <MiniBar value={agent.total_invocations} max={maxInvocations} color="bg-violet-500/70" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{agent.total_invocations} invocations</span>
            <span>P95: {agent.p95_duration_ms.toFixed(0)} ms</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── DORA metric card ── */
function DoraMetric({
  label,
  series,
  unit,
  icon,
}: {
  label: string;
  series: MetricDataPoint[];
  unit: string;
  icon: React.ReactNode;
}) {
  if (series.length === 0) return null;
  const latest = series[series.length - 1];
  const prev = series.length > 1 ? series[series.length - 2] : null;
  const delta = prev ? ((latest.value - prev.value) / (prev.value || 1)) * 100 : 0;

  return (
    <Card elevation="flat" className="p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-bold">
        {latest.value.toFixed(1)}{' '}
        <span className="text-sm font-normal text-muted-foreground">{unit}</span>
      </p>
      {prev && (
        <p className={`text-xs mt-1 ${delta > 0 ? 'text-amber-500' : 'text-green-500'}`}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% vs previous
        </p>
      )}
      <div className="flex items-center gap-1 mt-2">
        {series.slice(-8).map((dp, i) => {
          const max = Math.max(...series.slice(-8).map((s) => s.value), 1);
          const h = Math.max((dp.value / max) * 32, 2);
          return (
            <div
              key={i}
              className="flex-1 bg-primary/30 rounded-sm"
              style={{ height: `${h}px` }}
              title={`${dp.value.toFixed(1)} ${unit}`}
            />
          );
        })}
      </div>
    </Card>
  );
}

/* ── Main Page ── */
export default function AnalyticsTrendChartsPage() {
  const { data: trends, isLoading: trendsLoading } = useAnalyticsTrends();
  const { data: agentPerf, isLoading: agentsLoading } = useAnalyticsAgents();
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  // Filter velocity data by time range
  const velocityData = useMemo(() => {
    if (!trends?.velocity) return [];
    const data = trends.velocity;
    if (timeRange === 'all') return data;
    const now = Date.now();
    const ranges: Record<TimeRange, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      all: Infinity,
    };
    const days = ranges[timeRange];
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return data.filter((d) => new Date(d.date).getTime() >= cutoff);
  }, [trends, timeRange]);

  const isLoading = trendsLoading || agentsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading analytics…" />
      </div>
    );
  }

  const latestVelocity = velocityData.length > 0 ? velocityData[velocityData.length - 1] : null;
  const avgRatio =
    velocityData.length > 0
      ? velocityData.reduce((s, v) => s + v.velocity_ratio, 0) / velocityData.length
      : 0;

  return (
    <div className="p-6 space-y-6" data-testid="analytics-trends-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>
            <TrendingUp className="size-5 inline mr-2" />
            Analytics Trend Charts
          </Heading>
          <Text muted>Velocity, DORA metrics, and agent performance over time</Text>
        </div>
        {/* Time range selector */}
        <div
          className="flex items-center gap-1 bg-muted rounded-md p-1"
          role="radiogroup"
          aria-label="Time range"
        >
          {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              role="radio"
              aria-checked={timeRange === range}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                timeRange === range
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setTimeRange(range)}
            >
              {range === 'all' ? 'All' : range}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <section aria-label="Summary KPIs">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Sprints Tracked"
            value={velocityData.length}
            icon={<BarChart3 className="size-4" />}
            trend="neutral"
          />
          <MetricCard
            label="Avg Completion"
            value={`${(avgRatio * 100).toFixed(0)}%`}
            icon={<Gauge className="size-4" />}
            trend={avgRatio >= 0.8 ? 'up' : 'down'}
          />
          <MetricCard
            label="Latest Velocity"
            value={
              latestVelocity
                ? `${latestVelocity.completed_points}/${latestVelocity.planned_points}`
                : '—'
            }
            icon={<Zap className="size-4" />}
            trend="neutral"
          />
          <MetricCard
            label="Agents Tracked"
            value={agentPerf?.length ?? 0}
            icon={<Activity className="size-4" />}
            trend="neutral"
          />
        </div>
      </section>

      {/* Velocity trend chart */}
      <section aria-label="Velocity trends">
        <Card elevation="flat" className="p-4">
          <Heading level={2} className="mb-4">
            <TrendingUp className="size-4 inline mr-2" />
            Velocity Trends
          </Heading>
          {velocityData.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="size-12" />}
              title="No velocity data"
              description="Sprint velocity data will appear after sprints are completed."
            />
          ) : (
            <VelocityChart data={velocityData} />
          )}
        </Card>
      </section>

      {/* DORA metrics */}
      {trends?.dora && (
        <section aria-label="DORA metrics">
          <Heading level={2} className="mb-3">
            DORA Metrics
          </Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DoraMetric
              label="Lead Time"
              series={trends.dora.lead_time}
              unit="hours"
              icon={<Clock className="size-4" />}
            />
            <DoraMetric
              label="Deploy Frequency"
              series={trends.dora.deployment_frequency}
              unit="/week"
              icon={<Zap className="size-4" />}
            />
            <DoraMetric
              label="Change Failure Rate"
              series={trends.dora.change_failure_rate}
              unit="%"
              icon={<AlertTriangle className="size-4" />}
            />
            <DoraMetric
              label="MTTR"
              series={trends.dora.mttr}
              unit="hours"
              icon={<Activity className="size-4" />}
            />
          </div>
        </section>
      )}

      {/* Agent performance chart */}
      <section aria-label="Agent performance">
        <Card elevation="flat" className="p-4">
          <Heading level={2} className="mb-4">
            <Activity className="size-4 inline mr-2" />
            Agent Performance
          </Heading>
          {!agentPerf || agentPerf.length === 0 ? (
            <EmptyState
              icon={<Activity className="size-12" />}
              title="No agent data"
              description="Agent metrics appear once agents have been invoked."
            />
          ) : (
            <AgentChart data={agentPerf} />
          )}
        </Card>
      </section>
    </div>
  );
}
