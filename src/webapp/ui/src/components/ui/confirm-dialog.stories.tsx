import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmDialog } from './confirm-dialog';
import { Button } from './button';

const meta = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Confirm action',
    message: 'Are you sure you want to proceed?',
    onConfirm: () => {},
  },
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Confirm</Button>
        <ConfirmDialog {...args} open={open} onOpenChange={setOpen} />
      </>
    );
  },
};

export const Destructive: Story = {
  args: {
    title: 'Delete project?',
    message: 'This action cannot be undone. All data will be permanently lost.',
    confirmLabel: 'Yes, delete',
    cancelLabel: 'No, keep it',
    destructive: true,
    onConfirm: () => {},
  },
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete Project
        </Button>
        <ConfirmDialog {...args} open={open} onOpenChange={setOpen} />
      </>
    );
  },
};

export const CustomLabels: Story = {
  args: {
    title: 'Publish changes?',
    message: 'Your changes will be visible to all users.',
    confirmLabel: 'Publish now',
    cancelLabel: 'Go back',
    onConfirm: () => {},
  },
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Publish</Button>
        <ConfirmDialog {...args} open={open} onOpenChange={setOpen} />
      </>
    );
  },
};
