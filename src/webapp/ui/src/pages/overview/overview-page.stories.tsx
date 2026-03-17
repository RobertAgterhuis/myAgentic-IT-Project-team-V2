/**
 * Storybook stories for OverviewPage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import OverviewPage from './overview-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Overview',
  component: OverviewPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof OverviewPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const sessionsData = {
  sessions: [
    {
      id: 'sess-001',
      status: 'active',
      flow: 'CREATE',
      project: 'my-saas-app',
      phase: 'PHASE-2',
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-15T12:30:00Z',
    },
  ],
};

const sessionDetail = {
  ok: true,
  session: sessionsData.sessions[0],
  agents: [
    {
      id: 'agent-ba',
      name: 'Business Analyst',
      status: 'completed',
      phase: 'PHASE-1',
      role: 'analysis',
      task_description: 'Analyze business requirements',
      started_at: '2025-01-15T10:00:00Z',
      retry_count: 0,
    },
  ],
  timeline: [],
};

const healthData = {
  ok: true,
  data: {
    api: { status: 'healthy', latency_ms: 42 },
    database: { status: 'healthy', latency_ms: 12 },
  },
  timestamp: new Date().toISOString(),
};

const decisionsData = { all: [], open: [] };
const questionnairesData = { questionnaires: [] };
const approvalsData = [];

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/sessions', () => HttpResponse.json(sessionsData)),
        http.get('/api/sessions/:id', () => HttpResponse.json(sessionDetail)),
        http.get('/api/dashboard/health', () => HttpResponse.json(healthData)),
        http.get('/api/decisions', () => HttpResponse.json(decisionsData)),
        http.get('/api/questionnaires', () => HttpResponse.json(questionnairesData)),
        http.get('/api/approvals', () => HttpResponse.json(approvalsData)),
      ],
    },
  },
};

export const FirstTimeUser: Story = {
  name: 'First Time User (No Sessions)',
  parameters: {
    msw: {
      handlers: [
        http.get('/api/sessions', () => HttpResponse.json({ sessions: [] })),
        http.get('/api/dashboard/health', () => HttpResponse.json(healthData)),
        http.get('/api/decisions', () => HttpResponse.json(decisionsData)),
        http.get('/api/questionnaires', () => HttpResponse.json(questionnairesData)),
        http.get('/api/approvals', () => HttpResponse.json(approvalsData)),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/*', async () => {
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
        http.get('/api/sessions', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        ),
        http.get('/api/dashboard/health', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        ),
        http.get('/api/decisions', () => HttpResponse.json(decisionsData)),
        http.get('/api/questionnaires', () => HttpResponse.json(questionnairesData)),
        http.get('/api/approvals', () => HttpResponse.json(approvalsData)),
      ],
    },
  },
};
