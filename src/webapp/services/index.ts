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
export { AgentExecutionService, AgentNotFoundError } from './agent-execution-service';
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
