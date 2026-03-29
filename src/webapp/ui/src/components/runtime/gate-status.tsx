import { ShieldCheck, ShieldAlert, Clock, ShieldOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GateStatusValue = 'passed' | 'pending' | 'blocked' | 'failed';

interface GateStatusProps extends React.ComponentProps<'div'> {
  gateId: string;
  label: string;
  status: GateStatusValue;
  reason?: string;
  suggestedAction?: string;
  onClick?: () => void;
}

const statusConfig: Record<GateStatusValue, { icon: React.ReactNode; color: string; bg: string }> =
  {
    passed: {
      icon: <ShieldCheck className="size-5" />,
      color: 'text-green-600',
      bg: 'bg-green-500/5 border-green-500/20',
    },
    pending: {
      icon: <Clock className="size-5" />,
      color: 'text-muted-foreground',
      bg: 'bg-muted/30 border-border',
    },
    blocked: {
      icon: <ShieldOff className="size-5" />,
      color: 'text-amber-600',
      bg: 'bg-amber-500/5 border-amber-500/20',
    },
    failed: {
      icon: <ShieldAlert className="size-5" />,
      color: 'text-red-600',
      bg: 'bg-red-500/5 border-red-500/20',
    },
  };

export function GateStatus({
  gateId,
  label,
  status,
  reason,
  suggestedAction,
  onClick,
  className,
  ...props
}: GateStatusProps) {
  const config = statusConfig[status];
  const interactiveProps =
    typeof onClick === 'function'
      ? {
          role: 'button' as const,
          tabIndex: 0,
          onClick,
          onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          },
        }
      : {};

  return (
    <div
      data-gate-id={gateId}
      {...interactiveProps}
      aria-label={`Gate: ${label} — ${status}`}
      className={cn(
        'rounded-lg border p-3 transition-all',
        config.bg,
        onClick &&
          'cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span className={config.color}>{config.icon}</span>
        <span className="text-sm font-semibold">{label}</span>
        <span className={cn('ml-auto text-xs font-medium uppercase', config.color)}>{status}</span>
      </div>

      {reason && <p className="mt-2 text-xs text-muted-foreground">{reason}</p>}

      {suggestedAction && (
        <p className="mt-1 text-xs font-medium text-info">Suggested: {suggestedAction}</p>
      )}
    </div>
  );
}
