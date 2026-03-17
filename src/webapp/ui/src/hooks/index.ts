// Custom hooks barrel file

/* Auth (M29-006) */
export { useCurrentUser, useLogout } from './use-auth';

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

/* Artifacts (M10) */
export { useArtifacts, useArtifact, useArtifactLineage, useArtifactStats } from './use-artifacts';

/* Governance (M10) */
export { useApprovals, useApproveRequest, useRejectRequest } from './use-governance';

/* Policies (M22) */
export { usePolicies, usePolicyEvaluation, useCreateException } from './use-governance';

/* Traceability (M10) */
export { useTraceability } from './use-traceability';

/* Sessions (M15) */
export { useSessions, useSession, useSessionTimeline } from './use-sessions';

/* Agents (M15) */
export { useAgents, useAgent } from './use-agents';

/* Runtime Events (M15) */
export { useRuntimeEvents } from './use-runtime-events';

/* Cockpit (M27) */
export {
  useCockpitHealth,
  useDependencyGraph,
  useRootCause,
  useApprovalDetail,
  useApprovalHistory,
  useApproveWithComment,
  useRejectWithComment,
} from './use-cockpit';
