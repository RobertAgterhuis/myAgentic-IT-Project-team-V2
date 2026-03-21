// Custom hooks barrel file

/* Hero fold state */
export { useHeroFold } from './use-hero-fold';

/* Auth (M29-006) */
export { useCurrentUser, useLogout, useAuthorization } from './use-auth';

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
  useGateDiagnostics,
  useOrchestratorCommand,
  useSprintGate,
  useOrchestratorQueue,
  useQueueCommand,
  useGates,
  useOrchestratorErrors,
  useOnboardingDiagnostics,
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
export {
  usePolicies,
  usePolicyPacks,
  usePolicySignals,
  usePolicyEvaluation,
  useCreateException,
  useUpdatePolicy,
} from './use-governance';

/* Traceability (M10) */
export { useTraceability } from './use-traceability';

/* Audit/Evidence aggregation (UI-025) */
export { useAuditEvidenceAggregation } from './use-audit-evidence';

/* Observability contracts (UI-026) */
export { useObservabilityContracts } from './use-observability-contracts';

/* Sessions (M15) */
export { useSessions, useSession, useSessionTimeline } from './use-sessions';

/* Agents (M15, M31) */
export {
  useAgents,
  useAgent,
  useExecuteAgent,
  useAgentJobStatus,
  useAgentJobResult,
  useCancelAgentJob,
  useExecutionHistory,
} from './use-agents';

/* Runtime Events (M15) */
export { useRuntimeEvents } from './use-runtime-events';

/* Cockpit (M27) */
export {
  useCockpitHealth,
  useDependencyGraph,
  useDecisionProvenance,
  useRootCause,
  useApprovalDetail,
  useApprovalHistory,
  useApproveWithComment,
  useRejectWithComment,
} from './use-cockpit';

/* Workspaces (UI-014) */
export { useWorkspaces, useWorkspaceDetail } from './use-workspaces';

/* Prompts & Contracts (UI-015) */
export { usePromptContractAssets } from './use-prompt-contracts';

/* Administration (UI-016) */
export { useAdminUsers, useAdministrationOverview } from './use-administration';
