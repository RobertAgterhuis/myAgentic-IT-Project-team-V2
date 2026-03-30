import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DiffReviewPane, type DiffLineMarker } from '@/components/cockpit/monaco-host-panels';
import { Heading, Text } from '@/components/ui/typography';
import {
  useCancelAgentJob,
  useOrchestratorPackMetadata,
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
  const [rerouteMode, setRerouteMode] = useState('');
  const [rerouteStage, setRerouteStage] = useState('');
  const [selectedRunningJob, setSelectedRunningJob] = useState('');

  const { data: packMetadata } = useOrchestratorPackMetadata();
  const pauseMutation = usePauseOrchestrator();
  const resumeMutation = useResumeOrchestrator();
  const overrideMutation = useOverrideOrchestrator();
  const stopMutation = useOrchestratorStop();
  const cancelJobMutation = useCancelAgentJob();

  const paused = isPaused(status);
  const mode = typeof status?.mode === 'string' ? status.mode : 'unknown';
  const state = typeof status?.state === 'string' ? status.state : 'unknown';

  const modeOptions = useMemo(() => {
    const metadataModes = (packMetadata?.commands ?? [])
      .filter((entry) => entry.mode !== false)
      .map((entry) => ({
        id: String(entry.id || '').trim(),
        label: packMetadata?.labels?.commands?.[String(entry.id || '').trim()] || entry.label,
      }))
      .filter((entry) => entry.id.length > 0)
      .map((entry) => ({ id: entry.id, label: entry.label || entry.id }));

    if (metadataModes.length > 0) {
      return metadataModes;
    }

    const fallbackMode =
      typeof status?.mode === 'string' && status.mode.trim() ? status.mode.trim() : 'FEATURE';
    return [{ id: fallbackMode, label: fallbackMode }];
  }, [packMetadata, status?.mode]);

  const stageOptions = useMemo(() => {
    const metadataStages = (packMetadata?.stages ?? [])
      .map((entry) => {
        const id = typeof entry.id === 'string' ? entry.id.trim() : '';
        const label =
          packMetadata?.labels?.stages?.[id] ||
          (typeof entry.label === 'string' ? entry.label : id);
        return { id, label: label || id };
      })
      .filter((entry) => entry.id.length > 0);

    if (metadataStages.length > 0) {
      return metadataStages;
    }

    const fallbackStage =
      typeof status?.state === 'string' && status.state.trim()
        ? status.state.trim()
        : 'PHASE_5_EXECUTING';
    return [{ id: fallbackStage, label: fallbackStage }];
  }, [packMetadata, status?.state]);

  useEffect(() => {
    if (modeOptions.length === 0) return;
    if (modeOptions.some((entry) => entry.id === rerouteMode)) return;
    setRerouteMode(modeOptions[0].id);
  }, [modeOptions, rerouteMode]);

  useEffect(() => {
    if (stageOptions.length === 0) return;
    if (stageOptions.some((entry) => entry.id === rerouteStage)) return;
    setRerouteStage(stageOptions[0].id);
  }, [stageOptions, rerouteStage]);

  const normalizedReason = useMemo(() => reason.trim().replace(/\s+/g, ' '), [reason]);

  const interventionBaseline = useMemo(
    () =>
      [
        `state=${state}`,
        `mode=${mode}`,
        `paused=${paused}`,
        `running_jobs=${runningJobs.length}`,
        'requires_approval=false',
      ].join('\n'),
    [mode, paused, runningJobs.length, state]
  );

  const interventionPatch = useMemo(
    () =>
      [
        `state=${state}`,
        `mode=${rerouteMode || mode}`,
        `target_stage=${rerouteStage || state}`,
        `paused=${paused}`,
        'requires_approval=true',
        `operator_reason=${normalizedReason || 'n/a'}`,
        `active_job=${selectedRunningJob || runningJobs[0]?.job_id || 'none'}`,
      ].join('\n'),
    [
      mode,
      normalizedReason,
      paused,
      rerouteMode,
      rerouteStage,
      runningJobs,
      selectedRunningJob,
      state,
    ]
  );

  const interventionLineMarkers = useMemo<DiffLineMarker[]>(() => {
    const markers: DiffLineMarker[] = [];
    const patchLines = interventionPatch.split('\n');

    const findLine = (needle: string) => {
      const index = patchLines.findIndex((line) => line.startsWith(needle));
      return index >= 0 ? index + 1 : 1;
    };

    markers.push({
      id: 'intervention-approval',
      side: 'modified',
      lineNumber: findLine('requires_approval='),
      kind: 'approval',
      label: 'Approval required for intervention patch',
      detail: 'Operator action should remain auditable before execution continues.',
    });

    if (/fail|error|blocked/i.test(state)) {
      markers.push({
        id: 'intervention-gate-failure',
        side: 'modified',
        lineNumber: findLine('state='),
        kind: 'gate_failure',
        label: 'Gate failure context detected',
        detail: `Current state is ${state} and needs intervention handling.`,
      });
    }

    if (normalizedReason.length > 0) {
      markers.push({
        id: 'intervention-evidence-reference',
        side: 'modified',
        lineNumber: findLine('operator_reason='),
        kind: 'evidence_reference',
        label: 'Evidence reference',
        detail: normalizedReason,
      });
    }

    return markers;
  }, [interventionPatch, normalizedReason, state]);

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
              phases: rerouteStage.trim() ? [rerouteStage.trim()] : undefined,
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
        <select
          value={rerouteMode}
          onChange={(event) => setRerouteMode(event.target.value)}
          aria-label="Reroute mode"
          className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm"
        >
          {modeOptions.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
        <select
          value={rerouteStage}
          onChange={(event) => setRerouteStage(event.target.value)}
          aria-label="Reroute stage"
          className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm"
        >
          {stageOptions.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
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

      <DiffReviewPane
        title="Patch review overlays"
        originalLabel="Current orchestrator envelope"
        modifiedLabel="Proposed intervention patch"
        originalContent={interventionBaseline}
        modifiedContent={interventionPatch}
        originalModelLocator={{
          namespace: 'workspace',
          objectId: 'intervention-envelope-current',
          path: 'cockpit/intervention/current.env',
          language: 'plaintext',
        }}
        modifiedModelLocator={{
          namespace: 'workspace',
          objectId: 'intervention-envelope-patch',
          path: 'cockpit/intervention/patch.env',
          language: 'plaintext',
        }}
        lineMarkers={interventionLineMarkers}
        className="mt-2"
      />
    </Card>
  );
}
