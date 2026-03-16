import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SessionStatus } from './session-status';

describe('SessionStatus', () => {
  it('renders no-session state', () => {
    render(<SessionStatus session={null} progress={0} connectionStatus="connected" />);
    expect(screen.getByText('No Active Session')).toBeInTheDocument();
  });

  it('renders session info', () => {
    render(
      <SessionStatus
        session={{ id: 's1', command: 'CREATE', project: 'Phoenix' }}
        progress={50}
        connectionStatus="connected"
      />
    );
    expect(screen.getByText('Active Session')).toBeInTheDocument();
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByText(/Phoenix/)).toBeInTheDocument();
  });

  it('renders phase and agent', () => {
    render(
      <SessionStatus
        session={{ id: 's1', command: 'CREATE', project: 'P' }}
        progress={30}
        activePhase="Architecture"
        activeAgent="DevOps"
        connectionStatus="connected"
      />
    );
    expect(screen.getByText('Phase: Architecture')).toBeInTheDocument();
    expect(screen.getByText('Agent: DevOps')).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    render(
      <SessionStatus
        session={{ id: 's1', command: 'CREATE', project: 'P' }}
        progress={75}
        connectionStatus="connected"
      />
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('has aria-label', () => {
    const { container } = render(
      <SessionStatus session={null} progress={0} connectionStatus="connected" />
    );
    expect(container.firstChild).toHaveAttribute('aria-label', 'Session status');
  });
});
