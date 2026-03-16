import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { RuntimeLog, type RuntimeLogEvent } from './runtime-log';

const mkEvent = (i: number, overrides?: Partial<RuntimeLogEvent>): RuntimeLogEvent => ({
  id: `e-${i}`,
  type: 'agent_start',
  timestamp: new Date(Date.now() + i * 1000).toISOString(),
  description: `Event ${i}`,
  ...overrides,
});

describe('RuntimeLog', () => {
  it('renders empty state', () => {
    render(<RuntimeLog events={[]} />);
    expect(screen.getByText('No events')).toBeInTheDocument();
  });

  it('renders events', () => {
    const events = [mkEvent(0), mkEvent(1)];
    render(<RuntimeLog events={events} />);
    expect(screen.getByText('Event 0')).toBeInTheDocument();
    expect(screen.getByText('Event 1')).toBeInTheDocument();
  });

  it('limits visible events', () => {
    const events = Array.from({ length: 10 }, (_, i) => mkEvent(i));
    render(<RuntimeLog events={events} maxVisible={3} />);
    // Should show last 3
    expect(screen.queryByText('Event 6')).not.toBeInTheDocument();
    expect(screen.getByText('Event 7')).toBeInTheDocument();
    expect(screen.getByText('Event 8')).toBeInTheDocument();
    expect(screen.getByText('Event 9')).toBeInTheDocument();
  });

  it('filters events by type', () => {
    const events = [
      mkEvent(0, { type: 'gate_passed', description: 'Gate OK' }),
      mkEvent(1, { type: 'error', description: 'Error!' }),
    ];
    render(<RuntimeLog events={events} filter={['gate_passed']} />);
    expect(screen.getByText('Gate OK')).toBeInTheDocument();
    expect(screen.queryByText('Error!')).not.toBeInTheDocument();
  });

  it('has section landmark', () => {
    render(<RuntimeLog events={[]} />);
    expect(screen.getByRole('region', { name: 'Runtime timeline' })).toBeInTheDocument();
  });

  it('toggles event type filter', async () => {
    const events = [
      mkEvent(0, { type: 'gate_passed', description: 'Gate OK' }),
      mkEvent(1, { type: 'error', description: 'Error!' }),
    ];
    render(<RuntimeLog events={events} />);
    // Both visible initially
    expect(screen.getByText('Gate OK')).toBeInTheDocument();
    expect(screen.getByText('Error!')).toBeInTheDocument();

    // Click filter to show only errors
    await userEvent.click(screen.getByText('error'));
    expect(screen.queryByText('Gate OK')).not.toBeInTheDocument();
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });
});
