import { AlertTriangle, FileText, Link2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface EvidenceSource {
  label: string;
  path: string;
  line?: number;
}

export interface ExplainabilityContext {
  predecessorAgent?: string;
  predecessorPhase?: string;
  confidence?: 'high' | 'medium' | 'low';
}

interface ExplainabilityPanelProps extends React.ComponentProps<'aside'> {
  title: string;
  reason: string;
  suggestedAction?: string;
  details?: Record<string, string>;
  sources?: EvidenceSource[];
  context?: ExplainabilityContext;
  onDismiss: () => void;
}

export function ExplainabilityPanel({
  title,
  reason,
  suggestedAction,
  details,
  sources,
  context,
  onDismiss,
  className,
  ...props
}: ExplainabilityPanelProps) {
  return (
    <aside
      role="complementary"
      aria-label={title}
      className={cn(
        'relative overflow-hidden rounded-[26px] border border-amber-500/25 bg-linear-to-br from-card via-warning/6 to-warning/12 p-4 shadow-sm backdrop-blur-sm',
        className
      )}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-warning)_16%,transparent)_0%,transparent_34%),radial-gradient(circle_at_bottom_right,color-mix(in_srgb,var(--color-info)_10%,transparent)_0%,transparent_32%)]"
      />
      {/* Header */}
      <div className="relative mb-4 flex items-center justify-between gap-2">
        <div className="space-y-2">
          <Badge
            variant="warning"
            className="border-warning/25 bg-warning/14 text-warning-foreground"
          >
            <Sparkles className="size-3.5" />
            Needs human input
          </Badge>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 shrink-0 text-amber-500" />
            <span className="text-sm font-semibold">{title}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-lg border border-border/60 bg-background/70 p-1.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Reason */}
      <div className="relative space-y-3 text-sm">
        <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Reason
          </span>
          <p className="mt-0.5">{reason}</p>
        </div>

        {suggestedAction && (
          <div className="rounded-2xl border border-info/20 bg-info/8 p-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-info-foreground/80">
              Suggested Action
            </span>
            <p className="mt-1 font-medium text-info-foreground">{suggestedAction}</p>
          </div>
        )}

        {details && Object.keys(details).length > 0 && (
          <div className="mt-2 rounded-2xl border border-border/60 bg-background/55 p-3 text-xs space-y-2">
            {Object.entries(details).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="shrink-0 font-medium text-muted-foreground">{key}:</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Evidence Sources */}
        {sources && sources.length > 0 && (
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/6 p-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
              Evidence Sources
            </span>
            <ul className="mt-1.5 space-y-1" aria-label="Evidence sources">
              {sources.map((source, i) => (
                <li key={`${source.path}-${i}`} className="flex items-center gap-1.5 text-xs">
                  <FileText className="size-3 shrink-0 text-violet-500" />
                  <span className="font-medium">{source.label}</span>
                  <span className="text-muted-foreground truncate">
                    {source.path}
                    {source.line != null && `:${source.line}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Context & Confidence */}
        {context &&
          (context.predecessorAgent || context.predecessorPhase || context.confidence) && (
            <div className="rounded-2xl border border-border/60 bg-background/55 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Context
                </span>
                {context.confidence && (
                  <Badge
                    variant={
                      context.confidence === 'high'
                        ? 'success'
                        : context.confidence === 'medium'
                          ? 'warning'
                          : 'destructive'
                    }
                    className="text-xs"
                  >
                    <Link2 className="size-3" />
                    {context.confidence} confidence
                  </Badge>
                )}
              </div>
              <div className="mt-1.5 space-y-1 text-xs">
                {context.predecessorAgent && (
                  <div className="flex gap-2">
                    <span className="shrink-0 font-medium text-muted-foreground">
                      Source Agent:
                    </span>
                    <span>{context.predecessorAgent}</span>
                  </div>
                )}
                {context.predecessorPhase && (
                  <div className="flex gap-2">
                    <span className="shrink-0 font-medium text-muted-foreground">
                      Source Phase:
                    </span>
                    <span>{context.predecessorPhase}</span>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </aside>
  );
}
