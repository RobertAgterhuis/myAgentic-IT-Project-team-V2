import type { Meta, StoryObj } from '@storybook/react-vite';
import { TopNavigation } from './top-navigation';
import { withProviders } from '@/test/storybook-decorators';

const meta = {
  title: 'UI/TopNavigation',
  component: TopNavigation,
  tags: ['autodocs'],
  decorators: [withProviders],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TopNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    projectName: 'Enterprise Dashboard',
    orchestratorState: 'Phase 2 – Architecture',
    connectionStatus: 'connected',
  },
};

export const Disconnected: Story = {
  args: {
    projectName: 'Enterprise Dashboard',
    connectionStatus: 'disconnected',
  },
};

export const Connecting: Story = {
  args: {
    projectName: 'Enterprise Dashboard',
    orchestratorState: 'Initializing',
    connectionStatus: 'connecting',
  },
};

export const Minimal: Story = {
  args: {},
};
