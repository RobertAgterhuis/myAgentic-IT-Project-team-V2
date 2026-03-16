import { Badge } from '@/components/ui/badge';
import { Heading, Text } from '@/components/ui/typography';
import { ProgressBar } from '@/components/ui/progress';
import { useOrchestratorStatus, useOrchestratorQueue, useProgress } from '@/hooks';
import { useUIStore } from '@/stores/ui-store';
import {
  GitBranch,
  Zap,
  Radio,
  CircleDot,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Terminal,
} from 'lucide-react';

export function LiveStatusHero() {
  const { data: status } = useOrchestratorStatus();
  const { data: progress } = useProgress();
  const { data: queue } = useOrchestratorQueue();
  const connectionStatus = useUIStore((s) => s.connectionStatus);

  const phases = progress?.phases ?? [];
  const totalAgents = phases.reduce((a, p) => a + p.total, 0);
  const doneAgents = phases.reduce((a, p) => a + p.done, 0);
  const overallPct = totalAgents > 0 ? Math.round((doneAgents / totalAgents) * 100) : 0;
  const activePhase = phases.find((p) => p.status === 'active');
  const pendingCommands = queue?.queue?.filter((c) => c.status === 'PENDING').length ?? 0;

  const stateColor =
    status?.state === 'ERROR'
      ? 'from-red-500/10 to-red-600/5 border-red-500/20'
      : status?.state === 'IDLE'
        ? 'from-slate-500/10 to-slate-600/5 border-slate-500/20'
        : 'from-blue-500/10 to-blue-600/5 border-blue-500/20';

  return (
    <section
      aria-label="Live system status"
      className={`rounded-xl border bg-gradient-to-br ${stateColor} p-6 transition-all duration-500`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Left: State + Indicators */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            {status?.state !== 'IDLE' && status?.state !== 'ERROR' ? (
              <span className="relative flex size-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex rounded-full size-3 bg-blue-500" />
              </span>
            ) : status?.state === 'ERROR' ? (
              <XCircle className="size-5 text-red-500" />
            ) : (
              <CircleDot className="size-5 text-muted-foreground" />
            )}
            <Heading level={2} className="!mb-0">
              {status?.state === 'IDLE'
                ? 'System Ready'
                : status?.state === 'ERROR'
                  ? 'System Error'
                  : 'Pipeline Active'}
            </Heading>
            <Badge
              variant={
                status?.state === 'ERROR'
                  ? 'error'
                  : status?.state === 'IDLE'
                    ? 'secondary'
                    : 'info'
              }
            >
              {status?.state ?? 'UNKNOWN'}
            </Badge>
          </div>

          {/* Pipeline progress */}
          {progress?.active && (
            <div className="space-y-2">
              <ProgressBar
                value={overallPct}
                label={`Pipeline: ${doneAgents}/${totalAgents} agents complete`}
                showPercentage
              />
              {activePhase && (
                <div className="flex items-center gap-2 text-sm">
                  <GitBranch className="size-4 text-blue-500" />
                  <span className="font-medium">{activePhase.label}</span>
                  <span className="text-muted-foreground">
                    ({activePhase.done}/{activePhase.total} agents)
                  </span>
                </div>
              )}
              {progress.session?.current_agent && (
                <div className="flex items-center gap-2 text-sm">
                  <Radio className="size-4 text-blue-500 animate-pulse" />
                  <span className="text-muted-foreground">Active agent:</span>
                  <span className="font-medium">{progress.session.current_agent}</span>
                </div>
              )}
            </div>
          )}

          {/* Idle state encouragement */}
          {status?.state === 'IDLE' && (
            <Text muted className="mt-1">
              No active pipeline. Use the Command Center to start a CREATE, AUDIT, or FEATURE cycle.
            </Text>
          )}
        </div>

        {/* Right: Quick stats strip */}
        <div className="flex flex-wrap lg:flex-col gap-3 lg:min-w-40">
          <div className="flex items-center gap-2 text-sm">
            {connectionStatus === 'connected' ? (
              <Wifi className="size-4 text-green-500" />
            ) : (
              <WifiOff className="size-4 text-red-500" />
            )}
            <span className={connectionStatus === 'connected' ? 'text-green-600' : 'text-red-500'}>
              {connectionStatus === 'connected' ? 'Real-time' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Terminal className="size-4 text-muted-foreground" />
            <span>{pendingCommands} pending</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-muted-foreground" />
            <span>{doneAgents} completed</span>
          </div>
          {status?.mode && (
            <div className="flex items-center gap-2 text-sm">
              <Zap className="size-4 text-muted-foreground" />
              <span className="capitalize">{status.mode}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
