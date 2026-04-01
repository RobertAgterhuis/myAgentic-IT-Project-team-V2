import type { Meta, StoryObj } from '@storybook/react-vite';
import { SidebarNav } from './sidebar-nav';
import type { NavSection } from '@/components/ui/side-panel';
import { LayoutDashboard, GitBranch, Scale, Activity } from 'lucide-react';

const sections: NavSection[] = [
  {
    id: 'control-surface',
    title: 'Control Surface',
    items: [
      {
        id: '/dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard className="size-4" />,
      },
      {
        id: '/sessions',
        label: 'Sessions',
        href: '/sessions',
        icon: <Activity className="size-4" />,
      },
    ],
  },
  {
    id: 'governance',
    title: 'Governance',
    items: [
      {
        id: '/approvals',
        label: 'Approvals',
        href: '/approvals',
        icon: <Scale className="size-4" />,
      },
      {
        id: '/traceability',
        label: 'Traceability',
        href: '/traceability',
        icon: <GitBranch className="size-4" />,
      },
    ],
  },
];

const meta = {
  title: 'Layout/SidebarNav',
  component: SidebarNav,
  tags: ['autodocs'],
} satisfies Meta<typeof SidebarNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expanded: Story = {
  args: {
    sections,
    sidebarOpen: true,
    onCollapse: () => undefined,
    onSelectItem: () => undefined,
  },
  render: () => (
    <div className="h-[560px] w-[260px]">
      <SidebarNav
        sections={sections}
        activeItemId="/dashboard"
        sidebarOpen={true}
        onCollapse={() => undefined}
        onSelectItem={() => undefined}
        className="!flex"
      />
    </div>
  ),
};

export const Collapsed: Story = {
  args: {
    sections,
    sidebarOpen: false,
    onCollapse: () => undefined,
    onSelectItem: () => undefined,
  },
  render: () => (
    <div className="h-[560px] w-[68px]">
      <SidebarNav
        sections={sections}
        activeItemId="/dashboard"
        sidebarOpen={false}
        onCollapse={() => undefined}
        onSelectItem={() => undefined}
        className="!flex"
      />
    </div>
  ),
};
