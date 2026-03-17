/**
 * Artifact browser page — lists all registered artifacts with filtering.
 * M10 / Issue #392
 */
import { useState, useMemo } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { useArtifacts } from '@/hooks';
import type { Artifact } from '@/lib/api-types';
import type { ColumnDef } from '@tanstack/react-table';
import { Package, Hash, Layers, Filter, RefreshCw } from 'lucide-react';

/* ── Status badge mapping ── */
const statusVariant: Record<string, 'success' | 'warning' | 'info' | 'secondary'> = {
  VALID: 'success',
  DRAFT: 'info',
  SUPERSEDED: 'warning',
  INVALID: 'warning',
};

/* ── Table columns ── */
const artifactColumns: ColumnDef<Artifact, unknown>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs max-w-50 truncate block">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'artifact_type',
    header: 'Type',
    cell: ({ getValue }) => <Badge variant="secondary">{getValue() as string}</Badge>,
  },
  {
    accessorKey: 'stage',
    header: 'Phase',
    cell: ({ getValue }) => <Badge variant="info">{getValue() as string}</Badge>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue() as string;
      return <Badge variant={statusVariant[status] ?? 'secondary'}>{status}</Badge>;
    },
  },
  {
    accessorKey: 'content_hash',
    header: 'Hash',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {(getValue() as string).slice(0, 12)}…
      </span>
    ),
  },
  {
    accessorKey: 'updated_at',
    header: 'Updated',
    cell: ({ getValue }) => {
      const val = getValue() as string;
      return <span className="text-xs text-muted-foreground">{val || '—'}</span>;
    },
  },
];

/* ── Main Page ── */
export default function ArtifactBrowserPage() {
  const [filterPhase, setFilterPhase] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filters = useMemo(() => {
    const f: { stage?: string; type?: string; status?: string } = {};
    if (filterPhase) f.stage = filterPhase;
    if (filterType) f.type = filterType;
    if (filterStatus) f.status = filterStatus;
    return f;
  }, [filterPhase, filterType, filterStatus]);

  const { data, isLoading, error, refetch } = useArtifacts(filters);

  const artifacts = useMemo(() => data?.artifacts ?? [], [data]);

  // Derive unique values for filter dropdowns
  const phases = useMemo(() => [...new Set(artifacts.map((a) => a.stage))].sort(), [artifacts]);
  const types = useMemo(
    () => [...new Set(artifacts.map((a) => a.artifact_type))].sort(),
    [artifacts]
  );
  const statuses = useMemo(() => [...new Set(artifacts.map((a) => a.status))].sort(), [artifacts]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading artifacts…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load artifacts: {(error as Error).message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3 mr-1.5" /> Retry
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="artifact-browser-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>Artifact Browser</Heading>
          <Text muted>Browse all registered artifacts with metadata and status</Text>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="size-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <section aria-label="Artifact stats">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Artifacts"
            value={artifacts.length}
            icon={<Package className="size-4" />}
            trend="neutral"
          />
          <MetricCard
            label="Types"
            value={types.length}
            icon={<Layers className="size-4" />}
            trend="neutral"
          />
          <MetricCard
            label="Phases"
            value={phases.length}
            icon={<Filter className="size-4" />}
            trend="neutral"
          />
          <MetricCard
            label="Unique Hashes"
            value={new Set(artifacts.map((a) => a.content_hash)).size}
            icon={<Hash className="size-4" />}
            trend="neutral"
          />
        </div>
      </section>

      {/* Filters */}
      <Card elevation="flat" className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="size-4 text-muted-foreground" />
          <select
            className="h-8 rounded-md border bg-background px-3 text-sm"
            value={filterPhase}
            onChange={(e) => setFilterPhase(e.target.value)}
            aria-label="Filter by phase"
          >
            <option value="">All Phases</option>
            {phases.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            className="h-8 rounded-md border bg-background px-3 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label="Filter by type"
          >
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            className="h-8 rounded-md border bg-background px-3 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {(filterPhase || filterType || filterStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterPhase('');
                setFilterType('');
                setFilterStatus('');
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Artifact table */}
      <section aria-label="Artifact list">
        {artifacts.length === 0 ? (
          <EmptyState
            icon={<Package className="size-12" />}
            title="No artifacts registered"
            description="Artifacts will appear here once the engine registers them."
          />
        ) : (
          <DataTable
            columns={artifactColumns}
            data={artifacts}
            enableSorting
            enableFiltering
            filterPlaceholder="Search artifacts…"
            enablePagination
            emptyTitle="No matching artifacts"
          />
        )}
      </section>
    </div>
  );
}
