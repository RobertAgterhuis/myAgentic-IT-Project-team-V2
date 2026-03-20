import * as React from 'react';
import { cn } from '@/lib/utils';
import { RuntimeEvent, type TimelineEventType } from './runtime-event';
import { Heading } from '@/components/ui/typography';

export interface RuntimeLogEvent {
  id: string;
  type: TimelineEventType;
  timestamp: string;
  description: string;
  agent?: string;
  phase?: string;
  artifactId?: string;
  metadata?: Record<string, unknown>;
}

interface RuntimeLogProps extends React.ComponentProps<'section'> {
  events: RuntimeLogEvent[];
  maxVisible?: number;
  filter?: TimelineEventType[];
  autoScroll?: boolean;
}

const ALL_EVENT_TYPES: TimelineEventType[] = [
  'session_start',
  'phase_start',
  'phase_complete',
  'agent_start',
  'agent_complete',
  'artifact_created',
  'gate_passed',
  'gate_failed',
  'error',
  'retry',
];

export function RuntimeLog({
  events,
  maxVisible = 100,
  filter,
  autoScroll = true,
  className,
  ...props
}: RuntimeLogProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = React.useState<TimelineEventType[] | undefined>(filter);

  const filtered = activeFilter?.length
    ? events.filter((e) => activeFilter.includes(e.type))
    : events;

  const visible = filtered.slice(-maxVisible);

  // Auto-scroll to bottom on new events
  React.useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visible.length, autoScroll]);

  const toggleFilter = (type: TimelineEventType) => {
    setActiveFilter((prev) => {
      if (!prev || prev.length === 0) return [type];
      if (prev.includes(type)) {
        const next = prev.filter((t) => t !== type);
        return next.length === 0 ? undefined : next;
      }
      return [...prev, type];
    });
  };

  return (
    <section aria-label="Runtime timeline" className={cn('flex flex-col', className)} {...props}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Heading level={3} className="mb-0! text-base">
          Runtime Timeline
        </Heading>
        <div className="flex flex-wrap gap-1">
          {ALL_EVENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleFilter(type)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                activeFilter?.includes(type)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {type.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Event list */}
      <div
        ref={scrollRef}
        role="list"
        aria-label="Runtime events"
        className="overflow-y-auto max-h-80 rounded-md border bg-muted/30 p-2"
      >
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No events</p>
        ) : (
          visible.map((event) => (
            <RuntimeEvent
              key={event.id}
              type={event.type}
              timestamp={event.timestamp}
              description={event.description}
              agent={event.agent}
              phase={event.phase}
              artifactId={event.artifactId}
            />
          ))
        )}
      </div>
    </section>
  );
}
