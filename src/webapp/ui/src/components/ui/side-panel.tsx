import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronLeft } from 'lucide-react';

/* ---------- Types ---------- */

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
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

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        {!collapsed && <span className="flex-1 text-left truncate">{section.title}</span>}
        {!collapsed && section.progress != null && (
          <span className="text-[10px] tabular-nums">{section.progress}%</span>
        )}
        <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />
      </button>

      {/* Progress bar */}
      {!collapsed && section.progress != null && (
        <div className="mx-3 mb-1 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.min(100, Math.max(0, section.progress))}%` }}
          />
        </div>
      )}

      {open && (
        <ul role="list" className="space-y-0.5 px-1">
          {section.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onItemSelect?.(item.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                  'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  activeItemId === item.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-foreground'
                )}
                aria-current={activeItemId === item.id ? 'page' : undefined}
              >
                {item.icon && <span className="shrink-0 [&>svg]:size-4">{item.icon}</span>}
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
        'flex flex-col border-r bg-card transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-60',
        className
      )}
      {...props}
    >
      {/* Collapse toggle */}
      <div className="flex items-center justify-end p-2">
        <button
          type="button"
          onClick={() => onCollapse?.(!collapsed)}
          className="rounded-sm p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className={cn('size-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2">
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
