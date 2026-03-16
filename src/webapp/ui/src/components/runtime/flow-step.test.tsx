import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FlowStep } from './flow-step';

describe('FlowStep', () => {
  it('renders label and status', () => {
    render(<FlowStep label="Discovery" status="completed" isActive={false} />);
    expect(screen.getByRole('button', { name: 'Discovery — completed' })).toBeInTheDocument();
  });

  it('marks active step with aria-current', () => {
    render(<FlowStep label="Architecture" status="running" isActive={true} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'step');
  });

  it('does not set aria-current when not active', () => {
    render(<FlowStep label="Planning" status="pending" isActive={false} />);
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-current');
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(
      <FlowStep label="Discovery" status="completed" isActive={false} onClick={handleClick} />
    );
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it.each(['completed', 'running', 'pending', 'failed', 'paused'] as const)(
    'renders %s status without errors',
    (status) => {
      const { container } = render(<FlowStep label="Step" status={status} isActive={false} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    }
  );

  it('applies green text for completed status (M15-038)', () => {
    const { container } = render(
      <FlowStep label="Discovery" status="completed" isActive={false} />
    );
    expect(container.querySelector('.text-green-700')).toBeInTheDocument();
  });

  it('applies red text for failed status (M15-038)', () => {
    const { container } = render(<FlowStep label="Discovery" status="failed" isActive={false} />);
    expect(container.querySelector('.text-red-700')).toBeInTheDocument();
  });
});
