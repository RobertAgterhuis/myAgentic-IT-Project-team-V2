import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Badge } from './badge';
import { Menu, Search, Wifi, WifiOff, Loader2 } from 'lucide-react';

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
      className={cn('flex h-14 items-center gap-4 border-b bg-card px-4 shadow-sm', className)}
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
        <div className="hidden sm:flex items-center gap-2">
          <div className="size-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-semibold truncate max-w-48">{projectName}</span>
        </div>
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={searchRef}
          placeholder="Search… (Ctrl+K)"
          className="pl-8 h-8"
          onChange={(e) => onSearch?.(e.target.value)}
          aria-label="Search"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
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
            className="hidden sm:inline-flex gap-1"
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
      </div>
    </header>
  );
}

export { TopNavigation };
export type { TopNavigationProps, ConnectionStatus };
