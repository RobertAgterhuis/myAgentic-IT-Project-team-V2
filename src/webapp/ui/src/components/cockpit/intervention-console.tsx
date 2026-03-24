import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heading, Text } from '@/components/ui/typography';
import {
  useCancelAgentJob,
  useOrchestratorStop,
  useOverrideOrchestrator,
  usePauseOrchestrator,
  useResumeOrchestrator,
} from '@/hooks';
import type { OrchestratorStatus } from '@/lib/api-types';
import { Pause, Play, Route, Square, XCircle } from 'lucide-react';

type RunningJobOption = {
  job_id: string;
  agent_name: string;
};

interface InterventionConsoleProps {
  status?: OrchestratorStatus;
  runningJobs?: RunningJobOption[];
  title?: string;
  description?: string;
}

function isPaused(status?: OrchestratorStatus): boolean {
  return Boolean((status?.human_override as { paused?: boolean } | undefined)?.paused);
}

export function InterventionConsole({
  status,
  runningJobs = [],
  title = 'Intervention Console',
  description = 'Pause, resume, reroute, or cancel from one operator surface.',
}: InterventionConsoleProps) {
  const [reason, setReason] = useState('Operator intervention requested');
  const [rerouteMode, setRerouteMode] = useState('FEATURE');
  const [reroutePhases, setReroutePhases] = useState('PHASE_5_EXECUTING');
  const [selectedRunningJob, setSelectedRunningJob] = useState('');

  const pauseMutation = usePauseOrchestrator();
  const resumeMutation = useResumeOrchestrator();
  const overrideMutation = useOverrideOrchestrator();
  const stopMutation = useOrchestratorStop();
  const cancelJobMutation = useCancelAgentJob();

  const paused = isPaused(status);
  const mode = typeof status?.mode === 'string' ? status.mode : 'unknown';
  const state = typeof status?.state === 'string' ? status.state : 'unknown';

  return (
    <Card elevation="flat" className="p-4 space-y-3" data-testid="intervention-console">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading level={2} className="text-sm">
            {title}
          </Heading>
          <Text muted className="text-xs mt-1">
            {description}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={paused ? 'warning' : 'info'}>{paused ? 'Paused' : 'Running'}</Badge>
          <Badge variant="outline">state {state}</Badge>
          <Badge variant="outline">mode {mode}</Badge>
        </div>
      </div>

      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        aria-label="Intervention rationale"
        className="w-full rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm min-h-20 resize-y"
        placeholder="Operator rationale for this intervention"
      />

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <Button
          variant="outline"
          onClick={() =>
            pauseMutation.mutate({
              rationale: reason,
              requested_by: 'operator-ui',
            })
          }
          disabled={pauseMutation.isPending || paused}
        >
          <Pause className="mr-1.5 size-3" /> Pause
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            resumeMutation.mutate({
              rationale: reason,
              requested_by: 'operator-ui',
            })
          }
          disabled={resumeMutation.isPending || !paused}
        >
          <Play className="mr-1.5 size-3" /> Resume
        </Button>
        <Button
          variant="default"
          onClick={() =>
            overrideMutation.mutate({
              rationale: reason,
              requested_by: 'operator-ui',
              mode: rerouteMode.trim() || undefined,
              phases: reroutePhases
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            })
          }
          disabled={overrideMutation.isPending}
        >
          <Route className="mr-1.5 size-3" /> Reroute
        </Button>
        <Button
          variant="outline"
          onClick={() => stopMutation.mutate()}
          disabled={stopMutation.isPending}
        >
          <Square className="mr-1.5 size-3" /> Cancel Run
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          value={rerouteMode}
          onChange={(event) => setRerouteMode(event.target.value)}
          aria-label="Reroute mode"
          className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm"
          placeholder="Mode"
        />
        <input
          value={reroutePhases}
          onChange={(event) => setReroutePhases(event.target.value)}
          aria-label="Reroute phases"
          className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm"
          placeholder="Comma-separated phases"
        />
      </div>

      {runningJobs.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 md:items-center">
          <select
            value={selectedRunningJob}
            onChange={(event) => setSelectedRunningJob(event.target.value)}
            aria-label="Running execution jobs"
            className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm md:col-span-2"
          >
            <option value="">Select running job to cancel</option>
            {runningJobs.map((job) => (
              <option key={job.job_id} value={job.job_id}>
                {job.agent_name} ({job.job_id})
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => selectedRunningJob && cancelJobMutation.mutate(selectedRunningJob)}
            disabled={!selectedRunningJob || cancelJobMutation.isPending}
          >
            <XCircle className="mr-1.5 size-3" /> Cancel Job
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
