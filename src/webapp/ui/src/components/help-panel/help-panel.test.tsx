import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { useUIStore } from '@/stores/ui-store';
import { HelpPanel } from './help-panel';

function renderPanel(initialEntries: string[] = ['/commands'], onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <RouterTestWrapper initialEntries={initialEntries}>
        <HelpPanel onClose={onClose} />
      </RouterTestWrapper>
    ),
  };
}

describe('HelpPanel', () => {
  beforeEach(() => {
    useUIStore.setState({
      helpOpen: true,
      helpRouteSlug: 'commands',
      helpTopicId: 'commands-overview',
    });
  });

  it('renders topic HTML, toc entries, and related page links', async () => {
    renderPanel(['/commands']);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /commands overview/i, level: 1 })
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/use create to start a run/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /queueing/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /pipeline/i })).toBeInTheDocument();
  });

  it('defaults to the first page topic when none is selected', async () => {
    useUIStore.setState({
      helpOpen: true,
      helpRouteSlug: 'sessions',
      helpTopicId: null,
    });

    renderPanel(['/sessions']);

    await waitFor(() => {
      expect(screen.getByText(/sessions overview/i)).toBeInTheDocument();
    });

    expect(useUIStore.getState().helpTopicId).toBe('sessions-overview');
  });

  it('closes when escape is pressed', async () => {
    const user = userEvent.setup();
    const { onClose } = renderPanel(['/commands']);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
