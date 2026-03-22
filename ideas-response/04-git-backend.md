# Domain 04 — Embedded Git Backend

> Source: `ideas/ideas.md` — Section "Git Solution"  
> Analysis date: March 22, 2026  
> Analyst: GitHub Copilot (based on consultant recommendations)

---

## 1. Executive Summary

The consultant's recommendation: **"Yes — strongly — but implement it as a hybrid pluggable Git backend, with an embedded TypeScript-first backend as the default and native Git only as a fallback path."**

The platform already models Git as first-class capability: Git operations appear in the phase tool catalog, the agent execution schema includes Git commit capability, and workspace/repository abstractions exist. However, Git execution today depends on whatever `git` binary is installed on the host OS — a fragile, environment-sensitive, unauditable dependency.

The goal is a **Git backend abstraction** with three pluggable implementations:

1. **Embedded JS backend** (`isomorphic-git`) — default; TypeScript-native; no OS dependency
2. **Native Git fallback backend** — for edge cases and high-compatibility scenarios
3. **Provider API backend** — GitHub/Azure DevOps APIs for hosted metadata (PRs, branch protection, commit status)

This is a structural improvement to operational reliability, not a user-visible new feature. Priority is Medium (P2) relative to RAG, Identity, and Chat — but it removes one of the core OS-level fragile dependencies that limit deployment portability.

---

## 2. Current State Analysis

### What exists today

| Component                 | Location                                         | Notes                                           |
| ------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| Git in tool catalog       | `templates/sdlc/agents/`                         | `tool.git.commit` declared for execution agents |
| Workspace model           | `src/webapp/routes/workspaces.ts`                | Repository abstractions                         |
| Agent execution service   | `src/webapp/services/agent-execution-service.ts` | Where Git calls would originate                 |
| Session/artifact tracking | `src/webapp/services/session/`                   | Artifacts linked to commits                     |

### Git Call Patterns Used Today

Based on the template tool declarations and agent contracts:

- `git status` — working tree state
- `git add` / `git rm` — staging
- `git commit` — commit artifacts
- `git checkout` / `git switch` — branch management
- `git push` / `git pull` — remote sync
- `git diff` — change detection for architecture compliance review
- `git log` — history for audit trail

### Gaps

| Gap                                              | Severity                        |
| ------------------------------------------------ | ------------------------------- |
| No Git backend abstraction exists                | Critical (premise of this work) |
| OS `git` dependency for all operations           | High                            |
| No audit trail of Git actions as platform events | High                            |
| No typed Git result model                        | Medium                          |
| Git credentials per-workspace not managed        | High                            |

---

## 3. Architecture Design

### Git Backend Abstraction

```typescript
// Core abstraction interface
interface GitBackend {
  // Working tree
  status(repoPath: string): Promise<GitStatusResult>;
  diff(repoPath: string, options?: DiffOptions): Promise<GitDiffResult>;

  // Staging and commit
  add(repoPath: string, patterns: string[]): Promise<void>;
  remove(repoPath: string, patterns: string[]): Promise<void>;
  commit(
    repoPath: string,
    message: string,
    author: GitAuthor
  ): Promise<GitCommitResult>;

  // Branching
  branch(repoPath: string): Promise<string[]>;
  currentBranch(repoPath: string): Promise<string>;
  createBranch(repoPath: string, name: string, from?: string): Promise<void>;
  checkout(repoPath: string, ref: string): Promise<void>;

  // Remote operations
  fetch(repoPath: string, options?: FetchOptions): Promise<void>;
  pull(repoPath: string, options?: PullOptions): Promise<GitPullResult>;
  push(repoPath: string, options?: PushOptions): Promise<void>;

  // Log and history
  log(repoPath: string, options?: LogOptions): Promise<GitCommit[]>;

  // Metadata
  capabilities(): GitBackendCapabilities;
}

interface GitBackendCapabilities {
  name: 'isomorphic-git' | 'native-git' | 'provider-api';
  supportedOps: string[];
  requiresNativeGit: boolean;
  maxRepoSizeMb?: number;
}
```

### Three Backend Implementations

```
┌─────────────────────────────────────────────────────────┐
│  GitBackendRouter (selects backend per operation)        │
│  Primary: EmbeddedGitBackend (isomorphic-git)            │
│  Fallback: NativeGitBackend (child_process git)          │
│  Metadata: ProviderApiBackend (GitHub/ADO REST API)      │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  isomorphic-git         OS git binary      GitHub REST API
  (TypeScript, no OS)    (fallback only)    Azure DevOps API
```

### Routing Logic

```typescript
// EmbeddedGitBackend handles 80% path:
// status, diff, add, remove, commit, branch, checkout, log

// NativeGitBackend handles:
// complex merge scenarios, LFS operations, unusual repo states
// submodule advanced ops, credential edge cases

// ProviderApiBackend handles (no working tree needed):
// PR creation/listing, branch protection checks
// commit status (CI), repo metadata, default branch detection
```

### Credential Management

Credentials must be workspace-scoped and provider-aware:

```typescript
interface GitCredentialStore {
  get(workspaceId: string, remote: string): Promise<GitCredential | null>;
  set(
    workspaceId: string,
    remote: string,
    credential: GitCredential
  ): Promise<void>;
  revoke(workspaceId: string, remote: string): Promise<void>;
}

interface GitCredential {
  type: 'token' | 'ssh_key' | 'app_installation';
  token?: string; // Encrypted at rest; never plaintext
  key_id?: string; // Reference to key vault entry
  provider: 'github' | 'azure_devops' | 'generic';
  scopes: string[];
  expires_at?: string;
}
```

---

## 4. Phased Implementation Plan

### Phase 1 — Abstraction Foundation (Milestone: M-GIT-1a)

**Goal:** Define the Git backend interface; implement `isomorphic-git` backend for the core 80% path.

#### Epic 1.1 — Backend Interface and Types

- **Issue 1.1.1** — Define `GitBackend` interface and result types in `src/webapp/services/git/types.ts`
  - `GitStatusResult`, `GitDiffResult`, `GitCommitResult`, `GitCommit`, `GitAuthor`, `DiffOptions`, etc.
  - Acceptance: TypeScript types compile; no `any` in interface
  - Effort: M (2 days)

- **Issue 1.1.2** — Create `GitBackendRouter` service with primary/fallback routing logic
  - Acceptance: router selects primary backend by default; falls back when `UnsupportedOperationError` thrown
  - Effort: M (2 days)

- **Issue 1.1.3** — Create `GitService` singleton: wraps router with audit logging and credential injection
  - Acceptance: every Git operation emits an audit event to `audit-trail`
  - Effort: M (2 days)

#### Epic 1.2 — isomorphic-git Backend

- **Issue 1.2.1** — Install `isomorphic-git` and `@isomorphic-git/lightning-fs` for Node filesystem adapter
  - Acceptance: `npm install isomorphic-git` resolves; basic init/status works in test
  - Effort: S (1 day)

- **Issue 1.2.2** — Implement `EmbeddedGitBackend`: `status()`, `diff()`, `add()`, `remove()`, `commit()`
  - Acceptance: unit tests pass for all five operations on a test repo
  - Effort: L (4 days)

- **Issue 1.2.3** — Implement `EmbeddedGitBackend`: `branch()`, `currentBranch()`, `createBranch()`, `checkout()`
  - Acceptance: branch operations tested with checkout and detached HEAD scenarios
  - Effort: M (3 days)

- **Issue 1.2.4** — Implement `EmbeddedGitBackend`: `fetch()`, `pull()`, `push()` with HTTP auth
  - Acceptance: push/pull with token credential works against a test GitHub repo
  - Effort: L (3–4 days)

- **Issue 1.2.5** — Implement `EmbeddedGitBackend`: `log()` — last N commits with author/date/message
  - Acceptance: log returns same commits as `git log` on same repo
  - Effort: M (2 days)

#### Epic 1.3 — Credential Store

- **Issue 1.3.1** — Implement `GitCredentialStore` with SQLite backend; envelope-encrypt stored tokens
  - Acceptance: tokens stored encrypted; decrypted only within `GitService` boundary
  - Effort: M (2 days)

- **Issue 1.3.2** — Bind workspace credential to linked provider account: GitHub workspace uses GitHub OAuth token; Azure DevOps workspace uses Entra token
  - Acceptance: credential automatically retrieved for workspace Git operations
  - Effort: M (2 days) — depends on Domain 02 Phase 2

---

### Phase 2 — Native Fallback & Provider API Backend (Milestone: M-GIT-1b)

**Goal:** Add native Git fallback and provider API backend; achieve parity for all current Git operations.

#### Epic 2.1 — Native Git Fallback

- **Issue 2.1.1** — Implement `NativeGitBackend` using `child_process.execFile` (not `exec`) with argument validation
  - **Security Note:** Arguments must be validated/escaped; NEVER pass raw user input to git
  - `execFile('git', [...validatedArgs], { cwd: repoPath })` — no shell interpolation
  - Acceptance: no injection vectors; git binary path validated at startup
  - Effort: M (2–3 days)

- **Issue 2.1.2** — Implement fallback trigger: specific `isomorphic-git` error codes trigger native fallback
  - Acceptance: test scenarios where isomorphic-git returns `NotSupported` → fallback executes correctly
  - Effort: M (2 days)

- **Issue 2.1.3** — Add `git.backend` config option: `'embedded' | 'native' | 'hybrid'`
  - `hybrid` (default): embedded primary, native fallback
  - Acceptance: config override works in dev env for debugging
  - Effort: S (1 day)

#### Epic 2.2 — Provider API Backend

- **Issue 2.2.1** — Implement `ProviderApiBackend` for GitHub using existing GitHub token from linked accounts
  - Operations: `listPullRequests()`, `getPullRequest()`, `getBranchProtection()`, `getCommitStatus()`
  - Acceptance: returns PR list for a test repo; no working tree required
  - Effort: M (2–3 days)

- **Issue 2.2.2** — Implement `ProviderApiBackend` for Azure DevOps using Entra token
  - Operations: same PR/pipeline metadata surface
  - Acceptance: returns ADO repo metadata for a test org/project
  - Effort: M (2–3 days) — depends on Domain 02 Phase 2

- **Issue 2.2.3** — Implement `createPullRequest()` via provider API (GitHub + ADO)
  - Acceptance: creates PR via API; returns PR URL as `GitPullRequestResult`
  - Effort: M (2 days)

---

### Phase 3 — Agent Integration (Milestone: M-GIT-2)

**Goal:** Replace all shell-based Git calls in agent execution with the new `GitService`.

#### Epic 3.1 — Agent Execution Integration

- **Issue 3.1.1** — Audit all Git operation call sites in `agent-execution-service.ts` and template tool declarations
  - Acceptance: complete list of current Git call patterns documented
  - Effort: S (1 day)

- **Issue 3.1.2** — Replace shell Git calls with `GitService.commit()` + `GitService.push()` in Implementation Agent execution
  - Acceptance: no `child_process.exec('git ...')` calls remain in `agent-execution-service.ts`
  - Effort: M (2 days)

- **Issue 3.1.3** — Replace `git diff` calls in Architecture Compliance Reviewer (Agent 38) with `GitService.diff()`
  - Acceptance: compliance review diff results identical to native git diff
  - Effort: M (2 days)

- **Issue 3.1.4** — Replace `git log` calls in audit trail generation with `GitService.log()`
  - Acceptance: audit events include structured commit metadata, not raw git output strings
  - Effort: M (2 days)

#### Epic 3.2 — Observability & Audit

- **Issue 3.2.1** — Add Git operation audit events: `git.commit`, `git.push`, `git.checkout`, `git.branch.create`
  - Emitted to existing audit trail; includes workspace ID, repo URL, agent ID, operation result
  - Acceptance: audit trail in UI shows typed Git events
  - Effort: S (1 day)

- **Issue 3.2.2** — Add `GET /api/v1/git/status?workspaceId={id}` admin endpoint for workspace Git health
  - Acceptance: returns backend type, credential status, last operation result
  - Effort: S (1 day)

---

## 5. Milestones

### M-GIT-1a — Embedded Git Foundation

- **Deliverables:** `GitBackend` interface; `EmbeddedGitBackend` (isomorphic-git); `GitCredentialStore`; `GitService` with audit logging
- **Exit criteria:** All core Git operations work via embedded backend on a test repo; no OS `git` binary required

### M-GIT-1b — Full Backend Set

- **Deliverables:** `NativeGitBackend` fallback; `ProviderApiBackend` (GitHub + ADO); hybrid routing
- **Exit criteria:** Push/pull works with GitHub token; PR creation works via provider API

### M-GIT-2 — Agent Integration

- **Deliverables:** All agent Git calls routed through `GitService`; Git audit events in trail; no raw shell Git calls
- **Exit criteria:** `grep -r "exec.*git" src/` returns zero results; integration test: commit + push via `GitService`

---

## 6. Security Constraints

1. **No shell injection** — `NativeGitBackend` uses `execFile` with validated argument arrays; never `exec()`
2. **Credentials encrypted at rest** — `GitCredentialStore` uses AES-256-GCM; keys from environment
3. **No credential logging** — tokens never appear in audit events or logs
4. **Repo path validation** — all `repoPath` arguments validated against workspace-allowed paths; no path traversal
5. **Timeout on all Git operations** — prevent hung processes from blocking agent execution

---

## 7. Risks

| Risk                                               | Likelihood | Impact | Mitigation                                                           |
| -------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------- |
| isomorphic-git parity gaps in edge cases           | High       | Medium | Native fallback exists by design; document known gaps                |
| Credential token exposure in logs                  | Medium     | High   | Enforce credential redaction in all Git service logging              |
| Large repo performance (`git clone` / large blobs) | Medium     | Medium | LFS not supported in isomorphic-git; route to native or provider API |
| Windows path handling differences                  | Medium     | Medium | Path normalization layer in `GitService`; tested on Windows in CI    |
| Concurrent Git operations on same repo             | Low        | Medium | File-lock mechanism already exists at `file-lock.ts` — integrate     |

---

## HANDOFF CHECKLIST

- [x] All required sections are filled
- [x] Architecture design: three-backend model documented
- [x] TypeScript interface defined for `GitBackend`
- [x] `GitCredentialStore` design with per-provider binding documented
- [x] Security constraints: `execFile` vs `exec` explicitly called out
- [x] Integration path to `agent-execution-service.ts` specified
- [x] Phased plan actionable with effort estimates
- [x] Deliverable written to file
