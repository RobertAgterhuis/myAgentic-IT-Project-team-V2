import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalDialog } from './modal-dialog';
import { Button } from './button';

function renderModal(props: Partial<React.ComponentProps<typeof ModalDialog>> = {}) {
  return render(
    <ModalDialog
      title="Test Modal"
      open={true}
      onOpenChange={() => {}}
      {...props}
    >
      <p>Modal content</p>
    </ModalDialog>,
  );
}

describe('ModalDialog', () => {
  it('renders with role=dialog', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays title', () => {
    renderModal({ title: 'My Dialog' });
    expect(screen.getByText('My Dialog')).toBeInTheDocument();
  });

  it('displays description when provided', () => {
    renderModal({ description: 'This is helpful context' });
    expect(screen.getByText('This is helpful context')).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderModal();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    renderModal({ footer: <Button>Save</Button> });
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('has close button', () => {
    renderModal();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('calls onOpenChange when close button clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderModal({ onOpenChange });
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders trigger button', () => {
    render(
      <ModalDialog
        title="With Trigger"
        trigger={<Button>Open</Button>}
      >
        <p>Content</p>
      </ModalDialog>,
    );
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });
});
