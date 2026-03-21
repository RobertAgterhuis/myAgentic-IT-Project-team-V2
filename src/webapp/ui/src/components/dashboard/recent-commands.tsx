import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useOrchestratorQueue } from '@/hooks';
import { relativeTime } from '@/lib/utils';
import { Clock, Radio, CheckCircle2, XCircle, CircleDot } from 'lucide-react';

export function RecentCommands() {
  const { data: queue } = useOrchestratorQueue();
  const recentCommands = useMemo(() => (queue?.queue ?? []).slice(-5).reverse(), [queue]);

  if (recentCommands.length === 0) return null;

  const statusIcon: Record<string, React.ReactNode> = {
    PENDING: <Clock className="size-3.5 text-amber-500" />,
    PROCESSING: <Radio className="size-3.5 text-blue-500 animate-pulse" />,
    DONE: <CheckCircle2 className="size-3.5 text-green-500" />,
    ERROR: <XCircle className="size-3.5 text-red-500" />,
  };

  return (
    <Card elevation="flat" className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">Recent Commands</span>
        <Link to="/commands" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {recentCommands.map((cmd, i) => (
          <div
            key={`${cmd.command}-${cmd.requested_at}-${i}`}
            className="flex items-center gap-3 text-sm"
          >
            {statusIcon[cmd.status] ?? <CircleDot className="size-3.5" />}
            <span className="font-mono text-xs font-medium">{cmd.command}</span>
            {cmd.project && (
              <span className="text-muted-foreground text-xs truncate">{cmd.project}</span>
            )}
            <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
              {relativeTime(cmd.requested_at)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
