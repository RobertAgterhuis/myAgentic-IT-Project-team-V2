/**
 * DagNode — DAG node button with status indicator and badge.
 * Extracted from lineage-page (M15-007).
 */
import { Badge } from '@/components/ui/badge';
import type { LineageNode } from '@/lib/api-types';

const statusColor: Record<string, string> = {
  VALID: 'bg-green-500',
  DRAFT: 'bg-blue-400',
  SUPERSEDED: 'bg-amber-400',
  INVALID: 'bg-red-400',
};

const statusBadge: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
  VALID: 'success',
  DRAFT: 'info',
  SUPERSEDED: 'warning',
  INVALID: 'error',
};

export function DagNode({
  node,
  selected,
  onClick,
}: {
  node: LineageNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-all hover:shadow-md ${
        selected
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
          : 'border-border bg-card hover:border-primary/50'
      }`}
    >
      <span
        className={`size-3 rounded-full ${statusColor[node.status] ?? 'bg-gray-400'}`}
        aria-label={`Status: ${node.status}`}
      />
      <div className="min-w-0">
        <p className="font-mono text-xs truncate max-w-45">{node.id}</p>
        <div className="flex items-center gap-1 mt-1">
          <Badge variant={statusBadge[node.status] ?? 'secondary'} className="text-[10px]">
            {node.status}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            {node.artifact_type}
          </Badge>
        </div>
      </div>
    </button>
  );
}
