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
import { Button } from '@/components/ui/button';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { getPendingColumns, historyColumns } from './columns';
import { useApprovals, useApproveRequest, useRejectRequest } from '@/hooks';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileCheck,
} from 'lucide-react';

const PolicyCompliancePanel = lazy(() => import('./policy-compliance-panel'));

/* ── Main Page ── */
export default function GovernanceDashboardPage() {
  const { data, isLoading, error, refetch } = useApprovals();
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'approvals' | 'policies'>('approvals');

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
            label: 'Policy coverage',
            value: activeTab === 'policies' ? 'Live' : 'Ready',
            detail: 'Policy tab available for deeper review',
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
                {activeTab === 'approvals' ? 'Approval operations' : 'Policy compliance review'}
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
        <Button
          variant={activeTab === 'approvals' ? 'default' : 'ghost'}
          size="sm"
          role="tab"
          aria-selected={activeTab === 'approvals'}
          onClick={() => setActiveTab('approvals')}
        >
          <ShieldCheck className="size-3 mr-1.5" /> Approvals
        </Button>
        <Button
          variant={activeTab === 'policies' ? 'default' : 'ghost'}
          size="sm"
          role="tab"
          aria-selected={activeTab === 'policies'}
          onClick={() => setActiveTab('policies')}
        >
          <FileCheck className="size-3 mr-1.5" /> Policy Compliance
        </Button>
      </div>

      {activeTab === 'approvals' && (
        <>
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
        </>
      )}

      {activeTab === 'policies' && (
        <Suspense fallback={<Spinner label="Loading policy panel…" />}>
          <PolicyCompliancePanel />
        </Suspense>
      )}
    </div>
  );
}
