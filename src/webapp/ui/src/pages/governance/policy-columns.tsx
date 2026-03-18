/**
 * Policy compliance table column definitions — M22-007.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PolicyEntry } from '@/lib/api-types';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';

const severityVariant: Record<string, 'error' | 'warning' | 'secondary'> = {
  blocking: 'error',
  warning: 'warning',
  advisory: 'secondary',
};

const categoryVariant: Record<string, 'error' | 'warning' | 'secondary' | 'info'> = {
  security: 'error',
  quality: 'warning',
  compliance: 'info',
  process: 'secondary',
  architecture: 'secondary',
};

export function getPolicyColumns(
  onEdit: (policy: PolicyEntry) => void
): ColumnDef<PolicyEntry, unknown>[] {
  return [
    {
      accessorKey: 'id',
      header: 'Policy ID',
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
    },
    { accessorKey: 'name', header: 'Name' },
    {
      accessorKey: 'scope',
      header: 'Scope',
      cell: ({ getValue }) => <Badge variant="secondary">{getValue() as string}</Badge>,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ getValue }) => {
        const val = getValue() as string;
        return <Badge variant={categoryVariant[val] ?? 'secondary'}>{val}</Badge>;
      },
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ getValue }) => {
        const val = getValue() as string;
        return <Badge variant={severityVariant[val] ?? 'secondary'}>{val}</Badge>;
      },
    },
    {
      accessorKey: 'condition_check',
      header: 'Check',
      cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() as string}</span>,
    },
    {
      accessorKey: 'exception_count',
      header: 'Exceptions',
      cell: ({ getValue }) => {
        const count = getValue() as number;
        return count > 0 ? (
          <Badge variant="warning">{count}</Badge>
        ) : (
          <span className="text-muted-foreground text-xs">0</span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEdit(row.original)}
          aria-label={`Edit policy ${row.original.id}`}
        >
          <Pencil className="size-3.5" />
        </Button>
      ),
    },
  ];
}
