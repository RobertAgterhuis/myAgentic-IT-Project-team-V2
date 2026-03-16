import type { Meta, StoryObj } from '@storybook/react-vite';
import { SwitchField } from './switch-field';

const meta = {
  title: 'UI/SwitchField',
  component: SwitchField,
  tags: ['autodocs'],
  args: {
    label: 'Toggle option',
  },
} satisfies Meta<typeof SwitchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
  args: { defaultChecked: true },
};

export const WithDescription: Story = {
  args: {
    label: 'Email notifications',
    description: 'Receive email alerts when something happens.',
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const DisabledChecked: Story = {
  args: { disabled: true, defaultChecked: true },
};

export const Small: Story = {
  args: { size: 'sm', label: 'Compact toggle' },
};
