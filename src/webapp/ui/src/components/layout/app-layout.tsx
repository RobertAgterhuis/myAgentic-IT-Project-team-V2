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
import { useCurrentUser } from '@/hooks/use-auth';
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
      <ol className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 shadow-sm backdrop-blur-sm">
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

  // Fetch current user session (M29-006)
  useCurrentUser();

  // SSE for real-time cache invalidation
  useSSEEvents();

  // Bridge SSE events to runtime store (M15-034)
  useRuntimeEvents();

  // Global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-transparent text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--color-border)_30%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--color-border)_20%,transparent)_1px,transparent_1px)] bg-[size:88px_88px] opacity-50" />
        <div className="absolute -left-28 top-0 h-72 w-72 rounded-full bg-info/15 blur-3xl" />
        <div className="absolute right-[-6rem] top-20 h-80 w-80 rounded-full bg-secondary/12 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-1/3 h-80 w-80 rounded-full bg-accent/8 blur-3xl" />
      </div>

      <TopNavigation
        projectName="Agentic SDLC"
        orchestratorState={orchestratorStatus?.state}
        connectionStatus={connectionStatus}
        onMenuToggle={toggleSidebar}
      />

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <SidePanel
          sections={navSections}
          activeItemId={location.pathname}
          collapsed={!sidebarOpen}
          onCollapse={(collapsed) => useUIStore.getState().setSidebarOpen(!collapsed)}
          onItemSelect={(itemId) => navigate(itemId)}
          className={cn('hidden md:flex', !sidebarOpen && 'md:hidden')}
        />

        <main className="scrollbar-surface relative flex flex-1 flex-col overflow-y-auto">
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
