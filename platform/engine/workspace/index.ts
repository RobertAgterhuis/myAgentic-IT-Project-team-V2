// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Workspace module barrel export (M25).
 */

export type {
  Service,
  ServiceType,
  Repository,
  RepositoryProvider,
  Team,
  PolicyScope,
  PolicyScopeLevel,
  Project,
  ProjectStatus,
  Workspace,
  RepositoryContext,
  ProjectContext,
} from './types';

export {
  WorkspaceManager,
  WorkspaceNotFoundError,
  ProjectNotFoundError,
  RepositoryNotFoundError,
  DuplicateError,
  ValidationError,
} from './workspace-manager';

export { RepoIndexer } from './repo-indexer';
