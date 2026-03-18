import * as React from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);
