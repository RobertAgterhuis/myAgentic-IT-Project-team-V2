import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ContextStripItem {
  id: string;
  label: string;
  value: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'critical';
}

interface ContextStripProps extends React.ComponentProps<'section'> {
  items: ContextStripItem[];
}

const toneClass: Record<NonNullable<ContextStripItem['tone']>, string> = {
  neutral: 'text-foreground',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  critical: 'text-destructive',
};

/**
 * Compact strip for runtime context shown directly under page headers.
 */
export function ContextStrip({ items, className, ...props }: ContextStripProps) {
  if (items.length === 0) return null;

  return (
    <section
      className={cn(
        'surface-muted motion-fade-in rounded-sm border border-border/70 px-4 py-2',
        className
      )}
      {...props}
    >
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="flex min-w-0 items-baseline gap-2">
            <dt className="shrink-0 text-caption-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {item.label}
            </dt>
            <dd
              className={cn('truncate text-body-sm font-medium', toneClass[item.tone ?? 'neutral'])}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
