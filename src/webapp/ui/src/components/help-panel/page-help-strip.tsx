import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface VariantAction {
  key: string;
  label: string;
  to: string;
}

export function PageHelpStrip({ routeSlug, className }: PageHelpStripProps) {
  const navigate = useNavigate();
  const storageKey = `${STORAGE_PREFIX}${routeSlug}`;
  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed(storageKey));
  const { data: pageHelp } = usePageHelp(routeSlug);
  const openHelpForRoute = useUIStore((s) => s.openHelpForRoute);

  const topActions = useMemo(() => pageHelp?.coreActions.slice(0, 5) ?? [], [pageHelp]);
  const activeVariants = useMemo(() => pageHelp?.stateVariants ?? [], [pageHelp]);
  const variantActions = useMemo(
    () =>
      activeVariants.reduce<VariantAction[]>((actions, variant) => {
        switch (variant.condition) {
          case 'no_active_workspace':
            actions.push({ key: variant.condition, label: 'Open Workspaces', to: '/workspaces' });
            break;
          case 'pending_approvals_gt_0':
            actions.push({
              key: variant.condition,
              label: 'Open Approval Center',
              to: '/approvals',
            });
            break;
          case 'gate_failed':
            actions.push({ key: variant.condition, label: 'Open Pipeline', to: '/pipeline' });
            break;
          case 'agent_has_error':
            actions.push({
              key: variant.condition,
              label: 'Open Sessions Timeline',
              to: '/sessions',
            });
            break;
          default:
            break;
        }
        return actions;
      }, []),
    [activeVariants]
  );

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

      {!collapsed && activeVariants.length > 0 && (
        <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-warning">
            Context-aware guidance
          </div>
          <ul className="mt-1 space-y-1">
            {activeVariants.map((variant) => (
              <li key={variant.condition} className="text-xs text-foreground/90">
                {variant.additionalContent}
              </li>
            ))}
          </ul>
          {variantActions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {variantActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className="inline-flex items-center rounded-md border border-border/60 bg-background/80 px-2 py-1 text-xs font-medium hover:bg-background"
                  onClick={() => navigate(action.to)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
