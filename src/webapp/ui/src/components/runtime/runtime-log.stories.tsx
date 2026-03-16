import type { Meta, StoryObj } from '@storybook/react-vite';
import { RuntimeLog, type RuntimeLogEvent } from './runtime-log';

const meta = {
  title: 'Runtime/RuntimeLog',
  component: RuntimeLog,
  tags: ['autodocs'],
} satisfies Meta<typeof RuntimeLog>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = new Date('2026-03-16T10:00:00Z').getTime();
const mkEvent = (i: number, partial: Partial<RuntimeLogEvent>): RuntimeLogEvent => ({
  id: `evt-${i}`,
  type: 'agent_start',
  timestamp: new Date(base + i * 60_000).toISOString(),
  description: `Event ${i}`,
  ...partial,
});

const fewEvents: RuntimeLogEvent[] = [
  mkEvent(0, { type: 'session_start', description: 'Session started' }),
  mkEvent(1, { type: 'phase_start', description: 'Discovery phase started', phase: 'Phase 1' }),
  mkEvent(2, {
    type: 'agent_start',
    description: 'Business Analyst executing',
    agent: 'Business Analyst',
  }),
  mkEvent(3, {
    type: 'agent_complete',
    description: 'Business Analyst completed',
    agent: 'Business Analyst',
  }),
  mkEvent(4, { type: 'artifact_created', description: 'Artifact: requirements.md' }),
  mkEvent(5, { type: 'gate_passed', description: 'Phase 1 gate passed' }),
];

const manyEvents: RuntimeLogEvent[] = Array.from({ length: 50 }, (_, i) =>
  mkEvent(i, {
    description: `Event #${i + 1}`,
    type: i % 2 === 0 ? 'agent_start' : 'agent_complete',
  })
);

export const Empty: Story = {
  args: { events: [] },
};

export const FewEvents: Story = {
  args: { events: fewEvents },
};

export const ManyEvents: Story = {
  args: { events: manyEvents },
};

export const Filtered: Story = {
  args: { events: fewEvents, filter: ['gate_passed', 'gate_failed'] },
};
