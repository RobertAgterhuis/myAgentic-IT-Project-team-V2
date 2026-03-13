import type { Meta, StoryObj } from '@storybook/react';
import { MetricCard, ActivityFeed, type ActivityItem } from './metric-card';
import { Bug, Zap, CheckCircle2 } from 'lucide-react';

/* ---------- MetricCard ---------- */

const metricMeta = {
  title: 'UI/MetricCard',
  component: MetricCard,
  tags: ['autodocs'],
} satisfies Meta<typeof MetricCard>;

export default metricMeta;
type Story = StoryObj<typeof metricMeta>;

export const TrendUp: Story = {
  args: { label: 'Sprint Velocity', value: '21 SP', delta: '+12%', trend: 'up' },
};

export const TrendDown: Story = {
  args: { label: 'Open Bugs', value: 8, delta: '-3', trend: 'down', icon: <Bug className="size-4" /> },
};

export const Neutral: Story = {
  args: { label: 'Total Issues', value: 42, delta: '0%', trend: 'neutral' },
};

export const WithIcon: Story = {
  args: { label: 'Performance', value: '99ms', icon: <Zap className="size-4" /> },
};

export const Dashboard: Story = {
  args: { label: 'Velocity', value: '21 SP' },
  render: () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <MetricCard label="Velocity" value="21 SP" delta="+12%" trend="up" icon={<Zap className="size-4" />} />
      <MetricCard label="Open Bugs" value={3} delta="-2" trend="down" icon={<Bug className="size-4" />} />
      <MetricCard label="Done" value="87%" delta="+5%" trend="up" icon={<CheckCircle2 className="size-4" />} />
    </div>
  ),
};

/* ---------- ActivityFeed (inline stories) ---------- */

const feedItems: ActivityItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i),
  timestamp: `2026-03-${String(13 - i).padStart(2, '0')} ${9 + i}:00`,
  actor: ['Alice', 'Bob', 'Charlie'][i % 3],
  action: ['closed', 'opened', 'commented on', 'merged'][i % 4],
  target: `Issue #${200 + i}`,
}));

export const Feed: Story = {
  args: { label: 'Activity', value: 0 },
  render: () => <ActivityFeed items={feedItems} pageSize={5} />,
};
