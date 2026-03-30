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
import { buildQuickActionsFromPackMetadata } from './commands-config';

export function useCommandsController() {
  const [briefText, setBriefText] = useState('');
  const [projectName, setProjectName] = useState('');

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
    queueCommand.mutate({
      command,
      project: projectName || undefined,
      description: briefText.trim() || undefined,
      brief: briefText.trim() || undefined,
    });
  }

  function handleSubmitBrief() {
    if (!projectName.trim() || !briefText.trim()) return;
    queueCommand.mutate({
      command: 'CREATE',
      project: projectName.trim(),
      description: briefText.trim(),
      brief: briefText.trim(),
    });
    setBriefText('');
  }

  return {
    briefText,
    setBriefText,
    projectName,
    setProjectName,
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
