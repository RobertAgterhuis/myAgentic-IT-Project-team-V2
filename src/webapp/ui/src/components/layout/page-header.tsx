import * as React from 'react';
import { cn } from '@/lib/utils';

interface HeaderChip {
  id: string;
  label: string;
  tone?: 'default' | 'info' | 'success' | 'warning' | 'critical';
}

interface PageHeaderProps extends React.ComponentProps<'div'> {
  title: string;
  subtitle?: string;
  chips?: HeaderChip[];
  actions?: React.ReactNode;
}

const chipToneClass: Record<NonNullable<HeaderChip['tone']>, string> = {
  default: 'border-border/60 bg-card/80 text-foreground/90',
  info: 'border-info/30 bg-info/10 text-info',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  critical: 'border-destructive/30 bg-destructive/10 text-destructive',
};

/**
 * Standardized page title + context chips + action area.
 */
export function PageHeader({
  title,
  subtitle,
  chips,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'surface-elevated motion-fade-in rounded-md border border-border/70 p-5',
        className
      )}
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-balance text-heading-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && <p className="max-w-3xl text-body-md text-muted-foreground">{subtitle}</p>}
          {chips && chips.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {chips.map((chip) => (
                <span
                  key={chip.id}
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-1 text-caption-sm font-semibold uppercase tracking-[0.08em]',
                    chipToneClass[chip.tone ?? 'default']
                  )}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
