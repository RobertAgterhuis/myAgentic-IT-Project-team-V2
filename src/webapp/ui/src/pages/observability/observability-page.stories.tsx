/**
 * Storybook stories for ObservabilityPage — M21-006.
 * This is a tab container with lazy-loaded sub-pages; stories focus on tab rendering.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse, delay } from 'msw';
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
      summary: { total_drifts: 0 },
      in_sync: { sprints: [], stories: 0 },
    })
  ),
  http.get('/api/progress', () =>
    HttpResponse.json({ phases: [], sprints: { total: 0, statuses: {} } })
  ),
  http.get('/api/dashboard/metrics', () =>
    HttpResponse.json({ ok: true, data: {}, timestamp: new Date().toISOString() })
  ),
  http.get('/api/analytics/trends', () => HttpResponse.json({ velocity: [], dora: {} })),
  http.get('/api/analytics/agents', () => HttpResponse.json({ agents: [] })),
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
