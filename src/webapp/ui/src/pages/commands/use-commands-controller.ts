/**
 * Controller hook for CommandsPage — encapsulates all data fetching and mutation logic.
 * P1-UI-E1-I1 — Decompose monolithic operational pages
 */
import { useState } from 'react';
import {
  useOrchestratorStatus,
  useOrchestratorQueue,
  useOrchestratorPackMetadata,
  useQueueCommand,
} from '@/hooks';
import type { OrchestratorCommandName } from '@/lib/api-types';
import type { ExecutionMode } from '@/lib/execution-modes';
import { buildQuickActionsFromPackMetadata } from './commands-config';

function toCommandFromExecutionMode(executionMode: ExecutionMode): OrchestratorCommandName {
  if (executionMode === 'HYBRID') {
    return 'HYBRID';
  }
  if (executionMode === 'AGENCY_ONLY') {
    return 'AGENCY ONLY';
  }
  return 'CREATE';
}

function toExecutionMode(command: string): ExecutionMode {
  const normalized = command
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (normalized === 'HYBRID') {
    return 'HYBRID';
  }
  if (normalized === 'AGENCY_ONLY') {
    return 'AGENCY_ONLY';
  }
  return 'SDLC_ONLY';
}

export function useCommandsController() {
  const [briefText, setBriefText] = useState('');
  const [projectName, setProjectName] = useState('');
  const [selectedExecutionMode, setSelectedExecutionMode] = useState<ExecutionMode>('SDLC_ONLY');

  const {
    data: status,
    isLoading: isStatusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useOrchestratorStatus();
  const {
    data: queue,
    isLoading: isQueueLoading,
    error: queueError,
    refetch: refetchQueue,
  } = useOrchestratorQueue();
  const { data: packMetadata } = useOrchestratorPackMetadata();
  const queueCommand = useQueueCommand();

  const activeQueueEntry = queue?.command ?? queue?.queue?.[0] ?? null;
  const hasProjectName = projectName.trim().length > 0;
  const hasBrief = briefText.trim().length > 0;
  const quickActions = buildQuickActionsFromPackMetadata(packMetadata);

  function handleQuickAction(command: OrchestratorCommandName) {
    const executionMode = toExecutionMode(String(command));
    setSelectedExecutionMode(executionMode);

    queueCommand.mutate({
      command,
      project: projectName || undefined,
      description: briefText.trim() || undefined,
      brief: briefText.trim() || undefined,
      execution_mode: executionMode,
    });
  }

  function handleSubmitBrief() {
    if (!projectName.trim() || !briefText.trim()) return;

    const command = toCommandFromExecutionMode(selectedExecutionMode);
    queueCommand.mutate({
      command,
      project: projectName.trim(),
      description: briefText.trim(),
      brief: briefText.trim(),
      execution_mode: selectedExecutionMode,
    });
    setBriefText('');
  }

  return {
    briefText,
    setBriefText,
    projectName,
    setProjectName,
    selectedExecutionMode,
    setSelectedExecutionMode,
    status,
    queue,
    activeQueueEntry,
    hasProjectName,
    hasBrief,
    quickActions,
    isSubmitting: queueCommand.isPending,
    isLoading: isStatusLoading || isQueueLoading,
    error: (statusError as Error | null) ?? (queueError as Error | null),
    refetch: () => {
      void refetchStatus();
      void refetchQueue();
    },
    handleQuickAction,
    handleSubmitBrief,
  };
}
