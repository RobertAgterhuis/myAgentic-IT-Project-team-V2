#!/usr/bin/env pwsh
# Creates MEDIUM impact SDLC4 issues: M19-M22

$repo = "RobertAgterhuis/myAgentic-IT-Project-team-V2"

function New-Issue {
  param([string]$Title, [string]$Body, [int]$Milestone, [string[]]$Labels)
  $labelsJson = ($Labels | ForEach-Object { "`"$_`"" }) -join ","
  $bodyEscaped = $Body -replace '\\', '\\\\' -replace '"', '\"' -replace "`r`n", '\n' -replace "`n", '\n' -replace "`t", '\t'
  $json = "{`"title`":`"$Title`",`"body`":`"$bodyEscaped`",`"milestone`":$Milestone,`"labels`":[$labelsJson]}"
  $result = $json | gh api "repos/$repo/issues" --input - --jq ".number" 2>&1
  Write-Host "  #$result - $Title"
  Start-Sleep -Milliseconds 500
  return $result
}

# ============================================================
# M19: Execution Adapter Formalization (milestone #64)
# ============================================================
Write-Host "`n=== M19: Execution Adapter Formalization (milestone #64) ===" -ForegroundColor Cyan

New-Issue -Title "M19-001: Define adapter interface contracts" -Milestone 64 -Labels @("architecture","adapters","impact:medium") -Body @"
## Epic: Execution Adapter Formalization

For each of the 10 adapter types, create a formal TypeScript interface in platform/sdlc/adapters/contracts/:

- GitProvider - clone, branch, commit, push, PR, diff, blame
- CIProvider - trigger pipeline, get status, get logs, cancel
- ContainerProvider - build, push, pull, tag, scan
- CloudProvider - deploy, status, logs, rollback
- LLMProvider - complete, embed, stream, tool-use
- SecurityProvider - scan, audit, report
- TestingProvider - run, status, coverage, report
- ToolProvider - discover, invoke, validate
- ShellExecutor - exec, stream, timeout

Each interface must define: method signatures, input/output types, error types, and capability flags (e.g., supportsPR: boolean).

### Acceptance Criteria
- [ ] Contract file per adapter type in contracts/
- [ ] All methods have typed inputs and outputs
- [ ] Each contract has a capabilities type for feature detection
- [ ] Contracts are exported from the adapter barrel

**Milestone:** SDLC4 M19 | **Impact:** MEDIUM | **Audit ref:** Phase 4
"@

New-Issue -Title "M19-002: Implement GitHub adapter (GitProvider)" -Milestone 64 -Labels @("adapters","integration","impact:medium") -Body @"
## Epic: Execution Adapter Formalization

Create platform/sdlc/adapters/providers/github.ts implementing GitProvider:

- Use @octokit/rest or bare fetch against GitHub API
- Implement: list repos, create branch, get diff, create PR, list PR checks, merge PR, get file contents
- Configuration: token from environment, org/repo from context
- Error classification: rate-limited -> TRANSIENT, 404 -> NOT_FOUND, 403 -> PERMISSION_DENIED

### Acceptance Criteria
- [ ] GitHub adapter passes contract compliance test
- [ ] Works with both PAT and GitHub App token
- [ ] Rate limit handling (backoff on 429)
- [ ] Unit tests with mocked HTTP responses

**Milestone:** SDLC4 M19 | **Impact:** MEDIUM | **Audit ref:** Phase 4
"@

New-Issue -Title "M19-003: Implement Docker/container adapter" -Milestone 64 -Labels @("adapters","integration","impact:medium") -Body @"
## Epic: Execution Adapter Formalization

Create provider implementing ContainerProvider:

- Shell-based: invoke docker build, docker push, docker tag via shell executor
- Parse Docker CLI output for success/failure/image ID
- Support: build with Dockerfile path, tag, push to registry, image scan (Trivy/Grype)

### Acceptance Criteria
- [ ] Container adapter passes contract compliance test
- [ ] Build, tag, and push operations work
- [ ] Error handling for missing Docker daemon
- [ ] Unit tests with mocked shell responses

**Milestone:** SDLC4 M19 | **Impact:** MEDIUM | **Audit ref:** Phase 4
"@

New-Issue -Title "M19-004: Implement Vitest/testing adapter" -Milestone 64 -Labels @("adapters","testing","impact:medium") -Body @"
## Epic: Execution Adapter Formalization

Create provider implementing TestingProvider:

- Shell-based: invoke vitest run with JSON reporter
- Parse Vitest JSON output for: pass/fail/skip counts, file list, duration, coverage summary
- Support: run all, run file, run by name pattern, get coverage

### Acceptance Criteria
- [ ] Testing adapter passes contract compliance test
- [ ] Can run tests and parse results programmatically
- [ ] Coverage data extraction works
- [ ] Unit tests with mocked Vitest output

**Milestone:** SDLC4 M19 | **Impact:** MEDIUM | **Audit ref:** Phase 4
"@

New-Issue -Title "M19-005: Implement LLM provider adapter (multi-provider)" -Milestone 64 -Labels @("adapters","integration","impact:medium") -Body @"
## Epic: Execution Adapter Formalization

Create provider implementing LLMProvider. The dispatcher already routes to Copilot/Claude/OpenAI - formalize this into the adapter pattern:

- providers/copilot-llm.ts - GitHub Copilot integration
- providers/openai-llm.ts - OpenAI API
- providers/anthropic-llm.ts - Anthropic API
- Common: streaming support, token counting, tool-use protocol, timeout, retry

### Acceptance Criteria
- [ ] Each LLM provider passes contract compliance test
- [ ] Dispatcher uses the adapter interface (not direct implementation calls)
- [ ] Provider selection via configuration, not code changes
- [ ] Unit tests with mocked API responses

**Milestone:** SDLC4 M19 | **Impact:** MEDIUM | **Audit ref:** Phase 4
"@

New-Issue -Title "M19-006: Create adapter registry and discovery" -Milestone 64 -Labels @("adapters","architecture","impact:medium") -Body @"
## Epic: Execution Adapter Formalization

Create platform/sdlc/adapters/registry.ts:

- Registry pattern: registerProvider(type, name, factory)
- Discovery: getProvider(type, name?) - returns configured provider or default
- Configuration: read from platform.config.json or environment
- Validation: verify provider implements the contract at registration time

### Acceptance Criteria
- [ ] Registry supports dynamic provider registration
- [ ] Default providers are auto-registered
- [ ] Engine and server use the registry (not direct imports)
- [ ] Invalid providers are rejected with clear error messages

**Milestone:** SDLC4 M19 | **Impact:** MEDIUM | **Audit ref:** Phase 4
"@

New-Issue -Title "M19-007: Add adapter contract compliance test suite" -Milestone 64 -Labels @("testing","adapters","impact:medium") -Body @"
## Epic: Execution Adapter Formalization

Create tests/unit/adapters/contract-compliance.test.ts:

- For each adapter interface, define a compliance test suite
- Every concrete provider must pass the compliance suite
- Tests verify: method existence, input validation, error classification, return types

### Acceptance Criteria
- [ ] Compliance test suite exists for all adapter types
- [ ] All implemented providers pass compliance tests
- [ ] New providers automatically get tested (data-driven test)

**Milestone:** SDLC4 M19 | **Impact:** MEDIUM | **Audit ref:** Phase 4
"@

# ============================================================
# M20: MCP as Canonical Platform API (milestone #65)
# ============================================================
Write-Host "`n=== M20: MCP as Canonical Platform API (milestone #65) ===" -ForegroundColor Cyan

New-Issue -Title "M20-001: Inventory MCP vs HTTP API surface parity" -Milestone 65 -Labels @("architecture","mcp","impact:medium") -Body @"
## Epic: MCP as Canonical Platform API

Create a parity matrix: for each MCP tool (17), document whether an equivalent HTTP endpoint exists, and vice versa. Identify:

- MCP-only operations (no HTTP equivalent)
- HTTP-only operations (no MCP equivalent)
- Duplicated logic (same operation, two code paths)
- Behavioral differences (validation, error handling, audit)

### Acceptance Criteria
- [ ] Parity matrix documenting all 17 MCP tools vs HTTP endpoints
- [ ] Gaps and duplications clearly identified
- [ ] Recommendation per item: converge, keep separate, deprecate

**Milestone:** SDLC4 M20 | **Impact:** MEDIUM | **Audit ref:** Phase 3
"@

New-Issue -Title "M20-002: Extract shared service layer" -Milestone 65 -Labels @("refactor","architecture","impact:medium") -Body @"
## Epic: MCP as Canonical Platform API

Create src/webapp/services/ with service modules that contain the business logic currently duplicated between HTTP routes and MCP tools:

- decisions-service.ts - list, create, answer, decide
- questionnaire-service.ts - list, get, save answers
- commands-service.ts - queue, list, execute
- governance-service.ts - list approvals, approve, reject
- session-service.ts - status, progress, drift check

Each service takes FileStore and AuditTrail as constructor dependencies.

### Acceptance Criteria
- [ ] Service modules exist with typed interfaces
- [ ] All business logic is in services (not in route handlers or MCP tools)
- [ ] Services have independent unit tests
- [ ] Existing route handlers delegate to services
- [ ] MCP tools delegate to the same services

**Milestone:** SDLC4 M20 | **Impact:** MEDIUM | **Audit ref:** Phase 3
"@

New-Issue -Title "M20-003: Migrate HTTP routes to use service layer" -Milestone 65 -Labels @("refactor","backend","impact:medium") -Body @"
## Epic: MCP as Canonical Platform API

Refactor each of the 16 route modules in src/webapp/routes/ to:

- Import and call the corresponding service
- Handle only HTTP-specific concerns: request parsing, response formatting, status codes, headers
- Remove any business logic from route handlers

### Acceptance Criteria
- [ ] All 16 route modules are thin HTTP wrappers over services
- [ ] No business logic in route files
- [ ] All existing integration/smoke tests still pass

**Milestone:** SDLC4 M20 | **Impact:** MEDIUM | **Audit ref:** Phase 3
"@

New-Issue -Title "M20-004: Migrate MCP tools to use service layer" -Milestone 65 -Labels @("refactor","mcp","impact:medium") -Body @"
## Epic: MCP as Canonical Platform API

Refactor mcp-server.ts tool implementations to:

- Import and call the corresponding service
- Handle only MCP-specific concerns: schema validation, tool response format
- Remove duplicated business logic

### Acceptance Criteria
- [ ] All 17 MCP tools delegate to service layer
- [ ] No duplicated business logic between MCP and HTTP
- [ ] MCP-specific tests still pass

**Milestone:** SDLC4 M20 | **Impact:** MEDIUM | **Audit ref:** Phase 3
"@

New-Issue -Title "M20-005: Generate OpenAPI spec from service contracts" -Milestone 65 -Labels @("docs","api","impact:medium") -Body @"
## Epic: MCP as Canonical Platform API

Auto-generate or manually create an OpenAPI 3.1 spec (docs/api/openapi.yaml) that documents the canonical API surface derived from the service layer:

- Every service method maps to an operation
- Request/response schemas match TypeScript types
- Include error responses and authentication requirements

### Acceptance Criteria
- [ ] docs/api/openapi.yaml exists and validates against OpenAPI 3.1
- [ ] All service operations are documented
- [ ] Spec is generated from or verified against actual types

**Milestone:** SDLC4 M20 | **Impact:** MEDIUM | **Audit ref:** Phase 3
"@

New-Issue -Title "M20-006: Add MCP tool documentation to help system" -Milestone 65 -Labels @("docs","mcp","impact:medium") -Body @"
## Epic: MCP as Canonical Platform API

Ensure each MCP tool has comprehensive documentation accessible via the get_help MCP tool:

- Tool name and description
- Input schema with examples
- Output format
- Common errors
- Usage patterns

### Acceptance Criteria
- [ ] get_help returns documentation for all 17 tools
- [ ] Each tool doc includes at least one usage example
- [ ] Docs are verified against actual tool behavior

**Milestone:** SDLC4 M20 | **Impact:** MEDIUM | **Audit ref:** Phase 3
"@

# ============================================================
# M21: UI Coherence & Guided Navigation (milestone #66)
# ============================================================
Write-Host "`n=== M21: UI Coherence & Guided Navigation (milestone #66) ===" -ForegroundColor Cyan

New-Issue -Title "M21-001: Define primary user journeys" -Milestone 66 -Labels @("ux","product","impact:medium") -Body @"
## Epic: UI Coherence & Guided Navigation

Document the top 5 user journeys as step-by-step flows:

1. First-time onboarding - 'I just installed this, what do I do?'
2. Create new project - 'I want to start a CREATE cycle'
3. Monitor active sprint - 'What is happening right now?'
4. Answer questionnaire/decision - 'The system needs my input'
5. Review gate/approval - 'Something is blocked and needs me'

For each journey: entry point, steps, expected state changes, exit point.

### Acceptance Criteria
- [ ] 5 user journey documents in docs/ux/
- [ ] Each journey has a clear entry point tied to the UI
- [ ] Journeys validated against actual UI routes and components

**Milestone:** SDLC4 M21 | **Impact:** MEDIUM | **Audit ref:** Weakness #6, Phase 6
"@

New-Issue -Title "M21-002: Implement What's Next guidance on Overview page" -Milestone 66 -Labels @("ux","frontend","impact:medium") -Body @"
## Epic: UI Coherence & Guided Navigation

Add a contextual guidance section to the Overview (dashboard) page:

- If no project exists -> show 'Create your first project' CTA
- If project is in ONBOARDING -> show 'Complete onboarding' with progress
- If questionnaires are pending -> show 'X questionnaires need your input'
- If decisions are OPEN + HIGH -> show 'X critical decisions awaiting your input'
- If approvals are pending -> show 'X governance approvals needed'
- If sprint is active -> show sprint progress + any blocked stories

Use existing hooks (use-dashboard, use-governance, use-questionnaires, use-decisions).

### Acceptance Criteria
- [ ] Overview page shows contextual next-best-action guidance
- [ ] Guidance updates in real-time (via SSE/polling)
- [ ] Each guidance item links to the relevant page/action
- [ ] Empty state (no project) has a clear CTA

**Milestone:** SDLC4 M21 | **Impact:** MEDIUM | **Audit ref:** Weakness #6, Phase 6
"@

New-Issue -Title "M21-003: Add breadcrumb navigation" -Milestone 66 -Labels @("ux","frontend","impact:medium") -Body @"
## Epic: UI Coherence & Guided Navigation

Implement breadcrumb navigation across all pages:

- Dashboard -> Section -> Page (e.g., Runtime > Sessions > Session Detail)
- Use the existing navigation section grouping (Runtime, Operations, Data, Observability)
- Breadcrumbs should be clickable for navigation

### Acceptance Criteria
- [ ] Breadcrumbs visible on all non-root pages
- [ ] Breadcrumbs match the navigation hierarchy
- [ ] Clicking a breadcrumb navigates to that level

**Milestone:** SDLC4 M21 | **Impact:** MEDIUM | **Audit ref:** Weakness #6, Phase 6
"@

New-Issue -Title "M21-004: Add keyboard shortcuts for power users" -Milestone 66 -Labels @("ux","frontend","impact:medium") -Body @"
## Epic: UI Coherence & Guided Navigation

Extend the existing use-keyboard-shortcuts hook with navigation shortcuts:

- g d -> go to Dashboard
- g p -> go to Pipeline
- g c -> go to Commands
- g q -> go to Questionnaires
- g e -> go to Decisions
- ? -> show keyboard shortcut help overlay

### Acceptance Criteria
- [ ] Keyboard shortcuts work from any page
- [ ] ? opens a shortcut reference overlay
- [ ] Shortcuts are listed in the help documentation
- [ ] No conflicts with browser or IDE shortcuts

**Milestone:** SDLC4 M21 | **Impact:** MEDIUM | **Audit ref:** Weakness #6, Phase 6
"@

New-Issue -Title "M21-005: Implement page-level loading and error states" -Milestone 66 -Labels @("ux","frontend","impact:medium") -Body @"
## Epic: UI Coherence & Guided Navigation

Audit all 16 page components for consistent loading and error handling:

- Use the existing Skeleton, Spinner, and AlertBanner components
- Every page with data fetching must show skeleton on load, error banner on failure
- Retry button on error states
- Empty states with helpful guidance

### Acceptance Criteria
- [ ] All pages with data fetching have loading skeletons
- [ ] All pages have error banners with retry
- [ ] Empty states show guidance, not blank screens
- [ ] Consistent pattern across all pages

**Milestone:** SDLC4 M21 | **Impact:** MEDIUM | **Audit ref:** Weakness #6, Phase 6
"@

New-Issue -Title "M21-006: Add Storybook stories for all page states" -Milestone 66 -Labels @("testing","frontend","storybook","impact:medium") -Body @"
## Epic: UI Coherence & Guided Navigation

For each page component, create Storybook stories covering:

- Loading state
- Empty state
- Populated state (typical data)
- Error state
- Edge cases (long lists, missing data, boundary values)

### Acceptance Criteria
- [ ] Every page directory has a .stories.tsx file
- [ ] Each story covers at least: loading, empty, populated, error
- [ ] Stories use MSW for realistic data mocking
- [ ] Storybook builds successfully with all new stories

**Milestone:** SDLC4 M21 | **Impact:** MEDIUM | **Audit ref:** Weakness #6, Phase 6
"@

# ============================================================
# M22: Policy-as-Code Governance (milestone #67)
# ============================================================
Write-Host "`n=== M22: Policy-as-Code Governance (milestone #67) ===" -ForegroundColor Cyan

New-Issue -Title "M22-001: Define policy schema" -Milestone 67 -Labels @("architecture","governance","impact:medium") -Body @"
## Epic: Policy-as-Code Governance Framework

Create platform/schema/policy.schema.json defining:

- Policy: id, name, scope (global/org/team/repo/sprint), category (security/quality/compliance/process/architecture), severity (blocking/warning/advisory), condition, action, exceptions, metadata (owner, created, expires, evidence_required)

### Acceptance Criteria
- [ ] JSON Schema validates policy definitions
- [ ] Schema supports all severity levels
- [ ] Exception rules have approval requirements
- [ ] Schema is added to platform/schema/ barrel

**Milestone:** SDLC4 M22 | **Impact:** MEDIUM | **Audit ref:** Phase 5
"@

New-Issue -Title "M22-002: Create built-in policy pack (security baseline)" -Milestone 67 -Labels @("governance","security","impact:medium") -Body @"
## Epic: Policy-as-Code Governance Framework

Create platform/sdlc/policies/security-baseline.json with policies:

- POL-SEC-001: Secret scanning required before merge (blocking)
- POL-SEC-002: SAST scan required before merge (blocking)
- POL-SEC-003: Dependency vulnerability scan required (blocking for HIGH/CRITICAL)
- POL-SEC-004: Container image scan required for Docker builds (blocking)
- POL-SEC-005: API key rotation reminder every 90 days (warning)

### Acceptance Criteria
- [ ] Policy pack validates against policy schema
- [ ] All policies have clear conditions and actions
- [ ] Pack is loadable by the governance config module

**Milestone:** SDLC4 M22 | **Impact:** MEDIUM | **Audit ref:** Phase 5
"@

New-Issue -Title "M22-003: Create built-in policy pack (quality baseline)" -Milestone 67 -Labels @("governance","quality","impact:medium") -Body @"
## Epic: Policy-as-Code Governance Framework

Create platform/sdlc/policies/quality-baseline.json with policies:

- POL-QA-001: Unit test coverage > 60% on changed files (warning)
- POL-QA-002: No FIXME or TODO without linked issue (advisory)
- POL-QA-003: All public functions have JSDoc (advisory)
- POL-QA-004: E2E tests pass before production deploy (blocking)
- POL-QA-005: Accessibility audit score > 90 (warning)

### Acceptance Criteria
- [ ] Policy pack validates against policy schema
- [ ] Policies reference measurable conditions
- [ ] Pack is loadable by the governance config module

**Milestone:** SDLC4 M22 | **Impact:** MEDIUM | **Audit ref:** Phase 5
"@

New-Issue -Title "M22-004: Implement policy evaluator" -Milestone 67 -Labels @("engine","governance","impact:medium") -Body @"
## Epic: Policy-as-Code Governance Framework

Create platform/engine/policy-evaluator.ts:

- Load policy packs from configuration
- Evaluate policies against a context (sprint gate, PR, deploy, artifact)
- Return: { passed: Policy[], failed: Policy[], warnings: Policy[] }
- Support policy inheritance: global -> org -> team -> repo (most specific wins)
- Exception handling: skip policy if approved exception exists

### Acceptance Criteria
- [ ] Evaluator loads and applies policies correctly
- [ ] Inheritance chain resolves correctly
- [ ] Exceptions are honored with audit trail
- [ ] Unit tests cover: pass, fail, warning, inheritance, exception

**Milestone:** SDLC4 M22 | **Impact:** MEDIUM | **Audit ref:** Phase 5
"@

New-Issue -Title "M22-005: Integrate policy evaluator into sprint gate" -Milestone 67 -Labels @("engine","governance","impact:medium") -Body @"
## Epic: Policy-as-Code Governance Framework

Wire policy-evaluator.ts into sprint-gate.ts:

- Evaluate all applicable policies at sprint gate
- Blocking policies -> gate fails
- Warning policies -> gate passes with warnings in output
- Log all policy evaluation results to audit trail

### Acceptance Criteria
- [ ] Sprint gate evaluates policies
- [ ] Blocking policy failure prevents sprint progression
- [ ] Warnings are visible in UI (governance page) and SSE events
- [ ] Audit trail records all policy evaluations

**Milestone:** SDLC4 M22 | **Impact:** MEDIUM | **Audit ref:** Phase 5
"@

New-Issue -Title "M22-006: Add governance policy management to MCP" -Milestone 67 -Labels @("mcp","governance","impact:medium") -Body @"
## Epic: Policy-as-Code Governance Framework

Add MCP tools for policy management:

- list_policies - list all active policies with status
- get_policy_evaluation - get latest evaluation results per scope
- create_exception - request exception for a policy (requires approval)

### Acceptance Criteria
- [ ] Three new MCP tools registered
- [ ] Tools use the service layer (not direct file access)
- [ ] Policy evaluation results are queryable
- [ ] Exception creation triggers approval workflow

**Milestone:** SDLC4 M22 | **Impact:** MEDIUM | **Audit ref:** Phase 5
"@

New-Issue -Title "M22-007: Add policy compliance view to UI" -Milestone 67 -Labels @("frontend","governance","impact:medium") -Body @"
## Epic: Policy-as-Code Governance Framework

Add a 'Policy Compliance' section to the Governance page:

- Table of all active policies with status (passing/failing/warning)
- Filter by category, severity, scope
- Exception management (request, approve, reject)
- Policy evaluation history (last 10 evaluations)

### Acceptance Criteria
- [ ] Governance page shows policy compliance overview
- [ ] Filtering works for all dimensions
- [ ] Exception workflow is accessible from the UI
- [ ] Real-time updates via SSE

**Milestone:** SDLC4 M22 | **Impact:** MEDIUM | **Audit ref:** Phase 5
"@

Write-Host "`n=== MEDIUM IMPACT MILESTONES COMPLETE ===" -ForegroundColor Green
