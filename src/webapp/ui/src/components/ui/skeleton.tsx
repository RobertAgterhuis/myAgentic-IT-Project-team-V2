import { cn } from '@/lib/utils';

type SkeletonVariant = 'line' | 'circle' | 'rectangle';

const variantClasses: Record<SkeletonVariant, string> = {
  line: 'h-4 w-full rounded',
  circle: 'size-10 rounded-full',
  rectangle: 'h-24 w-full rounded-md',
};

function Skeleton({
  className,
  variant = 'line',
  ...props
}: React.ComponentProps<'div'> & { variant?: SkeletonVariant }) {
  return (
    <div
      data-slot="skeleton"
      data-variant={variant}
      className={cn('animate-pulse bg-accent', variantClasses[variant], className)}
      aria-busy="true"
      aria-live="polite"
      {...props}
    />
  );
}

export { Skeleton };
export type { SkeletonVariant };
