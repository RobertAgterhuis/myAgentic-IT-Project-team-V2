/**
 * App shell layout — persistent TopNavigation + SidePanel wrapping page content.
 * Uses React Router's <Outlet> for nested page rendering.
 */
import { Suspense } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { TopNavigation } from '@/components/ui/top-navigation';
import { SidePanel, type NavSection } from '@/components/ui/side-panel';
import { ErrorBoundary } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { HelpPanel } from '@/components/help-panel/help-panel';
import { useUIStore } from '@/stores/ui-store';
import { useOrchestratorStatus } from '@/hooks';
import { useSSEEvents } from '@/hooks/use-sse-events';
import { useRuntimeEvents } from '@/hooks/use-runtime-events';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { routes, buildBreadcrumbs } from '@/lib/routes';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Terminal,
  GitBranch,
  ClipboardList,
  Scale,
  BarChart3,
  Package,
  ShieldCheck,
  Activity,
  Bot,
  Gauge,
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="size-4" />,
  Terminal: <Terminal className="size-4" />,
  GitBranch: <GitBranch className="size-4" />,
  ClipboardList: <ClipboardList className="size-4" />,
  Scale: <Scale className="size-4" />,
  BarChart3: <BarChart3 className="size-4" />,
  Package: <Package className="size-4" />,
  ShieldCheck: <ShieldCheck className="size-4" />,
  Activity: <Activity className="size-4" />,
  Bot: <Bot className="size-4" />,
  Gauge: <Gauge className="size-4" />,
};

function buildSections(): NavSection[] {
  const sectionMap = new Map<string, NavSection>();

  for (const route of Object.values(routes)) {
    let section = sectionMap.get(route.section);
    if (!section) {
      section = { id: route.section.toLowerCase(), title: route.section, items: [] };
      sectionMap.set(route.section, section);
    }
    section.items.push({
      id: route.path,
      label: route.label,
      href: route.path,
      icon: route.icon ? iconMap[route.icon] : undefined,
    });
  }

  return Array.from(sectionMap.values());
}

const navSections = buildSections();

function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Spinner label="Loading page…" />
    </div>
  );
}

function Breadcrumbs({ pathname }: { pathname: string }) {
  const crumbs = buildBreadcrumbs(pathname);
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="px-6 pt-4 text-sm text-muted-foreground">
      <ol className="flex items-center gap-1.5">
        {crumbs.map((c, i) => (
          <li key={c.path + i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {i === crumbs.length - 1 ? (
              <span className="font-medium text-foreground" aria-current="page">
                {c.label}
              </span>
            ) : (
              <Link to={c.path} className="hover:text-foreground transition-colors">
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const helpOpen = useUIStore((s) => s.helpOpen);
  const toggleHelp = useUIStore((s) => s.toggleHelp);
  const connectionStatus = useUIStore((s) => s.connectionStatus);

  const { data: orchestratorStatus } = useOrchestratorStatus();

  // SSE for real-time cache invalidation
  useSSEEvents();

  // Bridge SSE events to runtime store (M15-034)
  useRuntimeEvents();

  // Global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TopNavigation
        projectName="Agentic SDLC"
        orchestratorState={orchestratorStatus?.state}
        connectionStatus={connectionStatus}
        onMenuToggle={toggleSidebar}
      />

      <div className="flex flex-1 overflow-hidden">
        <SidePanel
          sections={navSections}
          activeItemId={location.pathname}
          collapsed={!sidebarOpen}
          onCollapse={(collapsed) => useUIStore.getState().setSidebarOpen(!collapsed)}
          onItemSelect={(itemId) => navigate(itemId)}
          className={cn('hidden md:flex', !sidebarOpen && 'md:hidden')}
        />

        <main className="flex flex-1 flex-col overflow-y-auto">
          <Breadcrumbs pathname={location.pathname} />

          <ErrorBoundary>
            <Suspense fallback={<PageSpinner />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {helpOpen && <HelpPanel onClose={toggleHelp} />}
    </div>
  );
}
