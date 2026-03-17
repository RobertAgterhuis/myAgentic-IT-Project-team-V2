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
  phases: [
    { id: 'PHASE-1', label: 'Requirements', total: 5, done: 5 },
    { id: 'PHASE-2', label: 'Architecture', total: 5, done: 3 },
    { id: 'PHASE-3', label: 'Experience', total: 5, done: 0 },
  ],
  sprints: { total: 2, statuses: { completed: 1, active: 1 } },
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
            data: {
              response_time: { label: 'Avg Response', value: 142, trend: 'down', period: '-8%' },
              throughput: { label: 'Throughput', value: 1250, trend: 'up', period: '+12%' },
            },
            timestamp: new Date().toISOString(),
          })
        ),
        http.get('/api/analytics/trends', () => HttpResponse.json({ velocity: [] })),
        http.get('/api/analytics/agents', () => HttpResponse.json({ agents: [] })),
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
          HttpResponse.json({ ok: true, data: {}, timestamp: new Date().toISOString() })
        ),
        http.get('/api/analytics/trends', () => HttpResponse.json({ velocity: [] })),
        http.get('/api/analytics/agents', () => HttpResponse.json({ agents: [] })),
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
