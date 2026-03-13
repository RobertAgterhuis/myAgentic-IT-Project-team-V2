/**
 * Decisions page — filter bar, lifecycle flow, detail views.
 * Issue #243 (S9G-36)
 */
import { useState, useMemo, useCallback } from 'react';
import { Heading, Text } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { InputField } from '@/components/ui/input-field';
import { FormRow } from '@/components/ui/form-row';
import {
  useDecisions,
  useCreateDecision,
  useUpdateDecision,
  useDeleteDecision,
} from '@/hooks';
import type {
  OpenDecision,
  DecidedDecision,
  DeferredDecision,
  DecisionPriority,
} from '@/lib/api-types';
import type { ColumnDef } from '@tanstack/react-table';
import { Scale, Plus, Filter, ArrowRight, Trash2 } from 'lucide-react';

/* ── Types ── */
type DecisionItem =
  | (OpenDecision & { _kind: 'open' })
  | (DecidedDecision & { _kind: 'decided' })
  | (DeferredDecision & { _kind: 'deferred' });

type StatusFilter = 'all' | 'open' | 'decided' | 'deferred';

/* ── Badge mapping ── */
const statusBadge: Record<string, 'warning' | 'success' | 'secondary' | 'error'> = {
  OPEN: 'warning',
  DECIDED: 'success',
  DEFERRED: 'secondary',
  EXPIRED: 'error',
};

const priorityBadge: Record<string, 'error' | 'warning' | 'info'> = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'info',
};

/* ── Lifecycle visualization ── */
function LifecycleFlow({ status }: { status: string }) {
  const steps = ['OPEN', 'DECIDED'];
  const currentIdx = steps.indexOf(status);

  return (
    <div className="flex items-center gap-1 text-xs" aria-label={`Lifecycle: ${status}`}>
      {steps.map((step, i) => (
        <span key={step} className="flex items-center gap-1">
          <Badge
            variant={i <= currentIdx ? 'success' : 'secondary'}
            className="text-[10px] px-1.5"
          >
            {step}
          </Badge>
          {i < steps.length - 1 && (
            <ArrowRight className="size-3 text-muted-foreground" />
          )}
        </span>
      ))}
    </div>
  );
}

/* ── Create dialog ── */
function CreateDecisionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateDecision();
  const [scope, setScope] = useState('');
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<DecisionPriority>('MEDIUM');

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return;
    create.mutate(
      { action: 'create', type: 'OPEN_QUESTION', priority, scope: scope.trim(), text: text.trim() },
      { onSuccess: () => { onOpenChange(false); setScope(''); setText(''); } },
    );
  }, [create, text, scope, priority, onOpenChange]);

  return (
    <ModalDialog
      title="New Decision"
      open={open}
      onOpenChange={onOpenChange}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!text.trim() || create.isPending} loading={create.isPending}>
            Create
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <InputField label="Question / Decision" value={text} onChange={(e) => setText(e.target.value)} placeholder="What needs to be decided?" />
        <InputField label="Scope" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="e.g., architecture, ux, business" />
        <FormRow label="Priority">
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value as DecisionPriority)}
          >
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </FormRow>
      </div>
    </ModalDialog>
  );
}

/* ── Columns ── */
function getColumns(
  onAction: (item: DecisionItem, action: string) => void,
): ColumnDef<DecisionItem, unknown>[] {
  return [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row) => row.status,
      cell: ({ row }) => (
        <Badge variant={statusBadge[row.original.status] ?? 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      accessorFn: (row) => ('priority' in row ? row.priority : '—'),
      cell: ({ row }) => {
        const p = 'priority' in row.original ? row.original.priority : null;
        return p ? <Badge variant={priorityBadge[p] ?? 'info'}>{p}</Badge> : <span>—</span>;
      },
    },
    {
      accessorKey: 'scope',
      header: 'Scope',
    },
    {
      id: 'text',
      header: 'Subject',
      accessorFn: (row) => {
        if (row._kind === 'open') return row.question;
        if (row._kind === 'decided') return row.decision;
        return row.subject;
      },
      cell: ({ getValue }) => (
        <span className="line-clamp-2 max-w-[300px]">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) => <span className="text-xs">{getValue() as string}</span>,
    },
    {
      id: 'lifecycle',
      header: 'Lifecycle',
      cell: ({ row }) => <LifecycleFlow status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original._kind === 'open' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(row.original, 'decide')}
              aria-label={`Decide ${row.original.id}`}
            >
              Decide
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAction(row.original, 'delete')}
            aria-label={`Delete ${row.original.id}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}

/* ── Main Page ── */
export default function DecisionsPage() {
  const { data, isLoading } = useDecisions();
  const updateDecision = useUpdateDecision();
  const deleteDecision = useDeleteDecision();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showCreate, setShowCreate] = useState(false);

  // Flatten decisions into a single list
  const allDecisions: DecisionItem[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.open.map((d) => ({ ...d, _kind: 'open' as const })),
      ...data.decided.map((d) => ({ ...d, _kind: 'decided' as const })),
      ...data.deferred.map((d) => ({ ...d, _kind: 'deferred' as const })),
    ];
  }, [data]);

  // Filtered list
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return allDecisions;
    return allDecisions.filter((d) => d._kind === statusFilter);
  }, [allDecisions, statusFilter]);

  // Action handler
  const handleAction = useCallback(
    (item: DecisionItem, action: string) => {
      if (action === 'delete') {
        deleteDecision.mutate(item.id);
      } else if (action === 'decide' && item._kind === 'open') {
        updateDecision.mutate({ action: 'decide', id: item.id });
      }
    },
    [deleteDecision, updateDecision],
  );

  const columns = useMemo(() => getColumns(handleAction), [handleAction]);

  // Stats
  const stats = useMemo(() => ({
    total: allDecisions.length,
    open: data?.open.length ?? 0,
    decided: data?.decided.length ?? 0,
    deferred: data?.deferred.length ?? 0,
  }), [allDecisions.length, data]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading decisions…" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="decisions-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Heading level={1}>Decisions</Heading>
          <Text muted>Track project decisions through their lifecycle</Text>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-2" />
          New Decision
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {(['total', 'open', 'decided', 'deferred'] as const).map((key) => (
          <Card key={key} elevation="flat" className="p-4 text-center">
            <Text muted className="text-xs capitalize">{key}</Text>
            <p className="text-2xl font-bold">{stats[key]}</p>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2" role="toolbar" aria-label="Decision filters">
        <Filter className="size-4 text-muted-foreground" />
        {(['all', 'open', 'decided', 'deferred'] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={statusFilter === f ? 'default' : 'outline'}
            onClick={() => setStatusFilter(f)}
            aria-pressed={statusFilter === f}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Table */}
      {allDecisions.length === 0 ? (
        <EmptyState
          icon={<Scale className="size-12" />}
          title="No decisions yet"
          description="Create your first decision to track project choices."
          action={{ label: 'New Decision', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          enableSorting
          enableFiltering
          filterPlaceholder="Search decisions…"
          enablePagination
          emptyTitle="No matching decisions"
          emptyDescription="Try adjusting your filters."
        />
      )}

      {/* Create Dialog */}
      <CreateDecisionDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
