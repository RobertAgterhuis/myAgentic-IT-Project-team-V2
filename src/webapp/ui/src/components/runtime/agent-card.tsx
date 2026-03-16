import { cn } from '@/lib/utils';
import { relativeTime } from '@/lib/utils';
import { StatusDot } from '@/components/ui/status-dot';
import { ProgressBar } from '@/components/ui/progress';
import { RefreshCw, XCircle } from 'lucide-react';

export type AgentCardStatus = 'idle' | 'running' | 'completed' | 'failed' | 'retrying';

interface AgentCardProps extends React.ComponentProps<'div'> {
  name: string;
  status: AgentCardStatus;
  taskDescription?: string;
  progress?: number;
  startedAt?: string;
  retryCount?: number;
  onClick?: () => void;
}

const statusToDot: Record<
  AgentCardStatus,
  'active' | 'completed' | 'pending' | 'error' | 'warning'
> = {
  idle: 'pending',
  running: 'active',
  completed: 'completed',
  failed: 'error',
  retrying: 'warning',
};

const statusLabel: Record<AgentCardStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  retrying: 'Retrying',
};

export function AgentCard({
  name,
  status,
  taskDescription,
  progress,
  startedAt,
  retryCount,
  onClick,
  className,
  ...props
}: AgentCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={`${name} — ${statusLabel[status]}`}
      className={cn(
        'rounded-lg border bg-card p-4 transition-all',
        status === 'running' && 'border-blue-500/30 bg-blue-500/5 animate-pulse-border',
        status === 'failed' && 'border-red-500/30 bg-red-500/5',
        status === 'retrying' && 'border-amber-500/30 bg-amber-500/5',
        onClick &&
          'cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate">{name}</span>
        <StatusDot status={statusToDot[status]} animated={status === 'running'} size="sm" />
      </div>

      {/* Task description */}
      {taskDescription && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{taskDescription}</p>
      )}

      {/* Progress bar (running / retrying) */}
      {progress != null && (status === 'running' || status === 'retrying') && (
        <div className="mt-2">
          <ProgressBar value={progress} showPercentage />
        </div>
      )}

      {/* Footer meta */}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {startedAt && <span>Started {relativeTime(startedAt)}</span>}
        {status === 'retrying' && retryCount != null && (
          <span className="flex items-center gap-1 text-amber-600">
            <RefreshCw className="size-3" />
            {retryCount} {retryCount === 1 ? 'retry' : 'retries'}
          </span>
        )}
        {status === 'failed' && (
          <span className="flex items-center gap-1 text-red-600">
            <XCircle className="size-3" />
            Failed
          </span>
        )}
      </div>
    </div>
  );
}
