/**
 * RootCauseView — drill-down view for gate failures, UNCERTAIN / INSUFFICIENT_DATA items.
 * M27-006 / Root-cause analysis view
 */
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { RootCauseEntry } from '@/lib/api-types';
import {
  AlertTriangle,
  XCircle,
  HelpCircle,
  Lock,
  ChevronRight,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

/* ── Type styling ── */
const typeConfig: Record<
  string,
  { icon: React.ReactNode; label: string; variant: 'error' | 'warning' | 'info' | 'secondary' }
> = {
  gate_failure: {
    icon: <XCircle className="size-4" />,
    label: 'Gate Failure',
    variant: 'error',
  },
  uncertain: {
    icon: <HelpCircle className="size-4" />,
    label: 'UNCERTAIN',
    variant: 'warning',
  },
  insufficient_data: {
    icon: <AlertTriangle className="size-4" />,
    label: 'INSUFFICIENT_DATA',
    variant: 'warning',
  },
  sprint_blocked: {
    icon: <Lock className="size-4" />,
    label: 'Sprint Blocked',
    variant: 'error',
  },
};

const actionTypeLabel: Record<string, string> = {
  questionnaire: 'Open Questionnaire',
  decision: 'Go to Decision',
  document: 'View Document',
  sprint: 'View Sprint',
};

interface RootCauseViewProps {
  items: RootCauseEntry[];
  onNavigate?: (link: string, type: string) => void;
  className?: string;
}

export function RootCauseView({ items, onNavigate, className }: RootCauseViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.summary.toLowerCase().includes(lower) ||
          item.source_agent?.toLowerCase().includes(lower) ||
          item.cause_chain.some((c) => c.toLowerCase().includes(lower))
      );
    }
    if (typeFilter) {
      result = result.filter((item) => item.type === typeFilter);
    }
    return result;
  }, [items, search, typeFilter]);

  const types = useMemo(() => [...new Set(items.map((i) => i.type))], [items]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle className="size-12" />}
        title="No root-cause items"
        description="All gates passed and no data issues detected."
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-4 ${className ?? ''}`} data-testid="root-cause-view">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search root causes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            aria-label="Search root causes"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="size-3 text-muted-foreground" />
          <button
            onClick={() => setTypeFilter(null)}
            className={`px-2 py-1 rounded-md text-[10px] transition-colors ${
              !typeFilter ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            All ({items.length})
          </button>
          {types.map((type) => {
            const cfg = typeConfig[type];
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                className={`px-2 py-1 rounded-md text-[10px] transition-colors ${
                  typeFilter === type
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {cfg?.label ?? type} ({items.filter((i) => i.type === type).length})
              </button>
            );
          })}
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const cfg = typeConfig[item.type] ?? typeConfig.gate_failure;
          const isExpanded = expandedId === item.id;

          return (
            <Card
              key={item.id}
              elevation="flat"
              className={`transition-all ${isExpanded ? 'ring-1 ring-primary/30' : ''}`}
            >
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full text-left p-4 flex items-start gap-3"
                aria-expanded={isExpanded}
              >
                <span
                  className={`shrink-0 mt-0.5 ${cfg.variant === 'error' ? 'text-red-500' : 'text-amber-500'}`}
                >
                  {cfg.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={cfg.variant} className="text-[10px]">
                      {cfg.label}
                    </Badge>
                    {item.source_agent && (
                      <Badge variant="secondary" className="text-[10px]">
                        Agent: {item.source_agent}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{item.summary}</p>
                </div>
                <ChevronRight
                  className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t pt-3 ml-7">
                  {/* Cause chain */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Cause Chain</p>
                    <ol className="space-y-1">
                      {item.cause_chain.map((cause, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className="shrink-0 text-muted-foreground font-mono">{i + 1}.</span>
                          <span>{cause}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Source info */}
                  {item.source_file && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Source: </span>
                      <span className="font-mono">
                        {item.source_file}
                        {item.source_line ? `:${item.source_line}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Actionable link */}
                  {item.actionable_link && item.actionable_type && (
                    <button
                      onClick={() => onNavigate?.(item.actionable_link!, item.actionable_type!)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      {actionTypeLabel[item.actionable_type] ?? 'Navigate'}
                    </button>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items match your filters.
          </p>
        )}
      </div>
    </div>
  );
}
