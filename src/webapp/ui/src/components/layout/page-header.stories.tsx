import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageHeader } from './page-header';
import { Button } from '@/components/ui/button';

const meta = {
  title: 'Layout/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  args: {
    title: 'Approval Center',
    subtitle:
      'Review pending governance approvals and apply policy-aware decisions with full traceability.',
    chips: [
      { id: 'env', label: 'Production', tone: 'warning' },
      { id: 'policy', label: 'Policy Lock', tone: 'critical' },
      { id: 'audit', label: 'Audit Ready', tone: 'success' },
    ],
    actions: (
      <>
        <Button variant="outline">Export</Button>
        <Button>New Decision</Button>
      </>
    ),
  },
};
