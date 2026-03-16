import type { Meta, StoryObj } from '@storybook/react-vite';
import { RuntimeEvent } from './runtime-event';

const meta = {
  title: 'Runtime/RuntimeEvent',
  component: RuntimeEvent,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: [
        'session_start',
        'phase_start',
        'phase_complete',
        'agent_start',
        'agent_complete',
        'artifact_created',
        'gate_passed',
        'gate_failed',
        'error',
        'retry',
      ],
    },
  },
} satisfies Meta<typeof RuntimeEvent>;

export default meta;
type Story = StoryObj<typeof meta>;

const ts = new Date().toISOString();

export const SessionStart: Story = {
  args: { type: 'session_start', timestamp: ts, description: 'Session started' },
};

export const PhaseStart: Story = {
  args: {
    type: 'phase_start',
    timestamp: ts,
    description: 'Architecture phase started',
    phase: 'Phase 2',
  },
};

export const PhaseComplete: Story = {
  args: {
    type: 'phase_complete',
    timestamp: ts,
    description: 'Discovery phase completed',
    phase: 'Phase 1',
  },
};

export const AgentStart: Story = {
  args: {
    type: 'agent_start',
    timestamp: ts,
    description: 'DevOps agent executing',
    agent: 'DevOps Engineer',
  },
};

export const AgentComplete: Story = {
  args: {
    type: 'agent_complete',
    timestamp: ts,
    description: 'Business Analyst completed',
    agent: 'Business Analyst',
  },
};

export const ArtifactCreated: Story = {
  args: { type: 'artifact_created', timestamp: ts, description: 'Artifact: architecture.md' },
};

export const GatePassed: Story = {
  args: { type: 'gate_passed', timestamp: ts, description: 'Security gate passed' },
};

export const GateFailed: Story = {
  args: {
    type: 'gate_failed',
    timestamp: ts,
    description: 'Security gate failed — missing auth model',
  },
};

export const Error: Story = {
  args: { type: 'error', timestamp: ts, description: 'Orchestrator error: timeout' },
};

export const Retry: Story = {
  args: { type: 'retry', timestamp: ts, description: 'Retrying UX Designer', agent: 'UX Designer' },
};
