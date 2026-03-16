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
});
