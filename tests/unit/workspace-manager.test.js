/**
 * Workspace Manager — Unit Tests (M25-002)
 *
 * Tests CRUD operations for workspaces, projects, and repositories.
 * Uses an in-memory StorageProvider mock.
 */

import * as __req_0 from '../../platform/engine/workspace';
const {
  WorkspaceManager,
  WorkspaceNotFoundError,
  ProjectNotFoundError,
  RepositoryNotFoundError,
  DuplicateError,
  ValidationError,
} = __req_0;

// ─── Mock StorageProvider ────────────────────────────────────

function createMockStorage() {
  const collections = {};

  function getCollection(name) {
    if (!collections[name]) collections[name] = {};
    return collections[name];
  }

  return {
    name: 'mock',
    async read(collection, id) {
      return getCollection(collection)[id] ?? null;
    },
    async write(collection, id, data) {
      getCollection(collection)[id] = { ...data };
    },
    async delete(collection, id) {
      delete getCollection(collection)[id];
    },
    async list(collection, filter) {
      const coll = getCollection(collection);
      let docs = Object.values(coll);
      if (filter?.where) {
        for (const [k, v] of Object.entries(filter.where)) {
          docs = docs.filter((d) => d[k] === v);
        }
      }
      return docs;
    },
    async query(collection, q) {
      return this.list(collection, q);
    },
    async transaction(ops) {
      for (const op of ops) {
        if (op.type === 'write') await this.write(op.collection, op.id, op.data);
        if (op.type === 'delete') await this.delete(op.collection, op.id);
      }
    },
    async initialize() {},
    async close() {},
    async health() {
      return { status: 'healthy', provider: 'mock', latencyMs: 0 };
    },
    metrics() {
      return { reads: 0, writes: 0, deletes: 0, errors: 0, readLatencies: [], writeLatencies: [] };
    },
  };
}

// ─── Workspace CRUD ──────────────────────────────────────────

describe('WorkspaceManager — workspaces', () => {
  let mgr;
  let storage;

  beforeEach(() => {
    storage = createMockStorage();
    mgr = new WorkspaceManager(storage);
  });

  it('creates and retrieves a workspace', async () => {
    const ws = await mgr.createWorkspace({ id: 'ws-1', name: 'Test Workspace', owner: 'alice' });
    expect(ws.id).toBe('ws-1');
    expect(ws.name).toBe('Test Workspace');
    expect(ws.owner).toBe('alice');
    expect(ws.repositories).toEqual([]);
    expect(ws.teams).toEqual([]);

    const fetched = await mgr.getWorkspace('ws-1');
    expect(fetched.id).toBe('ws-1');
  });

  it('lists workspaces', async () => {
    await mgr.createWorkspace({ id: 'ws-a', name: 'A', owner: 'bob' });
    await mgr.createWorkspace({ id: 'ws-b', name: 'B', owner: 'bob' });
    const list = await mgr.listWorkspaces();
    expect(list).toHaveLength(2);
  });

  it('updates a workspace', async () => {
    await mgr.createWorkspace({ id: 'ws-1', name: 'Old', owner: 'alice' });
    const updated = await mgr.updateWorkspace('ws-1', { name: 'New' });
    expect(updated.name).toBe('New');
    expect(updated.owner).toBe('alice');
  });

  it('deletes a workspace and its projects', async () => {
    await mgr.createWorkspace({ id: 'ws-1', name: 'WS', owner: 'alice' });
    await mgr.createProject({ id: 'p1', workspaceId: 'ws-1', name: 'P1' });
    await mgr.deleteWorkspace('ws-1');
    await expect(mgr.getWorkspace('ws-1')).rejects.toThrow(WorkspaceNotFoundError);
    await expect(mgr.getProject('p1')).rejects.toThrow(ProjectNotFoundError);
  });

  it('throws WorkspaceNotFoundError for missing ID', async () => {
    await expect(mgr.getWorkspace('nope')).rejects.toThrow(WorkspaceNotFoundError);
  });

  it('throws DuplicateError on duplicate create', async () => {
    await mgr.createWorkspace({ id: 'ws-1', name: 'A', owner: 'x' });
    await expect(mgr.createWorkspace({ id: 'ws-1', name: 'B', owner: 'y' })).rejects.toThrow(
      DuplicateError
    );
  });
});

// ─── Repository Management ───────────────────────────────────

describe('WorkspaceManager — repositories', () => {
  let mgr;

  beforeEach(async () => {
    mgr = new WorkspaceManager(createMockStorage());
    await mgr.createWorkspace({ id: 'ws-1', name: 'WS', owner: 'alice' });
  });

  it('adds a repository', async () => {
    const ws = await mgr.addRepository('ws-1', {
      id: 'repo-1',
      name: 'Backend',
      provider: 'github',
      url: 'https://github.com/org/backend',
      defaultBranch: 'main',
      tags: ['api'],
    });
    expect(ws.repositories).toHaveLength(1);
    expect(ws.repositories[0].id).toBe('repo-1');
    expect(ws.repositories[0].tags).toEqual(['api']);
  });

  it('removes a repository', async () => {
    await mgr.addRepository('ws-1', {
      id: 'repo-1',
      name: 'R',
      provider: 'github',
      url: 'https://github.com/org/r',
      defaultBranch: 'main',
    });
    const ws = await mgr.removeRepository('ws-1', 'repo-1');
    expect(ws.repositories).toHaveLength(0);
  });

  it('throws DuplicateError on duplicate repo', async () => {
    const repo = {
      id: 'repo-1',
      name: 'R',
      provider: 'github',
      url: 'https://github.com/org/r',
      defaultBranch: 'main',
    };
    await mgr.addRepository('ws-1', repo);
    await expect(mgr.addRepository('ws-1', repo)).rejects.toThrow(DuplicateError);
  });

  it('throws ValidationError on invalid provider', async () => {
    await expect(
      mgr.addRepository('ws-1', {
        id: 'repo-1',
        name: 'R',
        provider: 'bitbucket',
        url: 'https://bb.com',
        defaultBranch: 'main',
      })
    ).rejects.toThrow(ValidationError);
  });

  it('throws RepositoryNotFoundError on remove of missing repo', async () => {
    await expect(mgr.removeRepository('ws-1', 'nope')).rejects.toThrow(RepositoryNotFoundError);
  });

  it('getRepository returns the correct repo', async () => {
    await mgr.addRepository('ws-1', {
      id: 'repo-1',
      name: 'Backend',
      provider: 'github',
      url: 'https://github.com/org/be',
      defaultBranch: 'main',
      tags: ['api'],
    });
    const repo = await mgr.getRepository('ws-1', 'repo-1');
    expect(repo.name).toBe('Backend');
  });
});

// ─── Project CRUD ────────────────────────────────────────────

describe('WorkspaceManager — projects', () => {
  let mgr;

  beforeEach(async () => {
    mgr = new WorkspaceManager(createMockStorage());
    await mgr.createWorkspace({ id: 'ws-1', name: 'WS', owner: 'alice' });
  });

  it('creates and retrieves a project', async () => {
    const p = await mgr.createProject({ id: 'proj-1', workspaceId: 'ws-1', name: 'My Project' });
    expect(p.id).toBe('proj-1');
    expect(p.workspaceId).toBe('ws-1');
    expect(p.status).toBe('active');
    expect(p.repositories).toEqual([]);

    const fetched = await mgr.getProject('proj-1');
    expect(fetched.name).toBe('My Project');
  });

  it('rejects project creation when referenced repositories do not exist in the workspace', async () => {
    await expect(
      mgr.createProject({
        id: 'proj-invalid',
        workspaceId: 'ws-1',
        name: 'Invalid Project',
        repositories: ['repo-missing'],
      })
    ).rejects.toThrow(ValidationError);
  });

  it('lists projects for a workspace', async () => {
    await mgr.createProject({ id: 'p1', workspaceId: 'ws-1', name: 'P1' });
    await mgr.createProject({ id: 'p2', workspaceId: 'ws-1', name: 'P2' });
    const projects = await mgr.listProjects('ws-1');
    expect(projects).toHaveLength(2);
  });

  it('updates a project', async () => {
    await mgr.createProject({ id: 'p1', workspaceId: 'ws-1', name: 'P1' });
    const updated = await mgr.updateProject('p1', { name: 'Updated', status: 'archived' });
    expect(updated.name).toBe('Updated');
    expect(updated.status).toBe('archived');
  });

  it('deletes a project', async () => {
    await mgr.createProject({ id: 'p1', workspaceId: 'ws-1', name: 'P1' });
    await mgr.deleteProject('p1');
    await expect(mgr.getProject('p1')).rejects.toThrow(ProjectNotFoundError);
  });

  it('adds and removes repo from project', async () => {
    await mgr.addRepository('ws-1', {
      id: 'repo-1',
      name: 'R',
      provider: 'github',
      url: 'https://github.com/org/r',
      defaultBranch: 'main',
    });
    await mgr.createProject({ id: 'p1', workspaceId: 'ws-1', name: 'P1' });

    const with_repo = await mgr.addRepositoryToProject('p1', 'repo-1');
    expect(with_repo.repositories).toContain('repo-1');

    const without_repo = await mgr.removeRepositoryFromProject('p1', 'repo-1');
    expect(without_repo.repositories).not.toContain('repo-1');
  });

  it('resolves project repositories', async () => {
    await mgr.addRepository('ws-1', {
      id: 'repo-1',
      name: 'Backend',
      provider: 'github',
      url: 'https://github.com/org/be',
      defaultBranch: 'main',
    });
    await mgr.addRepository('ws-1', {
      id: 'repo-2',
      name: 'Frontend',
      provider: 'github',
      url: 'https://github.com/org/fe',
      defaultBranch: 'main',
    });
    await mgr.createProject({
      id: 'p1',
      workspaceId: 'ws-1',
      name: 'P1',
      repositories: ['repo-1', 'repo-2'],
    });

    const repos = await mgr.resolveProjectRepositories('p1');
    expect(repos).toHaveLength(2);
    expect(repos.map((r) => r.id).sort()).toEqual(['repo-1', 'repo-2']);
  });

  it('removes orphaned repository references from projects when a repository is deleted', async () => {
    await mgr.addRepository('ws-1', {
      id: 'repo-1',
      name: 'Backend',
      provider: 'github',
      url: 'https://github.com/org/be',
      defaultBranch: 'main',
    });
    await mgr.addRepository('ws-1', {
      id: 'repo-2',
      name: 'Frontend',
      provider: 'github',
      url: 'https://github.com/org/fe',
      defaultBranch: 'main',
    });
    await mgr.createProject({
      id: 'p1',
      workspaceId: 'ws-1',
      name: 'P1',
      repositories: ['repo-1', 'repo-2'],
    });

    await mgr.removeRepository('ws-1', 'repo-1');

    const project = await mgr.getProject('p1');
    expect(project.repositories).toEqual(['repo-2']);
  });
});

// ─── Team Management ─────────────────────────────────────────

describe('WorkspaceManager — teams', () => {
  let mgr;

  beforeEach(async () => {
    mgr = new WorkspaceManager(createMockStorage());
    await mgr.createWorkspace({ id: 'ws-1', name: 'WS', owner: 'alice' });
  });

  it('adds and removes a team', async () => {
    const ws = await mgr.addTeam('ws-1', { id: 'team-1', name: 'Platform', members: ['alice'] });
    expect(ws.teams).toHaveLength(1);
    expect(ws.teams[0].name).toBe('Platform');

    const updated = await mgr.removeTeam('ws-1', 'team-1');
    expect(updated.teams).toHaveLength(0);
  });

  it('throws DuplicateError on duplicate team', async () => {
    await mgr.addTeam('ws-1', { id: 'team-1', name: 'T' });
    await expect(mgr.addTeam('ws-1', { id: 'team-1', name: 'T2' })).rejects.toThrow(DuplicateError);
  });
});

// ─── Default Workspace/Project ───────────────────────────────

describe('WorkspaceManager — defaults', () => {
  let mgr;

  beforeEach(() => {
    mgr = new WorkspaceManager(createMockStorage());
  });

  it('ensureDefaultWorkspace creates on first call', async () => {
    const ws = await mgr.ensureDefaultWorkspace('alice');
    expect(ws.id).toBe('default');
    expect(ws.owner).toBe('alice');

    // Second call returns the same
    const ws2 = await mgr.ensureDefaultWorkspace('bob');
    expect(ws2.owner).toBe('alice'); // not overwritten
  });

  it('ensureDefaultProject creates on first call', async () => {
    await mgr.createWorkspace({ id: 'ws-1', name: 'WS', owner: 'alice' });
    const proj = await mgr.ensureDefaultProject('ws-1');
    expect(proj.id).toBe('default');

    const proj2 = await mgr.ensureDefaultProject('ws-1');
    expect(proj2.id).toBe('default');
  });
});
