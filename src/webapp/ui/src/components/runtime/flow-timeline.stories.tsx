import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlowTimeline, type FlowPhase } from './flow-timeline';

const meta = {
  title: 'Runtime/FlowTimeline',
  component: FlowTimeline,
  tags: ['autodocs'],
} satisfies Meta<typeof FlowTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

const allPending: FlowPhase[] = [
  { id: '1', label: 'Discovery', status: 'pending' },
  { id: '2', label: 'Architecture', status: 'pending' },
  { id: '3', label: 'Planning', status: 'pending' },
  { id: '4', label: 'Implementation', status: 'pending' },
  { id: '5', label: 'Validation', status: 'pending' },
];

const midProgress: FlowPhase[] = [
  { id: '1', label: 'Discovery', status: 'completed' },
  { id: '2', label: 'Architecture', status: 'running' },
  { id: '3', label: 'Planning', status: 'pending' },
  { id: '4', label: 'Implementation', status: 'pending' },
  { id: '5', label: 'Validation', status: 'pending' },
];

const allCompleted: FlowPhase[] = [
  { id: '1', label: 'Discovery', status: 'completed' },
  { id: '2', label: 'Architecture', status: 'completed' },
  { id: '3', label: 'Planning', status: 'completed' },
  { id: '4', label: 'Implementation', status: 'completed' },
  { id: '5', label: 'Validation', status: 'completed' },
];

const withFailure: FlowPhase[] = [
  { id: '1', label: 'Discovery', status: 'completed' },
  { id: '2', label: 'Architecture', status: 'completed' },
  { id: '3', label: 'Planning', status: 'failed' },
  { id: '4', label: 'Implementation', status: 'pending' },
  { id: '5', label: 'Validation', status: 'pending' },
];

export const Empty: Story = {
  args: { phases: [] },
};

export const AllPending: Story = {
  args: { phases: allPending },
};

export const MidProgress: Story = {
  args: { phases: midProgress, activePhaseId: '2' },
};

export const Completed: Story = {
  args: { phases: allCompleted },
};

export const Failed: Story = {
  args: { phases: withFailure },
};
