/**
 * NotificationCenter — persistent slide-out panel displaying
 * approvals, failures, escalations, and system events.
 * Issue #1568
 */
import { useState, useCallback } from 'react';
import { useUIStore } from '@/stores/ui-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heading, Text } from '@/components/ui/typography';
import { AlertTriangle, Bell, CheckCircle, ChevronRight, Info, ShieldAlert, X } from 'lucide-react';

type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

interface Notification {
  id: string;
  level: NotificationLevel;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  href?: string;
}

const LEVEL_ICON: Record<NotificationLevel, React.ReactNode> = {
  info: <Info className="size-4 text-blue-500" />,
  success: <CheckCircle className="size-4 text-green-500" />,
  warning: <AlertTriangle className="size-4 text-amber-500" />,
  error: <ShieldAlert className="size-4 text-red-500" />,
};

const LEVEL_BADGE: Record<NotificationLevel, 'info' | 'success' | 'warning' | 'error'> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

type FilterOption = 'all' | NotificationLevel;

function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const raw = localStorage.getItem('notification-center-items');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const persist = useCallback((items: Notification[]) => {
    try {
      localStorage.setItem('notification-center-items', JSON.stringify(items));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const markRead = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      persist(next);
      return next;
    });
  }, [persist]);

  const dismiss = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const next = prev.filter((n) => n.id !== id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clearAll = useCallback(() => {
    setNotifications([]);
    persist([]);
  }, [persist]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll };
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const toggle = useUIStore((s) => s.toggleNotificationCenter);
  const open = useUIStore((s) => s.notificationCenterOpen);
  const { unreadCount } = useNotifications();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      aria-expanded={open}
      title="Notification center"
      className="motion-transition-base relative inline-flex items-center justify-center rounded-md p-1.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Bell className="size-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export function NotificationCenter() {
  const open = useUIStore((s) => s.notificationCenterOpen);
  const close = useUIStore((s) => s.setNotificationCenterOpen);
  const { notifications, unreadCount, markRead, markAllRead, dismiss, clearAll } =
    useNotifications();
  const [filter, setFilter] = useState<FilterOption>('all');

  if (!open) return null;

  const filtered =
    filter === 'all' ? notifications : notifications.filter((n) => n.level === filter);

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex"
      role="dialog"
      aria-label="Notification center"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-sm"
        onClick={() => close(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <Card
        elevation="raised"
        className="relative ml-auto w-full max-w-sm h-full rounded-none border-l flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Heading level={3}>Notifications</Heading>
            {unreadCount > 0 && (
              <Badge variant="info" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
            <button
              type="button"
              onClick={() => close(false)}
              aria-label="Close notification center"
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-1 border-b px-4 py-2">
          {(['all', 'error', 'warning', 'info', 'success'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFilter(opt)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === opt
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <Bell className="size-8 text-muted-foreground/50" />
              <Text muted className="text-sm">
                No notifications
              </Text>
              <Text muted className="text-xs">
                Approvals, failures, and escalations will appear here.
              </Text>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((n) => (
                <li
                  key={n.id}
                  className={`flex gap-3 p-4 transition-colors ${n.read ? 'opacity-60' : 'bg-muted/30'}`}
                >
                  <div className="pt-0.5 shrink-0">{LEVEL_ICON[n.level]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <Text className="text-sm font-medium truncate">{n.title}</Text>
                      <button
                        type="button"
                        onClick={() => dismiss(n.id)}
                        aria-label={`Dismiss notification: ${n.title}`}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                    <Text muted className="text-xs mt-0.5 line-clamp-2">
                      {n.message}
                    </Text>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant={LEVEL_BADGE[n.level]} className="text-[10px]">
                        {n.level}
                      </Badge>
                      <Text muted className="text-[10px]">
                        {formatRelativeTime(n.timestamp)}
                      </Text>
                    </div>
                    {n.href && (
                      <a
                        href={n.href}
                        onClick={() => {
                          markRead(n.id);
                          close(false);
                        }}
                        className="inline-flex items-center gap-0.5 text-xs text-primary mt-1 hover:underline"
                      >
                        View details <ChevronRight className="size-3" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t p-3">
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={clearAll}>
              Clear all notifications
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
