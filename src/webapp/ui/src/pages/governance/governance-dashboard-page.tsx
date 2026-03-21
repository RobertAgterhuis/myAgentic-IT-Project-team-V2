/**
 * Governance dashboard page — pending approvals, compliance, history.
 * M10 / Issue #394, M22 / Policy-as-Code Governance
 */
import { useState, useMemo, lazy, Suspense } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/ui/metric-card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button, buttonVariants } from '@/components/ui/button';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { DecisionProvenanceView } from '@/components/cockpit/decision-provenance-view';
import { cn } from '@/lib/utils';
import { getPendingColumns, historyColumns } from './columns';
import { useApprovals, useApproveRequest, useRejectRequest, useDecisionProvenance } from '@/hooks';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  Network,
} from 'lucide-react';

const PolicyCompliancePanel = lazy(() => import('./policy-compliance-panel'));

/* ── Main Page ── */
export default function GovernanceDashboardPage() {
  const { data, isLoading, error, refetch } = useApprovals();
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'approvals' | 'policies' | 'provenance'>('approvals');
  const approvalsTabId = 'governance-tab-approvals';
  const policiesTabId = 'governance-tab-policies';
  const provenanceTabId = 'governance-tab-provenance';
  const approvalsPanelId = 'governance-panel-approvals';
  const policiesPanelId = 'governance-panel-policies';
  const provenancePanelId = 'governance-panel-provenance';
  const [provenanceActorType, setProvenanceActorType] = useState<'all' | 'human' | 'machine'>(
    'all'
  );
  const [provenanceDecisionType, setProvenanceDecisionType] = useState<
    'all' | 'human_override' | 'approval' | 'policy_exception' | 'gate_failure' | 'error'
  >('all');
  const [provenancePage, setProvenancePage] = useState(1);

  const provenanceQuery = useDecisionProvenance({
    actor_type: provenanceActorType === 'all' ? undefined : provenanceActorType,
    decision_type: provenanceDecisionType === 'all' ? undefined : provenanceDecisionType,
    page: provenancePage,
    page_size: 20,
  });

  const approvals = useMemo(() => data?.approvals ?? [], [data]);

  const counts = useMemo(() => {
    const pending = approvals.filter((a) => a.status === 'PENDING').length;
    const approved = approvals.filter((a) => a.status === 'APPROVED').length;
    const rejected = approvals.filter((a) => a.status === 'REJECTED').length;
    return { pending, approved, rejected, total: approvals.length };
  }, [approvals]);

  const pendingApprovals = useMemo(
    () => approvals.filter((a) => a.status === 'PENDING'),
    [approvals]
  );

  const historyApprovals = useMemo(
    () => approvals.filter((a) => a.status !== 'PENDING'),
    [approvals]
  );

  const contextItems: ContextStripItem[] = [
    {
      id: 'governance-active-tab',
      label: 'Active tab',
      value:
        activeTab === 'approvals'
          ? 'Approvals'
          : activeTab === 'policies'
            ? 'Policy compliance'
            : 'Decision provenance',
      tone: activeTab === 'approvals' ? 'info' : activeTab === 'policies' ? 'warning' : 'neutral',
    },
    {
      id: 'governance-pending',
      label: 'Pending approvals',
      value: String(counts.pending),
      tone: counts.pending > 0 ? 'warning' : 'success',
    },
    {
      id: 'governance-provenance-events',
      label: 'Provenance events',
      value: String(provenanceQuery.data?.total ?? 0),
      tone: (provenanceQuery.data?.total ?? 0) > 0 ? 'info' : 'neutral',
    },
    {
      id: 'governance-mode',
      label: 'Mode',
      value: counts.pending > 0 ? 'Needs review' : 'Stable',
      tone: counts.pending > 0 ? 'warning' : 'success',
    },
  ];

  const pendingColumns = getPendingColumns({
    rejectingId,
    rejectReason,
    setRejectReason,
    setRejectingId,
    approveMutation,
    rejectMutation,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading governance data…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load governance data: {(error as Error).message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3 mr-1.5" /> Retry
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="governance-dashboard-page">
      <PageHeader
        title="Governance"
        subtitle="Review approvals, policy compliance, and decision provenance with explicit human oversight."
        chips={[
          {
            id: 'governance-chip-pending',
            label: `${counts.pending} pending`,
            tone: counts.pending > 0 ? 'warning' : 'success',
          },
          {
            id: 'governance-chip-approved',
            label: `${counts.approved} approved`,
            tone: 'info',
          },
          {
            id: 'governance-chip-rejected',
            label: `${counts.rejected} rejected`,
            tone: counts.rejected > 0 ? 'warning' : 'default',
          },
        ]}
      />

      <ContextStrip items={contextItems} />

      <MissionControlHero
        eyebrow="Governance command layer"
        title="Keep approvals, policy, and release discipline in one governed surface"
        description="Governance makes the system trustworthy by ensuring every phase gate, approval request, and policy outcome stays visible while delivery continues."
        badges={
          <>
            <ControlSignalBadge signal="governed" />
            {counts.pending > 0 && <ControlSignalBadge signal="needs-human-input" />}
            <Badge variant="outline">Advisory mode</Badge>
          </>
        }
        metrics={[
          {
            label: 'Pending',
            value: String(counts.pending),
            detail: 'Approvals waiting on a human',
          },
          {
            label: 'Approved',
            value: String(counts.approved),
            detail: 'Completed governance reviews',
          },
          {
            label: 'Rejected',
            value: String(counts.rejected),
            detail: 'Items blocked by governance',
          },
          {
            label: 'Decision lineage',
            value: String(provenanceQuery.data?.count ?? 0),
            detail: 'Machine-readable provenance events',
          },
        ]}
        motifs={
          <>
            <StatusMotif
              kind="governance"
              title="Approvals stay explicit"
              description="Pending and historical governance decisions are visible as operational workload, not hidden metadata."
            />
            <StatusMotif
              kind="agent"
              title="Automation respects oversight"
              description="Governance sits alongside orchestration so automated progress does not bypass accountability."
            />
            <StatusMotif
              kind="human-loop"
              title="Human review is first-class"
              description="Anything requiring acceptance or rejection is surfaced as a clear intervention point."
            />
          </>
        }
        asideTitle="Review rule"
        asideDescription="Start with Pending Approvals when something is blocked, then switch to Policy Compliance when you need systemic assurance rather than a single decision."
        asideContent={
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Current mode
              </div>
              <div className="mt-2 text-sm font-medium">
                {activeTab === 'approvals'
                  ? 'Approval operations'
                  : activeTab === 'policies'
                    ? 'Policy compliance review'
                    : 'Decision provenance review'}
              </div>
              <Text muted className="mt-1 text-xs">
                Use approvals for case-by-case intervention and policy compliance for systemic
                conformance.
              </Text>
            </div>
          </div>
        }
      />

      {/* Tab navigation */}
      <div className="flex gap-2 border-b pb-1" role="tablist" aria-label="Governance sections">
        {activeTab === 'approvals' ? (
          <button
            type="button"
            role="tab"
            id={approvalsTabId}
            aria-controls={approvalsPanelId}
            aria-selected="true"
            tabIndex={0}
            onClick={() => setActiveTab('approvals')}
            className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
          >
            <ShieldCheck className="size-3 mr-1.5" /> Approvals
          </button>
        ) : (
          <button
            type="button"
            role="tab"
            id={approvalsTabId}
            aria-controls={approvalsPanelId}
            aria-selected="false"
            tabIndex={-1}
            onClick={() => setActiveTab('approvals')}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            <ShieldCheck className="size-3 mr-1.5" /> Approvals
          </button>
        )}
        {activeTab === 'policies' ? (
          <button
            type="button"
            role="tab"
            id={policiesTabId}
            aria-controls={policiesPanelId}
            aria-selected="true"
            tabIndex={0}
            onClick={() => setActiveTab('policies')}
            className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
          >
            <FileCheck className="size-3 mr-1.5" /> Policy Compliance
          </button>
        ) : (
          <button
            type="button"
            role="tab"
            id={policiesTabId}
            aria-controls={policiesPanelId}
            aria-selected="false"
            tabIndex={-1}
            onClick={() => setActiveTab('policies')}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            <FileCheck className="size-3 mr-1.5" /> Policy Compliance
          </button>
        )}
        {activeTab === 'provenance' ? (
          <button
            type="button"
            role="tab"
            id={provenanceTabId}
            aria-controls={provenancePanelId}
            aria-selected="true"
            tabIndex={0}
            onClick={() => {
              setProvenancePage(1);
              setActiveTab('provenance');
            }}
            className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
          >
            <Network className="size-3 mr-1.5" /> Decision Provenance
          </button>
        ) : (
          <button
            type="button"
            role="tab"
            id={provenanceTabId}
            aria-controls={provenancePanelId}
            aria-selected="false"
            tabIndex={-1}
            onClick={() => {
              setProvenancePage(1);
              setActiveTab('provenance');
            }}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            <Network className="size-3 mr-1.5" /> Decision Provenance
          </button>
        )}
      </div>

      {activeTab === 'approvals' && (
        <div role="tabpanel" id={approvalsPanelId} aria-labelledby={approvalsTabId}>
          {/* Summary cards */}
          <section aria-label="Governance summary">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Pending"
                value={counts.pending}
                icon={<Clock className="size-4" />}
                trend={counts.pending > 0 ? 'down' : 'neutral'}
              />
              <MetricCard
                label="Approved"
                value={counts.approved}
                icon={<CheckCircle className="size-4" />}
                trend="up"
              />
              <MetricCard
                label="Rejected"
                value={counts.rejected}
                icon={<XCircle className="size-4" />}
                trend="neutral"
              />
              <MetricCard
                label="Total"
                value={counts.total}
                icon={<ShieldCheck className="size-4" />}
                trend="neutral"
              />
            </div>
          </section>

          {/* Pending approvals */}
          <section aria-label="Pending approvals">
            <Heading level={2} className="mb-3">
              <AlertTriangle className="size-4 inline mr-2" />
              Pending Approvals
            </Heading>
            {pendingApprovals.length === 0 ? (
              <EmptyState
                icon={<CheckCircle className="size-12" />}
                title="No pending approvals"
                description="All approval requests have been handled."
              />
            ) : (
              <DataTable
                columns={pendingColumns}
                data={pendingApprovals}
                enableSorting
                emptyTitle="No pending approvals"
              />
            )}
          </section>

          {/* Approval history */}
          <section aria-label="Approval history">
            <Heading level={2} className="mb-3">
              <Clock className="size-4 inline mr-2" />
              Approval History
            </Heading>
            {historyApprovals.length === 0 ? (
              <EmptyState
                icon={<Clock className="size-12" />}
                title="No history yet"
                description="Approval history will appear after requests are decided."
              />
            ) : (
              <DataTable
                columns={historyColumns}
                data={historyApprovals}
                enableSorting
                enablePagination
                emptyTitle="No history"
              />
            )}
          </section>
        </div>
      )}

      {activeTab === 'policies' && (
        <div role="tabpanel" id={policiesPanelId} aria-labelledby={policiesTabId}>
          <Suspense fallback={<Spinner label="Loading policy panel…" />}>
            <PolicyCompliancePanel />
          </Suspense>
        </div>
      )}

      {activeTab === 'provenance' && (
        <section
          aria-label="Decision provenance"
          className="space-y-4"
          role="tabpanel"
          id={provenancePanelId}
          aria-labelledby={provenanceTabId}
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 min-w-45">
              <Text
                id="governance-provenance-actor-label"
                className="text-xs uppercase tracking-wide text-muted-foreground"
              >
                Actor
              </Text>
              <select
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                aria-labelledby="governance-provenance-actor-label"
                aria-label="Actor"
                value={provenanceActorType}
                onChange={(event) => {
                  setProvenancePage(1);
                  setProvenanceActorType(event.target.value as 'all' | 'human' | 'machine');
                }}
              >
                <option value="all">All actors</option>
                <option value="human">Human</option>
                <option value="machine">Machine</option>
              </select>
            </div>
            <div className="space-y-1 min-w-55">
              <Text
                id="governance-provenance-decision-label"
                className="text-xs uppercase tracking-wide text-muted-foreground"
              >
                Decision Type
              </Text>
              <select
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
                aria-labelledby="governance-provenance-decision-label"
                aria-label="Decision Type"
                value={provenanceDecisionType}
                onChange={(event) => {
                  setProvenancePage(1);
                  setProvenanceDecisionType(
                    event.target.value as
                      | 'all'
                      | 'human_override'
                      | 'approval'
                      | 'policy_exception'
                      | 'gate_failure'
                      | 'error'
                  );
                }}
              >
                <option value="all">All decisions</option>
                <option value="human_override">Human override</option>
                <option value="approval">Approval</option>
                <option value="policy_exception">Policy exception</option>
                <option value="gate_failure">Gate failure</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>

          {provenanceQuery.isLoading ? (
            <Spinner label="Loading decision provenance…" />
          ) : provenanceQuery.isError ? (
            <AlertBanner variant="warning">
              Failed to load provenance feed: {(provenanceQuery.error as Error).message}
            </AlertBanner>
          ) : (
            <>
              <DecisionProvenanceView items={provenanceQuery.data?.items ?? []} />
              <div className="flex items-center justify-between">
                <Text muted className="text-xs">
                  Showing {provenanceQuery.data?.count ?? 0} of {provenanceQuery.data?.total ?? 0}{' '}
                  events
                </Text>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProvenancePage((p) => Math.max(1, p - 1))}
                    disabled={provenancePage <= 1 || provenanceQuery.isFetching}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setProvenancePage((p) => p + 1)}
                    disabled={
                      provenanceQuery.isFetching ||
                      (provenanceQuery.data?.page_size ?? 20) * provenancePage >=
                        (provenanceQuery.data?.total ?? 0)
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
