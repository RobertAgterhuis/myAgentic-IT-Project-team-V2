/**
 * Metrics page column definitions — drift, velocity, and agent tables.
 * Extracted from metrics-page (M15-008).
 */
import { Badge } from '@/components/ui/badge';
import type { DriftEntry, VelocityTrendEntry, AgentPerformanceStats } from '@/lib/api-types';
import type { ColumnDef } from '@tanstack/react-table';
import { severityBadge, severityIcons } from './constants';

/* ── Drift table columns ── */
export const driftColumns: ColumnDef<DriftEntry, unknown>[] = [
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
      <span className="text-xs max-w-50 line-clamp-2">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'actual',
    header: 'Actual',
    cell: ({ getValue }) => (
      <span className="text-xs max-w-50 line-clamp-2">{getValue() as string}</span>
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
export const velocityColumns: ColumnDef<VelocityTrendEntry, unknown>[] = [
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
export const agentColumns: ColumnDef<AgentPerformanceStats, unknown>[] = [
  { accessorKey: 'agent_name', header: 'Agent' },
  { accessorKey: 'total_invocations', header: 'Invocations' },
  {
    accessorKey: 'success_rate_pct',
    header: 'Success Rate',
    cell: ({ getValue }) => `${(getValue() as number).toFixed(1)}%`,
  },
  {
    accessorKey: 'avg_duration_ms',
    header: 'Avg Duration',
    cell: ({ getValue }) => `${Math.round(getValue() as number)} ms`,
  },
  {
    accessorKey: 'avg_provider_latency_ms',
    header: 'Provider Latency',
    cell: ({ getValue }) => {
      const value = getValue() as number;
      return value > 0 ? `${Math.round(value)} ms` : '—';
    },
  },
  {
    accessorKey: 'avg_model_retries',
    header: 'Avg Retries',
    cell: ({ getValue }) => (getValue() as number).toFixed(2),
  },
  {
    accessorKey: 'avg_total_tokens',
    header: 'Avg Tokens',
    cell: ({ getValue }) => `${Math.round(getValue() as number)}`,
  },
  {
    accessorKey: 'providers',
    header: 'Providers',
    cell: ({ getValue }) => {
      const providers = getValue() as string[];
      return providers.length > 0 ? providers.join(', ') : '—';
    },
  },
  {
    accessorKey: 'p95_duration_ms',
    header: 'P95',
    cell: ({ getValue }) => `${Math.round(getValue() as number)} ms`,
  },
  {
    accessorKey: 'min_duration_ms',
    header: 'Min',
    cell: ({ getValue }) => `${Math.round(getValue() as number)} ms`,
  },
  {
    accessorKey: 'max_duration_ms',
    header: 'Max',
    cell: ({ getValue }) => `${Math.round(getValue() as number)} ms`,
  },
];
