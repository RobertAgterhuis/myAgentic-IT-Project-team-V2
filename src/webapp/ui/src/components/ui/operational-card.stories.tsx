import type { Meta, StoryObj } from '@storybook/react-vite';
import { OperationalCard } from './operational-card';
import { Button } from './button';
import { Activity, ShieldCheck } from 'lucide-react';

const meta = {
  title: 'UI/OperationalCard',
  component: OperationalCard,
  tags: ['autodocs'],
} satisfies Meta<typeof OperationalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PendingApproval: Story = {
  args: {
    title: 'Approval for release gate PHASE-3',
    subtitle: 'Policy pack SOC2 controls require explicit human acknowledgement.',
    icon: <ShieldCheck className="size-4" />,
    statusLabel: 'Pending review',
    statusTone: 'warning',
    meta: [
      { id: 'requested-by', label: 'Requested by', value: 'orchestrator-engine' },
      { id: 'scope', label: 'Scope', value: 'release/2026.03.21', tone: 'info' },
      { id: 'risk', label: 'Risk', value: 'Medium', tone: 'warning' },
      { id: 'sla', label: 'SLA', value: '18m remaining', tone: 'critical' },
    ],
    actions: (
      <>
        <Button size="sm">Approve</Button>
        <Button size="sm" variant="outline">
          Reject
        </Button>
      </>
    ),
  },
};

export const ActiveRun: Story = {
  args: {
    title: 'Session run: payments-scope-change',
    subtitle: 'Execution is in PHASE-3 with one active retry on technical-agent.',
    icon: <Activity className="size-4" />,
    statusLabel: 'Running',
    statusTone: 'info',
    meta: [
      { id: 'phase', label: 'Phase', value: 'PHASE-3', tone: 'info' },
      { id: 'agent', label: 'Agent', value: 'technical-agent', tone: 'success' },
      { id: 'progress', label: 'Progress', value: '61%' },
      { id: 'issues', label: 'Open blockers', value: '0', tone: 'success' },
    ],
  },
};
