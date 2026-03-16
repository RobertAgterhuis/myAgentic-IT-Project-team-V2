// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Adapter Contracts — Barrel Export
 *
 * Formal TypeScript interfaces for all adapter provider types.
 * Each contract defines: method signatures, input/output types,
 * error types, and capability flags for feature detection.
 *
 * @module sdlc/adapters/contracts
 */

export type {
  GitProvider,
  GitCapabilities,
  GitErrorKind,
  GitError,
  BranchInfo,
  CommitInfo,
  DiffResult,
  PullRequestInput,
  PullRequestInfo,
  FileContents,
  BlameEntry,
} from './git-provider.js';

export type {
  CIProvider,
  CICapabilities,
  CIErrorKind,
  CIError,
  PipelineTriggerInput,
  PipelineStatus,
  PipelineLogs,
  WorkflowInfo,
} from './ci-provider.js';

export type {
  ContainerProvider,
  ContainerCapabilities,
  ContainerErrorKind,
  ContainerError,
  BuildInput,
  BuildResult,
  PushResult,
  ImageInfo,
  ScanResult,
  TagResult,
} from './container-provider.js';

export type {
  CloudProvider,
  CloudCapabilities,
  CloudErrorKind,
  CloudError,
  DeployInput,
  DeployResult,
  DeploymentStatus,
  EnvironmentInfo,
  RollbackResult,
} from './cloud-provider.js';

export type {
  LLMProvider,
  LLMCapabilities,
  LLMErrorKind,
  LLMError,
  LLMMessage,
  CompletionInput,
  CompletionResult,
  TokenUsage,
  EmbeddingInput,
  EmbeddingResult,
  ToolDefinition,
  ToolCall,
} from './llm-provider.js';

export type {
  SecurityProvider,
  SecurityCapabilities,
  SecurityErrorKind,
  SecurityError,
  ScanInput,
  Finding,
  ScanReport,
  DependencyAuditResult,
  SecretScanResult,
  LicenseCheckResult,
} from './security-provider.js';

export type {
  TestingProvider,
  TestingCapabilities,
  TestingErrorKind,
  TestingError,
  TestRunInput,
  TestSummary,
  TestRunResult,
  CoverageResult,
  TestReport,
} from './testing-provider.js';

export type {
  ToolProvider,
  ToolCapabilities,
  ToolErrorKind,
  ToolError,
  ToolInfo,
  ToolInvocation,
  ToolResult,
  ValidationResult,
} from './tool-provider.js';

export type {
  ShellExecutorProvider,
  ShellCapabilities,
  ShellErrorKind,
  ShellError,
  ExecInput,
  ExecResult,
} from './shell-executor.js';
