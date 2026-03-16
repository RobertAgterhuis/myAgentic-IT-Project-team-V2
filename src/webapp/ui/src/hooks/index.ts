// Custom hooks barrel file

/* Questionnaires (#233) */
export { useQuestionnaires, useQuestionnaire, useSaveQuestionnaire } from './use-questionnaires';

/* Decisions (#234) */
export {
  useDecisions,
  useDecision,
  useCreateDecision,
  useUpdateDecision,
  useDeleteDecision,
  useActivateCategory,
} from './use-decisions';

/* Milestones (#235) */
export {
  useMilestones,
  useMilestone,
  useCreateMilestone,
  useUpdateMilestone,
  useArchiveMilestone,
  useDeleteMilestone,
  useMilestoneTemplates,
  useCreateMilestoneTemplate,
  useDeleteMilestoneTemplate,
  useApplyMilestoneTemplate,
} from './use-milestones';

/* Orchestrator (#236) */
export {
  useOrchestratorStatus,
  useOrchestratorRunHistory,
  useAdvanceOrchestrator,
  useOrchestratorError,
  useOrchestratorRecover,
  useOrchestratorReset,
  useOrchestratorStop,
  useValidateGate,
  useOrchestratorCommand,
  useSprintGate,
  useOrchestratorQueue,
  useQueueCommand,
  useGates,
  useOrchestratorErrors,
} from './use-orchestrator';

/* Dashboard (#237) */
export {
  useDashboardHealth,
  useDashboardMetrics,
  useDashboardActivity,
  useDashboardStats,
} from './use-dashboard';

/* Drift (#237) */
export { useDriftDetection } from './use-drift';

/* Progress (#237) */
export { useProgress } from './use-progress';

/* SSE Events */
export { useSSEEvents } from './use-sse-events';

/* Keyboard Shortcuts (#241) */
export { useKeyboardShortcuts } from './use-keyboard-shortcuts';

/* Analytics (M7) */
export { useAnalyticsTrends, useAnalyticsAgents, useAnalyticsMetrics } from './use-analytics';
