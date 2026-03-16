import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TimelineConnector } from './timeline-connector';

describe('TimelineConnector', () => {
  it('renders with aria-hidden', () => {
    const { container } = render(<TimelineConnector />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders horizontal by default', () => {
    const { container } = render(<TimelineConnector />);
    expect(container.firstChild).toHaveClass('h-0.5', 'w-8');
  });

  it('renders vertical orientation', () => {
    const { container } = render(<TimelineConnector orientation="vertical" />);
    expect(container.firstChild).toHaveClass('h-8', 'w-0.5');
  });

  it('applies active styles', () => {
    const { container } = render(<TimelineConnector active />);
    expect(container.firstChild).toHaveClass('bg-blue-500');
  });

  it('applies inactive styles by default', () => {
    const { container } = render(<TimelineConnector />);
    expect(container.firstChild).toHaveClass('bg-border');
  });
});
