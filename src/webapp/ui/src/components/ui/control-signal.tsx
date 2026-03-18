import * as React from 'react';
import { Badge } from './badge';
import { Bot, ShieldCheck, UserCheck } from 'lucide-react';

type ControlSignal = 'governed' | 'active-agent' | 'needs-human-input';

const signalConfig: Record<
  ControlSignal,
  {
    label: string;
    description: string;
    variant: 'info' | 'secondary' | 'warning';
    icon: React.ReactNode;
  }
> = {
  governed: {
    label: 'Governed',
    description: 'This surface keeps gates, approvals, and policy awareness visible.',
    variant: 'info',
    icon: <ShieldCheck className="size-3.5" />,
  },
  'active-agent': {
    label: 'Active agent',
    description: 'This identifies the agent currently responsible for the next runtime step.',
    variant: 'secondary',
    icon: <Bot className="size-3.5" />,
  },
  'needs-human-input': {
    label: 'Needs human input',
    description: 'This marks work that is paused until a person answers or decides something.',
    variant: 'warning',
    icon: <UserCheck className="size-3.5" />,
  },
};

interface ControlSignalBadgeProps extends React.ComponentProps<typeof Badge> {
  signal: ControlSignal;
}

function ControlSignalBadge({ signal, className, ...props }: ControlSignalBadgeProps) {
  const config = signalConfig[signal];

  return (
    <Badge variant={config.variant} className={className} {...props}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

export { ControlSignalBadge, signalConfig };
export type { ControlSignal, ControlSignalBadgeProps };
