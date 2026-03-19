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
            <div className="min-w-0">
              <span className="text-xs font-medium">{agent.agent_name}</span>
              <div className="text-[10px] text-muted-foreground truncate">
                {agent.providers.length > 0 ? agent.providers.join(', ') : 'No provider data'}
                {agent.models.length > 0 ? ` · ${agent.models.join(', ')}` : ''}
              </div>
            </div>
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
          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground sm:grid-cols-4">
            <span>{agent.total_invocations} invocations</span>
            <span>P95: {agent.p95_duration_ms.toFixed(0)} ms</span>
            <span>Retries: {agent.avg_model_retries.toFixed(2)}</span>
            <span>Tokens: {Math.round(agent.avg_total_tokens)} avg</span>
          </div>
        </div>
      ))}
    </div>
  );
}
