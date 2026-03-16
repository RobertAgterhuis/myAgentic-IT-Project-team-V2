import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgentActivity, type AgentEntry } from './agent-activity';

const meta = {
  title: 'Runtime/AgentActivity',
  component: AgentActivity,
  tags: ['autodocs'],
} satisfies Meta<typeof AgentActivity>;

export default meta;
type Story = StoryObj<typeof meta>;

const now = Date.now();

const multi: AgentEntry[] = [
  {
    id: '1',
    name: 'Business Analyst',
    status: 'completed',
    startedAt: new Date(now - 600_000).toISOString(),
  },
  {
    id: '2',
    name: 'DevOps Engineer',
    status: 'running',
    taskDescription: 'Generating Bicep',
    progress: 65,
    startedAt: new Date(now - 120_000).toISOString(),
  },
  { id: '3', name: 'Security Architect', status: 'idle' },
  {
    id: '4',
    name: 'UX Designer',
    status: 'retrying',
    taskDescription: 'Retrying wireframes',
    progress: 30,
    retryCount: 2,
    startedAt: new Date(now - 180_000).toISOString(),
  },
];

export const Empty: Story = {
  args: { agents: [] },
};

export const SingleAgent: Story = {
  args: {
    agents: [
      {
        id: '1',
        name: 'DevOps Engineer',
        status: 'running',
        taskDescription: 'Generating templates',
        progress: 50,
      },
    ],
  },
};

export const MultiAgent: Story = {
  args: { agents: multi },
};
