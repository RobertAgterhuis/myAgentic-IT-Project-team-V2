import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryProvider } from '@/lib/query-provider';
import { Toaster } from '@/components/ui/toast-system';
import { ThemeProvider, applyTheme, getStoredTheme } from '@/components/ui/theme-provider';
import App from './App';
import './index.css';

applyTheme(getStoredTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryProvider>
        <App />
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  </StrictMode>
);
