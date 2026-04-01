/**
 * Hook to manage SetupWizard visibility and step progress via localStorage.
 * Supports skip/resume — persists which step the user reached.
 */
import { useState, useCallback } from 'react';

const STORAGE_KEY = 'setup-wizard-state';

interface SetupWizardState {
  completed: boolean;
  skipped: boolean;
  lastStep: number;
}

const DEFAULT_STATE: SetupWizardState = { completed: false, skipped: false, lastStep: 0 };

function readState(): SetupWizardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(state: SetupWizardState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — in-memory only
  }
}

export function useSetupWizard() {
  const [state, setState] = useState<SetupWizardState>(readState);

  const show = !state.completed && !state.skipped;

  const complete = useCallback(() => {
    const next: SetupWizardState = { completed: true, skipped: false, lastStep: state.lastStep };
    writeState(next);
    setState(next);
  }, [state.lastStep]);

  const skip = useCallback(() => {
    const next: SetupWizardState = { ...state, skipped: true };
    writeState(next);
    setState(next);
  }, [state]);

  const resume = useCallback(() => {
    const next: SetupWizardState = { ...state, skipped: false };
    writeState(next);
    setState(next);
  }, [state]);

  const setStep = useCallback(
    (step: number) => {
      const next: SetupWizardState = { ...state, lastStep: step };
      writeState(next);
      setState(next);
    },
    [state]
  );

  return { show, state, complete, skip, resume, setStep };
}
