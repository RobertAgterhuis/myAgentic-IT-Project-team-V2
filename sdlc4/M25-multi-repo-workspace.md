# M25: Multi-Repo Workspace Awareness

> **Impact:** HIGH | **Breaking changes:** NONE (additive — new abstractions
> above current single-repo model) | **Blocks:** nothing | **Blocked by:**
> nothing (benefits from M23 and M19 but can start independently)
>
> **Audit reference:** Phase 2 recommendation — "A complete platform needs:
> multi-repo awareness, workspace-level indexing, branch/PR abstractions,
> artifact lineage across repositories, code generation targets per
> repo/service/package, policy scopes per repo/domain/team."
>
> **Validation:** CONFIRMED. The current model is single-repo: all state lives
> in `BusinessDocs/` within the current repository. `session-state.json` tracks
> one project at a time. There is no workspace/project/repository abstraction
> layer — the engine assumes it operates on "this repo."

---

## Rationale

Real software delivery involves multiple repositories (monorepo services,
frontend + backend, shared libraries, infra-as-code). A platform must be aware
of repo boundaries to generate code in the right place, apply policies per repo,
track artifacts across repos, and manage PRs across services.

---

## Issues

### M25-001: Define workspace and project data model

**Labels:** `architecture`, `data-model`

Create `platform/schema/workspace.schema.json`:

```
Workspace {
  id: string
  name: string
  repositories: Repository[]
  teams: Team[]
  policies: PolicyScope[]
  created: string
  owner: string
}

Repository {
  id: string
  name: string
  provider: "github" | "azure-devops" | "gitlab" | "local"
  url: string
  defaultBranch: string
  services: Service[]      // logical services within the repo
  tags: string[]           // e.g. "frontend", "api", "infra"
}

Project {
  id: string
  workspaceId: string
  name: string
  repositories: string[]   // repository IDs
  sessions: string[]       // session IDs
  status: string
}
```

**Acceptance criteria:**

- [ ] Schema validates workspace, repository, and project definitions
- [ ] Schema supports multi-provider repositories
- [ ] Service-within-repo abstraction exists
- [ ] Schema is added to platform schema barrel

---

### M25-002: Implement workspace manager

**Labels:** `engine`, `feature`

Create `platform/engine/workspace/workspace-manager.ts`:

- CRUD operations for workspaces, projects, and repositories
- Repository registration with provider validation
- Project-to-repository mapping
- Uses StorageProvider for persistence

**Acceptance criteria:**

- [ ] Create/read/update/delete workspace operations
- [ ] Add/remove repositories from workspace
- [ ] Create/list projects within workspace
- [ ] Manager uses StorageProvider interface (not direct file access)
- [ ] Unit tests for all operations

---

### M25-003: Add repository context to engine

**Labels:** `engine`, `refactor`

Extend `engine.ts` to accept a project context that includes repository
information:

- Engine receives `projectId` on initialization
- Workspace manager resolves project → repositories
- Repository context is available to dispatched agents
- Agent invocations include target repository information

**Acceptance criteria:**

- [ ] Engine accepts project context
- [ ] Agent invocations include repository context
- [ ] Single-repo mode (current) still works (default project with local repo)
- [ ] No breaking changes to existing engine API

---

### M25-004: Implement cross-repo artifact lineage

**Labels:** `feature`, `traceability`

Extend `platform/sdlc/traceability.ts`:

- Artifacts can reference their source repository
- Lineage graph spans multiple repositories
- `artifact.origin = { repoId, branch, commitSha, path }`
- Query: "all artifacts from repo X" or "all repos that contributed to
  artifact Y"

**Acceptance criteria:**

- [ ] Artifacts have repository origin metadata
- [ ] Lineage queries work across repositories
- [ ] Existing single-repo artifacts get default origin
- [ ] Unit tests for cross-repo lineage queries

---

### M25-005: Add workspace management to MCP

**Labels:** `mcp`, `workspace`

Add MCP tools:

- `list_workspaces` — list all workspaces
- `get_workspace` — workspace details with repositories and projects
- `create_project` — create a new project in a workspace
- `add_repository` — register a repository in a workspace

**Acceptance criteria:**

- [ ] 4 new MCP tools for workspace management
- [ ] Tools use workspace manager service
- [ ] IDE can discover and switch between workspaces/projects

---

### M25-006: Add workspace selector to UI

**Labels:** `frontend`, `workspace`

Add workspace/project context to the UI:

- Workspace selector in the top navigation
- Project selector (within workspace)
- All data views filter by current project context
- Settings page for managing workspace repositories

**Acceptance criteria:**

- [ ] Workspace/project selector in navigation
- [ ] All pages filter data by current project
- [ ] Repository management UI exists
- [ ] Default workspace/project created automatically for single-repo users

---

### M25-007: Implement repository indexing

**Labels:** `feature`, `workspace`

Create `platform/engine/workspace/repo-indexer.ts`:

- Scan registered repositories for key files (package.json, Dockerfile,
  tsconfig.json, etc.)
- Build a service inventory per repository
- Detect technology stack per service
- Index is refreshable (manual or on-push webhook)

**Acceptance criteria:**

- [ ] Indexer scans repository file structure
- [ ] Technology stack detection works for common stacks (Node, .NET, Python,
      Go)
- [ ] Service boundaries are detected (monorepo support)
- [ ] Index is stored via StorageProvider
