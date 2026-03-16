import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgentCard } from './agent-card';

const meta = {
  title: 'Runtime/AgentCard',
  component: AgentCard,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['idle', 'running', 'completed', 'failed', 'retrying'],
    },
    progress: { control: { type: 'range', min: 0, max: 100 } },
  },
} satisfies Meta<typeof AgentCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { name: 'Business Analyst', status: 'idle' },
};

export const Running: Story = {
  args: {
    name: 'DevOps Engineer',
    status: 'running',
    taskDescription: 'Generating Bicep infrastructure templates',
    progress: 65,
    startedAt: new Date(Date.now() - 120_000).toISOString(),
  },
};

export const Completed: Story = {
  args: {
    name: 'Security Architect',
    status: 'completed',
    taskDescription: 'Security review completed',
    startedAt: new Date(Date.now() - 300_000).toISOString(),
  },
};

export const Failed: Story = {
  args: {
    name: 'Data Architect',
    status: 'failed',
    taskDescription: 'Failed to generate data model',
    startedAt: new Date(Date.now() - 60_000).toISOString(),
  },
};

export const Retrying: Story = {
  args: {
    name: 'UX Designer',
    status: 'retrying',
    taskDescription: 'Retrying wireframe generation',
    progress: 30,
    startedAt: new Date(Date.now() - 180_000).toISOString(),
    retryCount: 2,
  },
};
