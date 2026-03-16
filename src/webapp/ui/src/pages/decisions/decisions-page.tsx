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
import { LifecycleFlow } from '@/components/decisions/lifecycle-flow';
import { CreateDecisionDialog } from '@/components/decisions/create-decision-dialog';
import { getColumns } from './columns';
import { statusBadge, priorityBadge } from './constants';
import type { DecisionItem, StatusFilter } from './types';
import { useDecisions, useUpdateDecision, useDeleteDecision } from '@/hooks';
import { Scale, Plus, Filter, X } from 'lucide-react';

/* ── Decision Detail Dialog ── */
function DecisionDetailDialog({
  decision,
  onClose,
}: {
  decision: DecisionItem | null;
  onClose: () => void;
}) {
  if (!decision) return null;

  const subject =
    decision._kind === 'open'
      ? decision.question
      : decision._kind === 'decided'
        ? decision.decision
        : decision.subject;

  return (
    <ModalDialog
      title={`Decision ${decision.id}`}
      description={subject}
      open={!!decision}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4" data-testid="decision-detail">
        {/* Status & Priority */}
        <div className="flex items-center gap-3">
          <Badge variant={statusBadge[decision.status] ?? 'secondary'}>{decision.status}</Badge>
          {'priority' in decision && decision.priority && (
            <Badge variant={priorityBadge[decision.priority] ?? 'info'}>{decision.priority}</Badge>
          )}
          <LifecycleFlow status={decision.status} />
        </div>

        {/* Core fields */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Text muted className="text-xs">
              Scope
            </Text>
            <p className="font-medium">{decision.scope || '—'}</p>
          </div>
          <div>
            <Text muted className="text-xs">
              Date
            </Text>
            <p className="font-medium">{decision.date}</p>
          </div>
          {'category' in decision && decision.category && (
            <div>
              <Text muted className="text-xs">
                Category
              </Text>
              <p className="font-medium">{decision.category}</p>
            </div>
          )}
        </div>

        {/* Context — question text for open, decision text for decided */}
        <div>
          <Text muted className="text-xs">
            {decision._kind === 'open'
              ? 'Question'
              : decision._kind === 'decided'
                ? 'Decision'
                : 'Subject'}
          </Text>
          <p className="mt-1">{subject}</p>
        </div>

        {/* Rationale / Notes */}
        {decision._kind === 'open' && decision.answer && (
          <div>
            <Text muted className="text-xs">
              Answer
            </Text>
            <p className="mt-1">{decision.answer}</p>
          </div>
        )}
        {decision._kind === 'decided' && decision.notes && (
          <div>
            <Text muted className="text-xs">
              Rationale
            </Text>
            <p className="mt-1">{decision.notes}</p>
          </div>
        )}
        {decision._kind === 'deferred' && decision.reason && (
          <div>
            <Text muted className="text-xs">
              Reason for Deferral
            </Text>
            <p className="mt-1">{decision.reason}</p>
          </div>
        )}
      </div>
    </ModalDialog>
  );
}

/* ── Main Page ── */
export default function DecisionsPage() {
  const { data, isLoading } = useDecisions();
  const updateDecision = useUpdateDecision();
  const deleteDecision = useDeleteDecision();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<DecisionItem | null>(null);

  // Flatten decisions into a single list
  const allDecisions: DecisionItem[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.open.map((d) => ({ ...d, _kind: 'open' as const })),
      ...data.decided.map((d) => ({ ...d, _kind: 'decided' as const })),
      ...data.deferred.map((d) => ({ ...d, _kind: 'deferred' as const })),
    ];
  }, [data]);

  // Unique scopes for category filter
  const scopes = useMemo(() => {
    const set = new Set(allDecisions.map((d) => d.scope).filter(Boolean));
    return Array.from(set).sort();
  }, [allDecisions]);

  // Filtered list
  const filtered = useMemo(() => {
    let result = allDecisions;
    if (statusFilter !== 'all') {
      result = result.filter((d) => d._kind === statusFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((d) => d.scope === categoryFilter);
    }
    if (dateFrom) {
      result = result.filter((d) => d.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((d) => d.date <= dateTo);
    }
    return result;
  }, [allDecisions, statusFilter, categoryFilter, dateFrom, dateTo]);

  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all' || dateFrom || dateTo;

  const clearFilters = useCallback(() => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setDateFrom('');
    setDateTo('');
  }, []);

  // Action handler
  const handleAction = useCallback(
    (item: DecisionItem, action: string) => {
      if (action === 'delete') {
        deleteDecision.mutate(item.id);
      } else if (action === 'decide' && item._kind === 'open') {
        updateDecision.mutate({ action: 'decide', id: item.id });
      }
    },
    [deleteDecision, updateDecision]
  );

  const columns = useMemo(() => getColumns(handleAction, setSelectedDecision), [handleAction]);

  // Stats
  const stats = useMemo(
    () => ({
      total: allDecisions.length,
      open: data?.open.length ?? 0,
      decided: data?.decided.length ?? 0,
      deferred: data?.deferred.length ?? 0,
    }),
    [allDecisions.length, data]
  );

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
            <Text muted className="text-xs capitalize">
              {key}
            </Text>
            <p className="text-2xl font-bold">{stats[key]}</p>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="toolbar"
        aria-label="Decision filters"
      >
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

        <span className="mx-1 h-5 w-px bg-border" />

        {/* Category filter */}
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All scopes</option>
          {scopes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {/* Date range */}
        <input
          type="date"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="Date from"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <input
          type="date"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="Date to"
        />

        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters} aria-label="Clear all filters">
            <X className="size-3.5 mr-1" />
            Clear
          </Button>
        )}
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

      {/* Detail Dialog */}
      <DecisionDetailDialog decision={selectedDecision} onClose={() => setSelectedDecision(null)} />
    </div>
  );
}
