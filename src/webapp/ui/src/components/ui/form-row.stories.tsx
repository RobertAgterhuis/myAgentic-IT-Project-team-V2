import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormRow } from './form-row';
import { Input } from './input';

const meta = {
  title: 'UI/FormRow',
  component: FormRow,
  tags: ['autodocs'],
  args: {
    label: 'Field label',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Storybook args typing mismatch with ReactElement
    children: (<Input />) as any,
  },
} satisfies Meta<typeof FormRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Email address',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Storybook args typing mismatch
    children: (<Input type="email" placeholder="you@example.com" />) as any,
  },
};

export const Required: Story = {
  args: {
    label: 'Full name',
    required: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Storybook args typing mismatch
    children: (<Input placeholder="Jane Doe" />) as any,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Password',
    helperText: 'Must be at least 8 characters',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Storybook args typing mismatch
    children: (<Input type="password" />) as any,
  },
};

export const ErrorState: Story = {
  args: {
    label: 'Email',
    error: 'Please enter a valid email address',
    helperText: "We'll never share your email",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Storybook args typing mismatch
    children: (<Input type="email" defaultValue="not-an-email" />) as any,
  },
};
