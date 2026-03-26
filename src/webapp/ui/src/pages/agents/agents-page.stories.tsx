/**
 * Storybook stories for AgentsPage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import AgentsPage from './agents-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Agents',
  component: AgentsPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AgentsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/agents', () =>
          HttpResponse.json({
            agents: [
              {
                id: 'agent-ba',
                name: 'Business Analyst',
                status: 'completed',
                phase: 'PHASE-1',
                task_description: 'Analyzing business requirements and constraints.',
                started_at: '2025-01-15T10:00:00Z',
                duration_ms: 23500,
                outputs: ['BusinessDocs/Phase1-Business/requirements.md'],
                retry_count: 0,
                session_id: 'sess-1',
              },
              {
                id: 'agent-arch',
                name: 'Software Architect',
                status: 'running',
                phase: 'PHASE-2',
                task_description: 'Defining service boundaries and architecture decisions.',
                started_at: '2025-01-15T11:00:00Z',
                duration_ms: 8200,
                outputs: [],
                retry_count: 0,
                session_id: 'sess-1',
              },
              {
                id: 'agent-sec',
                name: 'Security Architect',
                status: 'idle',
                phase: 'PHASE-2',
                task_description: 'Waiting for architecture inputs before security review.',
                started_at: '2025-01-15T09:30:00Z',
                duration_ms: 0,
                outputs: [],
                retry_count: 0,
                session_id: 'sess-1',
              },
            ],
          })
        ),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [http.get('/api/agents', () => HttpResponse.json({ agents: [] }))],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/agents', async () => {
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
        http.get('/api/agents', () =>
          HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 })
        ),
      ],
    },
  },
};
