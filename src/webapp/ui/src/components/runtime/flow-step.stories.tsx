import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlowStep } from './flow-step';

const meta = {
  title: 'Runtime/FlowStep',
  component: FlowStep,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['completed', 'running', 'pending', 'failed', 'paused'],
    },
    isActive: { control: 'boolean' },
  },
} satisfies Meta<typeof FlowStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Completed: Story = {
  args: { label: 'Discovery', status: 'completed', isActive: false },
};

export const Running: Story = {
  args: { label: 'Architecture', status: 'running', isActive: true },
};

export const Pending: Story = {
  args: { label: 'Planning', status: 'pending', isActive: false },
};

export const Failed: Story = {
  args: { label: 'Validation', status: 'failed', isActive: false },
};

export const Paused: Story = {
  args: { label: 'Implementation', status: 'paused', isActive: false },
};

export const ActiveNotRunning: Story = {
  args: { label: 'Discovery', status: 'completed', isActive: true },
};

export const AllStatuses: Story = {
  args: { label: 'Discovery', status: 'completed', isActive: false },
  render: () => (
    <div className="flex items-center gap-2">
      <FlowStep label="Discovery" status="completed" isActive={false} />
      <FlowStep label="Architecture" status="running" isActive={true} />
      <FlowStep label="Planning" status="pending" isActive={false} />
      <FlowStep label="Validation" status="failed" isActive={false} />
      <FlowStep label="Implementation" status="paused" isActive={false} />
    </div>
  ),
};
