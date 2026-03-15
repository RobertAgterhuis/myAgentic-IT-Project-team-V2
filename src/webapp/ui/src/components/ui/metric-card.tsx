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
    <Card
      elevation="flat"
      className={cn('p-4 hover:shadow-md transition-all duration-200 group', className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && (
          <span className="text-muted-foreground group-hover:text-primary transition-colors p-1.5 rounded-md bg-muted">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
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

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function ActivityFeed({ items, pageSize = 10, className, ...props }: ActivityFeedProps) {
  const [visibleCount, setVisibleCount] = React.useState(pageSize);
  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <div className={cn('space-y-1', className)} {...props}>
      <ol className="space-y-2" aria-label="Activity feed">
        {visible.map((item) => (
          <li
            key={item.id}
            className="flex gap-3 text-sm py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <div className="shrink-0 mt-1">
              <div className="size-2 rounded-full bg-primary/60" />
            </div>
            <div className="flex-1 min-w-0">
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
            </div>
            <time
              className="shrink-0 text-xs text-muted-foreground tabular-nums whitespace-nowrap"
              dateTime={item.timestamp}
              title={item.timestamp}
            >
              {relativeTime(item.timestamp)}
            </time>
          </li>
        ))}
      </ol>
      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + pageSize)}
          className="text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-2 py-1"
        >
          Load more ({items.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}

export { MetricCard, ActivityFeed };
export type { MetricCardProps, ActivityItem, ActivityFeedProps, Trend };
