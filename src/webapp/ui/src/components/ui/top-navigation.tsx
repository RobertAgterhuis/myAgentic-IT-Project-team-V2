import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Badge } from './badge';
import {
  CircleHelp,
  Menu,
  Monitor,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Users,
  Wifi,
  WifiOff,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { UserMenu } from './user-menu';
import { useTheme } from './use-theme';

const THEME_CYCLE = ['light', 'dark', 'system'] as const;
type ThemeCycle = (typeof THEME_CYCLE)[number];

const THEME_ICON: Record<ThemeCycle, React.ReactNode> = {
  light: <Sun className="size-4" />,
  dark: <Moon className="size-4" />,
  system: <Monitor className="size-4" />,
};

const THEME_LABEL: Record<ThemeCycle, string> = {
  light: 'Light theme',
  dark: 'Dark theme',
  system: 'System theme',
};

function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();
  const current = (THEME_CYCLE.includes(theme as ThemeCycle) ? theme : 'system') as ThemeCycle;
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${THEME_LABEL[next]}`}
      title={THEME_LABEL[current]}
      className="motion-transition-base inline-flex items-center justify-center rounded-md p-1.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {THEME_ICON[current]}
    </button>
  );
}

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

const statusBadgeVariant: Record<ConnectionStatus, 'success' | 'error' | 'warning'> = {
  connected: 'success',
  disconnected: 'error',
  connecting: 'warning',
};

const statusLabel: Record<ConnectionStatus, string> = {
  connected: 'Live',
  disconnected: 'Offline',
  connecting: 'Connecting…',
};

const statusIcon: Record<ConnectionStatus, React.ReactNode> = {
  connected: <Wifi className="size-3.5" />,
  disconnected: <WifiOff className="size-3.5" />,
  connecting: <Loader2 className="size-3.5 animate-spin" />,
};

interface TopNavigationProps extends React.ComponentProps<'header'> {
  projectName?: string;
  orchestratorState?: string;
  connectionStatus?: ConnectionStatus;
  onSearch?: (query: string) => void;
  onMenuToggle?: () => void;
  onHelpClick?: () => void;
  onChatClick?: () => void;
}

function TopNavigation({
  projectName,
  orchestratorState,
  connectionStatus = 'connected',
  onSearch,
  onMenuToggle,
  onHelpClick,
  onChatClick,
  className,
  ...props
}: TopNavigationProps) {
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header
      role="banner"
      className={cn(
        'surface-app relative z-10 flex h-16 items-center gap-(--space-lg) border-b border-border/70 px-4 shadow-md backdrop-blur-xl supports-backdrop-filter:bg-card/72',
        className
      )}
      {...props}
    >
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="motion-transition-base shrink-0 rounded-sm p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Project context */}
      {projectName && (
        <div className="surface-muted hidden min-w-0 items-center gap-(--space-md) rounded-full border border-border/70 px-3 py-2 shadow-sm sm:flex">
          <div className="flex size-9 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-primary-foreground shadow-sm ring-1 ring-white/35">
            <ShieldCheck className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight max-w-48">
              {projectName}
            </div>
            <div className="truncate text-[11px] text-muted-foreground max-w-72">
              Governed human-in-the-loop SDLC control surface
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={searchRef}
          placeholder="Search routes, sessions, commands… (Ctrl+K)"
          className="motion-transition-base h-10 border-border/70 bg-background/70 pl-8 shadow-sm"
          onChange={(e) => onSearch?.(e.target.value)}
          aria-label="Search"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Badge
          variant="outline"
          className="hidden gap-1 border-secondary/25 bg-secondary/10 text-secondary xl:inline-flex"
        >
          <Users className="size-3.5" />
          Human checkpoints
        </Badge>

        {/* Orchestrator state */}
        {orchestratorState && (
          <Badge
            variant={
              orchestratorState === 'ERROR'
                ? 'error'
                : orchestratorState === 'IDLE'
                  ? 'secondary'
                  : 'info'
            }
            className="hidden gap-1 sm:inline-flex"
          >
            {orchestratorState !== 'IDLE' && (
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-current" />
              </span>
            )}
            {orchestratorState}
          </Badge>
        )}

        {/* Connection status */}
        <Badge variant={statusBadgeVariant[connectionStatus]} className="gap-1" dot={false}>
          {statusIcon[connectionStatus]}
          <span className="hidden sm:inline">{statusLabel[connectionStatus]}</span>
        </Badge>

        <button
          type="button"
          onClick={onHelpClick}
          title="Help for this page"
          aria-label="Help for this page"
          className="motion-transition-base inline-flex items-center justify-center rounded-md p-1.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <CircleHelp className="size-4" />
        </button>

        <button
          type="button"
          onClick={onChatClick}
          title="Open chat assistant (Ctrl+Shift+C)"
          aria-label="Open chat assistant"
          className="motion-transition-base inline-flex items-center justify-center rounded-md p-1.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <MessageSquare className="size-4" />
        </button>

        {/* Theme toggle */}
        <ThemeToggleButton />

        {/* User menu (M29-006) */}
        <UserMenu />
      </div>
    </header>
  );
}

export { TopNavigation };
export type { TopNavigationProps, ConnectionStatus };
