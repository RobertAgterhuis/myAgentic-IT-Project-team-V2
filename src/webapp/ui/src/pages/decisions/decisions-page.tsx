/**
 * Decisions page — filter bar, lifecycle flow, detail views.
 * Issue #243 (S9G-36)
 */
import { useState, useMemo, useCallback } from 'react';
import { Text } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { MissionControlHero } from '@/components/ui/mission-control-hero';
import { StatusMotif } from '@/components/ui/status-motif';
import { ControlSignalBadge } from '@/components/ui/control-signal';
import { PageHeader } from '@/components/layout/page-header';
import { ContextStrip, type ContextStripItem } from '@/components/layout/context-strip';
import { LifecycleFlow } from '@/components/decisions/lifecycle-flow';
import { CreateDecisionDialog } from '@/components/decisions/create-decision-dialog';
import { RelatedDecisionsPanel } from '@/components/decisions/related-decisions-panel';
import { getColumns } from './columns';
import { statusBadge, priorityBadge } from './constants';
import { getDecisionSubject } from './presentation';
import type { DecisionItem, StatusFilter } from './types';
import { useDecisions, useUpdateDecision, useDeleteDecision } from '@/hooks';
import { Scale, Plus, Filter, X, RefreshCw } from 'lucide-react';

type EditableDecision = Extract<DecisionItem, { _kind: 'decided' }>;

function EditDecisionDialog({
  decision,
  onClose,
}: {
  decision: EditableDecision | null;
  onClose: () => void;
}) {
  const updateDecision = useUpdateDecision();
  const [text, setText] = useState('');
  const [scope, setScope] = useState('');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');
  const [notes, setNotes] = useState('');

  useMemo(() => {
    if (!decision) return;
    setText(decision.decision);
    setScope(decision.scope);
    setPriority(decision.priority);
    setNotes(decision.notes ?? '');
  }, [decision]);

  if (!decision) return null;

  return (
    <ModalDialog
      title={`Edit ${decision.id}`}
      description="Update the stored decision text, scope, priority, and notes."
      open={!!decision}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!text.trim()) return;
              updateDecision.mutate(
                {
                  action: 'edit',
                  id: decision.id,
                  text: text.trim(),
                  scope: scope.trim(),
                  priority,
                  notes: notes.trim(),
                },
                { onSuccess: () => onClose() }
              );
            }}
            disabled={!text.trim() || updateDecision.isPending}
            loading={updateDecision.isPending}
          >
            Save changes
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium" htmlFor="decision-text">
            Decision
          </label>
          <textarea
            id="decision-text"
            className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Describe the actual decision"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="decision-scope">
              Scope
            </label>
            <input
              id="decision-scope"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              placeholder="e.g. business, architecture"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="decision-priority">
              Priority
            </label>
            <select
              id="decision-priority"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={priority}
              onChange={(event) => setPriority(event.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
            >
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm font-medium" htmlFor="decision-notes">
            Notes
          </label>
          <textarea
            id="decision-notes"
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional rationale or implementation notes"
          />
        </div>
      </div>
    </ModalDialog>
  );
}

/* ── Decision Detail Dialog ── */
function DecisionDetailDialog({
  decision,
  onClose,
  onOpenDecision,
}: {
  decision: DecisionItem | null;
  onClose: () => void;
  onOpenDecision: (decisionId: string) => void;
}) {
  if (!decision) return null;

  const subject = getDecisionSubject(decision);

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

        <RelatedDecisionsPanel
          query={subject}
          excludeDecisionId={decision.id}
          onOpenDecision={onOpenDecision}
          emptyHint="No decision subject is available to retrieve similar past decisions."
          testId="related-decisions-panel-detail"
        />
      </div>
    </ModalDialog>
  );
}

/* ── Main Page ── */
export default function DecisionsPage() {
  const { data, isLoading, error, refetch } = useDecisions();
  const updateDecision = useUpdateDecision();
  const deleteDecision = useDeleteDecision();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<DecisionItem | null>(null);
  const [editingDecision, setEditingDecision] = useState<EditableDecision | null>(null);

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
      } else if (action === 'edit' && item._kind === 'decided') {
        setEditingDecision(item);
      } else if (action === 'decide' && item._kind === 'open') {
        updateDecision.mutate({ action: 'decide', id: item.id });
      }
    },
    [deleteDecision, updateDecision]
  );

  const openDecisionById = useCallback(
    (decisionId: string) => {
      const target = allDecisions.find((decision) => decision.id === decisionId) || null;
      if (!target) return;
      setShowCreate(false);
      setEditingDecision(null);
      setSelectedDecision(target);
    },
    [allDecisions]
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

  const contextItems: ContextStripItem[] = [
    {
      id: 'decision-open',
      label: 'Open questions',
      value: String(stats.open),
      tone: stats.open > 0 ? 'warning' : 'success',
    },
    {
      id: 'decision-decided',
      label: 'Decided',
      value: String(stats.decided),
      tone: stats.decided > 0 ? 'info' : 'neutral',
    },
    {
      id: 'decision-filter',
      label: 'Active filter',
      value: statusFilter === 'all' ? 'None' : statusFilter,
      tone: statusFilter === 'all' ? 'neutral' : 'info',
    },
    {
      id: 'decision-visible',
      label: 'Visible rows',
      value: String(filtered.length),
      tone: filtered.length > 0 ? 'neutral' : 'warning',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Spinner label="Loading decisions…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <AlertBanner variant="error">
          <div className="flex items-center justify-between gap-4 w-full">
            <span>Failed to load decisions: {(error as Error).message}</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="size-3 mr-1.5" /> Retry
            </Button>
          </div>
        </AlertBanner>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="decisions-page">
      <PageHeader
        title="Decisions"
        subtitle="Track open questions, resolved choices, and deferred decisions as governed delivery records."
        chips={[
          {
            id: 'decision-chip-open',
            label: `${stats.open} open`,
            tone: stats.open > 0 ? 'warning' : 'success',
          },
          {
            id: 'decision-chip-decided',
            label: `${stats.decided} decided`,
            tone: 'info',
          },
          {
            id: 'decision-chip-deferred',
            label: `${stats.deferred} deferred`,
            tone: stats.deferred > 0 ? 'warning' : 'default',
          },
        ]}
        actions={
          <Button className="motion-transition-base" onClick={() => setShowCreate(true)}>
            <Plus className="size-4 mr-1.5" /> New Decision
          </Button>
        }
      />

      <ContextStrip items={contextItems} />

      <MissionControlHero
        heroId="decisions"
        eyebrow="Decision ledger"
        title="Treat decisions as governed delivery objects, not scattered notes"
        description="The decision surface keeps open questions, resolved choices, and deferred items in one evidence trail so teams can see where human judgment is still shaping the outcome."
        badges={
          <>
            <ControlSignalBadge signal="governed" />
            {stats.open > 0 && <ControlSignalBadge signal="needs-human-input" />}
            <Badge variant="outline">Decisions</Badge>
          </>
        }
        metrics={[
          { label: 'Total', value: String(stats.total), detail: 'Visible decision records' },
          { label: 'Open', value: String(stats.open), detail: 'Questions awaiting a human answer' },
          {
            label: 'Decided',
            value: String(stats.decided),
            detail: 'Resolved choices with rationale',
          },
          {
            label: 'Deferred',
            value: String(stats.deferred),
            detail: 'Choices postponed for later',
          },
        ]}
        motifs={
          <>
            <StatusMotif
              kind="governance"
              title="Decision history stays auditable"
              description="Open, decided, and deferred states are all visible in one governed lifecycle."
            />
            <StatusMotif
              kind="agent"
              title="Agents can escalate here safely"
              description="When automation reaches uncertainty, this page becomes the controlled handoff for a human choice."
            />
            <StatusMotif
              kind="human-loop"
              title="Human judgment is preserved as evidence"
              description="Answers, rationale, and deferrals remain attached to the delivery record instead of disappearing in chat."
            />
          </>
        }
        asideTitle="Decision rule"
        asideDescription="Use open items to unblock active work, then keep decided items clean so later phases inherit clear rationale instead of ambiguity."
        asideContent={
          <div className="space-y-3">
            <Button className="w-full justify-between" onClick={() => setShowCreate(true)}>
              <span className="inline-flex items-center gap-2">
                <Plus className="size-4" />
                New Decision
              </span>
              <span className="text-xs opacity-80">Record choice</span>
            </Button>
          </div>
        }
      />

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
      <CreateDecisionDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onOpenDecision={openDecisionById}
      />

      {/* Detail Dialog */}
      <DecisionDetailDialog
        decision={selectedDecision}
        onClose={() => setSelectedDecision(null)}
        onOpenDecision={openDecisionById}
      />

      {/* Edit Dialog */}
      <EditDecisionDialog decision={editingDecision} onClose={() => setEditingDecision(null)} />
    </div>
  );
}
