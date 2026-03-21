import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type OperationalCardTone = 'neutral' | 'info' | 'success' | 'warning' | 'critical';

const toneToBadgeVariant: Record<
  OperationalCardTone,
  'secondary' | 'info' | 'success' | 'warning' | 'error'
> = {
  neutral: 'secondary',
  info: 'info',
  success: 'success',
  warning: 'warning',
  critical: 'error',
};

export interface OperationalCardMetaItem {
  id: string;
  label: string;
  value: string;
  tone?: OperationalCardTone;
}

export interface OperationalCardProps extends React.ComponentProps<'div'> {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  statusTone?: OperationalCardTone;
  icon?: React.ReactNode;
  meta?: OperationalCardMetaItem[];
  actions?: React.ReactNode;
}

export function OperationalCard({
  title,
  subtitle,
  statusLabel,
  statusTone = 'neutral',
  icon,
  meta = [],
  actions,
  className,
  ...props
}: OperationalCardProps) {
  return (
    <Card elevation="flat" className={cn('p-4 border border-border/70', className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{title}</p>
            {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {statusLabel && (
          <Badge variant={toneToBadgeVariant[statusTone]} className="shrink-0">
            {statusLabel}
          </Badge>
        )}
      </div>

      {meta.length > 0 && (
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {meta.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border/60 bg-background/70 px-3 py-2"
            >
              <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-1 flex items-center gap-2 text-xs font-medium">
                {item.tone && (
                  <span
                    className={cn(
                      'inline-block size-2 rounded-full',
                      item.tone === 'success' && 'bg-success',
                      item.tone === 'warning' && 'bg-warning',
                      item.tone === 'critical' && 'bg-destructive',
                      item.tone === 'info' && 'bg-info',
                      item.tone === 'neutral' && 'bg-muted-foreground/50'
                    )}
                    aria-hidden="true"
                  />
                )}
                <span>{item.value}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}

      {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
    </Card>
  );
}
