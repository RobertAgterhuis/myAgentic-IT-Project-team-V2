import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type SpinnerSize = 'sm' | 'default' | 'lg';

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'size-4',
  default: 'size-6',
  lg: 'size-8',
};

function Spinner({
  size = 'default',
  className,
  label = 'Loading',
  ...props
}: React.ComponentProps<'div'> & { size?: SpinnerSize; label?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn('inline-flex items-center justify-center', className)}
      {...props}
    >
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export { Spinner };
export type { SpinnerSize };
