import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Badge } from './badge';
import { Menu, Search, ShieldCheck, Users, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { UserMenu } from './user-menu';

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
}

function TopNavigation({
  projectName,
  orchestratorState,
  connectionStatus = 'connected',
  onSearch,
  onMenuToggle,
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
        'relative z-10 flex h-16 items-center gap-4 border-b border-border/70 bg-card/78 px-4 shadow-md backdrop-blur-xl supports-[backdrop-filter]:bg-card/72',
        className
      )}
      {...props}
    >
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="shrink-0 md:hidden rounded-sm p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label="Toggle menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Project context */}
      {projectName && (
        <div className="hidden min-w-0 sm:flex items-center gap-3 rounded-full border border-border/70 bg-background/60 px-3 py-2 shadow-sm">
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-sm ring-1 ring-white/35">
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
          className="h-10 border-border/70 bg-background/70 pl-8 shadow-sm"
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

        {/* User menu (M29-006) */}
        <UserMenu />
      </div>
    </header>
  );
}

export { TopNavigation };
export type { TopNavigationProps, ConnectionStatus };
