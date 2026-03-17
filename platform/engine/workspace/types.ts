// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Workspace domain types (M25-001 / M25-002).
 *
 * Mirrors the workspace JSON Schema definitions as TypeScript interfaces
 * for use throughout the engine and services.
 *
 * @module engine/workspace/types
 */

// ─── Service ──────────────────────────────────────────────────

export type ServiceType = 'api' | 'web' | 'worker' | 'library' | 'cli' | 'infra' | 'other';

export interface Service {
  id: string;
  name: string;
  path: string;
  stack?: string[];
  type?: ServiceType;
}

// ─── Repository ───────────────────────────────────────────────

export type RepositoryProvider = 'github' | 'azure-devops' | 'gitlab' | 'local';

export interface Repository {
  id: string;
  name: string;
  provider: RepositoryProvider;
  url: string;
  defaultBranch: string;
  services?: Service[];
  tags?: string[];
}

// ─── Team ─────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  members?: string[];
}

// ─── PolicyScope ──────────────────────────────────────────────

export type PolicyScopeLevel = 'workspace' | 'repository' | 'team' | 'domain';

export interface PolicyScope {
  policyId: string;
  scope: PolicyScopeLevel;
  targetIds?: string[];
}

// ─── Project ──────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'archived' | 'draft';

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  repositories: string[];
  sessions: string[];
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

// ─── Workspace ────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  repositories: Repository[];
  teams: Team[];
  policies: PolicyScope[];
  owner: string;
  created_at: string;
  updated_at: string;
}

// ─── Repository Context (passed to agents) ────────────────────

export interface RepositoryContext {
  repoId: string;
  repoName: string;
  provider: RepositoryProvider;
  url: string;
  defaultBranch: string;
  services: Service[];
  tags: string[];
}

// ─── Project Context (passed to engine) ───────────────────────

export interface ProjectContext {
  projectId: string;
  projectName: string;
  workspaceId: string;
  repositories: RepositoryContext[];
}
