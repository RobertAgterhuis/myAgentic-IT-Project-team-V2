#!/usr/bin/env pwsh
# Creates all SDLC4 milestone issues on GitHub
# Milestones: M15-M27 (numbers 60-72)

$repo = "RobertAgterhuis/myAgentic-IT-Project-team-V2"
$owner = "RobertAgterhuis"
$repoName = "myAgentic-IT-Project-team-V2"

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
# M15: Test Runner Unification (milestone #60)
# ============================================================
Write-Host "`n=== M15: Test Runner Unification (milestone #60) ===" -ForegroundColor Cyan

New-Issue -Title "M15-001: Audit Jest test files for Vitest compatibility" -Milestone 60 -Labels @("testing","cleanup","impact:low") -Body @"
## Epic: Test Runner Unification

Inventory all 14 Jest-specific test files. For each file, document:
- Which Jest-specific APIs are used (jest.fn(), jest.mock(), jest.spyOn(), jest.useFakeTimers(), describe.each, etc.)
- Whether the file uses ts-jest transforms
- Any Jest-specific config (moduleNameMapper, testEnvironment)
- Migration effort estimate (trivial / minor / significant)

### Acceptance Criteria
- [ ] Spreadsheet/table of all 14 files with API usage and effort estimate
- [ ] No file is missed

**Milestone:** SDLC4 M15 | **Impact:** LOW | **Audit ref:** Weakness #2
"@

New-Issue -Title "M15-002: Migrate Jest test files to Vitest" -Milestone 60 -Labels @("testing","refactor","impact:low") -Body @"
## Epic: Test Runner Unification

For each file identified in M15-001:
- Replace jest.fn() -> vi.fn(), jest.mock() -> vi.mock(), jest.spyOn() -> vi.spyOn(), etc.
- Replace jest.useFakeTimers() -> vi.useFakeTimers()
- Update imports: add import { describe, it, expect, vi } from 'vitest' if not using globals
- Verify each file passes with vitest run

### Acceptance Criteria
- [ ] All 14 former Jest files pass under Vitest
- [ ] No Jest-specific APIs remain in any test file
- [ ] vitest run executes all tests (root + UI) in a single run

**Milestone:** SDLC4 M15 | **Impact:** LOW | **Audit ref:** Weakness #2
"@

New-Issue -Title "M15-003: Remove Jest dependencies and configuration" -Milestone 60 -Labels @("testing","cleanup","impact:low") -Body @"
## Epic: Test Runner Unification

- Remove from package.json: jest, ts-jest, @types/jest
- Remove jest.config.* or Jest config section from package.json
- Remove setup-require-hook.js if Jest-specific
- Update .eslintrc / eslint.config.mjs if it references Jest globals

### Acceptance Criteria
- [ ] jest not in package.json (dependencies or devDependencies)
- [ ] No Jest config files remain
- [ ] npm ls jest returns empty

**Milestone:** SDLC4 M15 | **Impact:** LOW | **Audit ref:** Weakness #2
"@

New-Issue -Title "M15-004: Unify test scripts in package.json" -Milestone 60 -Labels @("testing","dx","impact:low") -Body @"
## Epic: Test Runner Unification

Simplify the script surface:
- 'test' -> vitest run
- 'test:watch' -> vitest
- 'test:coverage' -> vitest run --coverage
- Remove 'test:all' (no longer needed - single runner)
- Keep specialized scripts: test:integration, test:smoke, test:e2e, test:translations, test:a11y

### Acceptance Criteria
- [ ] npm test runs all unit tests via Vitest
- [ ] npm run test:coverage produces a combined coverage report
- [ ] No dual-runner scripts remain
- [ ] README/CONTRIBUTING updated to reflect single runner

**Milestone:** SDLC4 M15 | **Impact:** LOW | **Audit ref:** Weakness #2
"@

New-Issue -Title "M15-005: Verify CI pipeline uses unified test runner" -Milestone 60 -Labels @("testing","ci","impact:low") -Body @"
## Epic: Test Runner Unification

Update .github/workflows/ci.yml and ci-pipeline.yml:
- Replace any jest invocations with vitest run
- Ensure coverage upload uses Vitest's coverage-final.json
- Verify Codecov or coverage tool compatibility

### Acceptance Criteria
- [ ] CI passes with Vitest-only test execution
- [ ] Coverage artifact is produced from Vitest
- [ ] No Jest references remain in workflow files

**Milestone:** SDLC4 M15 | **Impact:** LOW | **Audit ref:** Weakness #2
"@

# ============================================================
# M16: CI Gate Enforcement (milestone #61)
# ============================================================
Write-Host "`n=== M16: CI Gate Enforcement (milestone #61) ===" -ForegroundColor Cyan

New-Issue -Title "M16-001: Enable integration tests in CI" -Milestone 61 -Labels @("ci","testing","quality","impact:low") -Body @"
## Epic: CI Gate Enforcement

Add npm run test:integration as a required job in ci-pipeline.yml. The 15 integration test files in tests/integration/ must execute on every PR.

- Ensure the job has appropriate timeouts (integration tests may be slower)
- If tests require a running server, add a services or setup step
- If any integration tests are flaky, quarantine them (it.skip with // TODO: flaky) rather than disabling the entire job

### Acceptance Criteria
- [ ] test:integration runs as a required CI job on every PR
- [ ] All non-quarantined integration tests pass in CI
- [ ] Job timeout is set (suggested: 5 minutes)

**Milestone:** SDLC4 M16 | **Impact:** LOW | **Audit ref:** Weakness #3
"@

New-Issue -Title "M16-002: Enable smoke tests in CI" -Milestone 61 -Labels @("ci","testing","quality","impact:low") -Body @"
## Epic: CI Gate Enforcement

Add npm run test:smoke as a required job. The 2 smoke test files in tests/smoke/ should run after unit tests pass.

- Smoke tests validate that the server starts and responds to health checks
- If they require npm start, add a background server step with health-check wait

### Acceptance Criteria
- [ ] test:smoke runs as a required CI job on every PR
- [ ] Both smoke test files pass
- [ ] Smoke job depends on unit test job (fail-fast)

**Milestone:** SDLC4 M16 | **Impact:** LOW | **Audit ref:** Weakness #3
"@

New-Issue -Title "M16-003: Enable accessibility gate in CI" -Milestone 61 -Labels @("ci","a11y","quality","impact:low") -Body @"
## Epic: CI Gate Enforcement

Re-enable test:a11y in CI. If it requires a running Storybook or browser:

- Add a Storybook build step (or use the existing storybook.yml artifact)
- Use axe-core or pa11y against rendered components
- If full a11y testing is too heavy for every PR, run on main branch merges and weekly schedule

### Acceptance Criteria
- [ ] Accessibility tests execute in CI (PR or main-branch trigger)
- [ ] A11y violations are reported in CI output (not silently ignored)
- [ ] Blocking severity (critical/serious) fails the build; moderate/minor are warnings

**Milestone:** SDLC4 M16 | **Impact:** LOW | **Audit ref:** Weakness #3
"@

New-Issue -Title "M16-004: Re-enable coverage enforcement" -Milestone 61 -Labels @("ci","testing","quality","impact:low") -Body @"
## Epic: CI Gate Enforcement

Uncomment or re-add the Codecov patch-coverage check in ci-pipeline.yml:

- Set a realistic patch-coverage threshold (suggested: 60% for patches, no regression on overall)
- If Codecov is not desired, use Vitest's built-in coverage thresholds in vitest.config.mjs
- Ensure coverage-final.json is uploaded as a CI artifact

### Acceptance Criteria
- [ ] Coverage is measured and reported on every PR
- [ ] PRs that drop coverage below threshold are flagged (warning or fail)
- [ ] Coverage report artifact is downloadable from CI

**Milestone:** SDLC4 M16 | **Impact:** LOW | **Audit ref:** Weakness #3
"@

New-Issue -Title "M16-005: Add CI status badges to README" -Milestone 61 -Labels @("ci","docs","impact:low") -Body @"
## Epic: CI Gate Enforcement

Add workflow status badges to the top of README.md for:
- ci.yml (build + test)
- ci-pipeline.yml (extended pipeline)
- Coverage percentage
- storybook.yml (Storybook build)

### Acceptance Criteria
- [ ] README shows live CI status badges
- [ ] Badges link to the respective workflow runs

**Milestone:** SDLC4 M16 | **Impact:** LOW | **Audit ref:** Weakness #3
"@

New-Issue -Title "M16-006: Create CI health dashboard review process" -Milestone 61 -Labels @("ci","process","impact:low") -Body @"
## Epic: CI Gate Enforcement

Create a recurring process to review CI health monthly:
- Pipeline success rate
- Average pipeline duration
- Flaky test inventory
- Disabled gates inventory

### Acceptance Criteria
- [ ] Monthly CI health review checklist documented in docs/ or CONTRIBUTING.md
- [ ] Initial baseline captured (current success rate, duration, disabled gates)

**Milestone:** SDLC4 M16 | **Impact:** LOW | **Audit ref:** Weakness #3
"@

# ============================================================
# M17: Server Decomposition (milestone #62)
# ============================================================
Write-Host "`n=== M17: Server Decomposition (milestone #62) ===" -ForegroundColor Cyan

New-Issue -Title "M17-001: Extract rate limiter into standalone module" -Milestone 62 -Labels @("refactor","backend","impact:low") -Body @"
## Epic: Server Decomposition

Move the in-memory rate limiter (currently inline in server.ts ~L63-80) to src/webapp/rate-limiter.ts:

- Export a createRateLimiter(options) factory function
- Options: windowMs, maxRequests, pruneIntervalMs
- Return: { check(ip): { allowed: boolean, retryAfter?: number }, destroy() }
- Add unit tests for rate limiter logic independently

### Acceptance Criteria
- [ ] Rate limiter is a self-contained module with its own tests
- [ ] server.ts imports and uses the extracted module
- [ ] Behavior is identical (30 req/60s, periodic pruning)
- [ ] No breaking changes to API responses

**Milestone:** SDLC4 M17 | **Impact:** LOW | **Audit ref:** Weakness #4
"@

New-Issue -Title "M17-002: Extract SSE manager into standalone module" -Milestone 62 -Labels @("refactor","backend","impact:low") -Body @"
## Epic: Server Decomposition

Move SSE connection management to src/webapp/sse-manager.ts:

- Export: createSSEManager() with methods addClient(res), broadcast(event, data), destroy()
- Handle heartbeat (30s), client disconnect cleanup, connection limits
- Add unit tests

### Acceptance Criteria
- [ ] SSE logic is a self-contained module with tests
- [ ] server.ts uses the extracted SSE manager
- [ ] SSE endpoint (/api/events) behavior is unchanged

**Milestone:** SDLC4 M17 | **Impact:** LOW | **Audit ref:** Weakness #4
"@

New-Issue -Title "M17-003: Extract static file handler" -Milestone 62 -Labels @("refactor","backend","impact:low") -Body @"
## Epic: Server Decomposition

Move static file serving logic to src/webapp/static-handler.ts:

- Export: createStaticHandler(rootDir, options) returning a request handler
- Handle: MIME types, cache headers, index.html fallback for SPA routing, conditional Content-Security-Policy for HTML vs assets
- Add unit tests for MIME resolution, path resolution, SPA fallback

### Acceptance Criteria
- [ ] Static file serving is a self-contained module with tests
- [ ] server.ts uses the extracted handler
- [ ] SPA routing, MIME types, and CSP headers work identically

**Milestone:** SDLC4 M17 | **Impact:** LOW | **Audit ref:** Weakness #4
"@

New-Issue -Title "M17-004: Extract metrics collector into standalone module" -Milestone 62 -Labels @("refactor","backend","observability","impact:low") -Body @"
## Epic: Server Decomposition

Move per-endpoint metrics collection and flushing to src/webapp/metrics-collector.ts:

- Export: createMetricsCollector(options) with methods record(endpoint, duration, status), flush(), getSnapshot(), destroy()
- Options: flushIntervalMs, outputPath
- Add unit tests for recording, aggregation, and flushing

### Acceptance Criteria
- [ ] Metrics collector is a self-contained module with tests
- [ ] server.ts uses the extracted metrics module
- [ ] runtime-metrics.json output format is unchanged

**Milestone:** SDLC4 M17 | **Impact:** LOW | **Audit ref:** Weakness #4
"@

New-Issue -Title "M17-005: Create server composition root" -Milestone 62 -Labels @("refactor","backend","impact:low") -Body @"
## Epic: Server Decomposition

After extracting modules, refactor server.ts into a clear composition root:

- Import rate limiter, SSE manager, static handler, metrics, middleware, routes
- Wire them together in a readable createServer() function
- Target: server.ts should be < 200 lines - purely wiring, no business logic

### Acceptance Criteria
- [ ] server.ts is < 200 lines
- [ ] All extracted modules are wired via explicit composition
- [ ] Server starts and passes all existing integration/smoke tests
- [ ] No behavioral changes

**Milestone:** SDLC4 M17 | **Impact:** LOW | **Audit ref:** Weakness #4
"@

New-Issue -Title "M17-006: Document server architecture" -Milestone 62 -Labels @("docs","backend","impact:low") -Body @"
## Epic: Server Decomposition

Add src/webapp/README.md describing the server architecture:

- Module dependency diagram (text-based or Mermaid)
- Request lifecycle: incoming request -> rate limiter -> auth guard -> router -> route handler -> response
- SSE lifecycle
- Metrics collection flow

### Acceptance Criteria
- [ ] src/webapp/README.md exists with architecture overview
- [ ] Diagram matches actual module structure

**Milestone:** SDLC4 M17 | **Impact:** LOW | **Audit ref:** Weakness #4
"@

# ============================================================
# M18: Developer Onboarding & Documentation (milestone #63)
# ============================================================
Write-Host "`n=== M18: Developer Onboarding & Documentation (milestone #63) ===" -ForegroundColor Cyan

New-Issue -Title "M18-001: Fix root build script" -Milestone 63 -Labels @("dx","docs","impact:low") -Body @"
## Epic: Developer Onboarding & Documentation

Replace 'build': 'echo No build step required' with actual build command:

\`\`\`json
\"build\": \"npm run --workspace=src/webapp/ui build\"
\`\`\`

Or if the root build should also build design tokens:

\`\`\`json
\"build\": \"npm run tokens:build && npm run --workspace=src/webapp/ui build\"
\`\`\`

### Acceptance Criteria
- [ ] npm run build at root actually builds the UI
- [ ] Build output is placed where server.ts expects it
- [ ] CI uses the same build command

**Milestone:** SDLC4 M18 | **Impact:** LOW | **Audit ref:** Weakness #2
"@

New-Issue -Title "M18-002: Create architecture overview document" -Milestone 63 -Labels @("docs","architecture","impact:low") -Body @"
## Epic: Developer Onboarding & Documentation

Create docs/architecture.md with:

- Layer diagram: platform/engine -> platform/schema -> platform/sdlc -> src/webapp -> src/webapp/ui
- Data flow: user action -> UI -> HTTP API -> server -> engine -> state machine -> persistence
- MCP flow: IDE -> MCP server (stdio) -> file store
- Module inventory table (file count, purpose, test count per layer)

### Acceptance Criteria
- [ ] docs/architecture.md exists
- [ ] Diagram matches actual codebase structure (validated against file listing)
- [ ] Linked from README

**Milestone:** SDLC4 M18 | **Impact:** LOW | **Audit ref:** Weakness #2
"@

New-Issue -Title "M18-003: Create local development quickstart" -Milestone 63 -Labels @("dx","docs","impact:low") -Body @"
## Epic: Developer Onboarding & Documentation

Create or update docs/quick-start.md with exact steps:

1. Prerequisites (Node.js version, npm version)
2. npm install (root + workspaces)
3. npm run build (builds UI)
4. npm start (starts server on port 3000)
5. Open http://localhost:3000
6. npm test (runs all tests)
7. npm run storybook (if applicable)
8. Docker: docker compose -f infra/docker-compose.dev.yml up

### Acceptance Criteria
- [ ] A new developer can go from clone to running application by following the guide exactly
- [ ] Every command in the guide has been verified
- [ ] Guide covers both local and Docker workflows

**Milestone:** SDLC4 M18 | **Impact:** LOW | **Audit ref:** Weakness #2
"@

New-Issue -Title "M18-004: Align README with actual project state" -Milestone 63 -Labels @("docs","impact:low") -Body @"
## Epic: Developer Onboarding & Documentation

Review and update README.md:

- Remove or update any 'no build step' language
- Update test count (currently advertises 1,370 - verify actual count)
- Ensure feature list matches implemented features
- Add architecture-layer summary (link to docs/architecture.md)
- Verify all links work

### Acceptance Criteria
- [ ] README accurately reflects current project state
- [ ] All claims are verifiable against the codebase
- [ ] No dead links

**Milestone:** SDLC4 M18 | **Impact:** LOW | **Audit ref:** Weakness #2
"@

New-Issue -Title "M18-005: Document MCP server setup for IDE users" -Milestone 63 -Labels @("dx","docs","mcp","impact:low") -Body @"
## Epic: Developer Onboarding & Documentation

Create docs/mcp-setup.md:

- How to configure VS Code / Copilot to use the MCP server
- Available tools (17) and resources (3) with brief descriptions
- Example interactions
- Troubleshooting common issues

### Acceptance Criteria
- [ ] MCP setup guide exists and is linked from README
- [ ] A user unfamiliar with MCP can configure it by following the guide

**Milestone:** SDLC4 M18 | **Impact:** LOW | **Audit ref:** Weakness #2
"@

Write-Host "`n=== LOW IMPACT MILESTONES COMPLETE ===" -ForegroundColor Green
