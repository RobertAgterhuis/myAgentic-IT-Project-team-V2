import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toaster, showToast } from './toast-system';
import { Button } from './button';

const meta = {
  title: 'UI/Toaster',
  component: Toaster,
  tags: ['autodocs'],
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => showToast.success('Saved successfully')}>Success</Button>
        <Button variant="outline" onClick={() => showToast.info('Info message')}>
          Info
        </Button>
        <Button variant="outline" onClick={() => showToast.warning('Review required')}>
          Warning
        </Button>
        <Button variant="destructive" onClick={() => showToast.error('Action failed')}>
          Error
        </Button>
      </div>
      <Toaster />
    </div>
  ),
};
