/**
 * Governance dashboard column definitions.
 * Extracted from governance-dashboard-page (M15-009).
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ApprovalEntry } from '@/lib/api-types';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, XCircle } from 'lucide-react';
import { statusVariant } from './constants';

export interface PendingColumnDeps {
  rejectingId: string | null;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  setRejectingId: (v: string | null) => void;
  approveMutation: { isPending: boolean; mutate: (p: { id: string }) => void };
  rejectMutation: { isPending: boolean; mutate: (p: { id: string; reason: string }) => void };
}

export function getPendingColumns(deps: PendingColumnDeps): ColumnDef<ApprovalEntry, unknown>[] {
  const {
    rejectingId,
    rejectReason,
    setRejectReason,
    setRejectingId,
    approveMutation,
    rejectMutation,
  } = deps;

  return [
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
}

export const historyColumns: ColumnDef<ApprovalEntry, unknown>[] = [
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
