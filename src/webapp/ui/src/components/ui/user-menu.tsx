/**
 * UserMenu (M29-006) — Displays current user avatar/name and role badge
 * with a logout action. Shown in TopNavigation when authenticated.
 */
import * as React from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useLogout } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { LogOut, User } from 'lucide-react';

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'info'> = {
  admin: 'default',
  operator: 'info',
  viewer: 'secondary',
};

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const logoutMutation = useLogout();
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu on outside click
  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (loading) return null;

  if (!user) {
    return (
      <a
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
      >
        <User className="size-4" />
        <span className="hidden sm:inline">Sign in</span>
      </a>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User menu"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="size-6 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <User className="size-5" />
        )}
        <span className="hidden sm:inline text-sm font-medium truncate max-w-24">
          {user.display_name || user.login}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-56 rounded-md border bg-popover p-1 shadow-md"
          role="menu"
        >
          <div className="px-3 py-2 border-b">
            <p className="text-sm font-medium">{user.display_name || user.login}</p>
            <p className="text-xs text-muted-foreground">@{user.login}</p>
            <Badge variant={roleBadgeVariant[user.role] ?? 'secondary'} className="mt-1 text-xs">
              {user.role}
            </Badge>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logoutMutation.mutate();
            }}
            disabled={logoutMutation.isPending}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted transition-colors text-destructive"
          >
            <LogOut className="size-4" />
            {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
