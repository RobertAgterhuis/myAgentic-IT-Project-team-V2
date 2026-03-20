import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { HelpPanel } from './help-panel';

const meta = {
  title: 'Help/HelpPanel',
  component: HelpPanel,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HelpPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { onClose: () => {} },
  render: () => (
    <MemoryRouter initialEntries={['/commands']}>
      <div className="min-h-screen bg-background p-6">
        <HelpPanel onClose={() => {}} />
      </div>
    </MemoryRouter>
  ),
};
