/**
 * Metrics page — drift detection, KPI charts, time-range selector, analytics trends.
 * Issue #245 (S9G-38), M7 analytics integration (#376)
 */
import { useState, useMemo } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { ProgressBar } from '@/components/ui/progress';
import {
  useDriftDetection,
  useProgress,
  useDashboardMetrics,
  useAnalyticsTrends,
  useAnalyticsAgents,
} from '@/hooks';
import type {
  DriftEntry,
  DriftSeverity,
  VelocityTrendEntry,
  AgentPerformanceStats,
} from '@/lib/api-types';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Download,
  Clock,
  ShieldAlert,
  Info,
  TrendingUp,
  Activity,
} from 'lucide-react';

/* ── Time range ── */
type TimeRange = '24h' | '7d' | '30d' | '90d';

/* ── Severity badge ── */
const severityBadge: Record<DriftSeverity, 'error' | 'warning' | 'info'> = {
  CRITICAL: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

const severityIcons: Record<DriftSeverity, React.ReactNode> = {
  CRITICAL: <ShieldAlert className="size-4 text-red-600" />,
  WARNING: <AlertTriangle className="size-4 text-amber-500" />,
  INFO: <Info className="size-4 text-blue-500" />,
};

/* ── Drift table columns ── */
const driftColumns: ColumnDef<DriftEntry, unknown>[] = [
  {
    id: 'severity',
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        {severityIcons[row.original.severity]}
        <Badge variant={severityBadge[row.original.severity]}>{row.original.severity}</Badge>
      </div>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
  },
  {
    accessorKey: 'sprint',
    header: 'Sprint',
    cell: ({ getValue }) => (
      <Badge variant="secondary" className="text-xs">
        {getValue() as string}
      </Badge>
    ),
  },
  {
    accessorKey: 'expected',
    header: 'Expected',
    cell: ({ getValue }) => (
      <span className="text-xs max-w-[200px] line-clamp-2">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'actual',
    header: 'Actual',
    cell: ({ getValue }) => (
      <span className="text-xs max-w-[200px] line-clamp-2">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'recommendation',
    header: 'Recommendation',
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground line-clamp-2">{getValue() as string}</span>
    ),
  },
];

/* ── Velocity trend table columns ── */
const velocityColumns: ColumnDef<VelocityTrendEntry, unknown>[] = [
  { accessorKey: 'sprintId', header: 'Sprint' },
  { accessorKey: 'planned', header: 'Planned' },
  { accessorKey: 'completed', header: 'Completed' },
  {
    accessorKey: 'completionRate',
    header: 'Rate',
    cell: ({ getValue }) => `${((getValue() as number) * 100).toFixed(0)}%`,
  },
  {
    accessorKey: 'carryOver',
    header: 'Carry-over',
    cell: ({ getValue }) => (getValue() as number) || '—',
  },
  {
    accessorKey: 'trailingAvg',
    header: '3-Sprint Avg',
    cell: ({ getValue }) => {
      const v = getValue() as number | undefined;
      return v != null ? v.toFixed(1) : '—';
    },
  },
];

/* ── Agent performance table columns ── */
const agentColumns: ColumnDef<AgentPerformanceStats, unknown>[] = [
  { accessorKey: 'agentName', header: 'Agent' },
  { accessorKey: 'invocations', header: 'Invocations' },
  {
    accessorKey: 'successRate',
    header: 'Success Rate',
    cell: ({ getValue }) => `${((getValue() as number) * 100).toFixed(1)}%`,
  },
  {
    accessorKey: 'avgDurationMs',
    header: 'Avg Duration',
    cell: ({ getValue }) => `${Math.round(getValue() as number)} ms`,
  },
  {
    accessorKey: 'p95DurationMs',
    header: 'P95',
    cell: ({ getValue }) => `${Math.round(getValue() as number)} ms`,
  },
  {
    accessorKey: 'minDurationMs',
    header: 'Min',
    cell: ({ getValue }) => `${Math.round(getValue() as number)} ms`,
  },
  {
    accessorKey: 'maxDurationMs',
    header: 'Max',
    cell: ({ getValue }) => `${Math.round(getValue() as number)} ms`,
  },
];

/* ── Export helper ── */
function exportData(drifts: DriftEntry[], format: 'json' | 'csv') {
  let content: string;
  let mime: string;
  let ext: string;

  if (format === 'json') {
    content = JSON.stringify(drifts, null, 2);
    mime = 'application/json';
    ext = 'json';
  } else {
    const headers = ['id', 'type', 'severity', 'sprint', 'expected', 'actual', 'recommendation'];
    const rows = drifts.map((d) =>
      headers
        .map((h) => `"${String(d[h as keyof DriftEntry] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );
    content = [headers.join(','), ...rows].join('\n');
    mime = 'text/csv';
    ext = 'csv';
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drift-report.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Main Page ── */
export default function MetricsPage() {
  const { data: drift, isLoading: driftLoading } = useDriftDetection();
  const { data: progress } = useProgress();
  const { data: metrics } = useDashboardMetrics();
  const { data: trends } = useAnalyticsTrends();
  const { data: agentPerf } = useAnalyticsAgents();
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  // Sprint velocity mock (from progress data)
  const sprintStats = useMemo(() => {
    if (!progress?.sprints) return null;
    return {
      total: progress.sprints.total,
      statuses: progress.sprints.statuses,
    };
  }, [progress]);

  // Phase progress as KPI
  const phases = progress?.phases ?? [];
  const totalAgents = phases.reduce((a, p) => a + p.total, 0);
  const doneAgents = phases.reduce((a, p) => a + p.done, 0);
  const overallPct = totalAgents > 0 ? Math.round((doneAgents / totalAgents) * 100) : 0;

  if (driftLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading metrics…" />
      </div>
    );
  }

  const drifts = drift?.drifts ?? [];
  const summary = drift?.summary ?? { total_drifts: 0, critical: 0, warning: 0, info: 0 };
  const inSync = drift?.in_sync ?? { sprints: [], stories: 0 };

  return (
    <div className="p-6 space-y-6" data-testid="metrics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>Metrics & Drift Detection</Heading>
          <Text muted>Monitor project health, detect drift, and track KPIs</Text>
        </div>
        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <div
            className="flex items-center gap-1 bg-muted rounded-md p-1"
            role="radiogroup"
            aria-label="Time range"
          >
            {(['24h', '7d', '30d', '90d'] as TimeRange[]).map((range) => (
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
                {range}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData(drifts, 'json')}
            disabled={drifts.length === 0}
          >
            <Download className="size-4 mr-1" /> JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData(drifts, 'csv')}
            disabled={drifts.length === 0}
          >
            <Download className="size-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* Drift Summary Cards */}
      <section aria-label="Drift summary">
        <Heading level={2} className="mb-3">
          Drift Summary
        </Heading>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Drifts"
            value={summary.total_drifts}
            icon={<AlertTriangle className="size-4" />}
            trend={summary.total_drifts > 0 ? 'down' : 'neutral'}
          />
          <MetricCard
            label="Critical"
            value={summary.critical}
            icon={<ShieldAlert className="size-4" />}
            trend={summary.critical > 0 ? 'down' : 'neutral'}
          />
          <MetricCard
            label="Warnings"
            value={summary.warning}
            icon={<AlertTriangle className="size-4" />}
            trend={summary.warning > 0 ? 'down' : 'neutral'}
          />
          <MetricCard
            label="In Sync"
            value={`${inSync.sprints.length} sprints`}
            delta={`${inSync.stories} stories`}
            icon={<CheckCircle className="size-4" />}
            trend="up"
          />
        </div>
      </section>

      {/* KPI Section */}
      <section aria-label="KPI overview">
        <Heading level={2} className="mb-3">
          KPI Overview
        </Heading>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Overall pipeline progress */}
          <Card elevation="flat" className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="size-4" />
              <span className="font-semibold text-sm">Pipeline Progress</span>
            </div>
            <ProgressBar
              value={overallPct}
              label={`${doneAgents}/${totalAgents} agents`}
              showPercentage
            />
            {phases.length > 0 && (
              <div className="mt-3 space-y-2">
                {phases.map((phase) => {
                  const pct = phase.total > 0 ? Math.round((phase.done / phase.total) * 100) : 0;
                  return (
                    <ProgressBar
                      key={phase.key}
                      value={pct}
                      label={phase.label}
                      showPercentage
                      className="text-xs"
                    />
                  );
                })}
              </div>
            )}
          </Card>

          {/* Sprint stats */}
          <Card elevation="flat" className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="size-4" />
              <span className="font-semibold text-sm">Sprint Overview</span>
            </div>
            {sprintStats ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold">{sprintStats.total} sprints</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(sprintStats.statuses).map(([sprint, status]) => (
                    <Badge
                      key={sprint}
                      variant={
                        status === 'DONE'
                          ? 'success'
                          : status === 'IN_PROGRESS'
                            ? 'info'
                            : 'secondary'
                      }
                    >
                      {sprint}: {status}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <Text muted>No sprint data available yet.</Text>
            )}
          </Card>

          {/* API Metrics */}
          {metrics && (
            <>
              <MetricCard
                label={metrics.http_requests.label}
                value={String(metrics.http_requests.value)}
                delta={metrics.http_requests.period}
                trend={metrics.http_requests.trend === 'up' ? 'up' : 'neutral'}
              />
              <MetricCard
                label={metrics.error_rate.label}
                value={String(metrics.error_rate.value)}
                delta={metrics.error_rate.period}
                trend={metrics.error_rate.trend === 'down' ? 'down' : 'neutral'}
              />
            </>
          )}
        </div>
      </section>

      {/* Velocity Trends (M7 #376) */}
      <section aria-label="Velocity trends">
        <Heading level={2} className="mb-3">
          <TrendingUp className="size-4 inline mr-2" />
          Velocity Trends
        </Heading>
        {trends?.velocityTrends && trends.velocityTrends.length > 0 ? (
          <DataTable
            columns={velocityColumns}
            data={trends.velocityTrends}
            enableSorting
            emptyTitle="No velocity data"
          />
        ) : (
          <EmptyState
            icon={<TrendingUp className="size-12" />}
            title="No velocity trends yet"
            description="Velocity data will appear after sprint boundaries are recorded."
          />
        )}
      </section>

      {/* Agent Performance (M7 #376) */}
      <section aria-label="Agent performance">
        <Heading level={2} className="mb-3">
          <Activity className="size-4 inline mr-2" />
          Agent Performance
        </Heading>
        {agentPerf && agentPerf.length > 0 ? (
          <DataTable
            columns={agentColumns}
            data={agentPerf}
            enableSorting
            enableFiltering
            filterPlaceholder="Search agents…"
            emptyTitle="No agent data"
          />
        ) : (
          <EmptyState
            icon={<Activity className="size-12" />}
            title="No agent performance data"
            description="Agent metrics will appear once agents have been invoked."
          />
        )}
      </section>

      {/* DORA Metrics Summary (M7 #376) */}
      {trends?.dora && trends.dora.length > 0 && (
        <section aria-label="DORA metrics">
          <Heading level={2} className="mb-3">
            DORA Metrics
          </Heading>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const latest = trends.dora[trends.dora.length - 1];
              return (
                <>
                  <MetricCard
                    label="Lead Time"
                    value={`${latest.value.toFixed(1)}h`}
                    icon={<Clock className="size-4" />}
                    trend="neutral"
                  />
                  {trends.dora.length >= 2 && (
                    <MetricCard
                      label="Deployment Freq"
                      value={String(
                        trends.dora.filter((d) => d.metric === 'deployment_frequency').length
                      )}
                      icon={<BarChart3 className="size-4" />}
                      trend="neutral"
                    />
                  )}
                </>
              );
            })()}
          </div>
        </section>
      )}

      {/* Drift Detail Table */}
      <section aria-label="Drift details">
        <Heading level={2} className="mb-3">
          Drift Details
        </Heading>
        {drifts.length === 0 ? (
          <EmptyState
            icon={<CheckCircle className="size-12" />}
            title="No drift detected"
            description="All sprints are in sync with the session state."
          />
        ) : (
          <DataTable
            columns={driftColumns}
            data={drifts}
            enableSorting
            enableFiltering
            filterPlaceholder="Search drifts…"
            enablePagination
            emptyTitle="No matching drifts"
          />
        )}
      </section>

      {/* Generated timestamp */}
      {drift?.generated_at && (
        <Text muted className="text-xs">
          Last checked: {drift.generated_at}
        </Text>
      )}
    </div>
  );
}
