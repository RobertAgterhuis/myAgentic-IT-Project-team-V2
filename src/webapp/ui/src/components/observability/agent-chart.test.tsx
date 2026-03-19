import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentChart } from './agent-chart';

describe('AgentChart', () => {
  it('renders runtime telemetry details for an agent', () => {
    render(
      <AgentChart
        data={[
          {
            agent_id: '01',
            agent_name: 'Business Analyst',
            total_invocations: 12,
            successful: 11,
            failed: 1,
            success_rate_pct: 91.67,
            avg_duration_ms: 450,
            min_duration_ms: 210,
            max_duration_ms: 990,
            p95_duration_ms: 880,
            total_prompt_tokens: 1200,
            total_completion_tokens: 700,
            total_tokens: 1900,
            avg_total_tokens: 158.33,
            avg_provider_latency_ms: 320,
            avg_model_attempts: 1.25,
            avg_model_retries: 0.25,
            providers: ['openai', 'copilot'],
            models: ['gpt-4.1'],
          },
        ]}
      />
    );

    expect(screen.getByText('Business Analyst')).toBeInTheDocument();
    expect(screen.getByText(/openai, copilot/i)).toBeInTheDocument();
    expect(screen.getByText(/gpt-4.1/i)).toBeInTheDocument();
    expect(screen.getByText(/Retries: 0.25/)).toBeInTheDocument();
    expect(screen.getByText(/Tokens: 158 avg/)).toBeInTheDocument();
  });
});
