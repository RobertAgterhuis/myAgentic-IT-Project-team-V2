import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from './label';
import { Input } from './input';

const meta = {
  title: 'UI/Label',
  component: Label,
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="grid gap-2 max-w-sm">
      <Label htmlFor="name">Project name</Label>
      <Input id="name" placeholder="Agentic SDLC" />
    </div>
  ),
};
