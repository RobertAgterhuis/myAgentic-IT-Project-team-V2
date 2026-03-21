import { SidePanel, type NavSection } from '@/components/ui/side-panel';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  sections: NavSection[];
  activeItemId?: string;
  sidebarOpen: boolean;
  onCollapse: (collapsed: boolean) => void;
  onSelectItem: (itemId: string) => void;
  className?: string;
}

/**
 * Sidebar navigation primitive extracted from AppLayout.
 */
export function SidebarNav({
  sections,
  activeItemId,
  sidebarOpen,
  onCollapse,
  onSelectItem,
  className,
}: SidebarNavProps) {
  return (
    <SidePanel
      sections={sections}
      activeItemId={activeItemId}
      collapsed={!sidebarOpen}
      onCollapse={onCollapse}
      onItemSelect={onSelectItem}
      className={cn('hidden md:flex', !sidebarOpen && 'md:hidden', className)}
    />
  );
}
