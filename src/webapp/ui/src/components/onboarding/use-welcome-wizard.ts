/**
 * Hook to manage WelcomeWizard visibility via localStorage.
 * M15-040
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'welcome-wizard-dismissed';

export function useWelcomeWizard() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // localStorage unavailable — dismiss in-memory only
    }
    setDismissed(true);
  }, []);

  return { dismissed, dismiss };
}
