import { cn } from '@/lib/utils';

/**
 * MiniBar — CSS-based inline bar chart primitive.
 * Extracted from analytics-trends-page (M15-006).
 */
export function MiniBar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      className="h-6 w-full bg-muted rounded-sm overflow-hidden"
      role="meter"
      aria-label={label ?? `Metric value ${value} of ${max}`}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={cn('h-full transition-all duration-300', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
