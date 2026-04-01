/**
 * WelcomeWizard tests — M15-040
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WelcomeWizard } from './welcome-wizard';
import { useWelcomeWizard } from './use-welcome-wizard';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { renderHook, act } from '@testing-library/react';

function renderWizard(onDismiss = vi.fn()) {
  return {
    onDismiss,
    ...render(
      <RouterTestWrapper>
        <WelcomeWizard onDismiss={onDismiss} />
      </RouterTestWrapper>
    ),
  };
}

describe('WelcomeWizard', () => {
  it('renders the wizard dialog', () => {
    renderWizard();
    expect(screen.getByTestId('welcome-wizard')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /welcome wizard/i })).toBeInTheDocument();
  });

  it('shows step 1 of 5 initially', () => {
    renderWizard();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the Command Center')).toBeInTheDocument();
  });

  it('navigates to next step on Next click', async () => {
    renderWizard();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
    expect(screen.getByText('Run Commands')).toBeInTheDocument();
  });

  it('navigates back on Back click', async () => {
    renderWizard();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('disables Back button on first step', () => {
    renderWizard();
    const backBtn = screen.getByRole('button', { name: /back/i });
    expect(backBtn).toBeDisabled();
  });

  it('shows "Get Started" on the last step', async () => {
    renderWizard();
    const user = userEvent.setup();
    // Navigate to last step (step 5)
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: /next/i }));
    }
    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  it('calls onDismiss when "Get Started" is clicked', async () => {
    const onDismiss = vi.fn();
    renderWizard(onDismiss);
    const user = userEvent.setup();
    // Navigate to last step
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: /next/i }));
    }
    await user.click(screen.getByRole('button', { name: /get started/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when X button is clicked', async () => {
    const onDismiss = vi.fn();
    renderWizard(onDismiss);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /dismiss wizard/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders step indicators', () => {
    renderWizard();
    const progressList = screen.getByRole('list', { name: 'Wizard progress' });
    expect(progressList).toBeInTheDocument();
    const indicators = screen.getAllByRole('listitem');
    expect(indicators).toHaveLength(5);
    expect(screen.getByText(/Step 1 \(current\)/i)).toBeInTheDocument();
  });

  it('shows action button on steps that have one', async () => {
    renderWizard();
    const user = userEvent.setup();
    // Step 2 has "Go to Commands" action
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByRole('button', { name: /go to commands/i })).toBeInTheDocument();
  });

  it('step 1 does not show an action link', () => {
    renderWizard();
    expect(screen.queryByRole('button', { name: /go to commands/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view sessions/i })).not.toBeInTheDocument();
  });
});

describe('useWelcomeWizard hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns dismissed: false on first visit', () => {
    const { result } = renderHook(() => useWelcomeWizard());
    expect(result.current.dismissed).toBe(false);
  });

  it('returns dismissed: true after dismiss()', () => {
    const { result } = renderHook(() => useWelcomeWizard());
    act(() => result.current.dismiss());
    expect(result.current.dismissed).toBe(true);
  });

  it('persists dismissal in localStorage', () => {
    const { result } = renderHook(() => useWelcomeWizard());
    act(() => result.current.dismiss());
    expect(localStorage.getItem('welcome-wizard-dismissed')).toBe('true');
  });

  it('reads dismissed state from localStorage on mount', () => {
    localStorage.setItem('welcome-wizard-dismissed', 'true');
    const { result } = renderHook(() => useWelcomeWizard());
    expect(result.current.dismissed).toBe(true);
  });
});
