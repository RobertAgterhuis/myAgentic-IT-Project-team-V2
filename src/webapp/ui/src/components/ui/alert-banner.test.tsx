import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertBanner } from './alert-banner';

describe('AlertBanner', () => {
  it('renders children', () => {
    render(<AlertBanner>Something happened</AlertBanner>);
    expect(screen.getByText('Something happened')).toBeInTheDocument();
  });

  it.each(['info', 'warning', 'error', 'success'] as const)(
    'renders variant=%s',
    (variant) => {
      render(<AlertBanner variant={variant} data-testid="alert">Alert</AlertBanner>);
      expect(screen.getByTestId('alert')).toHaveAttribute('data-variant', variant);
    },
  );

  it('error variant has role=alert', () => {
    render(<AlertBanner variant="error">Error!</AlertBanner>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('non-error variants have role=status', () => {
    render(<AlertBanner variant="info">Info</AlertBanner>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders icon slot', () => {
    render(
      <AlertBanner icon={<span data-testid="icon">I</span>}>
        With icon
      </AlertBanner>,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders action slot', () => {
    render(
      <AlertBanner action={<button>Retry</button>}>
        With action
      </AlertBanner>,
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('dismissible hides banner on click', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <AlertBanner dismissible onDismiss={onDismiss}>
        Dismiss me
      </AlertBanner>,
    );
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
