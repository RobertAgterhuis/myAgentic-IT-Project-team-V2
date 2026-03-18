import * as React from 'react';
import { Badge } from './badge';
import { controlSignalConfig, type ControlSignal } from './control-signal-config';

interface ControlSignalBadgeProps extends React.ComponentProps<typeof Badge> {
  signal: ControlSignal;
}

function ControlSignalBadge({ signal, className, ...props }: ControlSignalBadgeProps) {
  const config = controlSignalConfig[signal];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className} {...props}>
      <Icon className="size-3.5" />
      {config.label}
    </Badge>
  );
}

export { ControlSignalBadge };
export type { ControlSignal, ControlSignalBadgeProps };
