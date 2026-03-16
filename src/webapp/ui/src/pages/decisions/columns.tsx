import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LifecycleFlow } from '@/components/decisions/lifecycle-flow';
import { statusBadge, priorityBadge } from './constants';
import type { ColumnDef } from '@tanstack/react-table';
import type { DecisionItem } from './types';
import { Eye, Trash2 } from 'lucide-react';

export function getColumns(
  onAction: (item: DecisionItem, action: string) => void,
  onView: (item: DecisionItem) => void
): ColumnDef<DecisionItem, unknown>[] {
  return [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.id}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row) => row.status,
      cell: ({ row }) => (
        <Badge variant={statusBadge[row.original.status] ?? 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      accessorFn: (row) => ('priority' in row ? row.priority : '—'),
      cell: ({ row }) => {
        const p = 'priority' in row.original ? row.original.priority : null;
        return p ? <Badge variant={priorityBadge[p] ?? 'info'}>{p}</Badge> : <span>—</span>;
      },
    },
    {
      accessorKey: 'scope',
      header: 'Scope',
    },
    {
      id: 'text',
      header: 'Subject',
      accessorFn: (row) => {
        if (row._kind === 'open') return row.question;
        if (row._kind === 'decided') return row.decision;
        return row.subject;
      },
      cell: ({ getValue }) => (
        <span className="line-clamp-2 max-w-[300px]">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) => <span className="text-xs">{getValue() as string}</span>,
    },
    {
      id: 'lifecycle',
      header: 'Lifecycle',
      cell: ({ row }) => <LifecycleFlow status={row.original.status} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onView(row.original)}
            aria-label={`View ${row.original.id}`}
          >
            <Eye className="size-3.5" />
          </Button>
          {row.original._kind === 'open' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAction(row.original, 'decide')}
              aria-label={`Decide ${row.original.id}`}
            >
              Decide
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAction(row.original, 'delete')}
            aria-label={`Delete ${row.original.id}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}
