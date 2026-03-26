import * as React from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { OperationalCard, type OperationalCardMetaItem } from '@/components/ui/operational-card';
import { ListTodo } from 'lucide-react';

export interface QueueTriageItem {
  id: string;
  title: string;
  subtitle?: string;
  statusLabel: string;
  statusTone?: 'neutral' | 'info' | 'success' | 'warning' | 'critical';
  meta?: OperationalCardMetaItem[];
  priority?: 'low' | 'medium' | 'high';
  icon?: React.ReactNode;
  actionLabel?: string;
}

interface QueueTriageListProps {
  title: string;
  description?: string;
  items: QueueTriageItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  onItemAction?: (id: string) => void;
  headingLevel?: 2 | 3 | 4;
}

function priorityToTone(priority: QueueTriageItem['priority']) {
  if (priority === 'high') return 'critical';
  if (priority === 'medium') return 'warning';
  if (priority === 'low') return 'success';
  return 'neutral';
}

export function QueueTriageList({
  title,
  description,
  items,
  emptyTitle = 'No queued items',
  emptyDescription = 'This queue is currently empty.',
  onItemAction,
  headingLevel = 3,
}: QueueTriageListProps) {
  const HeadingTag = `h${headingLevel}` as const;

  return (
    <section aria-label={title} className="space-y-3">
      <div>
        <HeadingTag className="text-sm font-semibold">{title}</HeadingTag>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="size-8" />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <OperationalCard
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              statusLabel={item.statusLabel}
              statusTone={item.statusTone ?? priorityToTone(item.priority)}
              icon={item.icon}
              meta={item.meta}
              actions={
                item.actionLabel && onItemAction ? (
                  <Button size="sm" variant="outline" onClick={() => onItemAction(item.id)}>
                    {item.actionLabel}
                  </Button>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
