import type { Meta, StoryObj } from '@storybook/react-vite';
import { GateStatus } from './gate-status';

const meta = {
  title: 'Runtime/GateStatus',
  component: GateStatus,
  tags: ['autodocs'],
  argTypes: {
    status: { control: 'select', options: ['passed', 'pending', 'blocked', 'failed'] },
  },
} satisfies Meta<typeof GateStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Passed: Story = {
  args: { gateId: 'g1', label: 'Security Gate', status: 'passed' },
};

export const Pending: Story = {
  args: { gateId: 'g2', label: 'Architecture Gate', status: 'pending' },
};

export const Blocked: Story = {
  args: {
    gateId: 'g3',
    label: 'Compliance Gate',
    status: 'blocked',
    reason: 'Waiting for legal review',
    suggestedAction: 'Contact legal team',
  },
};

export const Failed: Story = {
  args: {
    gateId: 'g4',
    label: 'Security Gate',
    status: 'failed',
    reason: 'Architecture missing authentication model',
    suggestedAction: 'Add OAuth strategy decision',
  },
};
