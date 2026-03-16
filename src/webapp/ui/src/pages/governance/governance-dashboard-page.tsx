/**
 * Governance dashboard page — pending approvals, compliance, history.
 * M10 / Issue #394
 */
import { useState, useMemo } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MetricCard } from '@/components/ui/metric-card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { useApprovals, useApproveRequest, useRejectRequest } from '@/hooks';
import type { ApprovalEntry } from '@/lib/api-types';
import type { ColumnDef } from '@tanstack/react-table';
import { ShieldCheck, CheckCircle, XCircle, Clock, AlertTriangle, Shield } from 'lucide-react';

/* ── Status badge mapping ── */
const statusVariant: Record<string, 'warning' | 'success' | 'error' | 'secondary'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  EXPIRED: 'secondary',
};

/* ── Main Page ── */
export default function GovernanceDashboardPage() {
  const { data, isLoading } = useApprovals();
  const approveMutation = useApproveRequest();
  const rejectMutation = useRejectRequest();
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const approvals = data?.approvals ?? [];

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

  /* ── Table columns ── */
  const pendingColumns: ColumnDef<ApprovalEntry, unknown>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{(getValue() as string).slice(0, 12)}</span>
      ),
    },
    { accessorKey: 'gate_id', header: 'Gate' },
    {
      accessorKey: 'stage',
      header: 'Stage',
      cell: ({ getValue }) => <Badge variant="info">{getValue() as string}</Badge>,
    },
    { accessorKey: 'requested_by', header: 'Requested By' },
    {
      accessorKey: 'requested_at',
      header: 'Requested',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'required_role',
      header: 'Required Role',
      cell: ({ getValue }) => <Badge variant="secondary">{getValue() as string}</Badge>,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const id = row.original.id;
        if (rejectingId === id) {
          return (
            <div className="flex items-center gap-1">
              <Input
                placeholder="Reason…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="h-7 text-xs w-32"
                aria-label="Rejection reason"
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => {
                  rejectMutation.mutate({ id, reason: rejectReason });
                  setRejectingId(null);
                  setRejectReason('');
                }}
              >
                Confirm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason('');
                }}
              >
                Cancel
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate({ id })}
            >
              <CheckCircle className="size-3 mr-1" /> Approve
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRejectingId(id)}>
              <XCircle className="size-3 mr-1" /> Reject
            </Button>
          </div>
        );
      },
    },
  ];

  const historyColumns: ColumnDef<ApprovalEntry, unknown>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{(getValue() as string).slice(0, 12)}</span>
      ),
    },
    { accessorKey: 'gate_id', header: 'Gate' },
    {
      accessorKey: 'stage',
      header: 'Stage',
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
    { accessorKey: 'requested_by', header: 'Requested By' },
    {
      accessorKey: 'requested_at',
      header: 'Timestamp',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{getValue() as string}</span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading governance data…" />
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
  );
}
