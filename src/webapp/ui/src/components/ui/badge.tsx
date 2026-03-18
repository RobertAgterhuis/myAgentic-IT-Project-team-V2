import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-[color,box-shadow,border-color,background-color] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default:
          'border-primary/30 bg-primary/90 text-primary-foreground shadow-sm [a&]:hover:bg-primary/95',
        secondary:
          'border-secondary/25 bg-secondary/85 text-secondary-foreground shadow-sm [a&]:hover:bg-secondary/90',
        destructive:
          'border-destructive/25 bg-destructive/90 text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 [a&]:hover:bg-destructive/90',
        outline: 'border-border/70 bg-background/70 text-foreground shadow-sm [a&]:hover:bg-card',
        success: 'border-success/25 bg-success/85 text-success-foreground shadow-sm',
        warning: 'border-warning/25 bg-warning/88 text-warning-foreground shadow-sm',
        error: 'border-destructive/25 bg-destructive/88 text-white shadow-sm',
        info: 'border-info/25 bg-info/88 text-info-foreground shadow-sm',
        neutral: 'border-border/70 bg-muted/80 text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  dot = false,
  removable = false,
  onRemove,
  children,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
    dot?: boolean;
    removable?: boolean;
    onRemove?: () => void;
  }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 -mr-1 inline-flex size-4 items-center justify-center rounded-full hover:bg-black/10 focus:outline-none"
          aria-label="Remove"
        >
          <X className="size-2.5!" />
        </button>
      )}
    </Comp>
  );
}

export { Badge, badgeVariants };
