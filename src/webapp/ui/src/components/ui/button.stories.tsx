import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { Mail, Plus } from 'lucide-react';

const meta = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'lg', 'icon'],
    },
    loading: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Button' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Delete' },
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Outline' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secondary' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ghost' },
};

export const Link: Story = {
  args: { variant: 'link', children: 'Link button' },
};

export const Small: Story = {
  args: { size: 'sm', children: 'Small' },
};

export const Large: Story = {
  args: { size: 'lg', children: 'Large' },
};

export const WithIcon: Story = {
  args: { children: undefined },
  render: () => (
    <Button>
      <Mail /> Login with Email
    </Button>
  ),
};

export const Loading: Story = {
  args: { loading: true, children: 'Please wait' },
};

export const LoadingDestructive: Story = {
  args: { loading: true, variant: 'destructive', children: 'Deleting...' },
};

export const IconOnly: Story = {
  args: { variant: 'outline', size: 'icon', children: undefined },
  render: () => (
    <Button variant="outline" size="icon">
      <Plus />
    </Button>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, children: 'Disabled' },
};
