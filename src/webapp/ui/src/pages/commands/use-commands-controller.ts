/**
 * Controller hook for CommandsPage — encapsulates all data fetching and mutation logic.
 * P1-UI-E1-I1 — Decompose monolithic operational pages
 */
import { useState } from 'react';
import { useOrchestratorStatus, useOrchestratorQueue, useQueueCommand } from '@/hooks';
import type { OrchestratorCommandName } from '@/lib/api-types';

export function useCommandsController() {
  const [briefText, setBriefText] = useState('');
  const [projectName, setProjectName] = useState('');

  const { data: status } = useOrchestratorStatus();
  const { data: queue } = useOrchestratorQueue();
  const queueCommand = useQueueCommand();

  const activeQueueEntry = queue?.command ?? queue?.queue?.[0] ?? null;
  const hasProjectName = projectName.trim().length > 0;
  const hasBrief = briefText.trim().length > 0;

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
    isSubmitting: queueCommand.isPending,
    handleQuickAction,
    handleSubmitBrief,
  };
}
