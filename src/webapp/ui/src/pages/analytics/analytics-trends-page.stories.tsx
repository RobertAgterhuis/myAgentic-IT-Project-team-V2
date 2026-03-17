/**
 * Storybook stories for AnalyticsTrendsPage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import AnalyticsTrendsPage from './analytics-trends-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/AnalyticsTrends',
  component: AnalyticsTrendsPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AnalyticsTrendsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const trendsData = {
  velocity: [
    { sprint: 'SP-1', planned: 8, completed: 7 },
    { sprint: 'SP-2', planned: 10, completed: 9 },
    { sprint: 'SP-3', planned: 12, completed: 12 },
  ],
  dora: {
    deployment_frequency: [
      { date: '2025-01-01', value: 2.1 },
      { date: '2025-02-01', value: 3.0 },
    ],
    lead_time: [
      { date: '2025-01-01', value: 48 },
      { date: '2025-02-01', value: 36 },
    ],
    mttr: [
      { date: '2025-01-01', value: 120 },
      { date: '2025-02-01', value: 90 },
    ],
    change_failure_rate: [
      { date: '2025-01-01', value: 15 },
      { date: '2025-02-01', value: 10 },
    ],
  },
};

const agentsData = {
  agents: [
    {
      name: 'BusinessAnalyst',
      invocations: 42,
      avg_duration_ms: 1500,
      success_rate: 0.95,
      tokens_used: 120000,
    },
    {
      name: 'Architect',
      invocations: 28,
      avg_duration_ms: 2200,
      success_rate: 0.89,
      tokens_used: 95000,
    },
    {
      name: 'SecurityArchitect',
      invocations: 15,
      avg_duration_ms: 1800,
      success_rate: 1.0,
      tokens_used: 60000,
    },
  ],
};

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/analytics/trends', () => HttpResponse.json(trendsData)),
        http.get('/api/analytics/agents', () => HttpResponse.json(agentsData)),
      ],
    },
  },
};

export const NoData: Story = {
  name: 'Empty (No Data)',
  parameters: {
    msw: {
      handlers: [
        http.get('/api/analytics/trends', () => HttpResponse.json({ velocity: [], dora: {} })),
        http.get('/api/analytics/agents', () => HttpResponse.json({ agents: [] })),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/analytics/trends', async () => {
          await delay('infinite');
          return new HttpResponse(null);
        }),
        http.get('/api/analytics/agents', async () => {
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
        http.get('/api/analytics/trends', () =>
          HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 })
        ),
        http.get('/api/analytics/agents', () =>
          HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 })
        ),
      ],
    },
  },
};
