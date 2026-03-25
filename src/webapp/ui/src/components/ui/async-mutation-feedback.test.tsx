import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AsyncMutationFeedback } from './async-mutation-feedback';

describe('AsyncMutationFeedback', () => {
  it('renders pending state text', () => {
    render(
      <AsyncMutationFeedback
        mutation={{ isPending: true, isSuccess: false, isError: false, error: null }}
        pendingMessage="Working..."
      />
    );

    expect(screen.getByText('Working...')).toBeTruthy();
  });

  it('renders success state text', () => {
    render(
      <AsyncMutationFeedback
        mutation={{ isPending: false, isSuccess: true, isError: false, error: null }}
        successMessage="Done."
      />
    );

    expect(screen.getByText('Done.')).toBeTruthy();
  });

  it('renders error state with retry action', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <AsyncMutationFeedback
        mutation={{
          isPending: false,
          isSuccess: false,
          isError: true,
          error: new Error('Network timed out'),
        }}
        errorMessagePrefix="Save failed."
        onRetry={onRetry}
      />
    );

    expect(screen.getByText(/Save failed\. Network timed out/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
