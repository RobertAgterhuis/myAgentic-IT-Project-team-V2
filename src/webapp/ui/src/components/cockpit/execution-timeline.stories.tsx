import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExecutionTimeline } from './execution-timeline';

const meta = {
  title: 'Cockpit/ExecutionTimeline',
  component: ExecutionTimeline,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ExecutionTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { events: [] },
};

const now = Date.now();
const mins = (n: number) => new Date(now - n * 60_000).toISOString();

export const Typical: Story = {
  args: {
    events: [
      {
        id: 'e1',
        type: 'phase_start',
        timestamp: mins(30),
        description: 'Phase 1 started',
        phase: 'PHASE-1',
      },
      {
        id: 'e2',
        type: 'agent_complete',
        timestamp: mins(25),
        description: 'Business Analyst completed',
        agent: 'Business Analyst',
        phase: 'PHASE-1',
      },
      {
        id: 'e3',
        type: 'agent_complete',
        timestamp: mins(20),
        description: 'Domain Expert completed',
        agent: 'Domain Expert',
        phase: 'PHASE-1',
      },
      {
        id: 'e4',
        type: 'error',
        timestamp: mins(15),
        description: 'Critic validation warning',
        agent: 'Critic',
        phase: 'PHASE-1',
      },
      {
        id: 'e5',
        type: 'phase_start',
        timestamp: mins(10),
        description: 'Phase 2 started',
        phase: 'PHASE-2',
      },
      {
        id: 'e6',
        type: 'gate_failed',
        timestamp: mins(5),
        description: 'Gate failed — missing security review',
        phase: 'PHASE-2',
      },
    ],
  },
};

export const AllSuccess: Story = {
  args: {
    events: Array.from({ length: 8 }, (_, i) => ({
      id: `s${i}`,
      type: 'agent_complete' as const,
      timestamp: mins(40 - i * 5),
      description: `Step ${i + 1} completed`,
      agent: `Agent-${i + 1}`,
    })),
  },
};

export const WithSkipped: Story = {
  args: {
    events: [
      { id: 'k1', type: 'agent_complete' as const, timestamp: mins(20), description: 'Step 1' },
      { id: 'k2', type: 'retry' as const, timestamp: mins(15), description: 'Step 2 — skipped' },
      { id: 'k3', type: 'agent_complete' as const, timestamp: mins(10), description: 'Step 3' },
      {
        id: 'k4',
        type: 'gate_failed' as const,
        timestamp: mins(5),
        description: 'Step 4 — failure',
      },
    ],
  },
};
