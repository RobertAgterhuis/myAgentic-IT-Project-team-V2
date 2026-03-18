/**
 * Execution History Page (M31-009) — lists past agent executions with
 * status, duration, and output location.
 */
import { useState } from 'react';
import { useExecutionHistory } from '@/hooks';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Heading, Text } from '@/components/ui/typography';
import { Clock, CheckCircle, XCircle, StopCircle } from 'lucide-react';
import type { AgentExecutionResult } from '@/lib/api-types';

const statusConfig: Record<
  string,
  { variant: 'success' | 'error' | 'warning' | 'info'; icon: typeof CheckCircle }
> = {
  completed: { variant: 'success', icon: CheckCircle },
  failed: { variant: 'error', icon: XCircle },
  cancelled: { variant: 'warning', icon: StopCircle },
  running: { variant: 'info', icon: Clock },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.running;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant}>
      <Icon className="size-3 mr-1" />
      {status}
    </Badge>
  );
}

function formatDuration(ms: number | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ExecutionHistoryPage() {
  const { data, isLoading, isError, error } = useExecutionHistory();
  const [filter, setFilter] = useState('');

  const executions: AgentExecutionResult[] = data?.executions ?? [];

  const filtered = filter
    ? executions.filter(
        (e) =>
          e.agent_name.toLowerCase().includes(filter.toLowerCase()) ||
          e.agent_id.includes(filter) ||
          e.status.includes(filter.toLowerCase())
      )
    : executions;

  return (
    <div className="p-6 space-y-6" data-testid="execution-history-page">
      <div>
        <Heading level={1}>Execution History</Heading>
        <Text className="text-muted-foreground">Review all past agent executions.</Text>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter by agent name, ID or status…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-xs text-muted-foreground">{filtered.length} executions</span>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner className="size-6" />
        </div>
      )}

      {isError && <AlertBanner variant="error">{(error as Error).message}</AlertBanner>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No executions found.</div>
      )}

      {/* History table */}
      {filtered.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Duration</th>
                <th className="px-4 py-2 font-medium">Output</th>
                <th className="px-4 py-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((exec) => (
                <tr key={exec.job_id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <div className="font-medium">{exec.agent_name}</div>
                    <div className="text-xs text-muted-foreground">{exec.agent_id}</div>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={exec.status} />
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatDuration(exec.duration_ms)}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground max-w-50 truncate">
                    {exec.output_path ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {exec.started_at ? new Date(exec.started_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
