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

  it('renders remediation for error events', () => {
    render(
      <RuntimeEvent
        type="error"
        timestamp={ts}
        description="Build failed"
        remediation="Check the build logs and fix syntax errors"
      />
    );
    expect(screen.getByText('Fix:')).toBeInTheDocument();
    expect(screen.getByText('Check the build logs and fix syntax errors')).toBeInTheDocument();
  });

  it('renders remediation for gate_failed events', () => {
    render(
      <RuntimeEvent
        type="gate_failed"
        timestamp={ts}
        description="Gate check failed"
        remediation="Resolve blocking items before proceeding"
      />
    );
    expect(screen.getByText('Fix:')).toBeInTheDocument();
    expect(screen.getByText('Resolve blocking items before proceeding')).toBeInTheDocument();
  });

  it('does not render remediation for non-error event types', () => {
    render(
      <RuntimeEvent
        type="agent_start"
        timestamp={ts}
        description="Agent started"
        remediation="This should not appear"
      />
    );
    expect(screen.queryByText('Fix:')).not.toBeInTheDocument();
    expect(screen.queryByText('This should not appear')).not.toBeInTheDocument();
  });

  it('does not render remediation section when prop is absent', () => {
    render(<RuntimeEvent type="error" timestamp={ts} description="Error" />);
    expect(screen.queryByText('Fix:')).not.toBeInTheDocument();
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
