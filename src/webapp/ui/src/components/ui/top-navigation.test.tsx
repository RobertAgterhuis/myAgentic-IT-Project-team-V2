import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopNavigation } from './top-navigation';

describe('TopNavigation', () => {
  it('renders with banner role', () => {
    render(<TopNavigation />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('displays project name', () => {
    render(<TopNavigation projectName="My Project" />);
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<TopNavigation />);
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
  });

  it('calls onSearch when typing', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<TopNavigation onSearch={onSearch} />);
    await user.type(screen.getByRole('textbox', { name: 'Search' }), 'hello');
    expect(onSearch).toHaveBeenLastCalledWith('hello');
  });

  it('shows orchestrator state badge', () => {
    render(<TopNavigation orchestratorState="Phase 2" />);
    expect(screen.getByText('Phase 2')).toBeInTheDocument();
  });

  it('shows connection status', () => {
    render(<TopNavigation connectionStatus="disconnected" />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('hamburger button calls onMenuToggle', async () => {
    const user = userEvent.setup();
    const onMenuToggle = vi.fn();
    render(<TopNavigation onMenuToggle={onMenuToggle} />);
    await user.click(screen.getByRole('button', { name: 'Toggle menu' }));
    expect(onMenuToggle).toHaveBeenCalledOnce();
  });

  it('shows Ctrl+K shortcut hint in search placeholder', () => {
    render(<TopNavigation />);
    expect(screen.getByPlaceholderText(/Ctrl\+K/)).toBeInTheDocument();
  });
});
