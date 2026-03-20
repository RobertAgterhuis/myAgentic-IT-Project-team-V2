import type { Meta, StoryObj } from '@storybook/react-vite';
import { GateIndicator } from './gate-indicator';

const meta = {
  title: 'Runtime/GateIndicator',
  component: GateIndicator,
  tags: ['autodocs'],
} satisfies Meta<typeof GateIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Passed: Story = { args: { status: 'passed' } };
export const Pending: Story = { args: { status: 'pending' } };
export const Blocked: Story = { args: { status: 'blocked' } };
