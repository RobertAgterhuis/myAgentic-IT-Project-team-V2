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
    items: [{ label: 'Overview', path: '/overview' }],
  },
  render: () => (
    <MemoryRouter>
      <BreadcrumbNav
        items={[
          { label: 'Overview', path: '/overview' },
          { label: 'Runs', path: '/runs' },
          { label: 'Run #7842', path: '/runs/7842' },
        ]}
      />
    </MemoryRouter>
  ),
};

export const SingleLevelHidden: Story = {
  args: {
    items: [{ label: 'Overview', path: '/overview' }],
  },
  render: () => (
    <MemoryRouter>
      <BreadcrumbNav items={[{ label: 'Overview', path: '/overview' }]} />
    </MemoryRouter>
  ),
};
