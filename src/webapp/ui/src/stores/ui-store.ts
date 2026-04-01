/**
 * Zustand client-state store — UI-only state that does NOT map to a server resource.
 * Server state lives in TanStack Query; this store handles sidebar, modals,
 * connection status, and real-time event tracking.
 */
import { create } from 'zustand';
import type { SSEEvent } from '@/hooks/use-sse-events';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export interface ConnectionRecoveryState {
  attempt: number;
  nextRetryAt: number | null;
  lastDelayMs: number | null;
}

export interface UIState {
  /* Sidebar / navigation */
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  /* Active page / tab */
  activePage: string;
  setActivePage: (page: string) => void;

  /* Chat panel */
  chatOpen: boolean;
  toggleChat: () => void;
  setChatOpen: (open: boolean) => void;

  /* Help panel */
  helpOpen: boolean;
  helpRouteSlug: string | null;
  helpTopicId: string | null;
  toggleHelp: () => void;
  closeHelp: () => void;
  openHelpForRoute: (routePathOrSlug: string, topicId?: string | null) => void;
  setHelpTopic: (topicId: string | null) => void;

  /* Notification center */
  notificationCenterOpen: boolean;
  toggleNotificationCenter: () => void;
  setNotificationCenterOpen: (open: boolean) => void;

  /* Confirm dialog */
  confirmDialog: ConfirmDialogState | null;
  showConfirm: (dialog: ConfirmDialogState) => void;
  dismissConfirm: () => void;

  /* Real-time connection status */
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  connectionRecovery: ConnectionRecoveryState;
  setConnectionRecovery: (recovery: ConnectionRecoveryState) => void;
  resetConnectionRecovery: () => void;

  /* Last SSE event (for live status widgets) */
  lastSSEEvent: SSEEvent | null;
  setLastSSEEvent: (event: SSEEvent) => void;
}

export interface ConfirmDialogState {
  title: string;
  description: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),

  chatOpen: false,
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setChatOpen: (open) => set({ chatOpen: open }),

  helpOpen: false,
  helpRouteSlug: null,
  helpTopicId: null,
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
  closeHelp: () => set({ helpOpen: false }),
  openHelpForRoute: (routePathOrSlug, topicId = null) =>
    set({
      helpOpen: true,
      helpRouteSlug: normalizeHelpRouteSlug(routePathOrSlug),
      helpTopicId: topicId,
    }),
  setHelpTopic: (topicId) => set({ helpTopicId: topicId }),

  notificationCenterOpen: false,
  toggleNotificationCenter: () =>
    set((s) => ({ notificationCenterOpen: !s.notificationCenterOpen })),
  setNotificationCenterOpen: (open) => set({ notificationCenterOpen: open }),

  confirmDialog: null,
  showConfirm: (dialog) => set({ confirmDialog: dialog }),
  dismissConfirm: () => set({ confirmDialog: null }),

  connectionStatus: 'connecting',
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  connectionRecovery: {
    attempt: 0,
    nextRetryAt: null,
    lastDelayMs: null,
  },
  setConnectionRecovery: (recovery) => set({ connectionRecovery: recovery }),
  resetConnectionRecovery: () =>
    set({
      connectionRecovery: {
        attempt: 0,
        nextRetryAt: null,
        lastDelayMs: null,
      },
    }),

  lastSSEEvent: null,
  setLastSSEEvent: (event) => set({ lastSSEEvent: event }),
}));

function normalizeHelpRouteSlug(routePathOrSlug: string): string {
  const value = routePathOrSlug.trim();
  if (!value) return '';

  if (value.startsWith('/')) {
    const [firstSegment] = value.split('/').filter(Boolean);
    return (firstSegment || '').toLowerCase();
  }

  return value.replace(/^\/+/, '').toLowerCase();
}
