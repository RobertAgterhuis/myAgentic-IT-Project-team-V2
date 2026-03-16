/**
 * Commands page tests — M15 / Issue #M15-031
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommandsPage from './commands-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/commands']}>
      <CommandsPage />
    </RouterTestWrapper>
  );
}

describe('CommandsPage', () => {
  it('renders the page heading as Commands', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /commands/i })).toBeInTheDocument();
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
