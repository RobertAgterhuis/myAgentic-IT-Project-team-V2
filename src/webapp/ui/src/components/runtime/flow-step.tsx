import { CheckCircle2, Circle, XCircle, Pause, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FlowStepStatus = 'completed' | 'running' | 'pending' | 'failed' | 'paused';

interface FlowStepProps extends React.ComponentProps<'button'> {
  label: string;
  status: FlowStepStatus;
  isActive: boolean;
  onClick?: () => void;
}

const statusIcon: Record<FlowStepStatus, React.ReactNode> = {
  completed: <CheckCircle2 className="size-5 text-green-600" />,
  running: <Loader2 className="size-5 text-blue-500 animate-spin" />,
  pending: <Circle className="size-5 text-muted-foreground/50" />,
  failed: <XCircle className="size-5 text-red-500" />,
  paused: <Pause className="size-5 text-amber-500" />,
};

export function FlowStep({ label, status, isActive, onClick, className, ...props }: FlowStepProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'step' : undefined}
      aria-label={`${label} — ${status}`}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
        'transition-all duration-300 ease-in-out',
        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive && 'ring-2 ring-blue-500/40 bg-blue-500/5',
        status === 'completed' && 'text-green-700 dark:text-green-400',
        status === 'failed' && 'text-red-700 dark:text-red-400',
        className
      )}
      {...props}
    >
      {statusIcon[status]}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
