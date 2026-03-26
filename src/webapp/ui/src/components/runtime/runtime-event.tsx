import {
  Play,
  GitBranch,
  CheckCircle2,
  Radio,
  FileText,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimelineEventType =
  | 'session_start'
  | 'phase_start'
  | 'phase_complete'
  | 'agent_start'
  | 'agent_complete'
  | 'artifact_created'
  | 'gate_passed'
  | 'gate_failed'
  | 'error'
  | 'retry';

interface RuntimeEventProps extends React.ComponentProps<'div'> {
  type: TimelineEventType;
  timestamp: string;
  description: string;
  agent?: string;
  phase?: string;
  artifactId?: string;
}

const typeIcon: Record<TimelineEventType, React.ReactNode> = {
  session_start: <Play className="size-4 text-blue-500" />,
  phase_start: <GitBranch className="size-4 text-blue-500" />,
  phase_complete: <CheckCircle2 className="size-4 text-green-600" />,
  agent_start: <Radio className="size-4 text-blue-500 animate-pulse" />,
  agent_complete: <CheckCircle2 className="size-4 text-green-600" />,
  artifact_created: <FileText className="size-4 text-violet-500" />,
  gate_passed: <ShieldCheck className="size-4 text-green-600" />,
  gate_failed: <ShieldAlert className="size-4 text-red-500" />,
  error: <XCircle className="size-4 text-red-500" />,
  retry: <RefreshCw className="size-4 text-amber-500" />,
};

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

export function RuntimeEvent({
  type,
  timestamp,
  description,
  agent,
  phase,
  artifactId: _artifactId,
  className,
  ...props
}: RuntimeEventProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 py-1.5 text-sm',
        (type === 'error' || type === 'gate_failed') && 'text-red-600',
        className
      )}
      {...props}
    >
      <span className="shrink-0 mt-0.5">{typeIcon[type]}</span>
      <span className="text-muted-foreground shrink-0 tabular-nums">{formatTime(timestamp)}</span>
      <span className="min-w-0">
        {description}
        {agent && <span className="ml-1 text-muted-foreground">({agent})</span>}
        {phase && <span className="ml-1 text-muted-foreground">[{phase}]</span>}
      </span>
    </div>
  );
}
