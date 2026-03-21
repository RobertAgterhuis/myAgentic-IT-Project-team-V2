import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import AnalyticsTrendChartsPage from './analytics-trends-page';

vi.mock('@/hooks', () => ({
  useAnalyticsTrends: () => ({
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
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useAnalyticsAgents: () => ({
    data: [
      {
        agent_id: '01',
        agent_name: 'Business Analyst',
        total_invocations: 10,
        successful: 9,
        failed: 1,
        success_rate_pct: 90,
        avg_duration_ms: 400,
        min_duration_ms: 200,
        max_duration_ms: 900,
        p95_duration_ms: 850,
        total_prompt_tokens: 70,
        total_completion_tokens: 50,
        total_tokens: 120,
        avg_total_tokens: 12,
        avg_provider_latency_ms: 300,
        avg_model_attempts: 1.2,
        avg_model_retries: 0.2,
        providers: ['openai'],
        models: ['gpt-4.1'],
      },
      {
        agent_id: '05',
        agent_name: 'Architect',
        total_invocations: 8,
        successful: 8,
        failed: 0,
        success_rate_pct: 100,
        avg_duration_ms: 500,
        min_duration_ms: 250,
        max_duration_ms: 1000,
        p95_duration_ms: 920,
        total_prompt_tokens: 95,
        total_completion_tokens: 60,
        total_tokens: 155,
        avg_total_tokens: 19.38,
        avg_provider_latency_ms: 500,
        avg_model_attempts: 1.4,
        avg_model_retries: 0.4,
        providers: ['copilot'],
        models: ['gpt-4o'],
      },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('AnalyticsTrendChartsPage', () => {
  it('renders shared page header and context strip', () => {
    render(<AnalyticsTrendChartsPage />);
    expect(screen.getByRole('heading', { name: /analytics trend charts/i })).toBeInTheDocument();
    expect(screen.getAllByText(/time range/i).length).toBeGreaterThan(0);
  });

  it('renders runtime telemetry summary cards', () => {
    render(<AnalyticsTrendChartsPage />);

    const telemetrySection = screen.getByLabelText(/runtime telemetry/i);
    expect(within(telemetrySection).getByText('Total Tokens')).toBeInTheDocument();
    expect(within(telemetrySection).getByText('275')).toBeInTheDocument();

    expect(within(telemetrySection).getByText('Avg Provider Latency')).toBeInTheDocument();
    expect(within(telemetrySection).getByText('400 ms')).toBeInTheDocument();

    expect(within(telemetrySection).getByText('Avg Validation Retries')).toBeInTheDocument();
    expect(within(telemetrySection).getByText('0.30')).toBeInTheDocument();

    expect(within(telemetrySection).getByText('Providers Active')).toBeInTheDocument();
    expect(within(telemetrySection).getByText('2')).toBeInTheDocument();
  });
});
