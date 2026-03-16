import { cn } from '@/lib/utils';

export type StatusDotStatus = 'active' | 'completed' | 'pending' | 'error' | 'warning';
export type StatusDotSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<StatusDotSize, string> = {
  sm: 'size-2',
  md: 'size-3',
  lg: 'size-4',
};

const colorClasses: Record<StatusDotStatus, string> = {
  active: 'bg-blue-500',
  completed: 'bg-green-500',
  pending: 'bg-muted-foreground/40',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
};

interface StatusDotProps extends React.ComponentProps<'span'> {
  status: StatusDotStatus;
  animated?: boolean;
  size?: StatusDotSize;
}

export function StatusDot({
  status,
  animated = false,
  size = 'md',
  className,
  ...props
}: StatusDotProps) {
  const shouldAnimate = animated && status === 'active';

  return (
    <span
      role="img"
      aria-label={`Status: ${status}`}
      className={cn('relative inline-flex shrink-0', sizeClasses[size], className)}
      {...props}
    >
      {shouldAnimate && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            colorClasses[status]
          )}
        />
      )}
      <span
        aria-hidden="true"
        className={cn('relative inline-flex h-full w-full rounded-full', colorClasses[status])}
      />
    </span>
  );
}
