$repo = "RobertAgterhuis/myAgentic-IT-Project-team-V2"

function New-Issue {
    param([string]$Title, [string[]]$Labels, [int]$Milestone, [string]$Body)
    $labelsJson = ($Labels | ForEach-Object { "`"$_`"" }) -join ","
    $safeBody = $Body -replace '\\', '\\\\' -replace '"', '\"' -replace "`r`n", '\n' -replace "`n", '\n' -replace "`t", '  '
    $json = "{`"title`":`"$Title`",`"labels`":[$labelsJson],`"milestone`":$Milestone,`"body`":`"$safeBody`"}"
    $num = $json | gh api "repos/$repo/issues" --input - --jq ".number"
    Write-Host "  #$num - $Title"
    Start-Sleep -Milliseconds 500
}

# === M23: Durable Persistence Layer (milestone #68) ===
Write-Host "`n=== M23: Durable Persistence Layer (milestone #68) ==="

New-Issue -Title "M23-001: Define persistence interface (StorageProvider)" `
  -Labels @("impact:high","architecture","persistence") -Milestone 68 `
  -Body @"
## Description
Create ``platform/engine/persistence/storage-provider.ts`` with the core StorageProvider interface.

### Interface Contract
- Document operations: read, write, delete, list (with filter)
- Atomic operations: transaction(ops[])
- Query: query(collection, query)
- Lifecycle: initialize(), close(), health()

Collections map to current file-backed concepts: sessions, decisions, questionnaires, commands, artifacts, audit-events, metrics.

## Acceptance Criteria
- [ ] Interface covers all current FileStore operations
- [ ] Interface supports transactions for multi-file updates
- [ ] Interface is async-first (for database compatibility)
- [ ] Types exported from persistence barrel

**Milestone:** M23 | **Impact:** HIGH | **Audit ref:** Weakness #1 — file-based persistence limits scalability
"@

New-Issue -Title "M23-002: Implement FileStorageProvider (wrap existing FileStore)" `
  -Labels @("impact:high","persistence","refactor") -Milestone 68 `
  -Body @"
## Description
Create ``platform/engine/persistence/file-provider.ts`` that wraps the existing FileStore behind the StorageProvider interface.

### Implementation Details
- Map collection to directory paths
- Map read/write/delete to file operations
- list scans directory; query filters in-memory after list
- transaction uses sequential file-lock writes
- Preserve atomic write semantics (temp-then-rename)
- Preserve backup-on-write behavior

## Acceptance Criteria
- [ ] FileStorageProvider passes StorageProvider contract tests
- [ ] Behavior is identical to current FileStore
- [ ] Existing tests still pass
- [ ] No data format changes
"@

New-Issue -Title "M23-003: Implement SQLiteStorageProvider" `
  -Labels @("impact:high","persistence","feature") -Milestone 68 `
  -Body @"
## Description
Create ``platform/engine/persistence/sqlite-provider.ts`` using better-sqlite3.

### Implementation Details
- Auto-create tables per collection on first write
- JSON column for document storage (flexible schema)
- Indexed columns for common queries (id, status, date, type)
- WAL mode for concurrent read performance
- Transaction support using native SQLite transactions

## Acceptance Criteria
- [ ] SQLiteStorageProvider passes StorageProvider contract tests
- [ ] Creates database file automatically on first use
- [ ] Supports all CRUD operations with proper indexing
- [ ] Transaction support works correctly
- [ ] Database file is in a configurable location (default: .agentic/data.db)
"@

New-Issue -Title "M23-004: Create storage provider contract test suite" `
  -Labels @("impact:high","testing","persistence") -Milestone 68 `
  -Body @"
## Description
Create ``tests/unit/persistence/storage-contract.test.ts`` — a data-driven test suite that runs against any StorageProvider implementation.

### Test Coverage
- CRUD operations, list with filters, query
- Transactions, concurrent writes
- Error handling, health check
- Both FileStorageProvider and SQLiteStorageProvider must pass

## Acceptance Criteria
- [ ] Contract test suite with 20+ test cases
- [ ] Both providers pass all contract tests
- [ ] Test suite is parameterized (add new providers and they auto-test)
"@

New-Issue -Title "M23-005: Migrate server to use StorageProvider" `
  -Labels @("impact:high","refactor","persistence") -Milestone 68 `
  -Body @"
## Description
Update ``src/webapp/server.ts`` and all service/route modules to use StorageProvider instead of direct FileStore.

### Implementation Details
- Inject StorageProvider via dependency injection at server startup
- Provider selection via configuration (STORAGE_PROVIDER=file|sqlite)
- Default: file (preserves current behavior, zero breaking change)
- All 16 route modules use provider, not FileStore directly

## Acceptance Criteria
- [ ] Server starts with STORAGE_PROVIDER=file (default) — identical behavior
- [ ] Server starts with STORAGE_PROVIDER=sqlite — uses SQLite
- [ ] All integration tests pass with both providers
- [ ] MCP server also uses StorageProvider
"@

New-Issue -Title "M23-006: Implement data migration utility" `
  -Labels @("impact:high","persistence","tooling") -Milestone 68 `
  -Body @"
## Description
Create ``scripts/migrate-storage.ts`` for migrating data between storage providers.

### Features
- Reads all data from source provider (e.g., file)
- Writes all data to target provider (e.g., sqlite)
- Validates migration completeness (document count, content hash)
- Supports dry-run mode
- Idempotent (safe to run multiple times)

## Acceptance Criteria
- [ ] Migration from file to sqlite works correctly
- [ ] Migration from sqlite to file works correctly (reversible)
- [ ] Dry-run mode shows what would be migrated without writing
- [ ] Validation confirms zero data loss
"@

New-Issue -Title "M23-007: Add persistence health to observability" `
  -Labels @("impact:high","observability","persistence") -Milestone 68 `
  -Body @"
## Description
Wire StorageProvider.health() into the server health endpoint and metrics.

### Implementation Details
- /api/health includes storage health status
- Metrics include: read latency (p50/p95), write latency, error count
- Dashboard page shows storage provider type and health

## Acceptance Criteria
- [ ] Health endpoint reports storage status
- [ ] Metrics include storage operation latency
- [ ] Observability page shows storage provider info
"@

# === M24: Background Job Execution (milestone #69) ===
Write-Host "`n=== M24: Background Job Execution (milestone #69) ==="

New-Issue -Title "M24-001: Define job execution interface" `
  -Labels @("impact:high","architecture","engine") -Milestone 69 `
  -Body @"
## Description
Create ``platform/engine/jobs/job-types.ts`` with Job and JobQueue interfaces.

### Job Interface
- Job types: agent-invocation, gate-validation, artifact-registration, sprint-gate, policy-evaluation
- Status: queued, running, completed, failed, cancelled
- Priority, retry count, max retries, error severity (transient/recoverable/fatal)

### JobQueue Interface
- enqueue, dequeue, complete, fail, cancel, status, list operations

## Acceptance Criteria
- [ ] Job type definitions cover all current engine operations
- [ ] Interface supports priority, retry, and cancellation
- [ ] Types exported from jobs barrel
"@

New-Issue -Title "M24-002: Implement in-process job queue" `
  -Labels @("impact:high","engine","feature") -Milestone 69 `
  -Body @"
## Description
Create ``platform/engine/jobs/memory-queue.ts`` — the default local-first job queue.

### Implementation Details
- Priority queue (higher priority jobs dequeue first)
- FIFO within same priority
- Configurable concurrency limit (default: 3 concurrent jobs)
- Job timeout enforcement
- Retry with exponential backoff (using dispatcher's existing severity classification)

## Acceptance Criteria
- [ ] Memory queue passes JobQueue contract tests
- [ ] Concurrency limit is enforced
- [ ] Priority ordering works correctly
- [ ] Retry with backoff works for transient failures
- [ ] Jobs time out after configured duration
"@

New-Issue -Title "M24-003: Implement persistent job queue (StorageProvider-backed)" `
  -Labels @("impact:high","engine","feature") -Milestone 69 `
  -Body @"
## Description
Create ``platform/engine/jobs/persistent-queue.ts`` backed by StorageProvider.

### Implementation Details
- Uses StorageProvider (M23) to persist job state
- Survives server restart — queued and running jobs are recoverable
- Running jobs on restart are re-queued (idempotent re-execution)
- Polling-based dequeue with configurable interval
- Dead letter queue for jobs that exhaust retries

## Acceptance Criteria
- [ ] Persistent queue passes JobQueue contract tests
- [ ] Jobs survive server restart
- [ ] Previously-running jobs are re-queued on restart
- [ ] Dead letter queue captures exhausted jobs
- [ ] Works with both file and SQLite storage providers
"@

New-Issue -Title "M24-004: Create job worker loop" `
  -Labels @("impact:high","engine","feature") -Milestone 69 `
  -Body @"
## Description
Create ``platform/engine/jobs/worker.ts`` — continuous job processing loop.

### Implementation Details
- Continuous loop: dequeue, execute, complete/fail
- Configurable worker count (default: 1)
- Graceful shutdown: finish current job, don't dequeue new ones
- Health reporting: active job count, queue depth, processing rate

## Acceptance Criteria
- [ ] Worker loop processes jobs continuously
- [ ] Graceful shutdown completes in-flight jobs
- [ ] Health metrics are exposed
- [ ] Worker count is configurable
"@

New-Issue -Title "M24-005: Migrate dispatcher to use job queue" `
  -Labels @("impact:high","refactor","engine") -Milestone 69 `
  -Body @"
## Description
Update ``dispatcher.ts`` to enqueue agent invocations as jobs instead of executing them inline.

### Implementation Details
- dispatch(agent, context) enqueues as { type: 'agent-invocation', ... }
- Worker loop picks up the job and invokes the agent
- Dispatcher returns a job ID; callers can poll for result
- SSE notifications fire on job state changes (queued, running, completed, failed)

## Acceptance Criteria
- [ ] Agent invocations go through the job queue
- [ ] Existing engine flow works identically (synchronous appearance, async execution)
- [ ] SSE notifications fire for job lifecycle events
- [ ] Existing tests pass (dispatcher behavior unchanged from caller's perspective)
"@

New-Issue -Title "M24-006: Add job management to MCP and UI" `
  -Labels @("impact:high","mcp","frontend") -Milestone 69 `
  -Body @"
## Description
MCP tools and UI for job queue management.

### MCP Tools
- list_jobs — list all jobs with status filter
- get_job — get job details + result
- cancel_job — cancel a queued or running job

### UI (Pipeline page)
- Job queue visualization (queued, running, completed, failed)
- Job detail panel with logs and result
- Cancel button for queued/running jobs

## Acceptance Criteria
- [ ] 3 new MCP tools for job management
- [ ] Pipeline page shows job queue state
- [ ] Job cancellation works from both MCP and UI
- [ ] Real-time updates via SSE
"@

New-Issue -Title "M24-007: Add job observability metrics" `
  -Labels @("impact:high","observability","engine") -Milestone 69 `
  -Body @"
## Description
Track and expose job execution metrics.

### Metrics
- Queue depth over time
- Job processing duration (p50, p95, p99)
- Jobs per type (agent-invocation, gate-validation, etc.)
- Failure rate by type and severity
- Retry count distribution
- Dead letter queue size

## Acceptance Criteria
- [ ] All listed metrics are tracked and exposed
- [ ] Metrics available via /api/metrics and observability page
- [ ] Metrics include histograms for duration distributions
"@

# === M25: Multi-Repo Workspace Awareness (milestone #70) ===
Write-Host "`n=== M25: Multi-Repo Workspace Awareness (milestone #70) ==="

New-Issue -Title "M25-001: Define workspace and project data model" `
  -Labels @("impact:high","architecture","data-model") -Milestone 70 `
  -Body @"
## Description
Create ``platform/schema/workspace.schema.json`` with Workspace, Repository, and Project schemas.

### Data Model
- Workspace: id, name, repositories[], teams[], policies[], created, owner
- Repository: id, name, provider (github|azure-devops|gitlab|local), url, defaultBranch, services[], tags[]
- Project: id, workspaceId, name, repositories[], sessions[], status

## Acceptance Criteria
- [ ] Schema validates workspace, repository, and project definitions
- [ ] Schema supports multi-provider repositories
- [ ] Service-within-repo abstraction exists
- [ ] Schema is added to platform schema barrel
"@

New-Issue -Title "M25-002: Implement workspace manager" `
  -Labels @("impact:high","engine","feature") -Milestone 70 `
  -Body @"
## Description
Create ``platform/engine/workspace/workspace-manager.ts`` for workspace CRUD.

### Operations
- CRUD for workspaces, projects, and repositories
- Repository registration with provider validation
- Project-to-repository mapping
- Uses StorageProvider for persistence

## Acceptance Criteria
- [ ] Create/read/update/delete workspace operations
- [ ] Add/remove repositories from workspace
- [ ] Create/list projects within workspace
- [ ] Manager uses StorageProvider interface (not direct file access)
- [ ] Unit tests for all operations
"@

New-Issue -Title "M25-003: Add repository context to engine" `
  -Labels @("impact:high","engine","refactor") -Milestone 70 `
  -Body @"
## Description
Extend ``engine.ts`` to accept a project context that includes repository information.

### Implementation Details
- Engine receives projectId on initialization
- Workspace manager resolves project to repositories
- Repository context is available to dispatched agents
- Agent invocations include target repository information

## Acceptance Criteria
- [ ] Engine accepts project context
- [ ] Agent invocations include repository context
- [ ] Single-repo mode (current) still works (default project with local repo)
- [ ] No breaking changes to existing engine API
"@

New-Issue -Title "M25-004: Implement cross-repo artifact lineage" `
  -Labels @("impact:high","feature","traceability") -Milestone 70 `
  -Body @"
## Description
Extend ``platform/sdlc/traceability.ts`` to support cross-repo lineage.

### Implementation Details
- Artifacts can reference their source repository
- Lineage graph spans multiple repositories
- artifact.origin = { repoId, branch, commitSha, path }
- Query: all artifacts from repo X or all repos that contributed to artifact Y

## Acceptance Criteria
- [ ] Artifacts have repository origin metadata
- [ ] Lineage queries work across repositories
- [ ] Existing single-repo artifacts get default origin
- [ ] Unit tests for cross-repo lineage queries
"@

New-Issue -Title "M25-005: Add workspace management to MCP" `
  -Labels @("impact:high","mcp","workspace") -Milestone 70 `
  -Body @"
## Description
Add MCP tools for workspace management.

### MCP Tools
- list_workspaces — list all workspaces
- get_workspace — workspace details with repositories and projects
- create_project — create a new project in a workspace
- add_repository — register a repository in a workspace

## Acceptance Criteria
- [ ] 4 new MCP tools for workspace management
- [ ] Tools use workspace manager service
- [ ] IDE can discover and switch between workspaces/projects
"@

New-Issue -Title "M25-006: Add workspace selector to UI" `
  -Labels @("impact:high","frontend","workspace") -Milestone 70 `
  -Body @"
## Description
Add workspace/project context to the UI.

### UI Elements
- Workspace selector in the top navigation
- Project selector (within workspace)
- All data views filter by current project context
- Settings page for managing workspace repositories

## Acceptance Criteria
- [ ] Workspace/project selector in navigation
- [ ] All pages filter data by current project
- [ ] Repository management UI exists
- [ ] Default workspace/project created automatically for single-repo users
"@

New-Issue -Title "M25-007: Implement repository indexing" `
  -Labels @("impact:high","feature","workspace") -Milestone 70 `
  -Body @"
## Description
Create ``platform/engine/workspace/repo-indexer.ts`` for repository scanning and indexing.

### Features
- Scan registered repositories for key files (package.json, Dockerfile, tsconfig.json, etc.)
- Build a service inventory per repository
- Detect technology stack per service
- Index is refreshable (manual or on-push webhook)

## Acceptance Criteria
- [ ] Indexer scans repository file structure
- [ ] Technology stack detection works for common stacks (Node, .NET, Python, Go)
- [ ] Service boundaries are detected (monorepo support)
- [ ] Index is stored via StorageProvider
"@

# === M26: Identity, RBAC & Multi-Tenancy (milestone #71) ===
Write-Host "`n=== M26: Identity, RBAC & Multi-Tenancy (milestone #71) ==="

New-Issue -Title "M26-001: Define identity and role model" `
  -Labels @("impact:high","architecture","security") -Milestone 71 `
  -Body @"
## Description
Create ``platform/schema/identity.schema.json`` with User, Role, Permission, and WorkspaceMembership schemas.

### Data Model
- User: id, name, email, provider (local|entra-id|github|oidc), roles[], workspaces[]
- Role: admin, lead, developer, viewer — each with granular permissions
- Permission: resource + actions (read, create, update, delete, approve)
- WorkspaceMembership: workspace-scoped role assignment

## Acceptance Criteria
- [ ] Identity schema supports multiple auth providers
- [ ] Role model has sensible defaults (admin, lead, developer, viewer)
- [ ] Permissions are granular per resource and action
- [ ] Workspace-scoped roles supported
"@

New-Issue -Title "M26-002: Implement authentication middleware" `
  -Labels @("impact:high","backend","security") -Milestone 71 `
  -Body @"
## Description
Create ``src/webapp/auth/auth-middleware.ts`` with pluggable authentication strategies.

### Strategies
- local: no auth required (current behavior preserved)
- api-key: current API-key behavior
- jwt: validates JWT bearer tokens
- oidc: OpenID Connect flow
- Strategy selection via AUTH_STRATEGY environment variable (default: local)

## Acceptance Criteria
- [ ] AUTH_STRATEGY=local — no auth required (current behavior preserved)
- [ ] AUTH_STRATEGY=api-key — current API-key behavior
- [ ] AUTH_STRATEGY=jwt — validates JWT tokens
- [ ] Middleware attaches user context to request
- [ ] All existing tests pass with local strategy
"@

New-Issue -Title "M26-003: Implement authorization middleware" `
  -Labels @("impact:high","backend","security") -Milestone 71 `
  -Body @"
## Description
Create ``src/webapp/auth/authz-middleware.ts`` for role-based access control.

### Implementation Details
- Check req.user.roles against required permissions for the endpoint
- Route-level permission annotation: requirePermission('decision', 'approve')
- Return 403 Forbidden with clear error message on unauthorized access
- Admin role bypasses all permission checks
- Log authorization decisions to audit trail

## Acceptance Criteria
- [ ] Authorization middleware checks permissions before route handler
- [ ] 403 returned for unauthorized access attempts
- [ ] Admin bypass works
- [ ] Audit trail includes user identity on all operations
- [ ] All routes annotated with required permissions
"@

New-Issue -Title "M26-004: Implement local user management" `
  -Labels @("impact:high","backend","feature") -Milestone 71 `
  -Body @"
## Description
Create ``src/webapp/auth/user-service.ts`` for local user CRUD.

### Implementation Details
- CRUD operations for local users
- Password hashing with scrypt (Node.js built-in)
- API key generation per user
- User invitation (create account with temporary password)
- Uses StorageProvider for user data

## Acceptance Criteria
- [ ] User CRUD operations work
- [ ] Passwords are hashed with scrypt (never stored in plaintext)
- [ ] Per-user API keys can be generated and rotated
- [ ] User data is stored via StorageProvider
"@

New-Issue -Title "M26-005: Add OIDC/Entra ID provider" `
  -Labels @("impact:high","security","integration") -Milestone 71 `
  -Body @"
## Description
Create ``src/webapp/auth/providers/oidc-provider.ts`` for OpenID Connect auth.

### Implementation Details
- OpenID Connect authorization code flow
- Configuration: issuer URL, client ID, client secret, redirect URI
- Token validation: signature, expiry, audience, issuer
- Auto-create user on first login (JIT provisioning)
- Map OIDC claims to internal roles (configurable claim mapping)

## Acceptance Criteria
- [ ] OIDC login flow works end-to-end
- [ ] Token validation is secure (all required checks)
- [ ] JIT user provisioning creates users with default role
- [ ] Claim-to-role mapping is configurable
- [ ] Works with Microsoft Entra ID (Azure AD)
"@

New-Issue -Title "M26-006: Add identity context to audit trail" `
  -Labels @("impact:high","security","observability") -Milestone 71 `
  -Body @"
## Description
Update ``audit.ts`` to include user identity in every audit event.

### Implementation Details
- userId, userName, userRole fields added to audit entries
- MCP tool invocations include the connected IDE user context
- Audit queries can filter by user
- Dashboard shows who did what view

## Acceptance Criteria
- [ ] All audit events include user identity (or anonymous for local mode)
- [ ] MCP invocations are attributed to the connected user
- [ ] Audit query supports user filter
- [ ] No PII beyond user ID and name in audit (no email, no IP in user context)
"@

New-Issue -Title "M26-007: Add user management to UI" `
  -Labels @("impact:high","frontend","security") -Milestone 71 `
  -Body @"
## Description
Add admin pages for user management.

### UI Pages
- User list with roles and last-activity
- Create/edit user (admin only)
- Role assignment per workspace
- Login page (when auth is not local)

## Acceptance Criteria
- [ ] Admin-only user management pages
- [ ] Login page shows when AUTH_STRATEGY is not local
- [ ] Role assignment UI per workspace
- [ ] Current user profile page with API key management
"@

# === M27: Operational Cockpit UI (milestone #72) ===
Write-Host "`n=== M27: Operational Cockpit UI (milestone #72) ==="

New-Issue -Title "M27-001: Implement artifact lineage graph visualization" `
  -Labels @("impact:high","frontend","feature","traceability") -Milestone 72 `
  -Body @"
## Description
Create a visual lineage graph on the Artifacts page.

### Implementation Details
- Nodes = artifacts (documents, code, decisions, approvals)
- Edges = derivation relationships (artifact A produced from artifact B)
- Interactive: click node for details, hover for summary
- Layout: left-to-right flow (input to processing to output)
- Filter by phase, type, or time range
- Use lightweight graph library (e.g., dagre for layout, SVG rendering)
- Data source: platform/sdlc/traceability.ts lineage graph

## Acceptance Criteria
- [ ] Lineage graph renders on the Artifacts page
- [ ] Nodes and edges reflect actual artifact relationships
- [ ] Interactive: click, hover, zoom, pan
- [ ] Filters work (phase, type, time)
- [ ] Empty state shows No artifacts yet with guidance
"@

New-Issue -Title "M27-002: Implement execution timeline / replay view" `
  -Labels @("impact:high","frontend","feature","observability") -Milestone 72 `
  -Body @"
## Description
Create an execution timeline on the Sessions page.

### Implementation Details
- Horizontal timeline of all state transitions in a session
- Each node: engine state, duration, agent invoked, outcome
- Color-coded: green (success), yellow (warning), red (failure), gray (skipped)
- Click a node: agent output path, gate validation result, errors
- Replay mode: step through timeline sequentially with context at each point
- Data source: session-state.json run history + audit trail events

## Acceptance Criteria
- [ ] Timeline renders all session state transitions
- [ ] States are color-coded by outcome
- [ ] Click reveals details (agent, output, errors)
- [ ] Timeline is scrollable for long sessions
- [ ] Works for both active and completed sessions
"@

New-Issue -Title "M27-003: Implement dependency graph for decisions and gates" `
  -Labels @("impact:high","frontend","feature","governance") -Milestone 72 `
  -Body @"
## Description
Create a dependency visualization on the Governance page.

### Implementation Details
- Show which decisions block which gates
- Show which gates block which sprints
- Show which questionnaires feed which decisions
- Interactive: click to navigate to the blocking item
- Highlight the critical path (blocking chain to next sprint)

## Acceptance Criteria
- [ ] Dependency graph renders decision to gate to sprint relationships
- [ ] Blocking items are visually highlighted
- [ ] Critical path is identifiable
- [ ] Click navigates to the relevant decision/gate/sprint
- [ ] Updates in real-time as decisions are answered
"@

New-Issue -Title "M27-004: Implement operator confidence indicators" `
  -Labels @("impact:high","frontend","feature","ux") -Milestone 72 `
  -Body @"
## Description
Add contextual confidence signals throughout the UI.

### Confidence Signals
- Session health score: composite of % gates passed, % decisions resolved, % questionnaires complete, error count, time on track
- Sprint readiness score: % stories ready, blocking items count, dependency resolution
- Agent confidence: based on UNCERTAIN: and INSUFFICIENT_DATA: markers in agent output
- Display as color-coded badges on dashboard, session list, and pipeline

## Acceptance Criteria
- [ ] Health scores visible on dashboard
- [ ] Scores computed from actual data (not hardcoded)
- [ ] Color coding: green (> 80%), yellow (50-80%), red (< 50%)
- [ ] Tooltip explains contributing factors
- [ ] Scores update in real-time
"@

New-Issue -Title "M27-005: Implement human-approval workflow UI" `
  -Labels @("impact:high","frontend","feature","governance") -Milestone 72 `
  -Body @"
## Description
Redesign the approval flow for clarity.

### Implementation Details
- Dedicated Needs Your Attention section on dashboard
- Approval detail page: what needs approval, context, risk assessment, recommended action
- Side-by-side comparison for reevaluation approvals
- Approve/reject with required comment
- Approval history with rationale

## Acceptance Criteria
- [ ] Approval items are prominently surfaced
- [ ] Detail page provides full context for informed decision
- [ ] Approve/reject requires a comment
- [ ] Approval history shows who approved what and why
- [ ] Notifications via SSE when new approval is needed
"@

New-Issue -Title "M27-006: Implement root-cause analysis view" `
  -Labels @("impact:high","frontend","feature","observability") -Milestone 72 `
  -Body @"
## Description
When a gate fails or agent reports errors, provide a root-cause drill-down.

### Drill-Down Paths
- Failed gate: show which specific checks failed, link to source
- UNCERTAIN items: show what data was missing, link to questionnaire
- INSUFFICIENT_DATA items: show which agent flagged it, link to source document
- Sprint blocked: show the blocking chain, highlight the unresolved item

## Acceptance Criteria
- [ ] Root-cause view accessible from any failed gate or error
- [ ] Drill-down shows cause chain (not just the symptom)
- [ ] Links to actionable items (questionnaire, decision, document)
- [ ] Works for both current and historical sessions
"@

New-Issue -Title "M27-007: Add Storybook documentation for cockpit components" `
  -Labels @("impact:high","storybook","docs","frontend") -Milestone 72 `
  -Body @"
## Description
Create comprehensive Storybook stories for all new cockpit components.

### Stories Required
- Lineage graph: empty, simple (3 nodes), complex (20+ nodes)
- Timeline: single state, full session, failed session
- Dependency graph: no blockers, with blockers, critical path
- Confidence indicators: all green, mixed, all red
- Approval workflow: pending, approved, rejected

## Acceptance Criteria
- [ ] All cockpit components have Storybook stories
- [ ] Stories cover key states (empty, typical, edge case)
- [ ] Storybook builds successfully
- [ ] Stories use realistic mock data
"@

Write-Host "`n=== HIGH IMPACT MILESTONES COMPLETE ==="
