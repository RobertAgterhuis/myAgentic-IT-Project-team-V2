import type { Meta, StoryObj } from '@storybook/react';
import { DataTable } from './data-table';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from './badge';

type Issue = {
  id: number;
  title: string;
  status: 'open' | 'closed' | 'in-progress';
  priority: string;
  points: number;
};

const columns: ColumnDef<Issue, unknown>[] = [
  { accessorKey: 'id', header: '#', size: 60 },
  { accessorKey: 'title', header: 'Title' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const v = getValue() as string;
      const variant = v === 'closed' ? 'success' : v === 'in-progress' ? 'warning' : 'info';
      return <Badge variant={variant}>{v}</Badge>;
    },
  },
  { accessorKey: 'priority', header: 'Priority' },
  { accessorKey: 'points', header: 'SP' },
];

const mockData: Issue[] = Array.from({ length: 25 }, (_, i) => ({
  id: 200 + i,
  title: `Issue ${i + 1}: ${['Setup tooling', 'Build components', 'Write tests', 'Fix bug', 'Deploy'][i % 5]}`,
  status: (['open', 'closed', 'in-progress'] as const)[i % 3],
  priority: (['P0', 'P1', 'P2'] as const)[i % 3],
  points: [2, 3, 5, 8][i % 4],
}));

const meta = {
  title: 'UI/DataTable',
  component: DataTable,
  tags: ['autodocs'],
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    columns: columns as ColumnDef<unknown, unknown>[],
    data: mockData,
  },
};

export const WithFiltering: Story = {
  args: {
    columns: columns as ColumnDef<unknown, unknown>[],
    data: mockData,
    enableFiltering: true,
    filterPlaceholder: 'Search issues…',
  },
};

export const WithPagination: Story = {
  args: {
    columns: columns as ColumnDef<unknown, unknown>[],
    data: mockData,
    enablePagination: true,
    pageSizes: [5, 10, 25],
  },
};

export const Loading: Story = {
  args: {
    columns: columns as ColumnDef<unknown, unknown>[],
    data: [],
    loading: true,
    loadingRowCount: 5,
  },
};

export const Empty: Story = {
  args: {
    columns: columns as ColumnDef<unknown, unknown>[],
    data: [],
    emptyTitle: 'No issues found',
    emptyDescription: 'Try adjusting your filters.',
  },
};

export const FullFeatured: Story = {
  args: {
    columns: columns as ColumnDef<unknown, unknown>[],
    data: mockData,
    enableFiltering: true,
    enablePagination: true,
    enableSorting: true,
    pageSizes: [10, 20],
    filterPlaceholder: 'Search issues…',
  },
};
