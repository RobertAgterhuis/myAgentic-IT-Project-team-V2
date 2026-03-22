#!/usr/bin/env pwsh
# Domain 04 - Git Backend: Create epics + issues

$repo = "RobertAgterhuis/myAgentic-IT-Project-team-V2"
$ErrorActionPreference = "Continue"

function New-Issue($title, $body, [string[]]$labels, $msNum) {
    $p = @{ title=$title; body=$body; labels=$labels; milestone=$msNum } | ConvertTo-Json -Compress
    $r = ($p | gh api "repos/$repo/issues" --input -) | ConvertFrom-Json
    Write-Host "  #$($r.number) $title" -ForegroundColor Green
    return [int]$r.number
}
function B { param($lines) return ($lines -join "`n") }

$ms103=103; $ms107=107; $ms116=116

Write-Host "`n=== Domain 04: Git Backend ===" -ForegroundColor Magenta

# ── M-GIT-1a ──────────────────────────────────────
Write-Host "`n-- M-GIT-1a (Git Backend Foundation) --"

$e11 = New-Issue "Epic: Git Backend Interface + Types" (B @(
    "## Epic 1.1 - Git Backend Interface and Type System",
    "**Milestone:** M-GIT-1a - Git Backend Phase 1",
    "**Domain:** Git Backend (Domain 04, Phase 1)",
    "",
    "The GitService sits between platform agents/commands and concrete Git operations.",
    "All outputs are typed; operations always written to audit log.",
    "",
    "### Hard Constraints",
    "- All credential access goes through GitCredentialStore (never plaintext in memory)",
    "- All operations written to structured audit log",
    "",
    "### Issues",
    "- [ ] GitBackend interface with 8 operations",
    "- [ ] GitBackendRouter: runtime selection of backend",
    "- [ ] GitService: wraps GitBackend with audit logging"
)) @("epic","domain:git","P0-critical","enhancement") $ms103

New-Issue "GIT-1.1.1 - GitBackend interface with 8 typed operations" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-GIT-1a",
    "",
    "Define GitBackend interface at src/webapp/services/git/git-backend.ts:",
    "Operations: status(), add(files), remove(files), commit(msg), diff(file), log(opts),",
    "            branch(opts), fetchPullPush(op, remote, branch)",
    "All return typed Result<T, GitError> tuples.",
    "",
    "**Acceptance criteria:**",
    "- TypeScript compiles against the interface contract",
    "- All 8 operations have typed input/output signatures",
    "",
    "**Effort:** S (1 day)"
)) @("domain:git","P0-critical","enhancement","tech") $ms103

New-Issue "GIT-1.1.2 - GitBackendRouter: select backend at runtime by config" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-GIT-1a",
    "",
    "Implement GitBackendRouter that selects the backend based on GIT_BACKEND env var or auto-detect.",
    "Values: isomorphic (default), native, provider-api",
    "Route errors for unavailable backend gracefully.",
    "",
    "**Acceptance criteria:**",
    "- Router returns correct backend for each config value in unit test",
    "",
    "**Effort:** S (1 day)"
)) @("domain:git","P0-critical","enhancement","tech") $ms103

New-Issue "GIT-1.1.3 - GitService: audit-logged wrapper around GitBackend" (B @(
    "**Epic:** #$e11",
    "**Milestone:** M-GIT-1a",
    "",
    "Implement GitService that wraps GitBackend with:",
    "- Structured audit log for every operation (actor, repo, operation, result, timestamp)",
    "- Emits typed events for status change, commit created, push completed",
    "",
    "**Acceptance criteria:**",
    "- Every operation produces an audit log entry",
    "- Events emitted on commit + push",
    "",
    "**Effort:** M (2 days)"
)) @("domain:git","P0-critical","enhancement","tech") $ms103

$e12 = New-Issue "Epic: isomorphic-git Backend Implementation" (B @(
    "## Epic 1.2 - isomorphic-git Backend",
    "**Milestone:** M-GIT-1a - Git Backend Phase 1",
    "**Domain:** Git Backend (Domain 04, Phase 1)",
    "",
    "Primary backend using isomorphic-git for pure-JS in-process Git ops.",
    "Runs inside the existing Node.js server, no child process overhead.",
    "",
    "### Issues",
    "- [ ] Install isomorphic-git and configure",
    "- [ ] Implement status, diff, add, remove, commit, log",
    "- [ ] Implement branch operations (list, create, checkout, delete)",
    "- [ ] Implement fetch, pull, push with credential store",
    "- [ ] Implement log with pagination"
)) @("epic","domain:git","P0-critical","enhancement") $ms103

New-Issue "GIT-1.2.1 - Install isomorphic-git and configure BrowserFS adapter" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-GIT-1a",
    "",
    "npm install isomorphic-git",
    "Configure virtual FS adapter for Node.js file system.",
    "Smoke test: git.log against current workspace confirms commit history.",
    "",
    "**Acceptance criteria:**",
    "- npm install completes without peer conflicts",
    "- git.log against workspace returns at least 1 commit",
    "",
    "**Effort:** S (0.5 days)"
)) @("domain:git","P0-critical","enhancement","tech") $ms103

New-Issue "GIT-1.2.2 - Implement status, diff, add, remove, commit operations" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-GIT-1a",
    "",
    "Implement IsomorphicGitBackend for core write operations:",
    "- status(): staged/unstaged file list",
    "- diff(file): unified diff for single file",
    "- add(files): stage files",
    "- remove(files): unstage files",
    "- commit(message): create commit with author from session user",
    "",
    "**Acceptance criteria:**",
    "- Edit a test file, call add + commit, verify git.log shows new commit",
    "",
    "**Effort:** M (2 days)"
)) @("domain:git","P0-critical","enhancement","tech") $ms103

New-Issue "GIT-1.2.3 - Implement branch operations: list, create, checkout, delete" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-GIT-1a",
    "",
    "Branch ops in IsomorphicGitBackend:",
    "- listBranches(): local branches",
    "- createBranch(name): from HEAD",
    "- checkout(branch): switch branch",
    "- deleteBranch(name): guard against deleting current branch",
    "",
    "**Acceptance criteria:**",
    "- Create test branch, checkout, verify HEAD points to new branch",
    "",
    "**Effort:** M (1-2 days)"
)) @("domain:git","P0-critical","enhancement","tech") $ms103

New-Issue "GIT-1.2.4 - Implement fetch, pull, push via GitCredentialStore" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-GIT-1a",
    "",
    "Implement remote operations in IsomorphicGitBackend:",
    "- fetch(remote): refresh remote tracking refs",
    "- pull(remote, branch): integrate remote changes",
    "- push(remote, branch): push with credentials from GitCredentialStore",
    "Credentials retrieved per-workspace from GitCredentialStore (never exposed to caller).",
    "",
    "**Acceptance criteria:**",
    "- Mock credential store in tests; confirm HTTP Basic auth header sent correctly",
    "",
    "**Effort:** M (2 days)"
)) @("domain:git","P0-critical","enhancement","tech") $ms103

New-Issue "GIT-1.2.5 - Implement log with pagination and commit metadata" (B @(
    "**Epic:** #$e12",
    "**Milestone:** M-GIT-1a",
    "",
    "Implement log(opts) with pagination (depth, since, until, author filter).",
    "Returns GitCommit[] with hash, author, date, subject, body.",
    "",
    "**Acceptance criteria:**",
    "- log({ depth: 5 }) returns 5 most recent commits with full metadata",
    "",
    "**Effort:** S (1 day)"
)) @("domain:git","P0-critical","enhancement","tech") $ms103

$e13 = New-Issue "Epic: Git Credential Store" (B @(
    "## Epic 1.3 - Git Credential Store",
    "**Milestone:** M-GIT-1a - Git Backend Phase 1",
    "**Domain:** Git Backend (Domain 04, Phase 1)",
    "",
    "Secure per-workspace PAT/token storage with envelope encryption.",
    "Credentials never stored in plaintext. Never serialized to logs.",
    "",
    "### Issues",
    "- [ ] GitCredentialStore: SQLite table with AES-256 envelope encryption",
    "- [ ] Workspace credential binding: GET /api/v1/git/credentials endpoints"
)) @("epic","domain:git","P0-critical","enhancement") $ms103

New-Issue "GIT-1.3.1 - GitCredentialStore: SQLite + AES-256 envelope encryption" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-GIT-1a",
    "",
    "Create GitCredentialStore in src/webapp/services/git/credential-store.ts:",
    "- SQLite table: git_credentials(workspace_id, provider, ciphertext, tag, iv)",
    "- AES-256-GCM envelope encryption; master key from CREDENTIAL_MASTER_KEY env var",
    "- Methods: getCredential(workspaceId, provider), setCredential(...), deleteCredential(...)",
    "",
    "**Acceptance criteria:**",
    "- Credential at rest is ciphertext (verified by raw DB read)",
    "- Round-trip: set then get returns original value",
    "",
    "**Effort:** M (2 days)"
)) @("domain:git","P0-critical","enhancement","tech","security") $ms103

New-Issue "GIT-1.3.2 - Workspace credential binding: REST endpoints for credential management" (B @(
    "**Epic:** #$e13",
    "**Milestone:** M-GIT-1a",
    "",
    "Add credential management routes to src/webapp/routes/git.ts:",
    "POST /api/v1/git/credentials: store encrypted credential for workspace+provider",
    "DELETE /api/v1/git/credentials/:provider: remove stored credential",
    "GET /api/v1/git/credentials/status: list providers with credential set (not the secret)",
    "",
    "**Acceptance criteria:**",
    "- GET /status returns ONLY presence flag, not the actual credential",
    "- Credentials scoped to authenticated user workspace only",
    "",
    "**Effort:** S (1 day)"
)) @("domain:git","P0-critical","enhancement","tech","security") $ms103

# ── M-GIT-1b ──────────────────────────────────────
Write-Host "`n-- M-GIT-1b (Native Git + Provider API) --"

$e21 = New-Issue "Epic: Native Git Fallback Backend" (B @(
    "## Epic 2.1 - Native Git Fallback",
    "**Milestone:** M-GIT-1b - Git Backend Phase 2",
    "**Domain:** Git Backend (Domain 04, Phase 2)",
    "",
    "Spawn local git binary as fallback when isomorphic-git is insufficient (LFS, submodules, etc.).",
    "",
    "### Issues",
    "- [ ] NativeGitBackend via execFile (no shell injection possible)",
    "- [ ] Automatic fallback trigger from IsomorphicGitBackend",
    "- [ ] git.backend config option to force backend"
)) @("epic","domain:git","P1-high","enhancement") $ms107

New-Issue "GIT-2.1.1 - NativeGitBackend: spawn git binary via execFile, typed output" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-GIT-1b",
    "",
    "Implement NativeGitBackend at src/webapp/services/git/native-git-backend.ts.",
    "Uses child_process.execFile (NOT exec/spawn shell) to eliminate injection risk.",
    "Arguments always passed as array, never interpolated into a shell string.",
    "Parses git porcelain output into typed GitBackend return types.",
    "",
    "**Security requirement:** No shell=true; all args as array",
    "",
    "**Acceptance criteria:**",
    "- status(), commit(), push() work against test repo",
    "- Injection test: arg with semicolons does not execute secondary command",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:git","P1-high","enhancement","tech","security") $ms107

New-Issue "GIT-2.1.2 - Automatic fallback from isomorphic-git to native on feature detection" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-GIT-1b",
    "",
    "GitBackendRouter automatically falls back to NativeGitBackend when:",
    "- LFS tracked files are detected (.gitattributes filter=lfs)",
    "- Submodules present (.gitmodules)",
    "- isomorphic-git returns UNIMPLEMENTED error",
    "",
    "**Acceptance criteria:**",
    "- LFS repo triggers native fallback automatically",
    "- Fallback logged at INFO level in audit log",
    "",
    "**Effort:** M (1-2 days)"
)) @("domain:git","P1-high","enhancement","tech") $ms107

New-Issue "GIT-2.1.3 - git.backend config option to force backend selection" (B @(
    "**Epic:** #$e21",
    "**Milestone:** M-GIT-1b",
    "",
    "Add GIT_BACKEND env var and workspace-level config override to force isomorphic|native|auto.",
    "Default: auto (smart detection).",
    "",
    "**Acceptance criteria:**",
    "- GIT_BACKEND=native forces native backend regardless of detection",
    "- GIT_BACKEND=isomorphic forces isomorphic backend",
    "",
    "**Effort:** S (0.5 days)"
)) @("domain:git","P1-high","enhancement","tech") $ms107

$e22 = New-Issue "Epic: Provider API Backend (GitHub + Azure DevOps)" (B @(
    "## Epic 2.2 - Provider API Backend",
    "**Milestone:** M-GIT-1b - Git Backend Phase 2",
    "**Domain:** Git Backend (Domain 04, Phase 2)",
    "",
    "REST API backend for hosted provider operations: PR creation, branch mgmt, CI status.",
    "",
    "### Issues",
    "- [ ] GitHub API: PRs, branches, CI status via Octokit",
    "- [ ] Azure DevOps API: repos, PRs, branches",
    "- [ ] createPullRequest: unified method in GitService for both providers"
)) @("epic","domain:git","P1-high","enhancement") $ms107

New-Issue "GIT-2.2.1 - GitHub provider backend: PR creation, branch mgmt via Octokit" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-GIT-1b",
    "",
    "Implement GitHubProviderBackend using @octokit/rest.",
    "Operations: listPullRequests, createPullRequest, mergePullRequest,",
    "            listBranches, createBranch, deleteBranch, getCIStatus.",
    "Credential: GitHub PAT from GitCredentialStore(workspaceId, 'github').",
    "",
    "**Acceptance criteria:**",
    "- createPullRequest creates a real PR in integration test repo (mocked PAT)",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:git","P1-high","enhancement","tech") $ms107

New-Issue "GIT-2.2.2 - Azure DevOps provider backend: repos, PRs, branches" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-GIT-1b",
    "",
    "Implement AzureDevOpsProviderBackend using azure-devops-node-api.",
    "Operations: listRepositories, createPullRequest, listBranches.",
    "Credential: ADO PAT from GitCredentialStore(workspaceId, 'ado').",
    "",
    "**Acceptance criteria:**",
    "- listRepositories returns repos for the ADO org in integration test",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:git","P1-high","enhancement","tech") $ms107

New-Issue "GIT-2.2.3 - GitService.createPullRequest: unified method for GitHub and ADO" (B @(
    "**Epic:** #$e22",
    "**Milestone:** M-GIT-1b",
    "",
    "Add createPullRequest(opts: CreatePROptions) to GitService.",
    "Routes to GitHubProviderBackend or AzureDevOpsProviderBackend based on workspace remoteUrl.",
    "Input: title, body, headBranch, baseBranch, reviewers, draft flag.",
    "",
    "**Acceptance criteria:**",
    "- Correct backend invoked based on remote URL pattern (github.com vs dev.azure.com)",
    "",
    "**Effort:** M (1-2 days)"
)) @("domain:git","P1-high","enhancement","tech") $ms107

# ── M-GIT-2 ──────────────────────────────────────
Write-Host "`n-- M-GIT-2 (Agent Integration) --"

$e31 = New-Issue "Epic: Agent Git Integration" (B @(
    "## Epic 3.1 - Agent Git Integration",
    "**Milestone:** M-GIT-2 - Git Backend Phase 3",
    "**Domain:** Git Backend (Domain 04, Phase 3)",
    "",
    "Replace all shell-based Git calls in agent execution engine with GitService.",
    "Agents access Git only through GitService (no direct execa/exec).",
    "",
    "### Issues",
    "- [ ] Audit and replace shell git calls in agent runner",
    "- [ ] GitService injection into agent execution context",
    "- [ ] Agent commit: auto-commit phase artifacts at gate boundary"
)) @("epic","domain:git","P1-high","enhancement") $ms116

New-Issue "GIT-3.1.1 - Audit and replace all shell git calls in agent runner" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-GIT-2",
    "",
    "Grep entire codebase for: execa('git'), exec('git'), spawn('git'), execFile('git').",
    "Replace each with GitService method calls.",
    "Remove direct git dependency from agent execution paths.",
    "",
    "**Acceptance criteria:**",
    "- Zero shell git calls remain in agent runner code (grep check in CI)",
    "",
    "**Effort:** M (2-3 days)"
)) @("domain:git","P1-high","enhancement","tech") $ms116

New-Issue "GIT-3.1.2 - GitService injection into agent execution context" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-GIT-2",
    "",
    "Inject GitService into AgentExecutionContext so all agents use the same service instance.",
    "Service carries workspaceId for credential resolution.",
    "",
    "**Acceptance criteria:**",
    "- All agents receive GitService via context (no direct import of git library)",
    "",
    "**Effort:** S (1 day)"
)) @("domain:git","P1-high","enhancement","tech") $ms116

New-Issue "GIT-3.1.3 - Auto-commit phase artifacts at gate boundary with signed message" (B @(
    "**Epic:** #$e31",
    "**Milestone:** M-GIT-2",
    "",
    "At each phase gate crossing, GitService auto-commits phase artifacts with a structured message:",
    "Format: 'chore(sdlc): phase N gate passed [session=<id>] [gate=<gateId>]'",
    "Only commits if there are staged/unstaged changes in the artifact output directory.",
    "",
    "**Acceptance criteria:**",
    "- Gate pass triggers commit with correct structured message",
    "- No commit if no artifact changes",
    "",
    "**Effort:** M (2 days)"
)) @("domain:git","P1-high","enhancement","tech") $ms116

Write-Host "`nDomain 04 complete!" -ForegroundColor Cyan
