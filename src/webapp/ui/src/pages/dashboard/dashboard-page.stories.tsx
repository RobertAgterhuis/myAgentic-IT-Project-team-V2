/**
 * Storybook stories for DashboardPage — M21-006.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
import DashboardPage from './dashboard-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Dashboard',
  component: DashboardPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DashboardPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const healthData = {
  ok: true,
  data: {
    api: { status: 'healthy', latency_ms: 42 },
    database: { status: 'healthy', latency_ms: 12 },
    sse: { status: 'degraded', latency_ms: 350 },
  },
  timestamp: new Date().toISOString(),
};

const metricsData = {
  ok: true,
  data: {
    response_time: { label: 'Avg Response', value: 142, trend: 'down', period: '-8% vs last week' },
    throughput: { label: 'Throughput', value: 1250, trend: 'up', period: '+12% vs last week' },
    error_rate: { label: 'Error Rate', value: 0.3, trend: 'down', period: '-50% vs last week' },
  },
  timestamp: new Date().toISOString(),
};

const activityData = {
  ok: true,
  data: [
    {
      timestamp: '2025-01-15T12:30:00Z',
      user: 'Architect Agent',
      action: 'Completed analysis',
      details: 'Phase 2',
    },
    {
      timestamp: '2025-01-15T11:00:00Z',
      user: 'System',
      action: 'Session started',
      details: 'sess-001',
    },
  ],
  timestamp: new Date().toISOString(),
};

const statsData = {
  ok: true,
  data: {
    active_files: { value: 42, label: 'Active Files', icon: 'file', details: '' },
    team_members: { value: 6, label: 'Team Members', icon: 'users', details: '' },
    sprint_progress: { value: '72%', label: 'Sprint Progress', icon: 'target', details: '' },
  },
  timestamp: new Date().toISOString(),
};

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/dashboard/health', () => HttpResponse.json(healthData)),
        http.get('/api/dashboard/metrics', () => HttpResponse.json(metricsData)),
        http.get('/api/dashboard/activity', () => HttpResponse.json(activityData)),
        http.get('/api/dashboard/stats', () => HttpResponse.json(statsData)),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/dashboard/*', async () => {
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
        http.get('/api/dashboard/health', () =>
          HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 })
        ),
        http.get('/api/dashboard/metrics', () => HttpResponse.json(metricsData)),
        http.get('/api/dashboard/activity', () => HttpResponse.json(activityData)),
        http.get('/api/dashboard/stats', () => HttpResponse.json(statsData)),
      ],
    },
  },
};
