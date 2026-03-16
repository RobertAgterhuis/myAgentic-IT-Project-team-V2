/**
 * DagEdge — visual representation of a lineage relationship.
 * Extracted from lineage-page (M15-007).
 */
import { Badge } from '@/components/ui/badge';
import type { LineageEdge } from '@/lib/api-types';
import { ArrowRight } from 'lucide-react';

export function DagEdge({ edge }: { edge: LineageEdge }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground">
      <span className="font-mono truncate max-w-30">{edge.source}</span>
      <ArrowRight className="size-3 shrink-0" />
      <span className="font-mono truncate max-w-30">{edge.target}</span>
      <Badge variant="secondary" className="text-[10px] ml-auto">
        {edge.relationship}
      </Badge>
    </div>
  );
}
