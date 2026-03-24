/**
 * Command Queue section for the Commands page.
 * P1-UI-E1-I1 — Decompose monolithic operational pages
 */
import { Heading, Text } from '@/components/ui/typography';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { commandQueueStatusVariant } from '@/lib/status-helpers';
import type { CommandQueueResponse } from '@/lib/api-types';
import { ShieldAlert } from 'lucide-react';

interface CommandQueueSectionProps {
  queue: CommandQueueResponse | undefined;
}

export function CommandQueueSection({ queue }: CommandQueueSectionProps) {
  const entries = queue?.queue ?? [];

  return (
    <div>
      <Heading level={2} className="mb-3">
        Command Queue
      </Heading>
      <Text muted className="mb-3 text-sm">
        After submitting, check here first: `PENDING` means waiting, `PROCESSING` means agents are
        actively running, and `DONE` means the command finished.
      </Text>

      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <Card key={`${entry.command}-${entry.requested_at}-${i}`} elevation="outlined">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={commandQueueStatusVariant[entry.status] ?? 'secondary'}>
                    {entry.status}
                  </Badge>
                  <div>
                    <span className="font-mono text-sm font-medium">{entry.command}</span>
                    {entry.project && (
                      <Text muted className="text-xs ml-2">
                        {entry.project}
                      </Text>
                    )}
                  </div>
                </div>
                <Text muted className="text-xs">
                  {new Date(entry.requested_at).toLocaleTimeString()}
                </Text>
              </div>
              {entry.description && (
                <Text muted className="text-xs mt-1">
                  {entry.description}
                </Text>
              )}
              {entry.status === 'PROCESSING' && (
                <div className="mt-3 rounded-xl border border-info/30 bg-info/10 px-3 py-2 text-xs text-muted-foreground">
                  This command is currently being executed. Open Pipeline to follow phase and agent
                  progress.
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ShieldAlert className="size-8" />}
          title="No commands in queue"
          description="Start with the three steps above: name the work, add the brief, then choose Submit Brief or the best matching quick action."
        />
      )}
    </div>
  );
}
