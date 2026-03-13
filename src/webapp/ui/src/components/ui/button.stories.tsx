import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { Loader2, Mail, Plus } from 'lucide-react';

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

export const WithIcon: Story = {
  args: { children: undefined },
  render: () => (
    <Button>
      <Mail /> Login with Email
    </Button>
  ),
};

export const Loading: Story = {
  args: { disabled: true, children: undefined },
  render: () => (
    <Button disabled>
      <Loader2 className="animate-spin" /> Please wait
    </Button>
  ),
};

export const IconOnly: Story = {
  args: { variant: 'outline', size: 'icon', children: undefined },
  render: () => (
    <Button variant="outline" size="icon">
      <Plus />
    </Button>
  ),
};
