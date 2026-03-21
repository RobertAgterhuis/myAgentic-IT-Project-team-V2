/**
 * Artifact browser page — lists all registered artifacts with filtering.
 * M10 / Issue #392
 */
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageShell } from '@/components/ui/page-shell';
import { QueueTriageList, type QueueTriageItem } from '@/components/ui/queue-triage-list';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { useArtifacts, useAuditEvidenceAggregation } from '@/hooks';
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
  const auditAggregation = useAuditEvidenceAggregation();

  const artifacts = useMemo(() => data?.artifacts ?? [], [data]);
  const auditTimeline = useMemo(
    () => auditAggregation.data?.timeline ?? [],
    [auditAggregation.data?.timeline]
  );

  // Derive unique values for filter dropdowns
  const phases = useMemo(() => [...new Set(artifacts.map((a) => a.stage))].sort(), [artifacts]);
  const types = useMemo(
    () => [...new Set(artifacts.map((a) => a.artifact_type))].sort(),
    [artifacts]
  );
  const statuses = useMemo(() => [...new Set(artifacts.map((a) => a.status))].sort(), [artifacts]);

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      { id: 'artifacts', label: 'Artifacts', value: String(artifacts.length) },
      { id: 'types', label: 'Types', value: String(types.length) },
      { id: 'phases', label: 'Phases', value: String(phases.length) },
      {
        id: 'audit-events',
        label: 'Audit events',
        value: String(auditTimeline.length),
        tone: auditTimeline.length > 0 ? 'info' : 'neutral',
      },
      {
        id: 'filtered',
        label: 'Filters active',
        value: filterPhase || filterType || filterStatus ? 'Yes' : 'No',
        tone: filterPhase || filterType || filterStatus ? 'warning' : 'neutral',
      },
    ],
    [
      artifacts.length,
      types.length,
      phases.length,
      auditTimeline.length,
      filterPhase,
      filterType,
      filterStatus,
    ]
  );

  const auditQueueItems = useMemo<QueueTriageItem[]>(
    () =>
      auditTimeline.slice(0, 5).map((event) => ({
        id: event.id,
        title: event.title,
        subtitle: event.description,
        statusLabel: event.severity,
        statusTone:
          event.severity === 'critical'
            ? 'critical'
            : event.severity === 'warning'
              ? 'warning'
              : 'info',
        priority:
          event.severity === 'critical' ? 'high' : event.severity === 'warning' ? 'medium' : 'low',
        actionLabel: event.entity_id ? 'Inspect entity' : undefined,
        meta: [
          { id: `${event.id}-domain`, label: 'Domain', value: event.domain, tone: 'info' },
          {
            id: `${event.id}-time`,
            label: 'Timestamp',
            value: new Date(event.timestamp).toLocaleString(),
          },
        ],
      })),
    [auditTimeline]
  );

  return (
    <PageShell
      isLoading={isLoading}
      loadingLabel="Loading artifacts…"
      error={error as Error | null}
      onRetry={() => refetch()}
    >
      <div className="p-6 space-y-6" data-testid="artifact-browser-page">
        <PageHeader
          title="Artifact Browser"
          subtitle="Browse governed delivery artifacts as traceable evidence with status, phase, and hash continuity."
          chips={[
            { id: 'artifact-registry', label: 'Artifact Registry', tone: 'info' },
            { id: 'governed', label: 'Governed' },
          ]}
        />

        <ContextStrip items={contextItems} />

        <MissionControlHero
          heroId="artifacts"
          eyebrow="Artifact registry"
          title="Browse governed delivery artifacts as traceable evidence"
          description="The artifact registry is where generated outputs become inspectable delivery evidence, with status, phase, and hash continuity across the workflow."
          badges={
            <>
              <ControlSignalBadge signal="governed" />
              <Badge variant="outline">Artifact registry</Badge>
              {(filterPhase || filterType || filterStatus) && (
                <ControlSignalBadge signal="active-agent" />
              )}
            </>
          }
          metrics={[
            {
              label: 'Artifacts',
              value: String(artifacts.length),
              detail: 'Registered outputs in scope',
            },
            { label: 'Types', value: String(types.length), detail: 'Distinct artifact categories' },
            {
              label: 'Phases',
              value: String(phases.length),
              detail: 'Phases represented in results',
            },
            {
              label: 'Unique hashes',
              value: String(new Set(artifacts.map((a) => a.content_hash)).size),
              detail: 'Content fingerprint count',
            },
          ]}
          motifs={
            <>
              <StatusMotif
                kind="governance"
                title="Evidence remains governed"
                description="Status and phase metadata make each artifact usable for audits and delivery reviews, not just as a file list."
              />
              <StatusMotif
                kind="agent"
                title="Artifacts point back to execution"
                description="Type, phase, and hash fields keep artifact inspection connected to the execution path that produced them."
              />
              <StatusMotif
                kind="human-loop"
                title="Filtering supports review"
                description="Operators can narrow the evidence set quickly when a person needs to inspect specific phases or states."
              />
            </>
          }
          asideTitle="Registry controls"
          asideDescription="Refresh the registry, apply phase or type filters, and inspect the table as an operational evidence view rather than a flat asset list."
          asideContent={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-4 mr-1" /> Refresh
            </Button>
          }
        />

        <QueueTriageList
          title="Audit timeline preview"
          description="Unified audit/evidence aggregation across artifacts and approvals."
          items={auditQueueItems}
          emptyTitle="No audit activity"
          emptyDescription="Audit timeline entries will appear once evidence and approvals are generated."
        />

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
        <Card elevation="flat" className="p-4 bg-card/78">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="size-4 text-muted-foreground" />
            <select
              className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-sm shadow-sm"
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
              className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-sm shadow-sm"
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
              className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-sm shadow-sm"
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
    </PageShell>
  );
}
