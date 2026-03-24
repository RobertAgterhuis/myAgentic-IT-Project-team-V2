import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { RouterTestWrapper } from '../../test/router-test-wrapper';
import { server } from '../../test/msw-server';
import { useUIStore } from '../../stores/ui-store';
import { PageHelpStrip } from './page-help-strip';

function renderStrip(routeSlug = 'commands') {
  return render(
    <RouterTestWrapper initialEntries={[`/${routeSlug}`]}>
      <PageHelpStrip routeSlug={routeSlug} />
    </RouterTestWrapper>
  );
}

describe('PageHelpStrip', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ helpOpen: false, helpRouteSlug: null, helpTopicId: null });
  });

  it('renders purpose and core actions for a route with help content', async () => {
    renderStrip('commands');

    await waitFor(() => {
      expect(screen.getByTestId('page-help-strip-commands')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/queue and guide orchestrator commands with clear project intent/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/create/i)).toBeInTheDocument();
  });

  it('caps visible core actions to five items', async () => {
    server.use(
      http.get('/api/v1/help/page/:routeSlug', () =>
        HttpResponse.json({
          routeSlug: 'commands',
          routePath: '/commands',
          pageTitle: 'Commands',
          purpose: 'Purpose text',
          coreActions: [
            { label: 'One', description: 'Action 1' },
            { label: 'Two', description: 'Action 2' },
            { label: 'Three', description: 'Action 3' },
            { label: 'Four', description: 'Action 4' },
            { label: 'Five', description: 'Action 5' },
            { label: 'Six', description: 'Action 6' },
          ],
          inputsOutputs: 'x',
          permissions: 'Operator',
          relatedPages: [],
          keywords: [],
          topicLinks: [],
        })
      )
    );

    renderStrip('commands');

    await waitFor(() => {
      expect(screen.getByText(/one/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/five/i)).toBeInTheDocument();
    expect(screen.queryByText(/six/i)).not.toBeInTheDocument();
  });

  it('persists collapsed state in localStorage per route', async () => {
    const user = userEvent.setup();
    const key = 'page-help-strip:collapsed:commands';

    const firstRender = renderStrip('commands');
    await waitFor(() => {
      expect(screen.getByTestId('page-help-strip-commands')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /hide/i }));

    expect(localStorage.getItem(key)).toBe('true');
    expect(
      screen.queryByText(/queue and guide orchestrator commands with clear project intent/i)
    ).not.toBeInTheDocument();

    firstRender.unmount();
    renderStrip('commands');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /show/i })).toBeInTheDocument();
    });
  });

  it('opens the help panel when Learn more is clicked', async () => {
    const user = userEvent.setup();
    renderStrip('commands');

    await waitFor(() => {
      expect(screen.getByTestId('page-help-strip-commands')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /learn more/i }));

    expect(useUIStore.getState().helpOpen).toBe(true);
    expect(useUIStore.getState().helpRouteSlug).toBe('commands');
    expect(useUIStore.getState().helpTopicId).toBe('commands-overview');
  });

  it('renders state-variant guidance and quick action links', async () => {
    server.use(
      http.get('/api/v1/help/page/:routeSlug', () =>
        HttpResponse.json({
          routeSlug: 'commands',
          routePath: '/commands',
          pageTitle: 'Commands',
          purpose: 'Purpose text',
          coreActions: [],
          inputsOutputs: 'x',
          permissions: 'Operator',
          relatedPages: [],
          keywords: [],
          topicLinks: [],
          stateVariants: [
            {
              condition: 'no_active_workspace',
              additionalContent: 'You need an active workspace and project first.',
            },
            {
              condition: 'pending_approvals_gt_0',
              additionalContent: 'N approvals pending. Each requires review to continue.',
            },
          ],
        })
      )
    );

    renderStrip('commands');

    await waitFor(() => {
      expect(screen.getByText(/active workspace and project first/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /open workspaces/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open approval center/i })).toBeInTheDocument();
  });
});
