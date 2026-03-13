import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetricCard, ActivityFeed, type ActivityItem } from './metric-card';

describe('MetricCard', () => {
  it('renders label and value', () => {
    render(<MetricCard label="Total Issues" value={42} />);
    expect(screen.getByText('Total Issues')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows delta with trend icon', () => {
    render(<MetricCard label="Velocity" value="21 SP" delta="+12%" trend="up" />);
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });

  it('renders custom icon', () => {
    render(<MetricCard label="Speed" value={99} icon={<span data-testid="icon">I</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders neutral trend by default', () => {
    render(<MetricCard label="Bugs" value={0} delta="0%" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});

describe('ActivityFeed', () => {
  const items: ActivityItem[] = Array.from({ length: 15 }, (_, i) => ({
    id: String(i),
    timestamp: `2026-03-${String(i + 1).padStart(2, '0')}`,
    actor: `User ${i}`,
    action: 'closed',
    target: `Issue #${i}`,
  }));

  it('renders items with actor and action', () => {
    render(<ActivityFeed items={items.slice(0, 3)} />);
    expect(screen.getByText('User 0')).toBeInTheDocument();
    expect(screen.getAllByText('closed')).toHaveLength(3);
  });

  it('renders ordered list with aria-label', () => {
    render(<ActivityFeed items={items.slice(0, 2)} />);
    expect(screen.getByRole('list', { name: 'Activity feed' })).toBeInTheDocument();
  });

  it('paginates with load more button', async () => {
    const user = userEvent.setup();
    render(<ActivityFeed items={items} pageSize={5} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    await user.click(screen.getByText(/Load more/));
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
  });

  it('hides load more when all visible', () => {
    render(<ActivityFeed items={items.slice(0, 3)} pageSize={10} />);
    expect(screen.queryByText(/Load more/)).not.toBeInTheDocument();
  });

  it('shows target when provided', () => {
    render(<ActivityFeed items={[items[0]]} />);
    expect(screen.getByText('Issue #0')).toBeInTheDocument();
  });
});
