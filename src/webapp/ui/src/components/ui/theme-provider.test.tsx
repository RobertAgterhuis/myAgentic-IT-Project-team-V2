import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { ThemeProvider, useTheme, applyTheme, getStoredTheme } from './theme-provider';

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

function ThemeProbe() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button type="button" onClick={() => setTheme('light')}>
        Light
      </button>
      <button type="button" onClick={() => setTheme('dark')}>
        Dark
      </button>
      <button type="button" onClick={() => setTheme('system')}>
        System
      </button>
    </div>
  );
}

describe('theme-provider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    setMatchMedia(false);
  });

  it('defaults to system when storage is empty', () => {
    expect(getStoredTheme()).toBe('system');
  });

  it('applies dark class and color-scheme when forced', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');

    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('hydrates from localStorage and updates when changed', async () => {
    window.localStorage.setItem('agentic-ui-theme', 'dark');

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Light' }));

    await waitFor(() => {
      expect(window.localStorage.getItem('agentic-ui-theme')).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('resolves system preference to dark when matchMedia matches', async () => {
    setMatchMedia(true);
    window.localStorage.setItem('agentic-ui-theme', 'system');

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme-value')).toHaveTextContent('system');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
