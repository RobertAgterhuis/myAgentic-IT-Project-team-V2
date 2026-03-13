import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwitchField } from './switch-field';

describe('SwitchField', () => {
  it('renders with label', () => {
    render(<SwitchField label="Dark mode" />);
    expect(screen.getByLabelText('Dark mode')).toBeInTheDocument();
  });

  it('has role=switch', () => {
    render(<SwitchField label="Toggle" />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('toggles on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SwitchField label="Toggle" onCheckedChange={onChange} />);
    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('supports controlled checked state', () => {
    render(<SwitchField label="On" checked={true} onCheckedChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('can be disabled', () => {
    render(<SwitchField label="Disabled" disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });

  it('renders description with aria-describedby', () => {
    render(<SwitchField label="Notifications" description="Receive email alerts" />);
    const switchEl = screen.getByRole('switch');
    const descId = switchEl.getAttribute('aria-describedby');
    expect(descId).toBeTruthy();
    expect(document.getElementById(descId!)).toHaveTextContent('Receive email alerts');
  });

  it('supports size variant', () => {
    render(<SwitchField label="Small" size="sm" />);
    expect(screen.getByRole('switch')).toHaveAttribute('data-size', 'sm');
  });
});
