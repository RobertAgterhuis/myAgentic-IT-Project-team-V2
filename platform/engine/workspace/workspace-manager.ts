// Copyright (c) 2026 Robert Agterhuis. MIT License.

/**
 * Workspace Manager (M25-002)
 *
 * CRUD operations for workspaces, projects, and repositories.
 * All I/O flows through the injected StorageProvider.
 *
 * Collections:
 *   - "workspaces" → Workspace documents
 *   - "projects"   → Project documents
 *
 * @module engine/workspace/workspace-manager
 */

import type { StorageProvider, Document } from '../persistence/storage-provider';
import type {
  Workspace,
  Repository,
  Project,
  ProjectStatus,
  Team,
  PolicyScope,
  RepositoryProvider,
} from './types';

// ─── Constants ────────────────────────────────────────────────

const WORKSPACES_COLLECTION = 'workspaces';
const PROJECTS_COLLECTION = 'projects';

const VALID_PROVIDERS: ReadonlySet<RepositoryProvider> = new Set([
  'github',
  'azure-devops',
  'gitlab',
  'local',
]);

// ─── Errors ───────────────────────────────────────────────────

export class WorkspaceNotFoundError extends Error {
  constructor(id: string) {
    super(`Workspace not found: ${id}`);
    this.name = 'WorkspaceNotFoundError';
  }
}

export class ProjectNotFoundError extends Error {
  constructor(id: string) {
    super(`Project not found: ${id}`);
    this.name = 'ProjectNotFoundError';
  }
}

export class RepositoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Repository not found in workspace: ${id}`);
    this.name = 'RepositoryNotFoundError';
  }
}

export class DuplicateError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} already exists: ${id}`);
    this.name = 'DuplicateError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function toWorkspace(doc: Document): Workspace {
  return {
    id: doc.id as string,
    name: doc.name as string,
    repositories: (doc.repositories as Repository[]) ?? [],
    teams: (doc.teams as Team[]) ?? [],
    policies: (doc.policies as PolicyScope[]) ?? [],
    owner: doc.owner as string,
    created_at: doc.created_at as string,
    updated_at: doc.updated_at as string,
  };
}

function toProject(doc: Document): Project {
  return {
    id: doc.id as string,
    workspaceId: doc.workspaceId as string,
    name: doc.name as string,
    repositories: (doc.repositories as string[]) ?? [],
    sessions: (doc.sessions as string[]) ?? [],
    status: (doc.status as ProjectStatus) ?? 'active',
    created_at: doc.created_at as string,
    updated_at: doc.updated_at as string,
  };
}

// ─── Workspace Manager ───────────────────────────────────────

export class WorkspaceManager {
  private storage: StorageProvider;

  constructor(storage: StorageProvider) {
    this.storage = storage;
  }

  // ── Workspace CRUD ───────────────────────────────────────

  async createWorkspace(input: { id: string; name: string; owner: string }): Promise<Workspace> {
    const existing = await this.storage.read(WORKSPACES_COLLECTION, input.id);
    if (existing) throw new DuplicateError('Workspace', input.id);

    const workspace: Workspace = {
      id: input.id,
      name: input.name,
      repositories: [],
      teams: [],
      policies: [],
      owner: input.owner,
      created_at: now(),
      updated_at: now(),
    };

    await this.storage.write(WORKSPACES_COLLECTION, workspace.id, workspace as unknown as Document);
    return workspace;
  }

  async getWorkspace(id: string): Promise<Workspace> {
    const doc = await this.storage.read(WORKSPACES_COLLECTION, id);
    if (!doc) throw new WorkspaceNotFoundError(id);
    return toWorkspace(doc);
  }

  async listWorkspaces(): Promise<Workspace[]> {
    const docs = await this.storage.list(WORKSPACES_COLLECTION);
    return docs.map(toWorkspace);
  }

  async updateWorkspace(
    id: string,
    updates: Partial<Pick<Workspace, 'name' | 'owner'>>
  ): Promise<Workspace> {
    const workspace = await this.getWorkspace(id);
    if (updates.name !== undefined) workspace.name = updates.name;
    if (updates.owner !== undefined) workspace.owner = updates.owner;
    workspace.updated_at = now();
    await this.storage.write(WORKSPACES_COLLECTION, id, workspace as unknown as Document);
    return workspace;
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.getWorkspace(id); // ensure exists
    // Delete all projects in this workspace
    const projects = await this.listProjects(id);
    for (const p of projects) {
      await this.storage.delete(PROJECTS_COLLECTION, p.id);
    }
    await this.storage.delete(WORKSPACES_COLLECTION, id);
  }

  // ── Repository management within workspace ───────────────

  async addRepository(workspaceId: string, repo: Repository): Promise<Workspace> {
    if (!VALID_PROVIDERS.has(repo.provider)) {
      throw new ValidationError(`Invalid provider: ${repo.provider}`);
    }

    const workspace = await this.getWorkspace(workspaceId);

    if (workspace.repositories.some((r) => r.id === repo.id)) {
      throw new DuplicateError('Repository', repo.id);
    }

    workspace.repositories.push({
      ...repo,
      services: repo.services ?? [],
      tags: repo.tags ?? [],
    });
    workspace.updated_at = now();
    await this.storage.write(WORKSPACES_COLLECTION, workspaceId, workspace as unknown as Document);
    return workspace;
  }

  async removeRepository(workspaceId: string, repoId: string): Promise<Workspace> {
    const workspace = await this.getWorkspace(workspaceId);
    const idx = workspace.repositories.findIndex((r) => r.id === repoId);
    if (idx === -1) throw new RepositoryNotFoundError(repoId);

    workspace.repositories.splice(idx, 1);
    workspace.updated_at = now();
    const affectedProjects = await this.listProjects(workspaceId);
    const ops = [
      {
        type: 'write' as const,
        collection: WORKSPACES_COLLECTION,
        id: workspaceId,
        data: workspace as unknown as Document,
      },
    ];
    for (const project of affectedProjects) {
      if (!project.repositories.includes(repoId)) {
        continue;
      }
      project.repositories = project.repositories.filter((current) => current !== repoId);
      project.updated_at = now();
      ops.push({
        type: 'write' as const,
        collection: PROJECTS_COLLECTION,
        id: project.id,
        data: project as unknown as Document,
      });
    }
    await this.storage.transaction(ops);
    return workspace;
  }

  async getRepository(workspaceId: string, repoId: string): Promise<Repository> {
    const workspace = await this.getWorkspace(workspaceId);
    const repo = workspace.repositories.find((r) => r.id === repoId);
    if (!repo) throw new RepositoryNotFoundError(repoId);
    return repo;
  }

  // ── Project CRUD ─────────────────────────────────────────

  async createProject(input: {
    id: string;
    workspaceId: string;
    name: string;
    repositories?: string[];
  }): Promise<Project> {
    // Verify workspace exists
    const workspace = await this.getWorkspace(input.workspaceId);

    const existing = await this.storage.read(PROJECTS_COLLECTION, input.id);
    if (existing) throw new DuplicateError('Project', input.id);

    const repositories = input.repositories ?? [];
    const missingRepos = repositories.filter(
      (repoId) => !workspace.repositories.some((repo) => repo.id === repoId)
    );
    if (missingRepos.length > 0) {
      throw new ValidationError(
        `Unknown repositories for workspace ${input.workspaceId}: ${missingRepos.join(', ')}`
      );
    }

    const project: Project = {
      id: input.id,
      workspaceId: input.workspaceId,
      name: input.name,
      repositories,
      sessions: [],
      status: 'active',
      created_at: now(),
      updated_at: now(),
    };

    await this.storage.write(PROJECTS_COLLECTION, project.id, project as unknown as Document);
    return project;
  }

  async getProject(id: string): Promise<Project> {
    const doc = await this.storage.read(PROJECTS_COLLECTION, id);
    if (!doc) throw new ProjectNotFoundError(id);
    const project = toProject(doc);
    const workspace = await this.getWorkspace(project.workspaceId);
    const validRepos = new Set(workspace.repositories.map((repo) => repo.id));
    const sanitizedRepositories = project.repositories.filter((repoId) => validRepos.has(repoId));
    if (sanitizedRepositories.length !== project.repositories.length) {
      project.repositories = sanitizedRepositories;
      project.updated_at = now();
      await this.storage.write(PROJECTS_COLLECTION, id, project as unknown as Document);
    }
    return project;
  }

  async listProjects(workspaceId: string): Promise<Project[]> {
    const docs = await this.storage.list(PROJECTS_COLLECTION, {
      where: { workspaceId },
    });
    return docs.map(toProject);
  }

  async updateProject(
    id: string,
    updates: Partial<Pick<Project, 'name' | 'status' | 'repositories' | 'sessions'>>
  ): Promise<Project> {
    const project = await this.getProject(id);
    if (updates.name !== undefined) project.name = updates.name;
    if (updates.status !== undefined) project.status = updates.status;
    if (updates.repositories !== undefined) project.repositories = updates.repositories;
    if (updates.sessions !== undefined) project.sessions = updates.sessions;
    project.updated_at = now();
    await this.storage.write(PROJECTS_COLLECTION, id, project as unknown as Document);
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await this.getProject(id); // ensure exists
    await this.storage.delete(PROJECTS_COLLECTION, id);
  }

  async addRepositoryToProject(projectId: string, repoId: string): Promise<Project> {
    const project = await this.getProject(projectId);
    if (project.repositories.includes(repoId)) {
      throw new DuplicateError('Repository in project', repoId);
    }
    // Validate repo exists in workspace
    await this.getRepository(project.workspaceId, repoId);
    project.repositories.push(repoId);
    project.updated_at = now();
    await this.storage.write(PROJECTS_COLLECTION, projectId, project as unknown as Document);
    return project;
  }

  async removeRepositoryFromProject(projectId: string, repoId: string): Promise<Project> {
    const project = await this.getProject(projectId);
    const idx = project.repositories.indexOf(repoId);
    if (idx === -1) throw new RepositoryNotFoundError(repoId);
    project.repositories.splice(idx, 1);
    project.updated_at = now();
    await this.storage.write(PROJECTS_COLLECTION, projectId, project as unknown as Document);
    return project;
  }

  // ── Team management ──────────────────────────────────────

  async addTeam(workspaceId: string, team: Team): Promise<Workspace> {
    const workspace = await this.getWorkspace(workspaceId);
    if (workspace.teams.some((t) => t.id === team.id)) {
      throw new DuplicateError('Team', team.id);
    }
    workspace.teams.push(team);
    workspace.updated_at = now();
    await this.storage.write(WORKSPACES_COLLECTION, workspaceId, workspace as unknown as Document);
    return workspace;
  }

  async removeTeam(workspaceId: string, teamId: string): Promise<Workspace> {
    const workspace = await this.getWorkspace(workspaceId);
    const idx = workspace.teams.findIndex((t) => t.id === teamId);
    if (idx === -1) throw new Error(`Team not found: ${teamId}`);
    workspace.teams.splice(idx, 1);
    workspace.updated_at = now();
    await this.storage.write(WORKSPACES_COLLECTION, workspaceId, workspace as unknown as Document);
    return workspace;
  }

  // ── Convenience: resolve project → repository contexts ───

  async resolveProjectRepositories(projectId: string): Promise<Repository[]> {
    const project = await this.getProject(projectId);
    const workspace = await this.getWorkspace(project.workspaceId);
    return project.repositories
      .map((rid) => workspace.repositories.find((r) => r.id === rid))
      .filter((r): r is Repository => r !== undefined);
  }

  // ── Default workspace for single-repo users ──────────────

  async ensureDefaultWorkspace(owner: string): Promise<Workspace> {
    try {
      return await this.getWorkspace('default');
    } catch {
      return await this.createWorkspace({
        id: 'default',
        name: 'Default Workspace',
        owner,
      });
    }
  }

  async ensureDefaultProject(workspaceId: string): Promise<Project> {
    try {
      return await this.getProject('default');
    } catch {
      return await this.createProject({
        id: 'default',
        workspaceId,
        name: 'Default Project',
      });
    }
  }
}
