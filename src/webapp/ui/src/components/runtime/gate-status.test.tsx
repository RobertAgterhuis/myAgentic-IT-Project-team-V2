import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { GateStatus } from './gate-status';

describe('GateStatus', () => {
  it('renders label and status', () => {
    render(<GateStatus gateId="g1" label="Security Gate" status="passed" />);
    expect(screen.getByText('Security Gate')).toBeInTheDocument();
    expect(screen.getByText('passed')).toBeInTheDocument();
  });

  it('renders reason when provided', () => {
    render(<GateStatus gateId="g1" label="Gate" status="failed" reason="Missing auth" />);
    expect(screen.getByText('Missing auth')).toBeInTheDocument();
  });

  it('renders suggested action', () => {
    render(<GateStatus gateId="g1" label="Gate" status="blocked" suggestedAction="Add OAuth" />);
    expect(screen.getByText('Suggested: Add OAuth')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<GateStatus gateId="g1" label="Gate" status="pending" onClick={handleClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('has correct aria-label', () => {
    render(<GateStatus gateId="g1" label="Security Gate" status="failed" onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Gate: Security Gate — failed'
    );
  });

  it('stores gate-id as data attribute', () => {
    const { container } = render(<GateStatus gateId="g42" label="Gate" status="passed" />);
    expect(container.firstChild).toHaveAttribute('data-gate-id', 'g42');
  });

  it.each(['passed', 'pending', 'blocked', 'failed'] as const)(
    'renders %s status without errors',
    (status) => {
      const { container } = render(<GateStatus gateId="g" label="G" status={status} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    }
  );
});
