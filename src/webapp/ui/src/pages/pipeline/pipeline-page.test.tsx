/**
 * Pipeline page tests — Issue #240 (S9F-33)
 */
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import PipelinePage from './pipeline-page';
import { RouterTestWrapper } from '@/test/router-test-wrapper';
import { server } from '@/test/msw-server';
import type { ProgressResponse } from '@/lib/api-types';

const populatedProgress: ProgressResponse = {
  active: true,
  command: null,
  session: {
    session_id: 'sess-test-001',
    cycle_type: 'FEATURE',
    status: 'RUNNING',
    current_phase: 'PHASE-2',
    current_agent: '05-software-architect',
    current_step: 'Drafting technical design',
    initiated_at: '2026-03-18T09:00:00Z',
    last_updated: '2026-03-18T09:10:00Z',
    blockers: [],
    open_human_escalations: [],
  },
  phases: [
    {
      key: 'ONBOARDING',
      label: 'Onboarding',
      status: 'done',
      done: 1,
      total: 1,
      agents: [{ id: '25', name: 'Onboarding Agent', status: 'done' }],
    },
    {
      key: 'PHASE-1',
      label: 'Phase 1 — Requirements & Strategy',
      status: 'done',
      done: 6,
      total: 6,
      agents: [
        { id: '01', name: 'Business Analyst', status: 'done' },
        { id: '02', name: 'Domain Expert', status: 'done' },
        { id: '03', name: 'Sales Strategist', status: 'done' },
        { id: '04', name: 'Financial Analyst', status: 'done' },
        { id: '34', name: 'Product Manager', status: 'done' },
        { id: 'critic_risk', name: 'Critic + Risk', status: 'done' },
      ],
    },
    {
      key: 'PHASE-2',
      label: 'Phase 2 — Architecture & Design',
      status: 'active',
      done: 1,
      total: 7,
      agents: [
        { id: '05', name: 'Software Architect', status: 'active' },
        { id: '06', name: 'Senior Developer', status: 'pending' },
        { id: '07', name: 'DevOps Engineer', status: 'pending' },
        { id: '08', name: 'Security Architect', status: 'pending' },
        { id: '09', name: 'Data Architect', status: 'pending' },
        { id: '33', name: 'Legal Counsel', status: 'pending' },
        { id: 'critic_risk', name: 'Critic + Risk', status: 'pending' },
      ],
    },
  ],
};

function renderPage() {
  return render(
    <RouterTestWrapper initialEntries={['/pipeline']}>
      <PipelinePage />
    </RouterTestWrapper>
  );
}

describe('PipelinePage', () => {
  it('renders the page heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /follow orchestration like a governed flight deck/i })
      ).toBeInTheDocument();
    });
  });

  it('renders pipeline motifs for governance, agents, and human loop', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/phase gates stay explicit/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/agent motion is trackable/i)).toBeInTheDocument();
    expect(screen.getByText(/escalations stop silent failure/i)).toBeInTheDocument();
  });

  it('renders page guidance explaining how to use the pipeline', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/how to use this page/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/recommended next step/i)).toBeInTheDocument();
  });

  it('renders orchestrator status badge', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('IDLE').length).toBeGreaterThan(0);
    });
  });

  it('renders phases as swimlanes with visible agents', async () => {
    server.use(
      http.get('/api/orchestrator/status', () =>
        HttpResponse.json({ state: 'RUNNING', mode: 'FEATURE' })
      ),
      http.get('/api/progress', () => HttpResponse.json(populatedProgress))
    );

    renderPage();
    await waitFor(() => {
      expect(screen.getByLabelText(/phase 2 .* swimlane/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Onboarding Agent')).toBeInTheDocument();
    expect(screen.getAllByText('Software Architect').length).toBeGreaterThan(0);
  });

  it('shows the active agent inside the active swimlane', async () => {
    server.use(
      http.get('/api/orchestrator/status', () =>
        HttpResponse.json({ state: 'RUNNING', mode: 'FEATURE' })
      ),
      http.get('/api/progress', () => HttpResponse.json(populatedProgress))
    );

    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Active agent').length).toBeGreaterThan(0);
    });

    const phaseLane = screen.getByLabelText(/phase 2 .* swimlane/i);
    expect(within(phaseLane).getAllByText('Software Architect').length).toBeGreaterThan(0);
    expect(within(phaseLane).getAllByText('Active').length).toBeGreaterThan(0);
  });

  it('shows when an agent needs more information', async () => {
    server.use(
      http.get('/api/orchestrator/status', () =>
        HttpResponse.json({ state: 'RUNNING', mode: 'FEATURE' })
      ),
      http.get('/api/progress', () =>
        HttpResponse.json({
          ...populatedProgress,
          session: {
            ...populatedProgress.session!,
            status: 'AWAITING_HUMAN',
            blockers: [
              {
                blocker_id: 'BLK-100',
                type: 'HUMAN_REQUIRED',
                description: 'Decision needed from user',
              },
            ],
            open_human_escalations: [
              {
                escalation_id: 'ESC-100',
                raised_by: 'Software Architect',
                raised_at: '2026-03-18T09:20:00Z',
                type: 'SCOPE_DECISION',
                question: 'Choose the deployment topology',
                timeout_action: 'PAUSE',
                timeout_at: null,
                status: 'OPEN',
                answer: null,
                answered_at: null,
              },
            ],
          },
        })
      )
    );

    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Needs human input').length).toBeGreaterThan(0);
    });

    const phaseLane = screen.getByLabelText(/phase 2 .* swimlane/i);
    expect(
      within(phaseLane).getByText(/waiting for answer before the agent can continue/i)
    ).toBeInTheDocument();
    expect(
      within(phaseLane).getByText(/1 open escalation\(s\) and 1 human blocker\(s\)/i)
    ).toBeInTheDocument();
  });
});
