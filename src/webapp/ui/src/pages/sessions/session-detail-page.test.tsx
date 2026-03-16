/**
 * Session Detail page tests — M15 / Issues #M15-029, #M15-034, #M15-035, #M15-036, #M15-037, #M15-038
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import SessionDetailPage from './session-detail-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { Route, Routes } from 'react-router-dom';
import { server } from '@/test/msw-server';
import { mockSession, mockAgentDetail, mockTimelineWithGateFailure } from '@/test/msw-handlers';
import type { SessionDetailResponse } from '@/lib/api-types';
import { useRuntimeStore } from '@/stores/runtime-store';

function renderPage(sessionId = 'sess-test-001') {
  return render(
    <RouterTestWrapper initialEntries={[`/sessions/${sessionId}`]}>
      <Routes>
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
      </Routes>
    </RouterTestWrapper>
  );
}

afterEach(() => {
  useRuntimeStore.getState().clearEvents();
});

describe('SessionDetailPage', () => {
  it('renders the page container', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });
  });

  it('renders session project name', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /TestProject/i })).toBeInTheDocument();
    });
  });

  it('renders status badge', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  it('renders phase timeline section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByLabelText(/phase timeline/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders agent activity section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByLabelText(/agent activity/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders runtime log section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/runtime log/i)).toBeInTheDocument();
    });
  });

  it('shows not found for unknown session', async () => {
    renderPage('unknown-id');
    await waitFor(() => {
      expect(screen.getByText(/session not found/i)).toBeInTheDocument();
    });
  });
});

describe('SessionDetailPage — M15-034: Phase click filtering', () => {
  it('shows clear filter option after clicking a phase', async () => {
    renderPage();
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
    renderPage();
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
    renderPage();
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
    renderPage();
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const agentCard = screen.getByRole('button', { name: /Business Analyst/i });
    await user.click(agentCard);

    expect(screen.getByText(/Agent: Business Analyst/)).toBeInTheDocument();
    expect(screen.getAllByText(/Processing PHASE-1/).length).toBeGreaterThanOrEqual(1);
  });

  it('toggles explainability panel off when clicking same agent again', async () => {
    renderPage();
    const user = userEvent.setup();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const agentCard = screen.getByRole('button', { name: /Business Analyst/i });
    await user.click(agentCard);
    expect(screen.getByText(/Agent: Business Analyst/)).toBeInTheDocument();

    await user.click(agentCard);
    expect(screen.queryByText(/Agent: Business Analyst/)).not.toBeInTheDocument();
  });
});

describe('SessionDetailPage — M15-036: Merged runtime log events', () => {
  it('renders query timeline events in the log', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(/Session started: CREATE for TestProject/)).toBeInTheDocument();
    expect(screen.getByText(/Phase started: PHASE-1/)).toBeInTheDocument();
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

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(/Agent completed: Business Analyst/)).toBeInTheDocument();
  });

  it('deduplicates events by id', async () => {
    // Add an event with the same ID as a query event — should not appear twice
    useRuntimeStore.getState().addEvent({
      id: 'evt-001',
      type: 'session_start',
      timestamp: '2026-03-01T10:00:00Z',
      description: 'Session started: CREATE for TestProject',
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    const matches = screen.getAllByText(/Session started: CREATE for TestProject/);
    expect(matches).toHaveLength(1);
  });
});

describe('SessionDetailPage — M15-037: Gate failure panel', () => {
  function renderWithGateFailure() {
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
    renderWithGateFailure();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(/Gate failure detected/i)).toBeInTheDocument();
  });

  it('shows gate failure details when prompt is clicked', async () => {
    renderWithGateFailure();
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
    renderWithGateFailure();
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
    renderWithGateFailure();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/product-vision\.md/).length).toBeGreaterThanOrEqual(1);
  });
});

describe('SessionDetailPage — M15-038: Artifacts section', () => {
  it('renders "No artifacts" when timeline has no artifact events', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(/No artifacts created yet/i)).toBeInTheDocument();
  });

  it('renders "No decisions" when timeline has no decision events', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(/No decisions recorded yet/i)).toBeInTheDocument();
  });

  it('shows detail panel placeholder when no agent selected', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('session-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByText(/Click an agent to view details/i)).toBeInTheDocument();
  });
});
