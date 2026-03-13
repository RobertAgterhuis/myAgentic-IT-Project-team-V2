/**
 * Command Center page tests — Issue #239 (S9F-32)
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommandCenterPage from './command-center-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/command-center']}>
      <CommandCenterPage />
    </RouterTestWrapper>,
  );
}

describe('CommandCenterPage', () => {
  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /command center/i })).toBeInTheDocument();
  });

  it('renders project brief form', () => {
    renderPage();
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/brief description/i)).toBeInTheDocument();
  });

  it('renders quick action cards', () => {
    renderPage();
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByText('AUDIT')).toBeInTheDocument();
    expect(screen.getByText('FEATURE')).toBeInTheDocument();
    expect(screen.getByText('HOTFIX')).toBeInTheDocument();
  });

  it('renders empty queue state', () => {
    renderPage();
    expect(screen.getByText(/no commands in queue/i)).toBeInTheDocument();
  });

  it('submit button is disabled when brief is empty', () => {
    renderPage();
    const btn = screen.getByRole('button', { name: /submit brief/i });
    expect(btn).toBeDisabled();
  });

  it('submit button enables when brief has text', async () => {
    const user = userEvent.setup();
    renderPage();
    const textarea = screen.getByLabelText(/brief description/i);
    await user.type(textarea, 'Test project');
    const btn = screen.getByRole('button', { name: /submit brief/i });
    expect(btn).toBeEnabled();
  });
});
