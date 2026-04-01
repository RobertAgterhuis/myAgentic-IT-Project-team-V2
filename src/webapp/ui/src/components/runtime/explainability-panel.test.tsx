import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ExplainabilityPanel } from './explainability-panel';

describe('ExplainabilityPanel', () => {
  const defaults = {
    title: 'Gate Failed',
    reason: 'Missing auth model',
    onDismiss: vi.fn(),
  };

  it('renders title and reason', () => {
    render(<ExplainabilityPanel {...defaults} />);
    expect(screen.getByText('Gate Failed')).toBeInTheDocument();
    expect(screen.getByText('Missing auth model')).toBeInTheDocument();
  });

  it('renders suggested action', () => {
    render(<ExplainabilityPanel {...defaults} suggestedAction="Add OAuth" />);
    expect(screen.getByText('Add OAuth')).toBeInTheDocument();
  });

  it('renders details', () => {
    render(
      <ExplainabilityPanel {...defaults} details={{ Agent: 'DevOps', Phase: 'Architecture' }} />
    );
    expect(screen.getByText('Agent:')).toBeInTheDocument();
    expect(screen.getByText('DevOps')).toBeInTheDocument();
    expect(screen.getByText('Phase:')).toBeInTheDocument();
    expect(screen.getByText('Architecture')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button clicked', async () => {
    const onDismiss = vi.fn();
    render(<ExplainabilityPanel {...defaults} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('has complementary landmark', () => {
    render(<ExplainabilityPanel {...defaults} />);
    expect(screen.getByRole('complementary', { name: 'Gate Failed' })).toBeInTheDocument();
  });

  it('renders evidence sources', () => {
    render(
      <ExplainabilityPanel
        {...defaults}
        sources={[
          { label: 'Auth Config', path: 'src/auth.ts', line: 42 },
          { label: 'Policy Doc', path: 'docs/security.md' },
        ]}
      />
    );
    expect(screen.getByLabelText('Evidence sources')).toBeInTheDocument();
    expect(screen.getByText('Auth Config')).toBeInTheDocument();
    expect(screen.getByText(/src\/auth\.ts:42/)).toBeInTheDocument();
    expect(screen.getByText('Policy Doc')).toBeInTheDocument();
  });

  it('renders context with confidence', () => {
    render(
      <ExplainabilityPanel
        {...defaults}
        context={{
          predecessorAgent: 'Security Architect',
          predecessorPhase: 'PHASE_2',
          confidence: 'high',
        }}
      />
    );
    expect(screen.getByText('Security Architect')).toBeInTheDocument();
    expect(screen.getByText('PHASE_2')).toBeInTheDocument();
    expect(screen.getByText('high confidence')).toBeInTheDocument();
  });
});
