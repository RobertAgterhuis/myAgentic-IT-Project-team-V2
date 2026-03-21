import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueueTriageList } from './queue-triage-list';
import { ShieldCheck, Activity, AlertTriangle } from 'lucide-react';

const meta = {
  title: 'UI/QueueTriageList',
  component: QueueTriageList,
  tags: ['autodocs'],
} satisfies Meta<typeof QueueTriageList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ApprovalsQueue: Story = {
  args: {
    title: 'Approvals queue',
    description: 'Triage approvals by urgency and governance impact.',
    items: [
      {
        id: 'appr-1',
        title: 'Release gate approval for sprint-42',
        subtitle: 'Blocking release transition to PHASE-4 until approved.',
        statusLabel: 'Pending',
        priority: 'high',
        icon: <ShieldCheck className="size-4" />,
        actionLabel: 'Review',
        meta: [
          { id: 'requested-by', label: 'Requested by', value: 'governance-agent' },
          { id: 'due', label: 'Due', value: '12 min', tone: 'critical' },
        ],
      },
      {
        id: 'appr-2',
        title: 'Policy exception approval',
        subtitle: 'Exception requested for temporary sandbox egress.',
        statusLabel: 'Needs context',
        priority: 'medium',
        icon: <AlertTriangle className="size-4" />,
        actionLabel: 'Inspect',
        meta: [
          { id: 'policy', label: 'Policy', value: 'NET-003' },
          { id: 'risk', label: 'Risk', value: 'Medium', tone: 'warning' },
        ],
      },
    ],
  },
};

export const RunsQueue: Story = {
  args: {
    title: 'Runs queue',
    description: 'Prioritize active and blocked orchestration sessions.',
    items: [
      {
        id: 'run-1',
        title: 'checkout-service-hotfix',
        subtitle: 'Current phase: PHASE-2',
        statusLabel: 'Running',
        priority: 'low',
        icon: <Activity className="size-4" />,
        actionLabel: 'Open run',
        meta: [
          { id: 'progress', label: 'Progress', value: '47%', tone: 'info' },
          { id: 'agent', label: 'Agent', value: 'technical-agent', tone: 'success' },
        ],
      },
    ],
  },
};

export const EmptyQueue: Story = {
  args: {
    title: 'Triage queue',
    description: 'Everything is currently healthy.',
    items: [],
    emptyTitle: 'Queue clear',
    emptyDescription: 'No items require action right now.',
  },
};
