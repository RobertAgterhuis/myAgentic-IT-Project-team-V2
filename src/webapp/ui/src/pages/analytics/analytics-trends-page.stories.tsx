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
  ok: true,
  count: 3,
  timestamp: new Date().toISOString(),
  data: [
    {
      agent_id: '01',
      agent_name: 'Business Analyst',
      total_invocations: 42,
      successful: 40,
      failed: 2,
      success_rate_pct: 95.24,
      avg_duration_ms: 1500,
      min_duration_ms: 900,
      max_duration_ms: 2600,
      p95_duration_ms: 2200,
      total_prompt_tokens: 70000,
      total_completion_tokens: 50000,
      total_tokens: 120000,
      avg_total_tokens: 2857,
      avg_provider_latency_ms: 640,
      avg_model_attempts: 1.1,
      avg_model_retries: 0.1,
      providers: ['openai'],
      models: ['gpt-4.1'],
    },
    {
      agent_id: '05',
      agent_name: 'Architect',
      total_invocations: 28,
      successful: 25,
      failed: 3,
      success_rate_pct: 89.29,
      avg_duration_ms: 2200,
      min_duration_ms: 1200,
      max_duration_ms: 4100,
      p95_duration_ms: 3600,
      total_prompt_tokens: 52000,
      total_completion_tokens: 43000,
      total_tokens: 95000,
      avg_total_tokens: 3393,
      avg_provider_latency_ms: 780,
      avg_model_attempts: 1.3,
      avg_model_retries: 0.3,
      providers: ['copilot'],
      models: ['gpt-4o'],
    },
    {
      agent_id: '08',
      agent_name: 'Security Architect',
      total_invocations: 15,
      successful: 15,
      failed: 0,
      success_rate_pct: 100,
      avg_duration_ms: 1800,
      min_duration_ms: 1000,
      max_duration_ms: 2500,
      p95_duration_ms: 2400,
      total_prompt_tokens: 33000,
      total_completion_tokens: 27000,
      total_tokens: 60000,
      avg_total_tokens: 4000,
      avg_provider_latency_ms: 520,
      avg_model_attempts: 1,
      avg_model_retries: 0,
      providers: ['openai', 'copilot'],
      models: ['gpt-4.1-mini'],
    },
  ],
};

export const Populated: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/analytics/trends', () => HttpResponse.json(trendsData)),
        http.get('/api/v1/analytics/agents', () => HttpResponse.json(agentsData)),
      ],
    },
  },
};

export const NoData: Story = {
  name: 'Empty (No Data)',
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/analytics/trends', () =>
          HttpResponse.json({
            ok: true,
            data: {
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
            },
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
        http.get('/api/v1/analytics/trends', async () => {
          await delay('infinite');
          return new HttpResponse(null);
        }),
        http.get('/api/v1/analytics/agents', async () => {
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
        http.get('/api/v1/analytics/trends', () =>
          HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 })
        ),
        http.get('/api/v1/analytics/agents', () =>
          HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 })
        ),
      ],
    },
  },
};
