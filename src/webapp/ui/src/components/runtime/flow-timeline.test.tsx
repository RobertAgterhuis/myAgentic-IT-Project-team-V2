import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FlowTimeline, type FlowPhase } from './flow-timeline';

const samplePhases: FlowPhase[] = [
  { id: '1', label: 'Discovery', status: 'completed' },
  { id: '2', label: 'Architecture', status: 'running' },
  { id: '3', label: 'Planning', status: 'pending' },
];

describe('FlowTimeline', () => {
  it('renders all phases', () => {
    render(<FlowTimeline phases={samplePhases} />);
    expect(screen.getByRole('button', { name: 'Discovery — completed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Architecture — running' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planning — pending' })).toBeInTheDocument();
  });

  it('renders empty state when no phases', () => {
    render(<FlowTimeline phases={[]} />);
    expect(screen.getByText('No phases available')).toBeInTheDocument();
  });

  it('calls onPhaseClick with phase id', async () => {
    const handleClick = vi.fn();
    render(<FlowTimeline phases={samplePhases} onPhaseClick={handleClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Architecture — running' }));
    expect(handleClick).toHaveBeenCalledWith('2');
  });

  it('marks active phase', () => {
    render(<FlowTimeline phases={samplePhases} activePhaseId="2" />);
    expect(screen.getByRole('button', { name: 'Architecture — running' })).toHaveAttribute(
      'aria-current',
      'step'
    );
  });

  it('has navigation landmark', () => {
    render(<FlowTimeline phases={samplePhases} />);
    expect(screen.getByRole('navigation', { name: 'Phase timeline' })).toBeInTheDocument();
  });
});
