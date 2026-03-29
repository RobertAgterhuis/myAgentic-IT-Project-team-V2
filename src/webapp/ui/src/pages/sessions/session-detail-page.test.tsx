/**
 * Session Detail page tests — M15 / Issues #M15-029, #M15-034, #M15-035, #M15-036, #M15-037, #M15-038
 */
import { describe, it, expect, afterAll, afterEach, beforeAll, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import SessionDetailPage from './session-detail-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { Route, Routes } from 'react-router-dom';
import { server } from '@/test/msw-server';
import { mockSession, mockAgentDetail, mockTimelineWithGateFailure } from '@/test/msw-handlers';
import type { SessionDetailResponse } from '@/lib/api-types';
import { useRuntimeStore } from '@/stores/runtime-store';

const originalConsoleError = console.error;

beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const message = String(args[0] ?? '');
    if (message.includes('not wrapped in act')) return;
    originalConsoleError(...(args as Parameters<typeof console.error>));
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});

async function renderPage(sessionId = 'sess-test-001') {
  let view: ReturnType<typeof render> | null = null;
  await act(async () => {
    view = render(
      <RouterTestWrapper initialEntries={[`/sessions/${sessionId}`]}>
        <Routes>
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
        </Routes>
      </RouterTestWrapper>
    );
  });
  return view;
}

afterEach(() => {
  useRuntimeStore.getState().clearEvents();
});

describe('SessionDetailPage', () => {
  it('renders the page container', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });
  });

  it('renders session project name', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: /TestProject/i }).length).toBeGreaterThan(0);
    });
  });

  it('renders status badge', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('active').length).toBeGreaterThan(0);
    });
  });

  it('renders phase timeline section', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getAllByLabelText(/phase timeline/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders agent activity section', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getAllByLabelText(/agent activity/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders runtime log section', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/runtime log/i)).toBeInTheDocument();
    });
  });

  it('renders the shared intervention console', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('intervention-console')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /cancel run/i })).toBeInTheDocument();
  });

  it('shows not found for unknown session', async () => {
    await renderPage('unknown-id');
    await waitFor(() => {
      expect(screen.getByText(/Failed to load (session|data):/i)).toBeInTheDocument();
      expect(screen.getByText(/Not found/i)).toBeInTheDocument();
    });
  });
});

describe('SessionDetailPage — M15-034: Phase click filtering', () => {
  it('shows clear filter option after clicking a phase', async () => {
    await renderPage();
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const phaseButton = screen.getByRole('button', { name: /PHASE 1 — running/i });
    await user.click(phaseButton);

    expect(screen.getByText(/Filtering: PHASE-1/)).toBeInTheDocument();
    expect(screen.getByText(/Clear filter/i)).toBeInTheDocument();
  });

  it('clears phase filter when clicking clear', async () => {
    await renderPage();
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const phaseButton = screen.getByRole('button', { name: /PHASE 1 — running/i });
    await user.click(phaseButton);
    expect(screen.getByText(/Filtering: PHASE-1/)).toBeInTheDocument();

    await user.click(screen.getByText(/Clear filter/i));
    expect(screen.queryByText(/Filtering:/i)).not.toBeInTheDocument();
  });

  it('toggles filter off when same phase clicked again', async () => {
    await renderPage();
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const phaseButton = screen.getByRole('button', { name: /PHASE 1 — running/i });
    await user.click(phaseButton);
    expect(screen.getByText(/Filtering: PHASE-1/)).toBeInTheDocument();

    await user.click(phaseButton);
    expect(screen.queryByText(/Filtering:/i)).not.toBeInTheDocument();
  });
});

describe('SessionDetailPage — M15-035: Agent click explainability', () => {
  it('shows explainability panel when clicking an agent', async () => {
    await renderPage();
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const agentCard = screen.getByRole('button', { name: /Business Analyst — Running/i });
    await user.click(agentCard);

    expect(screen.getByText(/Agent: Business Analyst/)).toBeInTheDocument();
    expect(screen.getAllByText(/Processing PHASE-1/).length).toBeGreaterThanOrEqual(1);
  });

  it('toggles explainability panel off when clicking same agent again', async () => {
    await renderPage();
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const agentCard = screen.getByRole('button', { name: /Business Analyst — Running/i });
    await user.click(agentCard);
    expect(screen.getByText(/Agent: Business Analyst/)).toBeInTheDocument();

    await user.click(agentCard);
    expect(screen.queryByText(/Agent: Business Analyst/)).not.toBeInTheDocument();
  });
});

describe('SessionDetailPage — M15-036: Merged runtime log events', () => {
  it('renders query timeline events in the log', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const runtimeEvents = screen.getByRole('list', { name: /runtime events/i });
    expect(
      within(runtimeEvents).getByText(/Session started: CREATE for TestProject/)
    ).toBeInTheDocument();
    expect(within(runtimeEvents).getByText(/Phase started: PHASE-1/)).toBeInTheDocument();
  });

  it('merges runtime store events into the log', async () => {
    useRuntimeStore.getState().addEvent({
      id: 'sse-live-001',
      type: 'agent_complete',
      timestamp: '2026-03-01T10:01:00Z',
      description: 'Agent completed: Business Analyst',
      agent: '01-business-analyst',
      phase: 'PHASE-1',
    });

    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const runtimeEvents = screen.getByRole('list', { name: /runtime events/i });
    expect(
      within(runtimeEvents).getByText(/Agent completed: Business Analyst/)
    ).toBeInTheDocument();
  });

  it('deduplicates events by id', async () => {
    // Add an event with the same ID as a query event — should not appear twice
    useRuntimeStore.getState().addEvent({
      id: 'evt-001',
      type: 'session_start',
      timestamp: '2026-03-01T10:00:00Z',
      description: 'Session started: CREATE for TestProject',
    });

    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const runtimeEvents = screen.getByRole('list', { name: /runtime events/i });
    const matches = within(runtimeEvents).getAllByText(/Session started: CREATE for TestProject/);
    expect(matches).toHaveLength(1);
  });
});

describe('SessionDetailPage — M15-037: Gate failure panel', () => {
  async function renderWithGateFailure() {
    server.use(
      http.get('/api/sessions/:id', () => {
        const resp: SessionDetailResponse = {
          ok: true,
          session: mockSession,
          agents: [mockAgentDetail],
          timeline: mockTimelineWithGateFailure,
        };
        return HttpResponse.json(resp);
      })
    );
    return renderPage();
  }

  it('shows gate failure prompt when gate_failed event exists', async () => {
    await renderWithGateFailure();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(/Gate failure detected/i)).toBeInTheDocument();
  });

  it('shows gate failure details when prompt is clicked', async () => {
    await renderWithGateFailure();
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const prompt = screen.getByText(/Gate failure detected/i).closest('[class*="cursor-pointer"]');
    expect(prompt).toBeTruthy();
    await user.click(prompt!);

    expect(screen.getByText('Gate Failed')).toBeInTheDocument();
    expect(screen.getAllByText(/PHASE-1 has 2 violations/).length).toBeGreaterThanOrEqual(1);
  });

  it('dismisses gate failure panel', async () => {
    await renderWithGateFailure();
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const prompt = screen.getByText(/Gate failure detected/i).closest('[class*="cursor-pointer"]');
    await user.click(prompt!);
    expect(screen.getByText('Gate Failed')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('Gate Failed')).not.toBeInTheDocument();
  });

  it('renders artifact creation events', async () => {
    await renderWithGateFailure();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/product-vision\.md/).length).toBeGreaterThanOrEqual(1);
  });
});

describe('SessionDetailPage — M15-038: Artifacts section', () => {
  it('renders "No artifacts" when timeline has no artifact events', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(/No artifacts created yet/i)).toBeInTheDocument();
  });

  it('renders "No decisions" when timeline has no decision events', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(/No decisions recorded yet/i)).toBeInTheDocument();
  });

  it('shows detail panel placeholder when no agent selected', async () => {
    await renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(/Click an agent to view details/i)).toBeInTheDocument();
  });
});
