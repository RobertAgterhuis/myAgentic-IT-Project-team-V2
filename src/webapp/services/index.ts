// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Service layer barrel export (M20-002).
 *
 * All business logic shared between HTTP routes and MCP tools
 * is accessed through these service classes.
 */

export { DecisionService, ServiceValidationError, ServiceNotFoundError } from './decisions-service';
export { QuestionnaireService } from './questionnaire-service';
export { CommandService } from './commands-service';
export { GovernanceService, ServiceNotAvailableError } from './governance-service';
export { PolicyService, PolicyValidationError, PolicyNotFoundError } from './policy-service';
export { SessionService } from './session-service';
export { DashboardService } from './dashboard-service';
export { MetricsDashboardService } from './metrics-dashboard-service';
export {
  AgentExecutionService,
  AgentNotFoundError,
  AgentCancelledError,
} from './agent-execution-service';
export type {
  GitBackend,
  ResultTuple,
  GitStatusResult,
  GitMutationResult,
  GitCommitResult,
  GitDiffResult,
  GitLogOptions,
  GitLogResult,
  GitBranchOptions,
  GitBranchResult,
  GitRemoteResult,
} from './git/git-backend';
export { createBrowserFsGitAdapter } from './git/browserfs-adapter';
export { GitCredentialStore } from './git/credential-store';
export { GitBackendRouter, GitBackendUnavailableError } from './git/git-backend-router';
export { IsomorphicGitBackend } from './git/isomorphic-git-backend';
export { NativeGitBackend } from './git/native-git-backend';
export { GitService } from './git/git-service';
export type { ExecuteAgentResult, ExecutionLogEntry } from './agent-execution-service';
export { toServiceContext } from './context-adapter';
export type {
  ServiceContext,
  DecisionCreateInput,
  DecisionMutateInput,
  DecisionResult,
  DecisionListResult,
  QuestionnaireUpdate,
  QuestionnaireSummary,
  SaveAnswersResult,
  CommandQueueEntry,
  QueueCommandInput,
  QueueCommandResult,
  ApprovalItem,
  ApprovalDecisionResult,
  SessionState,
  ProgressInfo,
} from './types';
