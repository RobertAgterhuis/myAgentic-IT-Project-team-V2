import type { Meta, StoryObj } from '@storybook/react-vite';
import { MiniBar } from './mini-bar';

const meta = {
  title: 'UI/MiniBar',
  component: MiniBar,
  tags: ['autodocs'],
} satisfies Meta<typeof MiniBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: 30, max: 100, color: 'bg-info' },
  render: () => (
    <div className="grid gap-3 max-w-sm">
      <MiniBar value={30} max={100} color="bg-info" />
      <MiniBar value={60} max={100} color="bg-warning" />
      <MiniBar value={90} max={100} color="bg-success" />
    </div>
  ),
};
