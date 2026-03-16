import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusDot } from './status-dot';

describe('StatusDot', () => {
  it.each(['active', 'completed', 'pending', 'error', 'warning'] as const)(
    'renders %s status with correct aria-label',
    (status) => {
      render(<StatusDot status={status} />);
      expect(screen.getByRole('img', { name: `Status: ${status}` })).toBeInTheDocument();
    }
  );

  it('renders ping animation when animated and active', () => {
    const { container } = render(<StatusDot status="active" animated />);
    expect(container.querySelector('.animate-ping')).toBeInTheDocument();
  });

  it('does not render ping animation when animated but not active', () => {
    const { container } = render(<StatusDot status="completed" animated />);
    expect(container.querySelector('.animate-ping')).not.toBeInTheDocument();
  });

  it('does not render ping animation when not animated', () => {
    const { container } = render(<StatusDot status="active" />);
    expect(container.querySelector('.animate-ping')).not.toBeInTheDocument();
  });

  it('applies size classes', () => {
    const { container } = render(<StatusDot status="active" size="lg" />);
    expect(container.firstChild).toHaveClass('size-4');
  });
});
