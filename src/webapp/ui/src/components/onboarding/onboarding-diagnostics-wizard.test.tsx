/**
 * OnboardingDiagnosticsWizard tests.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { OnboardingDiagnosticsWizard } from './onboarding-diagnostics-wizard';
import { useOnboardingDiagnosticsWizard } from './use-onboarding-diagnostics-wizard';
import { renderHook, act } from '@testing-library/react';

function renderWizard(onDismiss = vi.fn(), sessionId = 'sess-test-001') {
  return {
    onDismiss,
    ...render(
      <RouterTestWrapper>
        <OnboardingDiagnosticsWizard sessionId={sessionId} onDismiss={onDismiss} />
      </RouterTestWrapper>
    ),
  };
}

describe('OnboardingDiagnosticsWizard', () => {
  it('renders the diagnostics wizard', async () => {
    renderWizard();
    expect(
      screen.getByRole('status', { name: /loading onboarding diagnostics/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: /onboarding diagnostics wizard/i })
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Detect your runtime profile')).toBeInTheDocument();
    expect(screen.getByText('Local Development')).toBeInTheDocument();
  });

  it('advances and finishes the wizard', async () => {
    const onDismiss = vi.fn();
    renderWizard(onDismiss);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /finish/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows checklist items on step 2', async () => {
    renderWizard();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Validate setup requirements')).toBeInTheDocument();
    expect(screen.getByText('Storage provider')).toBeInTheDocument();
    expect(screen.getByText('Queue provider')).toBeInTheDocument();
    expect(screen.getByText('Session store')).toBeInTheDocument();
  });

  it('exports a diagnostics report', async () => {
    const createObjectURL = vi.fn(() => 'blob:diagnostics');
    const revokeObjectURL = vi.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;

    Object.defineProperty(URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    });

    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');

    renderWizard();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await user.click(screen.getByRole('button', { name: /export report/i }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(appendChild).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledOnce();

    Object.defineProperty(URL, 'createObjectURL', {
      value: originalCreate,
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: originalRevoke,
      configurable: true,
    });
  });

  it('renders error state when diagnostics fail', async () => {
    server.use(
      http.get('/api/orchestrator/onboarding-diagnostics', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 })
      )
    );

    renderWizard();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/failed to load onboarding diagnostics/i)).toBeInTheDocument();
  });
});

describe('useOnboardingDiagnosticsWizard hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns dismissed: false on first visit', () => {
    const { result } = renderHook(() => useOnboardingDiagnosticsWizard());
    expect(result.current.dismissed).toBe(false);
  });

  it('returns dismissed: true after dismiss()', () => {
    const { result } = renderHook(() => useOnboardingDiagnosticsWizard());
    act(() => result.current.dismiss());
    expect(result.current.dismissed).toBe(true);
  });

  it('persists dismissal in localStorage', () => {
    const { result } = renderHook(() => useOnboardingDiagnosticsWizard());
    act(() => result.current.dismiss());
    expect(localStorage.getItem('onboarding-diagnostics-dismissed')).toBe('true');
  });

  it('reads dismissed state from localStorage on mount', () => {
    localStorage.setItem('onboarding-diagnostics-dismissed', 'true');
    const { result } = renderHook(() => useOnboardingDiagnosticsWizard());
    expect(result.current.dismissed).toBe(true);
  });
});
