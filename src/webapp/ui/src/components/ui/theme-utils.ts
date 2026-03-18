import type { ThemePreference } from './theme-context';

const STORAGE_KEY = 'agentic-ui-theme';

function getStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(preference: ThemePreference) {
  if (typeof document === 'undefined') return;
  const resolved = preference === 'system' ? getSystemTheme() : preference;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

export { applyTheme, getStoredTheme, getSystemTheme, STORAGE_KEY };
