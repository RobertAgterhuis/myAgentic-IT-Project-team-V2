import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ---------- MetricCard ---------- */

type Trend = 'up' | 'down' | 'neutral';

interface MetricCardProps extends React.ComponentProps<'div'> {
  label: string;
  value: string | number;
  delta?: string;
  trend?: Trend;
  icon?: React.ReactNode;
}

const trendConfig: Record<Trend, { icon: React.ReactNode; color: string }> = {
  up: { icon: <TrendingUp className="size-4" />, color: 'text-success' },
  down: { icon: <TrendingDown className="size-4" />, color: 'text-destructive' },
  neutral: { icon: <Minus className="size-4" />, color: 'text-muted-foreground' },
};

function MetricCard({
  label,
  value,
  delta,
  trend = 'neutral',
  icon,
  className,
  ...props
}: MetricCardProps) {
  const t = trendConfig[trend];
  return (
    <Card elevation="flat" className={cn('p-4', className)} {...props}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {delta && (
          <span className={cn('flex items-center gap-0.5 text-sm font-medium', t.color)}>
            {t.icon}
            {delta}
          </span>
        )}
      </div>
    </Card>
  );
}

/* ---------- ActivityFeed ---------- */

interface ActivityItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target?: string;
}

interface ActivityFeedProps extends React.ComponentProps<'div'> {
  items: ActivityItem[];
  pageSize?: number;
}

function ActivityFeed({
  items,
  pageSize = 10,
  className,
  ...props
}: ActivityFeedProps) {
  const [visibleCount, setVisibleCount] = React.useState(pageSize);
  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <div className={cn('space-y-1', className)} {...props}>
      <ol className="space-y-3" aria-label="Activity feed">
        {visible.map((item) => (
          <li key={item.id} className="flex gap-3 text-sm">
            <time
              className="shrink-0 w-32 text-muted-foreground tabular-nums"
              dateTime={item.timestamp}
            >
              {item.timestamp}
            </time>
            <span>
              <span className="font-medium">{item.actor}</span>{' '}
              <span className="text-muted-foreground">{item.action}</span>
              {item.target && (
                <>
                  {' '}
                  <span className="font-medium">{item.target}</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + pageSize)}
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Load more ({items.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}

export { MetricCard, ActivityFeed };
export type { MetricCardProps, ActivityItem, ActivityFeedProps, Trend };
