import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './spinner';
import { Skeleton } from './skeleton';

describe('Spinner', () => {
  it('renders with role=status', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-busy=true', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
  });

  it('renders accessible label', () => {
    render(<Spinner label="Saving" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Saving');
    expect(screen.getByText('Saving')).toBeInTheDocument();
  });

  it('defaults label to Loading', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading');
  });
});

describe('Skeleton', () => {
  it('renders with aria-busy', () => {
    render(<Skeleton data-testid="skel" />);
    expect(screen.getByTestId('skel')).toHaveAttribute('aria-busy', 'true');
  });

  it('has animate-pulse class', () => {
    render(<Skeleton data-testid="skel" />);
    expect(screen.getByTestId('skel').className).toMatch(/animate-pulse/);
  });

  it.each(['line', 'circle', 'rectangle'] as const)('renders %s variant', (variant) => {
    render(<Skeleton data-testid="skel" variant={variant} />);
    expect(screen.getByTestId('skel')).toHaveAttribute('data-variant', variant);
  });

  it('defaults to line variant', () => {
    render(<Skeleton data-testid="skel" />);
    expect(screen.getByTestId('skel')).toHaveAttribute('data-variant', 'line');
  });
});
