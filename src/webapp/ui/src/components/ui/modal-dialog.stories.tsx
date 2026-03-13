import type { Meta, StoryObj } from '@storybook/react';
import { ModalDialog } from './modal-dialog';
import { Button } from './button';

const meta = {
  title: 'UI/ModalDialog',
  component: ModalDialog,
  tags: ['autodocs'],
} satisfies Meta<typeof ModalDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed?',
    trigger: <Button>Open Modal</Button>,
    footer: (
      <>
        <Button variant="outline">Cancel</Button>
        <Button>Confirm</Button>
      </>
    ),
    children: <p>This action cannot be undone.</p>,
  },
};

export const Small: Story = {
  args: {
    title: 'Quick Message',
    size: 'sm',
    trigger: <Button variant="outline">Open Small</Button>,
    children: <p>A compact dialog for quick confirmations.</p>,
  },
};

export const Large: Story = {
  args: {
    title: 'Detailed View',
    size: 'lg',
    trigger: <Button variant="outline">Open Large</Button>,
    children: (
      <div className="space-y-2">
        <p>This is a larger dialog suitable for forms and detailed content.</p>
        <p>It provides more horizontal space for complex layouts.</p>
      </div>
    ),
  },
};

export const NoBackdropClose: Story = {
  args: {
    title: 'Persistent Dialog',
    description: 'Click the X or Escape to close.',
    closeOnBackdropClick: false,
    trigger: <Button variant="destructive">Open Persistent</Button>,
    children: <p>Clicking outside this dialog will not close it.</p>,
  },
};
