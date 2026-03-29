/**
 * DependencyGraph — interactive visualization of decision → gate → sprint dependencies.
 * Highlights the critical path and blocking chains.
 * M27-003 / Dependency graph for decisions and gates
 */
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import type { DependencyNode, DependencyEdge } from '@/lib/api-types';
import { GitMerge, ShieldCheck, Zap, ClipboardList, ArrowRight } from 'lucide-react';

/* ── Node styling ── */
const typeIcon: Record<string, React.ReactNode> = {
  decision: <Zap className="size-3" />,
  gate: <ShieldCheck className="size-3" />,
  sprint: <GitMerge className="size-3" />,
  questionnaire: <ClipboardList className="size-3" />,
};

const statusColor: Record<string, string> = {
  resolved: 'border-green-500 bg-green-50 dark:bg-green-950',
  passed: 'border-green-500 bg-green-50 dark:bg-green-950',
  pending: 'border-amber-400 bg-amber-50 dark:bg-amber-950',
  blocked: 'border-red-400 bg-red-50 dark:bg-red-950',
  failed: 'border-red-500 bg-red-50 dark:bg-red-950',
};

const statusBadge: Record<string, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  resolved: 'success',
  passed: 'success',
  pending: 'warning',
  blocked: 'error',
  failed: 'error',
};

interface DependencyGraphProps {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  criticalPath: string[];
  onNodeClick?: (id: string) => void;
  className?: string;
}

export function DependencyGraph({
  nodes,
  edges,
  criticalPath,
  onNodeClick,
  className,
}: DependencyGraphProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const criticalSet = useMemo(() => new Set(criticalPath), [criticalPath]);

  // Group nodes by type for column layout
  const grouped = useMemo(() => {
    const groups: Record<string, DependencyNode[]> = {
      questionnaire: [],
      decision: [],
      gate: [],
      sprint: [],
    };
    for (const n of nodes) {
      (groups[n.type] ?? (groups[n.type] = [])).push(n);
    }
    return groups;
  }, [nodes]);

  const columns = ['questionnaire', 'decision', 'gate', 'sprint'];
  const columnLabels: Record<string, string> = {
    questionnaire: 'Questionnaires',
    decision: 'Decisions',
    gate: 'Gates',
    sprint: 'Sprints',
  };

  // Build adjacency for highlighting connected nodes
  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!adj.has(e.source)) adj.set(e.source, new Set());
      if (!adj.has(e.target)) adj.set(e.target, new Set());
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
    }
    return adj;
  }, [edges]);

  const connectedToSelected = useMemo(() => {
    if (!selectedId) return new Set<string>();
    return adjacency.get(selectedId) ?? new Set<string>();
  }, [selectedId, adjacency]);

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon={<GitMerge className="size-12" />}
        title="No dependency data"
        description="Dependency graph will populate as decisions and gates are created."
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-4 ${className ?? ''}`} data-testid="dependency-graph">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-green-500" /> Resolved / Passed
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-amber-400" /> Pending
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-red-500" /> Blocked / Failed
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-full border-2 border-primary bg-primary/20" /> Critical
          Path
        </span>
      </div>

      {/* Column layout: questionnaire → decision → gate → sprint */}
      <div className="grid grid-cols-4 gap-4 overflow-x-auto">
        {columns.map((type) => (
          <div key={type} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              {typeIcon[type]} {columnLabels[type]}
            </p>
            <div className="space-y-2">
              {(grouped[type] ?? []).map((node) => {
                const isCritical = criticalSet.has(node.id);
                const isSelected = node.id === selectedId;
                const isConnected = connectedToSelected.has(node.id);
                const dimmed = selectedId && !isSelected && !isConnected;

                return (
                  <button
                    key={node.id}
                    onClick={() => {
                      setSelectedId(isSelected ? null : node.id);
                      onNodeClick?.(node.id);
                    }}
                    className={`w-full text-left rounded-lg border-2 p-3 transition-all ${
                      statusColor[node.status] ?? 'border-border bg-card'
                    } ${isCritical ? 'ring-2 ring-primary/40' : ''} ${
                      isSelected ? 'ring-2 ring-primary shadow-md' : ''
                    } ${dimmed ? 'opacity-40' : 'opacity-100'} hover:shadow-sm`}
                    aria-label={`${node.type}: ${node.label}, Status: ${node.status}`}
                  >
                    <div className="flex items-center gap-2">
                      {typeIcon[node.type]}
                      <span className="text-xs font-medium truncate">{node.label}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant={statusBadge[node.status] ?? 'secondary'} className="text-xs">
                        {node.status}
                      </Badge>
                      {isCritical && (
                        <Badge variant="error" className="text-xs">
                          critical path
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
              {(grouped[type] ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground italic px-2">None</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected node edges */}
      {selectedId && (
        <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
          <p className="text-xs font-semibold">
            Connections for: {nodes.find((n) => n.id === selectedId)?.label ?? selectedId}
          </p>
          {edges
            .filter((e) => e.source === selectedId || e.target === selectedId)
            .map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono truncate max-w-30">{e.source}</span>
                <ArrowRight className="size-3 shrink-0" />
                <span className="font-mono truncate max-w-30">{e.target}</span>
                <Badge variant={e.critical ? 'error' : 'secondary'} className="text-xs ml-auto">
                  {e.relationship}
                </Badge>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
