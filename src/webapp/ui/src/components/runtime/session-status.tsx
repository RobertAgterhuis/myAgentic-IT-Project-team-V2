import { cn } from '@/lib/utils';
import { StatusDot } from '@/components/ui/status-dot';
import { ProgressBar } from '@/components/ui/progress';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { ConnectionStatus } from '@/stores/ui-store';

export interface SessionSummary {
  id: string;
  command: string;
  project: string;
}

interface SessionStatusProps extends React.ComponentProps<'div'> {
  session: SessionSummary | null;
  progress: number;
  activePhase?: string;
  activeAgent?: string;
  connectionStatus: ConnectionStatus;
}

const connectionIcon: Record<ConnectionStatus, React.ReactNode> = {
  connected: <Wifi className="size-4 text-green-600" />,
  disconnected: <WifiOff className="size-4 text-red-500" />,
  connecting: <Loader2 className="size-4 text-muted-foreground animate-spin" />,
};

export function SessionStatus({
  session,
  progress,
  activePhase,
  activeAgent,
  connectionStatus,
  className,
  ...props
}: SessionStatusProps) {
  if (!session) {
    return (
      <div
        aria-label="Session status"
        className={cn('rounded-xl border bg-card p-5', className)}
        {...props}
      >
        <div className="flex items-center gap-2">
          <StatusDot status="pending" size="md" />
          <span className="text-sm font-semibold text-muted-foreground">No Active Session</span>
          <span className="ml-auto">{connectionIcon[connectionStatus]}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Start a CREATE or AUDIT command to begin a session.
        </p>
      </div>
    );
  }

  return (
    <div
      aria-label="Session status"
      className={cn('rounded-xl border bg-card p-5', className)}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <StatusDot status="active" animated size="md" />
        <span className="text-sm font-semibold">Active Session</span>
        <span className="ml-auto">{connectionIcon[connectionStatus]}</span>
      </div>

      {/* Session info */}
      <div className="mt-2 text-sm">
        <span className="font-medium">{session.command}</span>
        <span className="text-muted-foreground"> / {session.project}</span>
      </div>

      {/* Phase & Agent */}
      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
        {activePhase && <span>Phase: {activePhase}</span>}
        {activeAgent && (
          <>
            <span aria-hidden="true">·</span>
            <span>Agent: {activeAgent}</span>
          </>
        )}
      </div>

      {/* Progress */}
      <div className="mt-3">
        <ProgressBar value={progress} showPercentage />
      </div>
    </div>
  );
}
