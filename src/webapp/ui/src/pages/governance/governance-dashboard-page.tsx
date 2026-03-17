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
import { getPendingColumns, historyColumns } from './columns';
import { useApprovals, useApproveRequest, useRejectRequest } from '@/hooks';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>
            <ShieldCheck className="size-5 inline mr-2" />
            Governance Dashboard
          </Heading>
          <Text muted>Manage approvals, monitor policy compliance, and review history</Text>
        </div>
        <Badge variant="info" className="text-sm">
          <Shield className="size-3 mr-1" /> Mode: Advisory
        </Badge>
      </div>

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
