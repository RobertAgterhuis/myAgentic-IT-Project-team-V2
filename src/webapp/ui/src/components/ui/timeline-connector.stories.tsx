import type { Meta, StoryObj } from '@storybook/react-vite';
import { TimelineConnector } from './timeline-connector';

const meta = {
  title: 'UI/TimelineConnector',
  component: TimelineConnector,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    active: { control: 'boolean' },
  },
} satisfies Meta<typeof TimelineConnector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
};

export const HorizontalActive: Story = {
  args: { orientation: 'horizontal', active: true },
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
};

export const VerticalActive: Story = {
  args: { orientation: 'vertical', active: true },
};
