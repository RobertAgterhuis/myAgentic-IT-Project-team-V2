/**
 * Storybook stories for SessionDetailPage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import SessionDetailPage from './session-detail-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/SessionDetail',
  component: SessionDetailPage,
  decorators: [(Story) => withProviders(Story, { initialEntries: ['/sessions/sess-abc123'] })],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SessionDetailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const sessionData = {
  id: 'sess-abc123',
  name: 'Sprint Planning Session',
  status: 'active' as const,
  created_at: '2025-06-01T10:00:00Z',
  updated_at: '2025-06-01T11:30:00Z',
  mode: 'CREATE',
  phases: ['PHASE-1', 'PHASE-2'],
  current_phase: 'PHASE-2',
  agents: [
    {
      name: 'BusinessAnalyst',
      status: 'completed',
      started_at: '2025-06-01T10:01:00Z',
      duration_ms: 12000,
    },
    {
      name: 'DomainExpert',
      status: 'completed',
      started_at: '2025-06-01T10:05:00Z',
      duration_ms: 8000,
    },
    {
      name: 'SoftwareArchitect',
      status: 'active',
      started_at: '2025-06-01T10:15:00Z',
      duration_ms: null,
    },
  ],
  timeline: [
    { timestamp: '2025-06-01T10:00:00Z', event: 'session_started', detail: 'Session created' },
    {
      timestamp: '2025-06-01T10:01:00Z',
      event: 'agent_started',
      detail: 'BusinessAnalyst started',
    },
    {
      timestamp: '2025-06-01T10:13:00Z',
      event: 'agent_completed',
      detail: 'BusinessAnalyst completed',
    },
    {
      timestamp: '2025-06-01T10:15:00Z',
      event: 'agent_started',
      detail: 'SoftwareArchitect started',
    },
  ],
  artifacts: [{ id: 'art-001', name: 'business-analysis.md', type: 'document' }],
  decisions: [{ id: 'dec-001', title: 'Tech stack selection', status: 'OPEN' }],
};

export const Active: Story = {
  parameters: {
    msw: {
      handlers: [http.get('/api/sessions/:id', () => HttpResponse.json(sessionData))],
    },
  },
};

export const Completed: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/sessions/:id', () =>
          HttpResponse.json({
            ...sessionData,
            status: 'completed',
            agents: sessionData.agents.map((a) => ({
              ...a,
              status: 'completed',
              duration_ms: a.duration_ms ?? 15000,
            })),
          })
        ),
      ],
    },
  },
};

export const Failed: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/sessions/:id', () =>
          HttpResponse.json({
            ...sessionData,
            status: 'failed',
            agents: [
              ...sessionData.agents.slice(0, 2),
              {
                name: 'SoftwareArchitect',
                status: 'failed',
                started_at: '2025-06-01T10:15:00Z',
                duration_ms: 5000,
                error: 'Token budget exceeded',
              },
            ],
          })
        ),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/sessions/:id', async () => {
          await delay('infinite');
          return new HttpResponse(null);
        }),
      ],
    },
  },
};

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/sessions/:id', () =>
          HttpResponse.json({ error: 'Session not found' }, { status: 404 })
        ),
      ],
    },
  },
};
