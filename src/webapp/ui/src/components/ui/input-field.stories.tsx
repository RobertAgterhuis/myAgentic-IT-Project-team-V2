import type { Meta, StoryObj } from '@storybook/react-vite';
import { InputField } from './input-field';

const meta = {
  title: 'UI/InputField',
  component: InputField,
  tags: ['autodocs'],
  argTypes: {
    error: { control: 'text' },
    helperText: { control: 'text' },
    success: { control: 'boolean' },
    showCount: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof InputField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Email', placeholder: 'you@example.com' },
};

export const WithHelperText: Story = {
  args: { label: 'Password', type: 'password', helperText: 'Must be at least 8 characters' },
};

export const ErrorState: Story = {
  args: { label: 'Email', defaultValue: 'bad-email', error: 'Please enter a valid email address' },
};

export const SuccessState: Story = {
  args: { label: 'Username', defaultValue: 'johndoe', success: true, helperText: 'Username available' },
};

export const WithCharacterCount: Story = {
  args: { label: 'Bio', placeholder: 'Tell us about yourself', showCount: true, maxLength: 160 },
};

export const Disabled: Story = {
  args: { label: 'Name', defaultValue: 'Locked value', disabled: true },
};
