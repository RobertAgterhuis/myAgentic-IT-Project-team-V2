/**
 * Hook to manage onboarding diagnostics wizard visibility via localStorage.
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'onboarding-diagnostics-dismissed';

export function useOnboardingDiagnosticsWizard() {
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
