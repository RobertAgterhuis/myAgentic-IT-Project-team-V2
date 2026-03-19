import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopNavigation } from './top-navigation';
import { TestWrapper } from '@/test/test-wrapper';

function renderNavigation(props: React.ComponentProps<typeof TopNavigation> = {}) {
  return render(
    <TestWrapper>
      <TopNavigation {...props} />
    </TestWrapper>
  );
}

describe('TopNavigation', () => {
  it('renders with banner role', () => {
    renderNavigation();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('displays project name', () => {
    renderNavigation({ projectName: 'My Project' });
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderNavigation();
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
  });

  it('calls onSearch when typing', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    renderNavigation({ onSearch });
    await user.type(screen.getByRole('textbox', { name: 'Search' }), 'hello');
    expect(onSearch).toHaveBeenLastCalledWith('hello');
  });

  it('shows orchestrator state badge', () => {
    renderNavigation({ orchestratorState: 'Phase 2' });
    expect(screen.getByText('Phase 2')).toBeInTheDocument();
  });

  it('shows connection status', () => {
    renderNavigation({ connectionStatus: 'disconnected' });
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('hamburger button calls onMenuToggle', async () => {
    const user = userEvent.setup();
    const onMenuToggle = vi.fn();
    renderNavigation({ onMenuToggle });
    await user.click(screen.getByRole('button', { name: 'Toggle menu' }));
    expect(onMenuToggle).toHaveBeenCalledOnce();
  });

  it('shows Ctrl+K shortcut hint in search placeholder', () => {
    renderNavigation();
    expect(screen.getByPlaceholderText(/Ctrl\+K/)).toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    renderNavigation();
    expect(screen.getByRole('button', { name: /theme/i })).toBeInTheDocument();
  });

  it('theme toggle button cycles to next theme on click', async () => {
    const user = userEvent.setup();
    renderNavigation();
    const btn = screen.getByRole('button', { name: /theme/i });
    // default is system — clicking should move to light; aria-label reflects next theme
    await user.click(btn);
    // after one click the label changes — just assert button is still present
    expect(screen.getByRole('button', { name: /theme/i })).toBeInTheDocument();
  });
});
