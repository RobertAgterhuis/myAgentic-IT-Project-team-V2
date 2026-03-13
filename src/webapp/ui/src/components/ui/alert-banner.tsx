import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

type AlertBannerVariant = 'info' | 'warning' | 'error' | 'success';

const variantStyles: Record<AlertBannerVariant, string> = {
  info: 'border-info/30 bg-info/10 text-info',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  success: 'border-success/30 bg-success/10 text-success',
};

interface AlertBannerProps extends React.ComponentProps<'div'> {
  variant?: AlertBannerVariant;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

function AlertBanner({
  variant = 'info',
  icon,
  action,
  dismissible,
  onDismiss,
  className,
  children,
  ...props
}: AlertBannerProps) {
  const [visible, setVisible] = React.useState(true);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const isDestructive = variant === 'error';

  return (
    <div
      role={isDestructive ? 'alert' : 'status'}
      aria-live={isDestructive ? 'assertive' : 'polite'}
      data-variant={variant}
      className={cn(
        'relative flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="mt-0.5 shrink-0 [&>svg]:size-4">{icon}</span>}
      <div className="flex-1 min-w-0">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export { AlertBanner };
export type { AlertBannerVariant, AlertBannerProps };
