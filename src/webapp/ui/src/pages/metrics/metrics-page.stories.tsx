/**
 * Storybook stories for MetricsPage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import MetricsPage from './metrics-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Metrics',
  component: MetricsPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof MetricsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const driftData = {
  drifts: [
    {
      id: 'drift-001',
      type: 'story_mismatch',
      severity: 'critical',
      sprint: 'SP-1',
      description: 'Story acceptance criteria changed post-implementation',
    },
    {
      id: 'drift-002',
      type: 'scope_creep',
      severity: 'warning',
      sprint: 'SP-1',
      description: 'New stories added mid-sprint',
    },
  ],
  summary: { total_drifts: 2, critical: 1, warning: 1, info: 0 },
  in_sync: { sprints: ['SP-0'], stories: 12 },
};

const progressData = {
  active: true,
  session: null,
  phases: [
    { key: 'PHASE-1', label: 'Requirements', status: 'done', agents: [], total: 5, done: 5 },
    { key: 'PHASE-2', label: 'Architecture', status: 'active', agents: [], total: 5, done: 3 },
    { key: 'PHASE-3', label: 'Experience', status: 'pending', agents: [], total: 5, done: 0 },
  ],
  sprints: { total: 2, statuses: { completed: 1, active: 1 } },
  command: null,
};

const dashboardMetricsData = {
  http_requests: { label: 'HTTP Requests', value: 18420, trend: 'up', period: '+6%' },
  error_rate: { label: 'Error Rate', value: '0.6%', trend: 'down', period: '-0.2%' },
  response_time: { label: 'Avg Response', value: '142ms', trend: 'down', period: '-8%' },
};

const analyticsTrendsData = {
  velocity: [],
  dora: {
    lead_time: [],
    deployment_frequency: [],
    change_failure_rate: [],
    mttr: [],
  },
  sprints: {
    planned_points: [],
    completed_points: [],
    defects_found: [],
  },
};

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/drift', () => HttpResponse.json(driftData)),
        http.get('/api/progress', () => HttpResponse.json(progressData)),
        http.get('/api/dashboard/metrics', () =>
          HttpResponse.json({
            ok: true,
            data: dashboardMetricsData,
            timestamp: new Date().toISOString(),
          })
        ),
        http.get('/api/v1/analytics/trends', () =>
          HttpResponse.json({
            ok: true,
            data: analyticsTrendsData,
            timestamp: new Date().toISOString(),
          })
        ),
        http.get('/api/v1/analytics/agents', () =>
          HttpResponse.json({ ok: true, data: [], count: 0, timestamp: new Date().toISOString() })
        ),
      ],
    },
  },
};

export const NoDrift: Story = {
  name: 'Clean (No Drift)',
  parameters: {
    msw: {
      handlers: [
        http.get('/api/drift', () =>
          HttpResponse.json({
            drifts: [],
            summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
            in_sync: { sprints: ['SP-1'], stories: 24 },
          })
        ),
        http.get('/api/progress', () => HttpResponse.json(progressData)),
        http.get('/api/dashboard/metrics', () =>
          HttpResponse.json({
            ok: true,
            data: dashboardMetricsData,
            timestamp: new Date().toISOString(),
          })
        ),
        http.get('/api/v1/analytics/trends', () =>
          HttpResponse.json({
            ok: true,
            data: analyticsTrendsData,
            timestamp: new Date().toISOString(),
          })
        ),
        http.get('/api/v1/analytics/agents', () =>
          HttpResponse.json({ ok: true, data: [], count: 0, timestamp: new Date().toISOString() })
        ),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/drift', async () => {
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
        http.get('/api/drift', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 })
        ),
      ],
    },
  },
};
