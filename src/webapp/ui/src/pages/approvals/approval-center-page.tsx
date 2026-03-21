/**
 * Approval Center Page — dedicated approval queue with inline decision context panel.
 * UI-011 / Phase 4 — #775
 * Replaces the split between Governance dashboard and Cockpit approval detail
 * with a single page: list on the left, decision context on the right.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/ui/metric-card';
import { PageShell } from '@/components/ui/page-shell';
import { QueueTriageList, type QueueTriageItem } from '@/components/ui/queue-triage-list';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { useApprovals, useApproveRequest, useRejectRequest, useApprovalDetail } from '@/hooks';
import type { ApprovalEntry } from '@/lib/api-types';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

/* ── Status badge mapping ── */
const statusVariant: Record<string, 'success' | 'warning' | 'secondary'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'secondary',
};

/* ── Decision context panel ── */
function ApprovalDecisionPanel({
  approvalId,
  onClose,
}: {
  approvalId: string;
  onClose: () => void;
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  const { data, isLoading, error, refetch } = useApprovalDetail(approvalId);
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();

  const approval = data?.approval;

  async function handleApprove() {
    setActionError('');
    try {
      await approveMutation.mutateAsync({ id: approvalId, reason: 'Approved via Approval Center' });
      onClose();
    } catch {
      setActionError('Failed to approve. Please try again.');
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setActionError('A rejection reason is required.');
      return;
    }
    setActionError('');
    try {
      await rejectMutation.mutateAsync({ id: approvalId, reason: rejectReason });
      onClose();
    } catch {
      setActionError('Failed to reject. Please try again.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading approval detail…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load detail: {(error as Error).message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3 mr-1" /> Retry
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="p-4">
        <EmptyState
          icon={<ShieldCheck className="size-8" />}
          title="Approval not found"
          description="The approval detail could not be loaded."
        />
      </div>
    );
  }

  const isPending = approval.status === 'PENDING';

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="approval-decision-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{approval.gate_id}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {approval.stage} · Requested by {approval.requested_by}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close detail panel">
          ✕
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={statusVariant[approval.status] ?? 'secondary'}>{approval.status}</Badge>
        <Badge variant="info">{approval.required_role}</Badge>
      </div>

      {/* Context fields */}
      <Card elevation="flat" className="p-3 bg-muted/40 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Approval ID</span>
          <span className="font-mono text-xs">{approval.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Entity</span>
          <span className="font-mono text-xs">{approval.entity_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Requested</span>
          <span>{new Date(approval.requested_at).toLocaleString()}</span>
        </div>
      </Card>

      {/* Risk assessment if available */}
      {'risk_level' in approval && (approval as { risk_level?: string }).risk_level && (
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="size-4 text-warning" aria-hidden="true" />
          <span>
            Risk level:{' '}
            <span className="font-medium">{(approval as { risk_level?: string }).risk_level}</span>
          </span>
        </div>
      )}

      {actionError && (
        <AlertBanner variant="error">
          <span className="text-sm">{actionError}</span>
        </AlertBanner>
      )}

      {isPending && (
        <div className="space-y-3">
          <div>
            <label htmlFor="reject-reason" className="block text-sm font-medium mb-1">
              Rejection reason (required to reject)
            </label>
            <textarea
              id="reject-reason"
              className="w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm min-h-[80px] resize-y"
              placeholder="Describe why this approval is being rejected…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="flex-1"
            >
              {approveMutation.isPending ? (
                <Spinner label="" />
              ) : (
                <CheckCircle className="size-4 mr-1" />
              )}
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              className="flex-1"
            >
              {rejectMutation.isPending ? (
                <Spinner label="" />
              ) : (
                <XCircle className="size-4 mr-1" />
              )}
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Approval row ── */
function ApprovalRow({
  approval,
  isSelected,
  onSelect,
}: {
  approval: ApprovalEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={[
        'w-full text-left p-3 rounded-xl border transition-colors',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border/60 bg-card hover:border-border hover:bg-card/80',
      ].join(' ')}
      onClick={onSelect}
      aria-pressed={isSelected}
      data-testid={`approval-row-${approval.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <p className="text-sm font-medium truncate">{approval.gate_id}</p>
          <p className="text-xs text-muted-foreground">
            {approval.stage} · {approval.required_role}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={statusVariant[approval.status] ?? 'secondary'}>{approval.status}</Badge>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {new Date(approval.requested_at).toLocaleString()}
      </p>
    </button>
  );
}

/* ── Main Page ── */
export default function ApprovalCenterPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>(
    'all'
  );
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useApprovals();

  const approvals = useMemo(() => data?.approvals ?? [], [data]);

  const counts = useMemo(() => {
    const pending = approvals.filter((a) => a.status === 'PENDING').length;
    const approved = approvals.filter((a) => a.status === 'APPROVED').length;
    const rejected = approvals.filter((a) => a.status === 'REJECTED').length;
    return { pending, approved, rejected, total: approvals.length };
  }, [approvals]);

  const filteredApprovals = useMemo(() => {
    if (statusFilter === 'all') return approvals;
    return approvals.filter((a) => a.status === statusFilter);
  }, [approvals, statusFilter]);

  const pendingQueueItems = useMemo<QueueTriageItem[]>(
    () =>
      approvals
        .filter((a) => a.status === 'PENDING')
        .slice(0, 3)
        .map((approval) => ({
          id: approval.id,
          title: `${approval.stage} approval`,
          subtitle: `Gate: ${approval.gate_id}`,
          statusLabel: 'PENDING',
          statusTone: 'warning',
          priority: 'high',
          icon: <ShieldCheck className="size-4" />,
          actionLabel: 'Review',
          meta: [
            {
              id: `${approval.id}-role`,
              label: 'Required role',
              value: approval.required_role,
              tone: 'warning',
            },
            {
              id: `${approval.id}-time`,
              label: 'Requested',
              value: new Date(approval.requested_at).toLocaleString(),
            },
          ],
        })),
    [approvals]
  );

  const contextItems = useMemo<ContextStripItem[]>(
    () => [
      {
        id: 'pending',
        label: 'Pending',
        value: String(counts.pending),
        tone: counts.pending > 0 ? 'warning' : 'success',
      },
      { id: 'approved', label: 'Approved', value: String(counts.approved), tone: 'success' },
      { id: 'rejected', label: 'Rejected', value: String(counts.rejected) },
      { id: 'total', label: 'Total', value: String(counts.total) },
      {
        id: 'selected',
        label: 'Selected',
        value: selectedId ?? 'None',
        tone: selectedId ? 'info' : 'neutral',
      },
    ],
    [counts, selectedId]
  );

  return (
    <PageShell
      isLoading={isLoading}
      loadingLabel="Loading approvals…"
      error={error as Error | null}
      onRetry={() => refetch()}
    >
      <div className="p-6 space-y-6" data-testid="approval-center-page">
        <PageHeader
          title="Approval Center"
          subtitle="Single approval queue with inline decision context, risk assessment, and full audit capture."
          chips={[
            { id: 'unified-approvals', label: 'Unified queue', tone: 'info' },
            { id: 'rbac', label: 'Role-restricted' },
            { id: 'audit', label: 'Audit-captured' },
          ]}
        />

        <ContextStrip items={contextItems} />

        <MissionControlHero
          eyebrow="Approval Center"
          title="Review, decide, and capture approvals without switching between tools"
          description="Pending approvals, their context, risk levels, and decision options are available in one surface. Every decision is audit-captured with the actor, reason, and timestamp to support governance reviews."
          badges={
            <>
              <ControlSignalBadge signal="governed" />
              <Badge variant="outline">Approval queue</Badge>
              {counts.pending > 0 && <ControlSignalBadge signal="blocked" />}
            </>
          }
          metrics={[
            { label: 'Pending', value: String(counts.pending), detail: 'Awaiting decision' },
            { label: 'Approved', value: String(counts.approved), detail: 'Completed decisions' },
            { label: 'Total', value: String(counts.total), detail: 'In this scope' },
          ]}
          motifs={
            <>
              <StatusMotif
                kind="governance"
                title="Decisions are audit-captured"
                description="Every approve or reject action records the actor, reason, and timestamp as an immutable governance event."
              />
              <StatusMotif
                kind="human-loop"
                title="Context is inline"
                description="Risk level, impacted entity, required role, and evidence links are shown alongside the decision options."
              />
              <StatusMotif
                kind="agent"
                title="Pending items surface first"
                description="The queue prioritises pending approvals so operators can work through outstanding items without manual filtering."
              />
            </>
          }
          asideTitle="Queue controls"
          asideDescription="Refresh the approval list, filter by status, and review full detail by selecting an item."
          asideContent={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-4 mr-1" /> Refresh
            </Button>
          }
        />

        {/* Pending triage queue */}
        {pendingQueueItems.length > 0 && (
          <QueueTriageList
            title="Pending approvals requiring decision"
            description="These approvals are blocking governed run progression and require explicit human review."
            items={pendingQueueItems}
            emptyTitle="No pending approvals"
            emptyDescription="All approvals have been decided."
          />
        )}

        {/* Metrics */}
        <section aria-label="Approval metrics">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total"
              value={counts.total}
              icon={<ShieldCheck className="size-4" />}
              trend="neutral"
            />
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
              trend="neutral"
            />
            <MetricCard
              label="Rejected"
              value={counts.rejected}
              icon={<XCircle className="size-4" />}
              trend="neutral"
            />
          </div>
        </section>

        {/* Status filter */}
        <div
          className="flex items-center gap-2 flex-wrap"
          role="group"
          aria-label="Filter approvals by status"
        >
          {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
            >
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>

        {/* Main split layout: approval list + detail panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 items-start">
          {/* Approval list */}
          <section aria-label="Approval list">
            {filteredApprovals.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="size-8" />}
                title="No approvals"
                description={
                  statusFilter === 'all'
                    ? 'No approvals found.'
                    : `No ${statusFilter.toLowerCase()} approvals.`
                }
              />
            ) : (
              <div className="space-y-2">
                {filteredApprovals.map((approval) => (
                  <ApprovalRow
                    key={approval.id}
                    approval={approval}
                    isSelected={selectedId === approval.id}
                    onSelect={() => setSelectedId(selectedId === approval.id ? null : approval.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Decision context panel */}
          {selectedId && (
            <aside aria-label="Approval decision context" className="lg:sticky lg:top-6">
              <Card elevation="flat" className="border border-border/60">
                <ApprovalDecisionPanel
                  approvalId={selectedId}
                  onClose={() => setSelectedId(null)}
                />
              </Card>
            </aside>
          )}

          {!selectedId && (
            <aside className="hidden lg:flex items-center justify-center p-8 rounded-xl border border-dashed border-border/60 text-muted-foreground text-sm">
              Select an approval to view decision context
            </aside>
          )}
        </div>

        {/* Full detail link */}
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => navigate('/cockpit')}>
            Open full Cockpit view
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
