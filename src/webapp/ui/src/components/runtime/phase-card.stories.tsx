import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhaseCard } from './phase-card';
import type { PhaseEntry } from '@/lib/api-types';

const meta = {
  title: 'Runtime/PhaseCard',
  component: PhaseCard,
  tags: ['autodocs'],
} satisfies Meta<typeof PhaseCard>;

export default meta;

type Story = StoryObj<typeof meta>;

const phase: PhaseEntry = {
  key: 'PHASE-2',
  label: 'Phase 2 - Architecture',
  status: 'active',
  total: 4,
  done: 2,
  agents: [
    { id: 'agent-1', name: 'Architect', status: 'active' },
    { id: 'agent-2', name: 'Security', status: 'pending' },
  ],
};

export const Default: Story = {
  args: {
    phase,
    isExpanded: true,
    onToggle: () => {},
  },
  render: () => {
    const [open, setOpen] = useState(true);
    return <PhaseCard phase={phase} isExpanded={open} onToggle={() => setOpen(!open)} />;
  },
};
