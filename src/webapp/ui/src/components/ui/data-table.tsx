import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Button } from './button';
import { Input } from './input';
import { Skeleton } from './skeleton';
import { EmptyState } from './empty-state';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

/* ---------- Types ---------- */

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  loadingRowCount?: number;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  filterPlaceholder?: string;
  enablePagination?: boolean;
  pageSizes?: number[];
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  caption?: string;
  tableAriaLabel?: string;
  className?: string;
}

/* ---------- Component ---------- */

function DataTable<TData>({
  columns,
  data,
  loading = false,
  loadingRowCount = 5,
  enableSorting = true,
  enableFiltering = false,
  filterPlaceholder = 'Filter…',
  enablePagination = false,
  pageSizes = [10, 20, 50],
  enableRowSelection = false,
  onRowSelectionChange,
  emptyTitle = 'No data',
  emptyDescription,
  caption,
  tableAriaLabel,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  React.useEffect(() => {
    onRowSelectionChange?.(rowSelection);
  }, [rowSelection, onRowSelectionChange]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    ...(enableSorting ? { getSortedRowModel: getSortedRowModel() } : {}),
    ...(enableFiltering ? { getFilteredRowModel: getFilteredRowModel() } : {}),
    ...(enablePagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    enableRowSelection,
  });

  // Set initial page size only when it differs from the current one.
  React.useEffect(() => {
    const initialPageSize = pageSizes[0];
    if (!enablePagination || !initialPageSize) {
      return;
    }

    if (table.getState().pagination.pageSize !== initialPageSize) {
      table.setPageSize(initialPageSize);
    }
  }, [enablePagination, pageSizes, table]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Global filter */}
      {enableFiltering && (
        <div className="rounded-2xl border border-border/70 bg-card/72 p-3 shadow-sm backdrop-blur-sm">
          <Input
            placeholder={filterPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm h-9"
            aria-label="Filter table"
          />
        </div>
      )}

      {/* Table */}
      <Table aria-label={tableAriaLabel}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const canSort = enableSorting && header.column.getCanSort();
                const sortLabel =
                  sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none';
                return (
                  <TableHead
                    key={header.id}
                    scope="col"
                    aria-sort={canSort ? sortLabel : undefined}
                  >
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        className="group flex items-center gap-1 cursor-pointer select-none"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="text-muted-foreground group-hover:text-foreground">
                          {sorted === 'asc' ? (
                            <ArrowUp className="size-3.5" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUpDown className="size-3.5" />
                          )}
                        </span>
                      </button>
                    ) : (
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: loadingRowCount }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {columns.map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton variant="line" className="h-4 w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  className="m-3 py-10"
                />
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {enablePagination && !loading && table.getRowModel().rows.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/72 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };
export type { DataTableProps };
