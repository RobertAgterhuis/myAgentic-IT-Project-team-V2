/**
 * Global keyboard shortcuts hook — navigation and panel toggles.
 * Attaches to document and routes keys to actions.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { resolveHelpRouteSlug } from './use-help';

/**
 * Handles two-key sequences (e.g., G then D) and single-key shortcuts.
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const helpOpen = useUIStore((s) => s.helpOpen);
  const closeHelp = useUIStore((s) => s.closeHelp);
  const openHelpForRoute = useUIStore((s) => s.openHelpForRoute);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const clearPending = useCallback(() => {
    pendingRef.current = null;
    clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement).isContentEditable) return;

      const key = e.key;

      // Two-key sequences starting with G
      if (pendingRef.current === 'g') {
        clearPending();
        switch (key.toLowerCase()) {
          case 'd':
            navigate('/');
            return;
          case 'c':
            navigate('/commands');
            return;
          case 'p':
            navigate('/pipeline');
            return;
          case 'q':
            navigate('/questionnaires');
            return;
          case 'e':
            navigate('/decisions');
            return;
          case 's':
            navigate('/sessions');
            return;
          case 'a':
            navigate('/agents');
            return;
          case 'o':
            navigate('/observability');
            return;
          case 'v':
            navigate('/approvals');
            return;
        }
        return;
      }

      // Single-key shortcuts
      if (key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        if (helpOpen) {
          closeHelp();
        } else {
          openHelpForRoute(resolveHelpRouteSlug(location.pathname));
        }
        return;
      }

      if (key === '[' && !e.ctrlKey && !e.metaKey) {
        toggleSidebar();
        return;
      }

      if (key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey) {
        pendingRef.current = 'g';
        timerRef.current = setTimeout(clearPending, 500);
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timerRef.current);
    };
  }, [
    navigate,
    location.pathname,
    helpOpen,
    closeHelp,
    openHelpForRoute,
    toggleSidebar,
    clearPending,
  ]);
}
