/**
 * Traceability explorer page — navigate requirement → design → code → test chains.
 * M10 / Issue #396
 */
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { Heading, Text } from '@/components/ui/typography';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { useTraceability } from '@/hooks';
import type { TraceEntity, TraceGap, TraceEntityType } from '@/lib/api-types';
import type { ColumnDef } from '@tanstack/react-table';
import {
  GitPullRequest,
  FileText,
  Palette,
  Code,
  TestTube,
  AlertTriangle,
  Search,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

/* ── Entity type config ── */
const entityConfig: Record<
  TraceEntityType,
  { label: string; icon: React.ReactNode; variant: 'info' | 'success' | 'warning' | 'secondary' }
> = {
  requirement: { label: 'Requirement', icon: <FileText className="size-3" />, variant: 'info' },
  design: { label: 'Design', icon: <Palette className="size-3" />, variant: 'secondary' },
  code: { label: 'Code', icon: <Code className="size-3" />, variant: 'success' },
  test: { label: 'Test', icon: <TestTube className="size-3" />, variant: 'warning' },
};

/* ── Chain order ── */
const chainOrder: TraceEntityType[] = ['requirement', 'design', 'code', 'test'];

/* ── Entity table columns ── */
const entityColumns: ColumnDef<TraceEntity, unknown>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs max-w-50 truncate block">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ getValue }) => {
      const type = getValue() as TraceEntityType;
      const config = entityConfig[type];
      return (
        <Badge variant={config.variant} className="gap-1">
          {config.icon} {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'phase',
    header: 'Phase',
    cell: ({ getValue }) => <Badge variant="secondary">{getValue() as string}</Badge>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => <span className="text-xs">{getValue() as string}</span>,
  },
];

/* ── Gap table columns ── */
const gapColumns: ColumnDef<TraceGap, unknown>[] = [
  {
    accessorKey: 'entity_id',
    header: 'Entity',
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
  },
  {
    accessorKey: 'entity_type',
    header: 'Type',
    cell: ({ getValue }) => {
      const type = getValue() as TraceEntityType;
      const config = entityConfig[type];
      return <Badge variant={config.variant}>{config.label}</Badge>;
    },
  },
  {
    accessorKey: 'missing',
    header: 'Missing Link',
    cell: ({ getValue }) => {
      const type = getValue() as TraceEntityType;
      const config = entityConfig[type];
      return (
        <Badge variant="error" className="gap-1">
          <AlertTriangle className="size-3" /> No {config.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'label',
    header: 'Label',
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">{getValue() as string}</span>
    ),
  },
];

/* ── Chain visualization ── */
function TraceChainVisual({ entities }: { entities: TraceEntity[] }) {
  const grouped = useMemo(() => {
    const groups: Record<TraceEntityType, TraceEntity[]> = {
      requirement: [],
      design: [],
      code: [],
      test: [],
    };
    for (const e of entities) {
      groups[e.type]?.push(e);
    }
    return groups;
  }, [entities]);

  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
      {chainOrder.map((type, idx) => {
        const config = entityConfig[type];
        const items = grouped[type];
        return (
          <div key={type} className="flex items-center gap-2">
            <Card elevation="flat" className="p-3 min-w-35">
              <div className="flex items-center gap-1 mb-2">
                {config.icon}
                <span className="text-xs font-semibold">{config.label}</span>
                <Badge variant={config.variant} className="text-[10px] ml-auto">
                  {items.length}
                </Badge>
              </div>
              {items.length === 0 ? (
                <Text muted className="text-[10px]">
                  None
                </Text>
              ) : (
                <div className="space-y-1 max-h-30 overflow-y-auto">
                  {items.slice(0, 5).map((e) => (
                    <div
                      key={e.id}
                      className="text-[10px] font-mono truncate text-muted-foreground"
                    >
                      {e.id}
                    </div>
                  ))}
                  {items.length > 5 && (
                    <Text muted className="text-[10px]">
                      +{items.length - 5} more
                    </Text>
                  )}
                </div>
              )}
            </Card>
            {idx < chainOrder.length - 1 && (
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <ArrowRight className="size-4 text-muted-foreground" />
                <ArrowLeft className="size-3 text-muted-foreground/50" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Page ── */
export default function TraceabilityExplorerPage() {
  const { data, isLoading, error, refetch } = useTraceability();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TraceEntityType | ''>('');

  const entities = useMemo(() => data?.entities ?? [], [data]);
  const gaps = useMemo(() => data?.gaps ?? [], [data]);

  const filtered = useMemo(() => {
    let result = entities;
    if (filterType) result = result.filter((e) => e.type === filterType);
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.id.toLowerCase().includes(lower) ||
          e.label.toLowerCase().includes(lower) ||
          e.phase.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [entities, filterType, search]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { requirement: 0, design: 0, code: 0, test: 0 };
    for (const e of entities) counts[e.type] = (counts[e.type] || 0) + 1;
    return counts;
  }, [entities]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading traceability data…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load traceability data: {(error as Error).message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3 mr-1.5" /> Retry
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="traceability-explorer-page">
      <MissionControlHero
        eyebrow="Traceability explorer"
        title="Follow requirement-to-test chains as governed delivery pathways"
        description="Traceability shows whether intent, design, implementation, and tests remain connected. Gaps here are delivery risks, not just missing rows."
        badges={
          <>
            <ControlSignalBadge signal="governed" />
            {gaps.length > 0 && <ControlSignalBadge signal="needs-human-input" />}
            <Badge variant="outline">Traceability</Badge>
          </>
        }
        metrics={[
          {
            label: 'Entities',
            value: String(entities.length),
            detail: 'Tracked traceability nodes',
          },
          {
            label: 'Requirements',
            value: String(typeCounts.requirement),
            detail: 'Intent-level inputs',
          },
          { label: 'Tests', value: String(typeCounts.test), detail: 'Verification endpoints' },
          {
            label: 'Coverage gaps',
            value: String(gaps.length),
            detail: 'Broken or incomplete chains',
          },
        ]}
        motifs={
          <>
            <StatusMotif
              kind="governance"
              title="Traceability is auditable"
              description="Each entity is visible as part of a governed chain, making delivery lineage inspectable instead of assumed."
            />
            <StatusMotif
              kind="agent"
              title="Execution leaves links behind"
              description="The explorer exposes how generated outputs connect across requirement, design, code, and test layers."
            />
            <StatusMotif
              kind="human-loop"
              title="Coverage gaps need review"
              description="When links are missing, a person can quickly identify where the chain broke and what evidence is absent."
            />
          </>
        }
        asideTitle="Explorer controls"
        asideDescription="Use chain overview for structure, coverage gaps for immediate risk, and the entity browser for targeted inspection."
        asideContent={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="size-3 mr-1.5" /> Refresh
          </Button>
        }
      />

      {/* Summary */}
      <section aria-label="Traceability summary">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            label="Requirements"
            value={typeCounts.requirement}
            icon={<FileText className="size-4" />}
            trend="neutral"
          />
          <MetricCard
            label="Designs"
            value={typeCounts.design}
            icon={<Palette className="size-4" />}
            trend="neutral"
          />
          <MetricCard
            label="Code"
            value={typeCounts.code}
            icon={<Code className="size-4" />}
            trend="neutral"
          />
          <MetricCard
            label="Tests"
            value={typeCounts.test}
            icon={<TestTube className="size-4" />}
            trend="neutral"
          />
          <MetricCard
            label="Coverage Gaps"
            value={gaps.length}
            icon={<AlertTriangle className="size-4" />}
            trend={gaps.length > 0 ? 'down' : 'neutral'}
          />
        </div>
      </section>

      {/* Chain visualization */}
      <section aria-label="Traceability chain">
        <Heading level={2} className="mb-3">
          Chain Overview
        </Heading>
        <TraceChainVisual entities={entities} />
      </section>

      {/* Coverage gaps */}
      {gaps.length > 0 && (
        <section aria-label="Coverage gaps">
          <Heading level={2} className="mb-3">
            <AlertTriangle className="size-4 inline mr-2 text-amber-500" />
            Coverage Gaps
          </Heading>
          <DataTable columns={gapColumns} data={gaps} enableSorting emptyTitle="No gaps" />
        </section>
      )}

      {/* Entity browser with filters */}
      <section aria-label="Entity browser">
        <Heading level={2} className="mb-3">
          All Entities
        </Heading>
        <Card elevation="flat" className="mb-3 p-4 bg-card/78">
          <div className="flex items-center gap-3 flex-wrap">
            <Search className="size-4 text-muted-foreground" />
            <Input
              placeholder="Search entities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 max-w-sm"
              aria-label="Search entities"
            />
            <select
              className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-sm shadow-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TraceEntityType | '')}
              aria-label="Filter by entity type"
            >
              <option value="">All Types</option>
              {chainOrder.map((t) => (
                <option key={t} value={t}>
                  {entityConfig[t].label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<GitPullRequest className="size-12" />}
            title="No entities found"
            description="Traceability entities will appear once artifacts are registered."
          />
        ) : (
          <DataTable
            columns={entityColumns}
            data={filtered}
            enableSorting
            enablePagination
            emptyTitle="No matching entities"
          />
        )}
      </section>
    </div>
  );
}
