import type { Meta, StoryObj } from '@storybook/react-vite';
import { SessionStatus } from './session-status';

const meta = {
  title: 'Runtime/SessionStatus',
  component: SessionStatus,
  tags: ['autodocs'],
} satisfies Meta<typeof SessionStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Active: Story = {
  args: {
    session: { id: 's-1', command: 'CREATE', project: 'Project Phoenix' },
    progress: 38,
    activePhase: 'Architecture',
    activeAgent: 'DevOps Engineer',
    connectionStatus: 'connected',
  },
};

export const Idle: Story = {
  args: {
    session: { id: 's-2', command: 'AUDIT', project: 'Legacy System' },
    progress: 0,
    connectionStatus: 'connected',
  },
};

export const Error: Story = {
  args: {
    session: { id: 's-3', command: 'CREATE', project: 'Broken Project' },
    progress: 65,
    activePhase: 'Implementation',
    connectionStatus: 'disconnected',
  },
};

export const NoSession: Story = {
  args: {
    session: null,
    progress: 0,
    connectionStatus: 'connecting',
  },
};
