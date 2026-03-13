import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormRow } from './form-row';
import { Input } from './input';

describe('FormRow', () => {
  it('renders label linked to input', () => {
    render(
      <FormRow label="Email">
        <Input />
      </FormRow>,
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows required indicator', () => {
    render(
      <FormRow label="Name" required>
        <Input />
      </FormRow>,
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('shows helper text', () => {
    render(
      <FormRow label="Password" helperText="Min 8 characters">
        <Input />
      </FormRow>,
    );
    expect(screen.getByText('Min 8 characters')).toBeInTheDocument();
  });

  it('shows error and hides helper text', () => {
    render(
      <FormRow label="Email" helperText="Enter email" error="Invalid email">
        <Input />
      </FormRow>,
    );
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.queryByText('Enter email')).not.toBeInTheDocument();
  });

  it('sets aria-invalid on input when error', () => {
    render(
      <FormRow label="Field" error="Required">
        <Input />
      </FormRow>,
    );
    expect(screen.getByLabelText('Field')).toHaveAttribute('aria-invalid', 'true');
  });

  it('error has role=alert', () => {
    render(
      <FormRow label="X" error="Oops">
        <Input />
      </FormRow>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Oops');
  });

  it('propagates custom htmlFor', () => {
    render(
      <FormRow label="Custom" htmlFor="my-input">
        <Input />
      </FormRow>,
    );
    expect(screen.getByLabelText('Custom')).toHaveAttribute('id', 'my-input');
  });
});
