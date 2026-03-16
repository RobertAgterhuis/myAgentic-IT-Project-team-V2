import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AgentActivity, type AgentEntry } from './agent-activity';

const agents: AgentEntry[] = [
  { id: '1', name: 'Business Analyst', status: 'completed' },
  { id: '2', name: 'DevOps Engineer', status: 'running', taskDescription: 'Working' },
  { id: '3', name: 'Security Architect', status: 'idle' },
];

describe('AgentActivity', () => {
  it('renders empty state', () => {
    render(<AgentActivity agents={[]} />);
    expect(screen.getByText('No agents active')).toBeInTheDocument();
  });

  it('renders all agents', () => {
    render(<AgentActivity agents={agents} />);
    expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    expect(screen.getByText('DevOps Engineer')).toBeInTheDocument();
    expect(screen.getByText('Security Architect')).toBeInTheDocument();
  });

  it('sorts running agents first', () => {
    const { container } = render(<AgentActivity agents={agents} />);
    const cards = container.querySelectorAll('section[aria-label="Agent activity"] > [aria-label]');
    // running first, then completed, then idle
    expect(cards[0]).toHaveAttribute('aria-label', 'DevOps Engineer — Running');
    expect(cards[1]).toHaveAttribute('aria-label', 'Business Analyst — Completed');
    expect(cards[2]).toHaveAttribute('aria-label', 'Security Architect — Idle');
  });

  it('calls onAgentClick with correct id', async () => {
    const handleClick = vi.fn();
    render(<AgentActivity agents={agents} onAgentClick={handleClick} />);
    await userEvent.click(screen.getByText('DevOps Engineer'));
    expect(handleClick).toHaveBeenCalledWith('2');
  });

  it('has section landmark', () => {
    render(<AgentActivity agents={agents} />);
    expect(screen.getByRole('region', { name: 'Agent activity' })).toBeInTheDocument();
  });
});
