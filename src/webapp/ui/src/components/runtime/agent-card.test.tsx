import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AgentCard } from './agent-card';

describe('AgentCard', () => {
  it('renders agent name and status', () => {
    render(<AgentCard name="DevOps Engineer" status="running" />);
    expect(screen.getByText('DevOps Engineer')).toBeInTheDocument();
  });

  it('renders task description', () => {
    render(<AgentCard name="Agent" status="running" taskDescription="Generating templates" />);
    expect(screen.getByText('Generating templates')).toBeInTheDocument();
  });

  it('renders progress bar when running', () => {
    render(<AgentCard name="Agent" status="running" progress={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('does not render progress bar when idle', () => {
    render(<AgentCard name="Agent" status="idle" progress={50} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('renders retry count when retrying', () => {
    render(<AgentCard name="Agent" status="retrying" retryCount={3} progress={20} />);
    expect(screen.getByText(/3 retries/)).toBeInTheDocument();
  });

  it('renders singular retry text', () => {
    render(<AgentCard name="Agent" status="retrying" retryCount={1} progress={10} />);
    expect(screen.getByText(/1 retry$/)).toBeInTheDocument();
  });

  it('renders failed indicator', () => {
    render(<AgentCard name="Agent" status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<AgentCard name="Agent" status="idle" onClick={handleClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('handles keyboard activation', async () => {
    const handleClick = vi.fn();
    render(<AgentCard name="Agent" status="idle" onClick={handleClick} />);
    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('has correct aria-label', () => {
    render(<AgentCard name="DevOps" status="running" onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'DevOps — Running');
  });

  it('applies pulse animation class when running (M15-038)', () => {
    const { container } = render(<AgentCard name="Agent" status="running" />);
    expect(container.querySelector('.animate-pulse-border')).toBeInTheDocument();
  });

  it('does not apply pulse animation class when idle', () => {
    const { container } = render(<AgentCard name="Agent" status="idle" />);
    expect(container.querySelector('.animate-pulse-border')).not.toBeInTheDocument();
  });
});
