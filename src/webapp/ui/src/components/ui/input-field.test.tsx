import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InputField } from '@/components/ui/input-field';

describe('InputField', () => {
  it('renders with label', () => {
    render(<InputField label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders helper text', () => {
    render(<InputField label="Name" helperText="Enter your full name" />);
    expect(screen.getByText('Enter your full name')).toBeInTheDocument();
  });

  it('renders error and hides helper text', () => {
    render(<InputField label="Email" helperText="We'll never share" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.queryByText("We'll never share")).not.toBeInTheDocument();
  });

  it('sets aria-invalid when error is present', () => {
    render(<InputField label="Email" error="Required" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('error message has role=alert', () => {
    render(<InputField label="Email" error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('renders character counter when showCount and maxLength set', async () => {
    render(<InputField label="Bio" showCount maxLength={100} />);
    expect(screen.getByText('0/100')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Bio'), 'Hello');
    expect(screen.getByText('5/100')).toBeInTheDocument();
  });

  it('calls onChange handler', async () => {
    const handleChange = vi.fn();
    render(<InputField label="Name" onChange={handleChange} />);
    await userEvent.type(screen.getByLabelText('Name'), 'a');
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders disabled state', () => {
    render(<InputField label="Name" disabled />);
    expect(screen.getByLabelText('Name')).toBeDisabled();
  });
});
