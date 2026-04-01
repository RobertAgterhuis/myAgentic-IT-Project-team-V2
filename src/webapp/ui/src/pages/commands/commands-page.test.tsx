/**
 * Commands page tests — M15 / Issue #M15-031
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import CommandsPage from './commands-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { server } from '@/test/msw-server';

async function renderPage() {
  const view = render(
    <RouterTestWrapper initialEntries={['/commands']}>
      <CommandsPage />
    </RouterTestWrapper>
  );

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /commands/i })).toBeInTheDocument();
  });

  return view;
}

describe('CommandsPage', () => {
  it('renders the page heading as Commands', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { name: /commands/i })).toBeInTheDocument();
  });

  it('renders project brief form', async () => {
    await renderPage();
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/brief description/i)).toBeInTheDocument();
  });

  it('renders explicit guidance for how to proceed', async () => {
    await renderPage();
    expect(screen.getByText(/recommended next step/i)).toBeInTheDocument();
    expect(screen.getByText(/show step-by-step guide/i)).toBeInTheDocument();
    expect(screen.getByText(/what happens when you click submit brief/i)).toBeInTheDocument();
  });

  it('renders the page help strip', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('page-help-strip-commands')).toBeInTheDocument();
    });
  });

  it('renders quick action cards', async () => {
    await renderPage();
    expect(screen.getAllByText('CREATE').length).toBeGreaterThan(0);
    expect(screen.getByText('CREATE BUSINESS')).toBeInTheDocument();
    expect(screen.getByText('CREATE TECH')).toBeInTheDocument();
    expect(screen.getByText('CREATE UX')).toBeInTheDocument();
    expect(screen.getByText('CREATE MARKETING')).toBeInTheDocument();
    expect(screen.getAllByText('AUDIT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FEATURE').length).toBeGreaterThan(0);
    expect(screen.getByText('SCOPE CHANGE')).toBeInTheDocument();
    expect(screen.getByText('HOTFIX')).toBeInTheDocument();
    expect(screen.getByText('AGENCY ONLY')).toBeInTheDocument();
    expect(screen.getByText('HYBRID')).toBeInTheDocument();
  });

  it('renders empty queue state', async () => {
    await renderPage();
    expect(screen.getByText(/no commands in queue/i)).toBeInTheDocument();
  });

  it('submit button is disabled when brief is empty', async () => {
    await renderPage();
    const btn = screen.getByRole('button', { name: /submit brief/i });
    expect(btn).toBeDisabled();
  });

  it('submit button stays disabled until project name and brief are both filled', async () => {
    const user = userEvent.setup();
    await renderPage();
    const projectName = screen.getByLabelText(/project name/i);
    const textarea = screen.getByLabelText(/brief description/i);

    await user.type(textarea, 'Test project');
    const btn = screen.getByRole('button', { name: /submit brief/i });
    expect(btn).toBeDisabled();

    await user.type(projectName, 'My project');
    expect(btn).toBeEnabled();
  });

  it('renders pack-driven quick actions for non-SDLC metadata', async () => {
    server.use(
      http.get('/api/orchestrator/pack-metadata', () =>
        HttpResponse.json({
          ok: true,
          pack: {
            manifest_version: '2.0',
            id: 'ops-command-center',
            name: 'Operations Command Center',
            version: '1.0.0',
          },
          commands: [
            { id: 'TRIAGE', label: 'TRIAGE', mode: true },
            { id: 'CONTAIN', label: 'CONTAIN', mode: true },
            { id: 'RESTORE', label: 'RESTORE', mode: true },
            { id: 'POSTMORTEM', label: 'POSTMORTEM', mode: true },
          ],
          stages: [],
          gates: [],
          labels: {
            commands: {
              TRIAGE: 'TRIAGE',
              CONTAIN: 'CONTAIN',
              RESTORE: 'RESTORE',
              POSTMORTEM: 'POSTMORTEM',
            },
            stages: {},
            gates: {},
          },
          help_topics: [],
          capabilities: {
            supportsRuntimeGraph: true,
            supportsCommandCatalog: true,
            supportsHelpTopics: false,
            supportsArtifactNamespaces: true,
            supportsGateAssets: false,
            parallelDispatchStates: [],
          },
          warnings: [],
        })
      )
    );

    await renderPage();
    expect(screen.getAllByText('TRIAGE').length).toBeGreaterThan(0);
    expect(screen.getByText('CONTAIN')).toBeInTheDocument();
    expect(screen.getByText('RESTORE')).toBeInTheDocument();
    expect(screen.getByText('POSTMORTEM')).toBeInTheDocument();
  });
});
