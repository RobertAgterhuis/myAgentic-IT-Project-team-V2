/**
 * Help panel overlay — keyboard shortcut reference and context-aware help.
 * Issue #241 (S9F-34). Triggered by ? key or help button.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { X, Search, Keyboard, HelpCircle } from 'lucide-react';

export interface Shortcut {
  keys: string[];
  description: string;
  /** Restrict to specific route paths, or omit for global. */
  routes?: string[];
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['?'], description: 'Toggle help panel' },
  { keys: ['Ctrl', 'K'], description: 'Focus search' },
  { keys: ['Escape'], description: 'Close panel / dismiss dialog' },
  { keys: ['G', 'D'], description: 'Go to Dashboard' },
  { keys: ['G', 'C'], description: 'Go to Command Center' },
  { keys: ['G', 'P'], description: 'Go to Pipeline' },
  { keys: ['G', 'Q'], description: 'Go to Questionnaires' },
  { keys: ['['], description: 'Toggle sidebar' },
  // Pipeline-specific
  { keys: ['Enter'], description: 'Expand selected phase', routes: ['/pipeline'] },
  // Command Center–specific
  { keys: ['Ctrl', 'Enter'], description: 'Submit brief', routes: ['/command-center'] },
];

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span>{shortcut.description}</span>
      <kbd className="flex items-center gap-1">
        {shortcut.keys.map((key, i) => (
          <span key={i}>
            {i > 0 && <span className="text-muted-foreground mx-0.5">+</span>}
            <span className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono font-medium">
              {key}
            </span>
          </span>
        ))}
      </kbd>
    </div>
  );
}

interface HelpPanelProps {
  onClose: () => void;
}

export function HelpPanel({ onClose }: HelpPanelProps) {
  const [filter, setFilter] = useState('');
  const location = useLocation();

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Context-aware filtering
  const contextShortcuts = useMemo(() => {
    return SHORTCUTS.filter((s) => {
      if (s.routes && !s.routes.includes(location.pathname)) return false;
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        s.description.toLowerCase().includes(q) || s.keys.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [filter, location.pathname]);

  const globalShortcuts = contextShortcuts.filter((s) => !s.routes);
  const pageShortcuts = contextShortcuts.filter((s) => s.routes);

  // Focus trap - close on outside click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20"
      onClick={handleBackdropClick}
      role="dialog"
      aria-label="Keyboard shortcuts"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-lg border bg-card shadow-lg animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Keyboard className="size-5" />
            <span className="font-semibold">Keyboard Shortcuts</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Close help"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b px-4 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search shortcuts…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Search shortcuts"
              autoFocus
            />
          </div>
        </div>

        {/* Shortcut list */}
        <div className="max-h-80 overflow-y-auto px-4 py-3">
          {globalShortcuts.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Global
              </h3>
              {globalShortcuts.map((s, i) => (
                <ShortcutRow key={i} shortcut={s} />
              ))}
            </section>
          )}

          {pageShortcuts.length > 0 && (
            <section className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                This Page
              </h3>
              {pageShortcuts.map((s, i) => (
                <ShortcutRow key={i} shortcut={s} />
              ))}
            </section>
          )}

          {contextShortcuts.length === 0 && (
            <div
              className={cn(
                'flex flex-col items-center gap-2 py-6 text-center text-muted-foreground'
              )}
            >
              <HelpCircle className="size-8" />
              <span className="text-sm">No shortcuts match "{filter}"</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
