import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContextStrip } from './context-strip';

const meta = {
  title: 'Layout/ContextStrip',
  component: ContextStrip,
  tags: ['autodocs'],
} satisfies Meta<typeof ContextStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RuntimeContext: Story = {
  args: {
    items: [
      { id: 'workspace', label: 'Workspace', value: 'myAgentic-IT-Project-team-V2' },
      { id: 'phase', label: 'Phase', value: 'Phase 2', tone: 'info' },
      { id: 'risk', label: 'Risk', value: 'High', tone: 'warning' },
      { id: 'status', label: 'Status', value: 'Blocked by approval', tone: 'critical' },
    ],
  },
};
