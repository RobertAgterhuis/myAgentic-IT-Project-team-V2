import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusDot } from './status-dot';

const meta = {
  title: 'UI/StatusDot',
  component: StatusDot,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['active', 'completed', 'pending', 'error', 'warning'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    animated: { control: 'boolean' },
  },
} satisfies Meta<typeof StatusDot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: { status: 'active' },
};

export const Completed: Story = {
  args: { status: 'completed' },
};

export const Pending: Story = {
  args: { status: 'pending' },
};

export const Error: Story = {
  args: { status: 'error' },
};

export const Warning: Story = {
  args: { status: 'warning' },
};

export const AnimatedActive: Story = {
  args: { status: 'active', animated: true },
};

export const AllSizes: Story = {
  args: { status: 'active' },
  render: () => (
    <div className="flex items-center gap-4">
      <StatusDot status="active" size="sm" />
      <StatusDot status="active" size="md" />
      <StatusDot status="active" size="lg" />
    </div>
  ),
};

export const AllStatuses: Story = {
  args: { status: 'active' },
  render: () => (
    <div className="flex items-center gap-4">
      <StatusDot status="active" animated />
      <StatusDot status="completed" />
      <StatusDot status="pending" />
      <StatusDot status="error" />
      <StatusDot status="warning" />
    </div>
  ),
};
