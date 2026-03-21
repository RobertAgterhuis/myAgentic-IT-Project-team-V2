import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft } from 'lucide-react';

/* ---------- Types ---------- */

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
  progress?: number; // 0-100
}

interface SidePanelProps extends React.ComponentProps<'nav'> {
  sections: NavSection[];
  activeItemId?: string;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  onItemSelect?: (itemId: string) => void;
}

/* ---------- Section component ---------- */

function SectionGroup({
  section,
  activeItemId,
  onItemSelect,
  collapsed,
}: {
  section: NavSection;
  activeItemId?: string;
  onItemSelect?: (id: string) => void;
  collapsed: boolean;
}) {
  const [open, setOpen] = React.useState(true);
  const progressWidthClasses = [
    'w-0',
    'w-1/12',
    'w-2/12',
    'w-3/12',
    'w-4/12',
    'w-5/12',
    'w-6/12',
    'w-7/12',
    'w-8/12',
    'w-9/12',
    'w-10/12',
    'w-11/12',
    'w-full',
  ];

  return (
    <div>
      {open ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded="true"
        >
          <span
            className="size-1.5 rounded-full bg-secondary/80 shadow-[0_0_10px_currentColor]"
            aria-hidden="true"
          />
          {!collapsed && <span className="flex-1 text-left truncate">{section.title}</span>}
          {!collapsed && section.progress != null && (
            <span className="text-[10px] tabular-nums">{section.progress}%</span>
          )}
          <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded="false"
        >
          <span
            className="size-1.5 rounded-full bg-secondary/80 shadow-[0_0_10px_currentColor]"
            aria-hidden="true"
          />
          {!collapsed && <span className="flex-1 text-left truncate">{section.title}</span>}
          {!collapsed && section.progress != null && (
            <span className="text-[10px] tabular-nums">{section.progress}%</span>
          )}
          <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />
        </button>
      )}

      {/* Progress bar */}
      {!collapsed &&
        section.progress != null &&
        (() => {
          const pct = Math.min(100, Math.max(0, section.progress));
          const step = Math.min(
            progressWidthClasses.length - 1,
            Math.max(0, Math.round((pct / 100) * (progressWidthClasses.length - 1)))
          );
          const widthClass = progressWidthClasses[step];
          return (
            <div className="mx-3 mb-2 h-1 rounded-full bg-muted/80 overflow-hidden">
              <div
                className={cn(
                  'h-full bg-linear-to-r from-secondary via-info to-primary transition-all',
                  widthClass
                )}
              />
            </div>
          );
        })()}

      {open && (
        <ul role="list" className="space-y-0.5 px-1">
          {section.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="link"
                onClick={() => {
                  if (item.disabled) return;
                  onItemSelect?.(item.href ?? item.id);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all duration-150',
                  'hover:bg-background/80 hover:translate-x-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  item.disabled
                    ? 'cursor-not-allowed text-muted-foreground/60'
                    : activeItemId === (item.href ?? item.id)
                      ? 'border border-info/20 bg-linear-to-r from-primary/16 via-info/10 to-secondary/10 text-primary font-medium shadow-sm'
                      : 'border border-transparent text-foreground/88'
                )}
                aria-current={activeItemId === (item.href ?? item.id) ? 'page' : undefined}
                aria-disabled={item.disabled || undefined}
                disabled={item.disabled}
              >
                {item.icon && (
                  <span
                    className={cn(
                      'shrink-0 [&>svg]:size-4',
                      activeItemId === (item.href ?? item.id) && 'text-primary'
                    )}
                  >
                    {item.icon}
                  </span>
                )}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- SidePanel ---------- */

function SidePanel({
  sections,
  activeItemId,
  collapsed = false,
  onCollapse,
  onItemSelect,
  className,
  ...props
}: SidePanelProps) {
  return (
    <nav
      aria-label="Side navigation"
      className={cn(
        'flex flex-col border-r border-border/70 bg-card/82 backdrop-blur-xl transition-[width] duration-200 shadow-md supports-backdrop-filter:bg-card/76',
        collapsed ? 'w-14' : 'w-60',
        className
      )}
      {...props}
    >
      {/* Collapse toggle */}
      <div className="flex items-center justify-between border-b border-border/50 px-2 py-2">
        {!collapsed && (
          <div className="pl-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
            Control surface
          </div>
        )}
        <button
          type="button"
          onClick={() => onCollapse?.(!collapsed)}
          className="rounded-lg p-1.5 hover:bg-background/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Sections */}
      <div className="scrollbar-surface flex-1 overflow-y-auto space-y-4 py-3">
        {sections.map((section) => (
          <SectionGroup
            key={section.id}
            section={section}
            activeItemId={activeItemId}
            onItemSelect={onItemSelect}
            collapsed={collapsed}
          />
        ))}
      </div>
    </nav>
  );
}

export { SidePanel };
export type { SidePanelProps };
