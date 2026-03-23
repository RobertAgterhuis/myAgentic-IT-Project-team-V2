import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, Lightbulb } from 'lucide-react';
import { usePageHelp } from '@/hooks';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

const STORAGE_PREFIX = 'page-help-strip:collapsed:';

function readCollapsed(key: string): boolean {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeCollapsed(key: string, collapsed: boolean): void {
  try {
    localStorage.setItem(key, String(collapsed));
  } catch {
    // Ignore persistence failures; keep UI responsive.
  }
}

interface PageHelpStripProps {
  routeSlug: string;
  className?: string;
}

export function PageHelpStrip({ routeSlug, className }: PageHelpStripProps) {
  const storageKey = `${STORAGE_PREFIX}${routeSlug}`;
  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed(storageKey));
  const { data: pageHelp } = usePageHelp(routeSlug);
  const openHelpForRoute = useUIStore((s) => s.openHelpForRoute);

  const topActions = useMemo(() => pageHelp?.coreActions.slice(0, 5) ?? [], [pageHelp]);

  if (!pageHelp) {
    return null;
  }

  const toggleCollapsed = () => {
    setCollapsed((previous) => {
      const next = !previous;
      writeCollapsed(storageKey, next);
      return next;
    });
  };

  const openHelp = () => {
    const defaultTopic = pageHelp.topicLinks[0]?.topicId ?? null;
    openHelpForRoute(pageHelp.routePath || routeSlug, defaultTopic);
  };

  return (
    <section
      className={cn(
        'rounded-2xl border border-info/35 bg-info/10 px-4 py-3 text-sm text-foreground',
        className
      )}
      data-testid={`page-help-strip-${routeSlug}`}
      aria-label={`${pageHelp.pageTitle} help summary`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <HelpCircle className="mt-0.5 size-4 shrink-0 text-info" />
          <div className="min-w-0">
            <div className="font-medium">{pageHelp.pageTitle} quick help</div>
            {!collapsed && <p className="mt-1 text-sm text-foreground/85">{pageHelp.purpose}</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-xs font-medium hover:bg-background"
            onClick={openHelp}
          >
            <Lightbulb className="size-3.5" />
            Learn more
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-xs font-medium hover:bg-background"
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <ChevronRight className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            {collapsed ? 'Show' : 'Hide'}
          </button>
        </div>
      </div>

      {!collapsed && topActions.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Core actions">
          {topActions.map((action) => (
            <li
              key={action.label}
              className="rounded-full border border-border/60 bg-background/80 px-2 py-1 text-xs"
            >
              <span className="font-medium">{action.label}</span>
              <span className="text-muted-foreground">: {action.description}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
