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

  it('renders explicit guidance for how to proceed', () => {
    renderPage();
    expect(screen.getByText(/how to proceed/i)).toBeInTheDocument();
    expect(screen.getByText(/recommended next step/i)).toBeInTheDocument();
    expect(screen.getByText(/what happens when you click submit brief/i)).toBeInTheDocument();
  });

  it('renders quick action cards', () => {
    renderPage();
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getAllByText('AUDIT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FEATURE').length).toBeGreaterThan(0);
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

  it('submit button stays disabled until project name and brief are both filled', async () => {
    const user = userEvent.setup();
    renderPage();
    const projectName = screen.getByLabelText(/project name/i);
    const textarea = screen.getByLabelText(/brief description/i);

    await user.type(textarea, 'Test project');
    const btn = screen.getByRole('button', { name: /submit brief/i });
    expect(btn).toBeDisabled();

    await user.type(projectName, 'My project');
    expect(btn).toBeEnabled();
  });
});
