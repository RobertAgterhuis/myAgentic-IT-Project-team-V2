/**
 * MiniBar — CSS-based inline bar chart primitive.
 * Extracted from analytics-trends-page (M15-006).
 */
export function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      className="h-6 w-full bg-muted rounded-sm overflow-hidden"
      role="meter"
      aria-valuenow={value}
      aria-valuemax={max}
    >
      <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}
