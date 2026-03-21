/**
 * Audit & Evidence Explorer — unified view of artifacts, traceability, and approvals.
 * UI-012 / Phase 4 — #773
 * Combines the artifact registry and traceability explorer into a single audit timeline
 * with evidence packs, enabling operators to inspect governed delivery evidence end-to-end.
 */
import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
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
import { OperationalCard } from '@/components/ui/operational-card';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { useAuditEvidenceAggregation, useArtifacts, useApprovals } from '@/hooks';
import type { AuditTimelineEntry, AuditEvidencePack } from '@/lib/api-types';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ShieldCheck,
  Package,
  Clock,
  AlertTriangle,
  RefreshCw,
  Filter,
  FileCheck,
  Search,
} from 'lucide-react';

/* ── Domain filter options aligned with AuditTimelineDomain ── */
const DOMAIN_FILTERS = [
  { value: '', label: 'All Events' },
  { value: 'approvals', label: 'Approvals' },
  { value: 'policies', label: 'Policy' },
  { value: 'artifacts', label: 'Artifacts' },
  { value: 'sessions', label: 'Sessions' },
];

const SEVERITY_FILTERS = [
  { value: '', label: 'All Severity' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

/* ── Evidence pack status badge ── */
const packStatusVariant: Record<AuditEvidencePack['status'], 'success' | 'warning' | 'secondary'> =
  {
    complete: 'success',
    partial: 'warning',
    missing: 'secondary',
  };

/* ── Timeline table columns ── */
const timelineColumns: ColumnDef<AuditTimelineEntry, unknown>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs max-w-40 truncate block">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'domain',
    header: 'Domain',
    cell: ({ getValue }) => <Badge variant="info">{getValue() as string}</Badge>,
  },
  {
    accessorKey: 'event_type',
    header: 'Event Type',
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ getValue }) => {
      const sev = getValue() as string;
      return (
        <Badge
          variant={sev === 'critical' ? 'warning' : sev === 'warning' ? 'warning' : 'secondary'}
        >
          {sev}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'timestamp',
    header: 'Time',
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">
        {new Date(getValue() as string).toLocaleString()}
      </span>
    ),
  },
];

/* ── Evidence pack table columns ── */
const packColumns: ColumnDef<AuditEvidencePack, unknown>[] = [
  {
    accessorKey: 'id',
    header: 'Pack ID',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs max-w-40 truncate block">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'phase',
    header: 'Phase',
    cell: ({ getValue }) => <Badge variant="secondary">{getValue() as string}</Badge>,
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ getValue }) => <span className="text-sm font-medium">{getValue() as string}</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue() as AuditEvidencePack['status'];
      return <Badge variant={packStatusVariant[status] ?? 'secondary'}>{status}</Badge>;
    },
  },
  {
    accessorKey: 'coverage_score',
    header: 'Coverage',
    cell: ({ getValue }) => <span className="text-sm font-mono">{getValue() as number}%</span>,
  },
  {
    accessorKey: 'last_updated',
    header: 'Last Updated',
    cell: ({ getValue }) => {
      const val = getValue() as string;
      return (
        <span className="text-xs text-muted-foreground">
          {val ? new Date(val).toLocaleString() : '—'}
        </span>
      );
    },
  },
];

type ActiveTab = 'timeline' | 'evidence-packs';

/* ── Main Page ── */
export default function AuditEvidenceExplorerPage() {
  const [domainFilter, setDomainFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('timeline');

  const aggregation = useAuditEvidenceAggregation();
  const artifacts = useArtifacts({});
  const approvals = useApprovals();

  const isLoading = aggregation.isLoading;
  const error = aggregation.error;

  const timeline = useMemo(() => aggregation.data?.timeline ?? [], [aggregation.data]);
  const packs = useMemo(() => aggregation.data?.packs ?? [], [aggregation.data]);
  const summary = useMemo(() => aggregation.data?.summary, [aggregation.data]);

  const filteredTimeline = useMemo(() => {
    let entries = timeline;
    if (domainFilter) entries = entries.filter((e) => e.domain === domainFilter);
    if (severityFilter) entries = entries.filter((e) => e.severity === severityFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(
        (e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [timeline, domainFilter, severityFilter, searchQuery]);

  const criticalItems = useMemo<QueueTriageItem[]>(
    () =>
      timeline
        .filter((e) => e.severity === 'critical' || e.severity === 'warning')
        .slice(0, 5)
        .map((event) => ({
          id: event.id,
          title: event.title,
          subtitle: `${event.domain} · ${event.event_type}`,
          statusLabel: event.severity,
          statusTone:
            event.severity === 'critical'
              ? 'critical'
              : event.severity === 'warning'
                ? 'warning'
                : 'info',
          priority:
            event.severity === 'critical'
              ? 'high'
              : event.severity === 'warning'
                ? 'medium'
                : 'low',
          meta: [
            { id: `${event.id}-domain`, label: 'Domain', value: event.domain, tone: 'info' },
            {
              id: `${event.id}-time`,
              label: 'Time',
              value: new Date(event.timestamp).toLocaleString(),
            },
          ],
        })),
    [timeline]
  );

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      { id: 'total-events', label: 'Total events', value: String(timeline.length) },
      {
        id: 'critical-events',
        label: 'Critical',
        value: String(summary?.critical_events ?? 0),
        tone: (summary?.critical_events ?? 0) > 0 ? 'warning' : 'success',
      },
      {
        id: 'evidence-packs',
        label: 'Evidence packs',
        value: String(packs.length),
        tone: 'info',
      },
      {
        id: 'artifacts',
        label: 'Artifacts',
        value: String(artifacts.data?.artifacts.length ?? 0),
      },
      {
        id: 'pending-approvals',
        label: 'Pending approvals',
        value: String(approvals.data?.approvals.filter((a) => a.status === 'PENDING').length ?? 0),
        tone:
          (approvals.data?.approvals.filter((a) => a.status === 'PENDING').length ?? 0) > 0
            ? 'warning'
            : 'neutral',
      },
      {
        id: 'filters',
        label: 'Filters active',
        value: domainFilter || severityFilter || searchQuery ? 'Yes' : 'No',
        tone: domainFilter || severityFilter || searchQuery ? 'warning' : 'neutral',
      },
    ],
    [
      timeline.length,
      summary?.critical_events,
      packs.length,
      artifacts.data?.artifacts.length,
      approvals.data?.approvals,
      domainFilter,
      severityFilter,
      searchQuery,
    ]
  );

  function handleRefresh() {
    void aggregation.refetch();
    void artifacts.refetch();
    void approvals.refetch();
  }

  return (
    <PageShell
      isLoading={isLoading}
      loadingLabel="Loading audit evidence…"
      error={error as Error | null}
      onRetry={handleRefresh}
    >
      <div className="p-6 space-y-6" data-testid="audit-evidence-explorer-page">
        <PageHeader
          title="Audit & Evidence Explorer"
          subtitle="Unified audit timeline linking artifacts, traceability chains, and approvals into governed evidence packs."
          chips={[
            { id: 'audit-unified', label: 'Unified audit surface', tone: 'info' },
            { id: 'evidence-packs', label: 'Evidence packs' },
            { id: 'cross-domain', label: 'Cross-domain' },
          ]}
        />

        <ContextStrip items={contextItems} />

        <MissionControlHero
          eyebrow="Audit & Evidence"
          title="Inspect governed delivery evidence across artifacts, approvals, and traceability"
          description="Every artifact, approval decision, and traceability link becomes a dated, domain-tagged audit entry. Evidence packs group these entries by phase so reviewers can validate coverage without navigating multiple tools."
          badges={
            <>
              <ControlSignalBadge signal="governed" />
              <Badge variant="outline">Audit timeline</Badge>
              {(summary?.critical_events ?? 0) > 0 && <ControlSignalBadge signal="blocked" />}
            </>
          }
          metrics={[
            {
              label: 'Timeline events',
              value: String(timeline.length),
              detail: 'Across all domains',
            },
            {
              label: 'Evidence packs',
              value: String(packs.length),
              detail: 'Phase-scoped coverage',
            },
            {
              label: 'Critical',
              value: String(summary?.critical_events ?? 0),
              detail: 'Requires attention',
            },
          ]}
          motifs={
            <>
              <StatusMotif
                kind="governance"
                title="Evidence is cross-domain"
                description="Artifacts, approvals, and traceability entries are unified into a single chronological record for compliance-ready inspection."
              />
              <StatusMotif
                kind="agent"
                title="Phase coverage is tracked"
                description="Each evidence pack scores coverage per phase so gaps are visible before an audit or delivery review."
              />
              <StatusMotif
                kind="human-loop"
                title="Critical events surface first"
                description="The triage queue brings high-severity items to the top so operators can prioritise their review efficiently."
              />
            </>
          }
          asideTitle="Explorer controls"
          asideDescription="Refresh all data sources, apply domain or severity filters, and search the timeline."
          asideContent={
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="size-4 mr-1" /> Refresh all
            </Button>
          }
        />

        {/* Critical & warning triage queue */}
        {criticalItems.length > 0 && (
          <QueueTriageList
            title="High-severity audit events"
            description="Critical and warning events requiring review before evidence packs can be considered complete."
            items={criticalItems}
            emptyTitle="No high-severity events"
            emptyDescription="No critical or warning audit events in current scope."
          />
        )}

        {/* Metric summary */}
        <section aria-label="Audit summary metrics">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Events"
              value={timeline.length}
              icon={<Clock className="size-4" />}
              trend="neutral"
            />
            <MetricCard
              label="Critical"
              value={summary?.critical_events ?? 0}
              icon={<AlertTriangle className="size-4" />}
              trend={(summary?.critical_events ?? 0) > 0 ? 'down' : 'neutral'}
            />
            <MetricCard
              label="Evidence Packs"
              value={packs.length}
              icon={<FileCheck className="size-4" />}
              trend="neutral"
            />
            <MetricCard
              label="Artifacts Linked"
              value={artifacts.data?.artifacts.length ?? 0}
              icon={<Package className="size-4" />}
              trend="neutral"
            />
          </div>
        </section>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Audit explorer tabs"
          className="flex items-center gap-1 border-b"
        >
          {(['timeline', 'evidence-packs'] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`audit-panel-${tab}`}
              id={`audit-tab-${tab}`}
              className={[
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50',
              ].join(' ')}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'timeline' ? 'Audit Timeline' : 'Evidence Packs'}
            </button>
          ))}
        </div>

        {/* Timeline panel */}
        {activeTab === 'timeline' && (
          <div
            id="audit-panel-timeline"
            role="tabpanel"
            aria-labelledby="audit-tab-timeline"
            className="space-y-4"
          >
            {/* Filters */}
            <Card elevation="flat" className="p-4 bg-card/78">
              <div className="flex items-center gap-3 flex-wrap">
                <Filter className="size-4 text-muted-foreground" aria-hidden="true" />

                <div className="relative">
                  <Search
                    className="absolute left-2.5 top-2 size-4 text-muted-foreground pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    placeholder="Search events…"
                    className="h-9 pl-8 pr-3 rounded-xl border border-border/70 bg-background/80 text-sm shadow-sm w-48"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search audit events"
                  />
                </div>

                <select
                  className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-sm shadow-sm"
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  aria-label="Filter by domain"
                >
                  {DOMAIN_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>

                <select
                  className="h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-sm shadow-sm"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  aria-label="Filter by severity"
                >
                  {SEVERITY_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>

                {(domainFilter || severityFilter || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDomainFilter('');
                      setSeverityFilter('');
                      setSearchQuery('');
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </Card>

            {filteredTimeline.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="size-8" />}
                title="No audit events"
                description="No events match the current filter criteria."
              />
            ) : (
              <DataTable columns={timelineColumns} data={filteredTimeline} />
            )}
          </div>
        )}

        {/* Evidence packs panel */}
        {activeTab === 'evidence-packs' && (
          <div
            id="audit-panel-evidence-packs"
            role="tabpanel"
            aria-labelledby="audit-tab-evidence-packs"
            className="space-y-4"
          >
            {/* Pack cards summary */}
            {packs.length > 0 && (
              <section
                aria-label="Evidence pack overview"
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              >
                {packs.map((pack) => (
                  <OperationalCard
                    key={pack.id}
                    title={pack.title}
                    subtitle={`Phase: ${pack.phase}`}
                    statusLabel={pack.status}
                    statusTone={
                      pack.status === 'complete'
                        ? 'success'
                        : pack.status === 'partial'
                          ? 'warning'
                          : 'critical'
                    }
                    meta={[
                      {
                        id: `${pack.id}-coverage`,
                        label: 'Coverage',
                        value: `${pack.coverage_score}%`,
                      },
                      {
                        id: `${pack.id}-artifacts`,
                        label: 'Artifacts',
                        value: String(pack.artifact_ids.length),
                      },
                      {
                        id: `${pack.id}-approvals`,
                        label: 'Approvals',
                        value: String(pack.approval_ids.length),
                      },
                    ]}
                  />
                ))}
              </section>
            )}

            {packs.length === 0 ? (
              <EmptyState
                icon={<FileCheck className="size-8" />}
                title="No evidence packs"
                description="Evidence packs are generated once artifacts, approvals, and trace entities are available."
              />
            ) : (
              <DataTable columns={packColumns} data={packs} />
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
