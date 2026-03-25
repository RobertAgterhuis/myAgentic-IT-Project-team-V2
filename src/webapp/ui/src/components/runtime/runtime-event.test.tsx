import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RuntimeEvent } from './runtime-event';

const ts = '2026-03-16T10:00:00Z';

describe('RuntimeEvent', () => {
  it('renders description', () => {
    render(<RuntimeEvent type="session_start" timestamp={ts} description="Session started" />);
    expect(screen.getByText('Session started')).toBeInTheDocument();
  });

  it('renders agent name', () => {
    render(
      <RuntimeEvent type="agent_start" timestamp={ts} description="Executing" agent="DevOps" />
    );
    expect(screen.getByText('(DevOps)')).toBeInTheDocument();
  });

  it('renders phase name', () => {
    render(
      <RuntimeEvent type="phase_start" timestamp={ts} description="Started" phase="Phase 1" />
    );
    expect(screen.getByText('[Phase 1]')).toBeInTheDocument();
  });

  it('renders as a plain event row', () => {
    render(<RuntimeEvent type="error" timestamp={ts} description="Error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders icon for each type', () => {
    const types = [
      'session_start',
      'phase_start',
      'phase_complete',
      'agent_start',
      'agent_complete',
      'artifact_created',
      'gate_passed',
      'gate_failed',
      'error',
      'retry',
    ] as const;
    for (const type of types) {
      const { container, unmount } = render(
        <RuntimeEvent type={type} timestamp={ts} description={`test-${type}`} />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
      unmount();
    }
  });
});
