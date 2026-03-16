import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './skeleton';

const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {
  args: { variant: 'line' },
};

export const Circle: Story = {
  args: { variant: 'circle' },
};

export const Rectangle: Story = {
  args: { variant: 'rectangle' },
};

export const CardSkeleton: Story = {
  render: () => (
    <div className="flex flex-col gap-3 w-64">
      <Skeleton variant="rectangle" className="h-32" />
      <Skeleton variant="line" className="w-3/4" />
      <Skeleton variant="line" className="w-1/2" />
    </div>
  ),
};
