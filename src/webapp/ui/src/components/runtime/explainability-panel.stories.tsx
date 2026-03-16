import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExplainabilityPanel } from './explainability-panel';

const meta = {
  title: 'Runtime/ExplainabilityPanel',
  component: ExplainabilityPanel,
  tags: ['autodocs'],
} satisfies Meta<typeof ExplainabilityPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GateFailure: Story = {
  args: {
    title: 'Security Gate Failed',
    reason: 'Architecture missing authentication model.',
    suggestedAction: 'Add OAuth strategy decision.',
    onDismiss: () => {},
  },
};

export const AgentRetry: Story = {
  args: {
    title: 'Agent Retry',
    reason: 'UX Designer failed due to context overflow. Retrying with reduced scope.',
    suggestedAction: 'Wait for retry to complete or reduce project scope.',
    details: {
      Agent: 'UX Designer',
      'Retry Count': '2',
      'Original Error': 'Context window exceeded',
    },
    onDismiss: () => {},
  },
};

export const Generic: Story = {
  args: {
    title: 'Pipeline Warning',
    reason: 'One or more deliverables below quality threshold.',
    onDismiss: () => {},
  },
};
