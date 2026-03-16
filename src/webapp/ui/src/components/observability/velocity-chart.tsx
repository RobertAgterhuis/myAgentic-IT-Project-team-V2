/**
 * VelocityChart — sprint velocity table with inline bars.
 * Extracted from analytics-trends-page (M15-006).
 */
import { MiniBar } from '@/components/ui/mini-bar';
import type { VelocityTrendEntry } from '@/lib/api-types';

export function VelocityChart({ data }: { data: VelocityTrendEntry[] }) {
  const maxPoints = Math.max(...data.map((d) => Math.max(d.planned_points, d.completed_points)), 1);

  return (
    <div className="space-y-2">
      {data.map((entry) => (
        <div key={entry.sprint_id} className="grid grid-cols-[120px_1fr_80px] items-center gap-3">
          <span className="text-xs font-mono truncate">{entry.sprint_id}</span>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-16">Planned</span>
              <MiniBar value={entry.planned_points} max={maxPoints} color="bg-blue-400/60" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-16">Done</span>
              <MiniBar value={entry.completed_points} max={maxPoints} color="bg-green-500" />
            </div>
          </div>
          <span className="text-xs font-semibold text-right">
            {(entry.velocity_ratio * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}
