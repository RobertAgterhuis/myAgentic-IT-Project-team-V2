import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

const meta = {
  title: 'UI/Table',
  component: Table,
  tags: ['autodocs'],
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Phase</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[
          { name: 'Architect', status: 'Active', phase: 'PHASE-2' },
          { name: 'QA Specialist', status: 'Pending', phase: 'PHASE-4' },
          { name: 'Release Manager', status: 'Done', phase: 'PHASE-5' },
        ].map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.status}</TableCell>
            <TableCell>{row.phase}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};
