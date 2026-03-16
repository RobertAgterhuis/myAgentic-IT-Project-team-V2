import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar, StepIndicator } from './progress';

/* ---------- ProgressBar stories ---------- */

const progressMeta = {
  title: 'UI/ProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
} satisfies Meta<typeof ProgressBar>;

export default progressMeta;
type Story = StoryObj<typeof progressMeta>;

export const Default: Story = {
  args: { value: 60 },
};

export const WithLabel: Story = {
  args: { value: 45, label: 'Upload progress', showPercentage: true },
};

export const Complete: Story = {
  args: { value: 100, label: 'Done', showPercentage: true },
};

export const Steps: Story = {
  args: { value: 0 },
  render: () => (
    <StepIndicator
      steps={[
        { label: 'Requirements', status: 'completed' },
        { label: 'Architecture', status: 'completed' },
        { label: 'Design', status: 'active' },
        { label: 'Implementation', status: 'upcoming' },
        { label: 'Review', status: 'upcoming' },
      ]}
    />
  ),
};
