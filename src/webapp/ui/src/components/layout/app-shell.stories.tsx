import type { Meta, StoryObj } from '@storybook/react-vite';
import { AppShell } from './app-shell';
import { TopNavigation } from '@/components/ui/top-navigation';
import { SidebarNav } from './sidebar-nav';
import { BreadcrumbNav } from './breadcrumb-nav';
import type { NavSection } from '@/components/ui/side-panel';
import { LayoutDashboard, Terminal } from 'lucide-react';

const sections: NavSection[] = [
  {
    id: 'runtime',
    title: 'Runtime',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard className="size-4" />,
      },
      {
        id: 'commands',
        label: 'Commands',
        href: '/commands',
        icon: <Terminal className="size-4" />,
      },
    ],
  },
];

const meta = {
  title: 'Layout/AppShell',
  component: AppShell,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    topNavigation: <div />,
    sidebar: <div />,
    children: <div />,
  },
  render: () => (
    <AppShell
      topNavigation={<TopNavigation projectName="Agentic SDLC" orchestratorState="PHASE_2" />}
      sidebar={
        <SidebarNav
          sections={sections}
          activeItemId="/dashboard"
          sidebarOpen={true}
          onCollapse={() => undefined}
          onSelectItem={() => undefined}
        />
      }
      breadcrumbs={<BreadcrumbNav items={[{ label: 'Dashboard', path: '/dashboard' }]} />}
    >
      <div className="p-6">
        <h2 className="text-heading-lg font-semibold text-foreground">Page Content</h2>
        <p className="mt-2 text-body-md text-muted-foreground">
          AppShell composes navigation chrome while keeping route content isolated.
        </p>
      </div>
    </AppShell>
  ),
};
