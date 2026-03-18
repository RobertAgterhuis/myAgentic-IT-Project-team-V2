import * as React from 'react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';
import { Bot, ShieldCheck, UserCheck } from 'lucide-react';

type StatusMotifKind = 'governance' | 'agent' | 'human-loop';

const motifConfig: Record<
  StatusMotifKind,
  {
    icon: React.ReactNode;
    badge: string;
    badgeVariant: 'info' | 'secondary' | 'warning';
    className: string;
  }
> = {
  governance: {
    icon: <ShieldCheck className="size-4" />,
    badge: 'Governed',
    badgeVariant: 'info',
    className: 'border-info/20 bg-info/8 text-foreground',
  },
  agent: {
    icon: <Bot className="size-4" />,
    badge: 'Agent activity',
    badgeVariant: 'secondary',
    className: 'border-secondary/20 bg-secondary/10 text-foreground',
  },
  'human-loop': {
    icon: <UserCheck className="size-4" />,
    badge: 'Human loop',
    badgeVariant: 'warning',
    className: 'border-warning/20 bg-warning/10 text-foreground',
  },
};

interface StatusMotifProps extends React.ComponentProps<'div'> {
  kind: StatusMotifKind;
  title: string;
  description: string;
}

export function StatusMotif({ kind, title, description, className, ...props }: StatusMotifProps) {
  const config = motifConfig[kind];

  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-4 shadow-sm backdrop-blur-sm transition-transform hover:-translate-y-0.5',
        config.className,
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 items-center justify-center rounded-xl border border-white/35 bg-white/55 text-current shadow-sm">
          {config.icon}
        </div>
        <div className="min-w-0">
          <Badge variant={config.badgeVariant} className="mb-2">
            {config.badge}
          </Badge>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
        </div>
      </div>
    </div>
  );
}

export type { StatusMotifKind, StatusMotifProps };
