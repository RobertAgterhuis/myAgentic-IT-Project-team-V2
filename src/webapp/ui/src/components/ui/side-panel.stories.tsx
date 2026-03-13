import type { Meta, StoryObj } from '@storybook/react';
import { SidePanel, type NavSection } from './side-panel';
import { FileText, Settings, BarChart, Users } from 'lucide-react';

const sampleSections: NavSection[] = [
  {
    id: 'phase1',
    title: 'Phase 1 – Business',
    progress: 100,
    items: [
      { id: 'ba', label: 'Business Analyst', icon: <FileText /> },
      { id: 'de', label: 'Domain Expert', icon: <Users /> },
      { id: 'ss', label: 'Sales Strategist', icon: <BarChart /> },
    ],
  },
  {
    id: 'phase2',
    title: 'Phase 2 – Architecture',
    progress: 40,
    items: [
      { id: 'sa', label: 'Software Architect', icon: <Settings /> },
      { id: 'sd', label: 'Senior Developer', icon: <FileText /> },
    ],
  },
  {
    id: 'phase3',
    title: 'Phase 3 – UX',
    progress: 0,
    items: [
      { id: 'ux', label: 'UX Researcher' },
      { id: 'ui', label: 'UI Designer' },
    ],
  },
];

const meta = {
  title: 'UI/SidePanel',
  component: SidePanel,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sections: sampleSections,
    activeItemId: 'sa',
    className: 'h-[600px]',
  },
};

export const Collapsed: Story = {
  args: {
    sections: sampleSections,
    collapsed: true,
    className: 'h-[600px]',
  },
};
