/**
 * App shell layout — persistent TopNavigation + SidePanel wrapping page content.
 * Uses React Router's <Outlet> for nested page rendering.
 */
import { Suspense } from 'react';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TopNavigation } from '@/components/ui/top-navigation';
import { type NavSection } from '@/components/ui/side-panel';
import { ErrorBoundary } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { HelpPanel } from '@/components/help-panel/help-panel';
import { useUIStore } from '@/stores/ui-store';
import { useOrchestratorStatus } from '@/hooks';
import { useCurrentUser } from '@/hooks/use-auth';
import { useSSEEvents } from '@/hooks/use-sse-events';
import { useRuntimeEvents } from '@/hooks/use-runtime-events';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { resolveHelpRouteSlug } from '@/hooks/use-help';
import { routes, buildBreadcrumbs, DOMAIN_ORDER, type DomainSection } from '@/lib/routes';
import { AppShell } from '@/components/layout/app-shell';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { ChatPanel } from '@/components/chat/chat-panel';
import { showToast } from '@/components/ui/toast-system';
import { AUTH_EXPIRED_EVENT } from '@/lib/api-client';
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
  History,
  FolderKanban,
  FileCode2,
  Settings2,
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
  History: <History className="size-4" />,
  FolderKanban: <FolderKanban className="size-4" />,
  FileCode2: <FileCode2 className="size-4" />,
  Settings2: <Settings2 className="size-4" />,
};

function toSectionId(section: DomainSection): string {
  return section
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildSections(): NavSection[] {
  const sectionMap = new Map<DomainSection, NavSection>();

  DOMAIN_ORDER.forEach((section) => {
    sectionMap.set(section, { id: toSectionId(section), title: section, items: [] });
  });

  for (const route of Object.values(routes)) {
    const section = sectionMap.get(route.section);
    if (!section) continue;
    section.items.push({
      id: route.path,
      label: route.label,
      href: route.path,
      icon: route.icon ? iconMap[route.icon] : undefined,
    });
  }

  return DOMAIN_ORDER.map((section) => {
    const entry = sectionMap.get(section);
    if (!entry) return { id: toSectionId(section), title: section, items: [] };
    if (entry.items.length === 0) {
      entry.items.push({
        id: `${entry.id}-placeholder`,
        label: 'Coming soon',
        disabled: true,
      });
    }
    return entry;
  });
}

function resolveActiveNavPath(pathname: string): string {
  const directMatch = Object.values(routes).find((route) => route.path === pathname);
  if (directMatch) return directMatch.path;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return pathname;

  const parentPath = `/${segments[0]}`;
  const parentMatch = Object.values(routes).find((route) => route.path === parentPath);
  return parentMatch?.path ?? pathname;
}

const navSections = buildSections();

function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Spinner label="Loading page…" />
    </div>
  );
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const helpOpen = useUIStore((s) => s.helpOpen);
  const closeHelp = useUIStore((s) => s.closeHelp);
  const openHelpForRoute = useUIStore((s) => s.openHelpForRoute);
  const toggleChat = useUIStore((s) => s.toggleChat);
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

  useEffect(() => {
    const onAuthExpired = () => {
      const next = `${location.pathname}${location.search}${location.hash}`;
      showToast.warning('Your session expired. Please sign in again to continue.');
      navigate(`/login?reason=session-expired&next=${encodeURIComponent(next)}`, {
        replace: true,
      });
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired as EventListener);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired as EventListener);
    };
  }, [location.hash, location.pathname, location.search, navigate]);

  return (
    <AppShell
      topNavigation={
        <TopNavigation
          projectName="Agentic SDLC"
          orchestratorState={orchestratorStatus?.state}
          connectionStatus={connectionStatus}
          onMenuToggle={toggleSidebar}
          onHelpClick={() => openHelpForRoute(resolveHelpRouteSlug(location.pathname))}
          onChatClick={toggleChat}
        />
      }
      sidebar={
        <SidebarNav
          sections={navSections}
          activeItemId={resolveActiveNavPath(location.pathname)}
          sidebarOpen={sidebarOpen}
          onCollapse={(collapsed) => useUIStore.getState().setSidebarOpen(!collapsed)}
          onSelectItem={(itemId) => navigate(itemId)}
        />
      }
      breadcrumbs={<BreadcrumbNav items={buildBreadcrumbs(location.pathname)} />}
      helpPanel={helpOpen ? <HelpPanel onClose={closeHelp} /> : null}
      chatPanel={<ChatPanel />}
    >
      <ErrorBoundary>
        <Suspense fallback={<PageSpinner />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </AppShell>
  );
}
