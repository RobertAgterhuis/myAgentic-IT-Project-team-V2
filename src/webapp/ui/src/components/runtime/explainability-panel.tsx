import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExplainabilityPanelProps extends React.ComponentProps<'aside'> {
  title: string;
  reason: string;
  suggestedAction?: string;
  details?: Record<string, string>;
  onDismiss: () => void;
}

export function ExplainabilityPanel({
  title,
  reason,
  suggestedAction,
  details,
  onDismiss,
  className,
  ...props
}: ExplainabilityPanelProps) {
  return (
    <aside
      role="complementary"
      aria-label={title}
      className={cn('rounded-lg border border-amber-500/30 bg-amber-500/5 p-4', className)}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600 shrink-0" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Reason */}
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">Reason:</span>
          <p className="mt-0.5">{reason}</p>
        </div>

        {suggestedAction && (
          <div>
            <span className="font-medium text-muted-foreground">Suggested Action:</span>
            <p className="mt-0.5 text-blue-600 font-medium">{suggestedAction}</p>
          </div>
        )}

        {details && Object.keys(details).length > 0 && (
          <div className="mt-2 rounded border bg-muted/30 p-2 text-xs space-y-1">
            {Object.entries(details).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="font-medium text-muted-foreground shrink-0">{key}:</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
