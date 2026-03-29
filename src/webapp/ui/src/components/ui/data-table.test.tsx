import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './data-table';
import { type ColumnDef } from '@tanstack/react-table';

type Row = { id: number; name: string; status: string };

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
];

const data: Row[] = [
  { id: 1, name: 'Alpha', status: 'active' },
  { id: 2, name: 'Beta', status: 'inactive' },
  { id: 3, name: 'Gamma', status: 'active' },
];

describe('DataTable', () => {
  it('renders header and rows', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('shows empty state when data is empty', () => {
    render(<DataTable columns={columns} data={[]} emptyTitle="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('shows skeleton rows when loading', () => {
    render(<DataTable columns={columns} data={[]} loading loadingRowCount={3} />);
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(6); // 3 rows * 2 columns
  });

  it('sorts on column header click', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} enableSorting />);
    const nameHeader = screen.getByRole('button', { name: 'Name' });
    await user.click(nameHeader);
    const cells = screen.getAllByRole('cell');
    const names = cells.filter((_, i) => i % 2 === 0).map((c) => c.textContent);
    expect(names).toEqual(['Alpha', 'Beta', 'Gamma']); // asc
  });

  it('sets aria-sort on sortable header cells', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} enableSorting />);

    const nameHeaderButton = screen.getByRole('button', { name: 'Name' });
    const nameHeaderCell = nameHeaderButton.closest('th');

    expect(nameHeaderCell).toHaveAttribute('aria-sort', 'none');
    await user.click(nameHeaderButton);
    expect(nameHeaderCell).toHaveAttribute('aria-sort', 'ascending');
  });

  it('filters with global filter', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={data} enableFiltering />);
    const input = screen.getByRole('textbox', { name: 'Filter table' });
    await user.type(input, 'Beta');
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('paginates', async () => {
    const bigData = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      status: 'active',
    }));
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={bigData} enablePagination pageSizes={[5]} />);
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('renders responsive scroll container', () => {
    render(<DataTable columns={columns} data={data} />);
    const container = document.querySelector('[data-slot="table-container"]');
    expect(container).toBeInTheDocument();
    expect(container!.className).toMatch(/overflow/);
  });
});
