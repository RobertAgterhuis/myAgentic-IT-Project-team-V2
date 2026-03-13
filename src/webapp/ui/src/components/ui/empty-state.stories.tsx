import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './empty-state';
import { Inbox, Search, FileX } from 'lucide-react';

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { title: 'No items found' },
};

export const WithDescription: Story = {
  args: {
    title: 'No results',
    description: 'Try adjusting your search or filter criteria.',
  },
};

export const WithIcon: Story = {
  args: {
    icon: <Inbox className="size-12" />,
    title: 'Inbox empty',
    description: 'All caught up!',
  },
};

export const WithAction: Story = {
  args: {
    icon: <FileX className="size-12" />,
    title: 'No documents',
    description: 'Get started by creating your first document.',
    action: { label: 'Create document', onClick: () => {} },
  },
};

export const SearchEmpty: Story = {
  args: {
    icon: <Search className="size-12" />,
    title: 'No search results',
    description: "We couldn't find anything matching your query.",
  },
};
