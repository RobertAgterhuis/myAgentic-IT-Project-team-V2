import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgentList } from './agent-list';
import type { AgentEntry } from '@/lib/api-types';

const meta = {
  title: 'Runtime/AgentList',
  component: AgentList,
  tags: ['autodocs'],
} satisfies Meta<typeof AgentList>;

export default meta;

type Story = StoryObj<typeof meta>;

const agents: AgentEntry[] = [
  { id: 'agent-1', name: 'Discovery Analyst', status: 'active' },
  { id: 'agent-2', name: 'Solution Architect', status: 'pending' },
  { id: 'agent-3', name: 'QA Specialist', status: 'done' },
];

export const Default: Story = {
  args: { agents },
};
