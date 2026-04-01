import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router-dom';
import { BreadcrumbNav } from './breadcrumb-nav';

const meta = {
  title: 'Layout/BreadcrumbNav',
  component: BreadcrumbNav,
  tags: ['autodocs'],
} satisfies Meta<typeof BreadcrumbNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MultiLevel: Story = {
  args: {
    items: [{ label: 'Dashboard', path: '/dashboard' }],
  },
  render: () => (
    <MemoryRouter>
      <BreadcrumbNav
        items={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Sessions', path: '/sessions' },
          { label: 'Session #7842', path: '/sessions/7842' },
        ]}
      />
    </MemoryRouter>
  ),
};

export const SingleLevelHidden: Story = {
  args: {
    items: [{ label: 'Dashboard', path: '/dashboard' }],
  },
  render: () => (
    <MemoryRouter>
      <BreadcrumbNav items={[{ label: 'Dashboard', path: '/dashboard' }]} />
    </MemoryRouter>
  ),
};
