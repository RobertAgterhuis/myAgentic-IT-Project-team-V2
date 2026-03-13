import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Badge } from '@/components/ui/badge';

describe('Badge', () => {
  it('renders with text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders correct variant data attribute', () => {
    render(<Badge variant="success">Done</Badge>);
    expect(screen.getByText('Done')).toHaveAttribute('data-variant', 'success');
  });

  it.each(['success', 'warning', 'error', 'info', 'neutral'] as const)(
    'renders %s variant',
    (variant) => {
      render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toHaveAttribute('data-variant', variant);
    }
  );

  it('renders dot indicator', () => {
    const { container } = render(<Badge dot>Status</Badge>);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('renders removable badge with remove button', () => {
    render(
      <Badge removable onRemove={() => {}}>
        Tag
      </Badge>
    );
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked', async () => {
    const handleRemove = vi.fn();
    render(
      <Badge removable onRemove={handleRemove}>
        Tag
      </Badge>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(handleRemove).toHaveBeenCalledOnce();
  });
});
