/**
 * ExecutionTimeline — horizontal timeline with replay capability.
 * Color-coded state transitions: green=success, yellow=warning, red=failure, gray=skipped.
 * M27-002 / Execution timeline / replay view
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import type { TimelineEvent } from '@/lib/api-types';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Clock,
} from 'lucide-react';

/* ── Color mapping ── */
type Outcome = 'success' | 'warning' | 'failure' | 'skipped' | 'neutral';

function getOutcome(event: TimelineEvent): Outcome {
  const t = event.type;
  if (
    t === 'session_complete' ||
    t === 'phase_complete' ||
    t === 'agent_complete' ||
    t === 'gate_passed'
  )
    return 'success';
  if (t === 'retry') return 'warning';
  if (t === 'gate_failed' || t === 'error') return 'failure';
  if (t === 'artifact_created' || t === 'decision_created') return 'neutral';
  return 'skipped';
}

const outcomeColor: Record<Outcome, string> = {
  success: 'bg-green-500 border-green-600',
  warning: 'bg-amber-400 border-amber-500',
  failure: 'bg-red-500 border-red-600',
  skipped: 'bg-gray-400 border-gray-500',
  neutral: 'bg-blue-400 border-blue-500',
};

const outcomeBadge: Record<Outcome, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  failure: 'error',
  skipped: 'secondary',
  neutral: 'info',
};

const outcomeIcon: Record<Outcome, React.ReactNode> = {
  success: <CheckCircle className="size-3" />,
  warning: <AlertTriangle className="size-3" />,
  failure: <XCircle className="size-3" />,
  skipped: <MinusCircle className="size-3" />,
  neutral: <Clock className="size-3" />,
};

interface ExecutionTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function ExecutionTimeline({ events, className }: ExecutionTimelineProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const replayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [events]
  );

  const selectedEvent = selectedIdx !== null ? sorted[selectedIdx] : null;

  // Auto-scroll to selected node
  useEffect(() => {
    if (selectedIdx !== null && scrollRef.current) {
      const node = scrollRef.current.children[selectedIdx] as HTMLElement | undefined;
      node?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedIdx]);

  // Replay controls
  const startReplay = useCallback(() => {
    setIsReplaying(true);
    setSelectedIdx(0);
    replayRef.current = setInterval(() => {
      setSelectedIdx((prev) => {
        const next = (prev ?? -1) + 1;
        if (next >= sorted.length) {
          clearInterval(replayRef.current!);
          setIsReplaying(false);
          return prev;
        }
        return next;
      });
    }, 1500);
  }, [sorted.length]);

  const stopReplay = useCallback(() => {
    if (replayRef.current) clearInterval(replayRef.current);
    setIsReplaying(false);
  }, []);

  const stepForward = useCallback(() => {
    stopReplay();
    setSelectedIdx((prev) => Math.min((prev ?? -1) + 1, sorted.length - 1));
  }, [sorted.length, stopReplay]);

  const stepBack = useCallback(() => {
    stopReplay();
    setSelectedIdx((prev) => Math.max((prev ?? 1) - 1, 0));
  }, [stopReplay]);

  const resetReplay = useCallback(() => {
    stopReplay();
    setSelectedIdx(null);
  }, [stopReplay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (replayRef.current) clearInterval(replayRef.current);
    };
  }, []);

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="size-12" />}
        title="No timeline events"
        description="Timeline events will appear as the session progresses."
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-4 ${className ?? ''}`} data-testid="execution-timeline">
      {/* Replay controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={stepBack}
          disabled={selectedIdx === 0 || selectedIdx === null}
          aria-label="Previous timeline step"
        >
          <SkipBack className="size-3" />
        </Button>
        {isReplaying ? (
          <Button variant="outline" size="sm" onClick={stopReplay}>
            <Pause className="size-3 mr-1" /> Pause
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={startReplay}>
            <Play className="size-3 mr-1" /> Replay
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={stepForward}
          disabled={selectedIdx === sorted.length - 1}
          aria-label="Next timeline step"
        >
          <SkipForward className="size-3" />
        </Button>
        <Button variant="ghost" size="sm" onClick={resetReplay}>
          <RotateCcw className="size-3 mr-1" /> Reset
        </Button>
        {selectedIdx !== null && (
          <span className="text-xs text-muted-foreground ml-auto">
            Step {selectedIdx + 1} of {sorted.length}
          </span>
        )}
      </div>

      {/* Scrollable horizontal timeline */}
      <div className="overflow-x-auto pb-2" role="list" aria-label="Execution timeline">
        <div ref={scrollRef} className="flex items-center gap-0 min-w-max px-2">
          {sorted.map((event, i) => {
            const outcome = getOutcome(event);
            const isSelected = i === selectedIdx;
            return (
              <div key={event.id} className="flex items-center" role="listitem">
                {/* Node */}
                <button
                  onClick={() => {
                    stopReplay();
                    setSelectedIdx(i);
                  }}
                  className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                    isSelected ? 'bg-primary/10 ring-2 ring-primary/30' : 'hover:bg-muted'
                  }`}
                  aria-label={`${event.type}: ${event.description}`}
                  aria-current={isSelected ? 'step' : undefined}
                >
                  <div
                    className={`size-6 rounded-full border-2 flex items-center justify-center ${outcomeColor[outcome]}`}
                  >
                    <span className="text-white">{outcomeIcon[outcome]}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground max-w-20 truncate text-center">
                    {event.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[9px] text-muted-foreground/60">
                    {new Date(event.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </button>
                {/* Connector */}
                {i < sorted.length - 1 && (
                  <div
                    className={`h-0.5 w-8 ${
                      isSelected || i + 1 === selectedIdx ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected event detail */}
      {selectedEvent && (
        <Card elevation="flat" className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={outcomeBadge[getOutcome(selectedEvent)]} className="text-xs">
              {selectedEvent.type.replace(/_/g, ' ')}
            </Badge>
            {selectedEvent.agent && (
              <Badge variant="secondary" className="text-xs">
                Agent: {selectedEvent.agent}
              </Badge>
            )}
            {selectedEvent.phase && (
              <Badge variant="secondary" className="text-xs">
                {selectedEvent.phase}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(selectedEvent.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="text-sm">{selectedEvent.description}</p>
          {selectedEvent.artifact_id && (
            <p className="text-xs text-muted-foreground">
              Artifact: <span className="font-mono">{selectedEvent.artifact_id}</span>
            </p>
          )}
          {selectedEvent.metadata && Object.keys(selectedEvent.metadata).length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Metadata</summary>
              <pre className="mt-1 p-2 rounded-md bg-muted text-[10px] overflow-x-auto">
                {JSON.stringify(selectedEvent.metadata, null, 2)}
              </pre>
            </details>
          )}
        </Card>
      )}
    </div>
  );
}
