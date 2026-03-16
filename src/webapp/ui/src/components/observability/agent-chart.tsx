/**
 * AgentChart — horizontal bar chart for agent performance stats.
 * Extracted from analytics-trends-page (M15-006).
 */
import { Badge } from '@/components/ui/badge';
import { MiniBar } from '@/components/ui/mini-bar';
import type { AgentPerformanceStats } from '@/lib/api-types';

export function AgentChart({ data }: { data: AgentPerformanceStats[] }) {
  const maxInvocations = Math.max(...data.map((d) => d.total_invocations), 1);

  return (
    <div className="space-y-3">
      {data.map((agent) => (
        <div key={agent.agent_id} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{agent.agent_name}</span>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  agent.success_rate_pct >= 90
                    ? 'success'
                    : agent.success_rate_pct >= 70
                      ? 'warning'
                      : 'error'
                }
                className="text-[10px]"
              >
                {agent.success_rate_pct.toFixed(1)}%
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {agent.avg_duration_ms.toFixed(0)} ms avg
              </span>
            </div>
          </div>
          <MiniBar value={agent.total_invocations} max={maxInvocations} color="bg-violet-500/70" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{agent.total_invocations} invocations</span>
            <span>P95: {agent.p95_duration_ms.toFixed(0)} ms</span>
          </div>
        </div>
      ))}
    </div>
  );
}
