import type { Meta, StoryObj } from '@storybook/react';
import { Toaster } from './sonner';
import { showToast } from './toast-system';
import { Button } from './button';

const meta = {
  title: 'UI/Toast',
  component: Toaster,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <>
        <Story />
        <Toaster position="bottom-right" />
      </>
    ),
  ],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  render: () => (
    <Button onClick={() => showToast.success('Changes saved successfully')}>
      Show Success Toast
    </Button>
  ),
};

export const Error: Story = {
  render: () => (
    <Button
      variant="destructive"
      onClick={() => showToast.error('Something went wrong')}
    >
      Show Error Toast
    </Button>
  ),
};

export const Warning: Story = {
  render: () => (
    <Button
      variant="outline"
      onClick={() => showToast.warning('Disk space running low')}
    >
      Show Warning Toast
    </Button>
  ),
};

export const Info: Story = {
  render: () => (
    <Button
      variant="secondary"
      onClick={() => showToast.info('New version available')}
    >
      Show Info Toast
    </Button>
  ),
};

export const WithDuration: Story = {
  render: () => (
    <Button onClick={() => showToast.success('Auto-dismiss in 10s', { duration: 10000 })}>
      Long Duration Toast
    </Button>
  ),
};

export const Stacking: Story = {
  render: () => (
    <Button
      onClick={() => {
        showToast.success('First toast');
        showToast.info('Second toast');
        showToast.warning('Third toast');
      }}
    >
      Show 3 Toasts
    </Button>
  ),
};
