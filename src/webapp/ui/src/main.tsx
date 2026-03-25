import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryProvider } from '@/lib/query-provider';
import { Toaster } from '@/components/ui/toast-system';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { applyTheme, getStoredTheme } from '@/components/ui/theme-utils';
import App from './App';
import './index.css';
import { initWebVitals } from '@/lib/web-vitals';
import { validateRuntimeEnv } from '@/lib/runtime-env';

applyTheme(getStoredTheme());

const runtimeEnv = validateRuntimeEnv();
if (!runtimeEnv.ok) {
  throw new Error(`Invalid frontend runtime environment: ${runtimeEnv.errors.join(' ')}`);
}
if (runtimeEnv.warnings.length > 0) {
  // Warnings are advisory only and should not block startup.
  console.warn('Frontend runtime environment warnings:', runtimeEnv.warnings.join(' '));
}

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

// P1-UI-E3-I3: Report CLS, INP, LCP to backend metrics endpoint (best-effort, non-blocking).
initWebVitals();
