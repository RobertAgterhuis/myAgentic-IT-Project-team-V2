import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar, StepIndicator } from './progress';

describe('ProgressBar', () => {
  it('renders progressbar role', () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow, min, max', () => {
    render(<ProgressBar value={30} max={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '30');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('renders label', () => {
    render(<ProgressBar value={60} label="Upload progress" />);
    expect(screen.getByText('Upload progress')).toBeInTheDocument();
  });

  it('shows percentage when enabled', () => {
    render(<ProgressBar value={75} showPercentage />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('clamps value to 0-100 range', () => {
    render(<ProgressBar value={150} showPercentage />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('StepIndicator', () => {
  const steps = [
    { label: 'Step 1', status: 'completed' as const },
    { label: 'Step 2', status: 'active' as const },
    { label: 'Step 3', status: 'upcoming' as const },
  ];

  it('renders all steps', () => {
    render(<StepIndicator steps={steps} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('marks active step with aria-current', () => {
    render(<StepIndicator steps={steps} />);
    const activeMarker = screen.getByText('Step 2').previousElementSibling;
    expect(activeMarker).toHaveAttribute('aria-current', 'step');
  });

  it('renders navigation landmark', () => {
    render(<StepIndicator steps={steps} />);
    expect(screen.getByRole('navigation', { name: 'Progress' })).toBeInTheDocument();
  });
});
