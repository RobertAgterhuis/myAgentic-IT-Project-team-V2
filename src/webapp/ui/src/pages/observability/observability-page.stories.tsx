/**
 * Storybook stories for ObservabilityPage — M21-006.
 * This is a tab container with lazy-loaded sub-pages; stories focus on tab rendering.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import ObservabilityPage from './observability-page';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'Pages/Observability',
  component: ObservabilityPage,
  decorators: [withProviders],
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ObservabilityPage>;

export default meta;
type Story = StoryObj<typeof meta>;

/* Provide minimal data for all sub-pages so the tab container renders without errors */
const baseHandlers = [
  http.get('/api/drift', () =>
    HttpResponse.json({
      drifts: [],
      summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
      in_sync: { sprints: [], stories: 0 },
      generated_at: new Date().toISOString(),
    })
  ),
  http.get('/api/v1/drift', () =>
    HttpResponse.json({
      drifts: [],
      summary: { total_drifts: 0, critical: 0, warning: 0, info: 0 },
      in_sync: { sprints: [], stories: 0 },
      generated_at: new Date().toISOString(),
    })
  ),
  http.get('/api/progress', () =>
    HttpResponse.json({
      active: false,
      session: null,
      phases: [],
      sprints: { total: 0, statuses: {} },
      command: null,
    })
  ),
  http.get('/api/dashboard/metrics', () =>
    HttpResponse.json({
      ok: true,
      data: {
        http_requests: { label: 'HTTP Requests', value: 0, trend: 'neutral', period: '0%' },
        error_rate: { label: 'Error Rate', value: '0%', trend: 'neutral', period: '0%' },
        response_time: { label: 'Avg Response', value: '0ms', trend: 'neutral', period: '0%' },
      },
      timestamp: new Date().toISOString(),
    })
  ),
  http.get('/api/v1/analytics/trends', () =>
    HttpResponse.json({
      ok: true,
      data: {
        velocity: [],
        dora: { lead_time: [], deployment_frequency: [], change_failure_rate: [], mttr: [] },
        sprints: { planned_points: [], completed_points: [], defects_found: [] },
      },
      timestamp: new Date().toISOString(),
    })
  ),
  http.get('/api/v1/observability/rag-freshness', () =>
    HttpResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      workspace_id: 'default',
      summary: {
        total_collections: 4,
        healthy_collections: 4,
        stale_collections: 0,
        missing_collections: 0,
        stale_threshold_seconds: 3600,
      },
      collections: [],
    })
  ),
  http.get('/api/v1/analytics/agents', () =>
    HttpResponse.json({ ok: true, data: [], count: 0, timestamp: new Date().toISOString() })
  ),
  http.get('/api/traceability', () =>
    HttpResponse.json({ entities: [], gaps: [], coverage: { overall: 0 } })
  ),
];

export const Default: Story = {
  name: 'Drift & KPIs tab (default)',
  parameters: { msw: { handlers: baseHandlers } },
};

export const AnalyticsTab: Story = {
  name: 'Analytics & Velocity tab',
  parameters: { msw: { handlers: baseHandlers } },
};

export const TraceabilityTab: Story = {
  name: 'Traceability tab',
  parameters: { msw: { handlers: baseHandlers } },
};
