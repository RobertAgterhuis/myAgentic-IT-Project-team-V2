#!/usr/bin/env pwsh
# SCOPE CHANGE ALL — Create issues v2 (reliable body handling)
$ErrorActionPreference = "Continue"
$repo = "RobertAgterhuis/myAgentic-IT-Project-team-V2"

$mandatoryReqs = @"

---

## Mandatory Code Requirements

All code changes for this story MUST follow:
- **DRY** — No duplicated logic; extract shared functionality
- **No GOD code** — No monolithic files/functions; keep single responsibility
- **Modular** — Separate concerns into focused, testable modules
- **Best-practice folder structure** — Follow established project conventions
"@

function New-GhIssue {
  param([string]$Title, [string]$Body, [string]$Labels, [string]$Milestone)
  $fullBody = $Body + $mandatoryReqs
  $tmpFile = Join-Path $env:TEMP "gh-issue-$(Get-Random).md"
  [System.IO.File]::WriteAllText($tmpFile, $fullBody, [System.Text.UTF8Encoding]::new($false))
  $args = @("issue", "create", "-R", $repo, "--title", $Title, "--label", $Labels, "--body-file", $tmpFile)
  if ($Milestone) { $args += @("--milestone", $Milestone) }
  $result = & gh @args 2>&1
  Remove-Item $tmpFile -ErrorAction SilentlyContinue
  $url = ($result | Where-Object { $_ -match "github.com" }) -replace '.*?(https://\S+)','$1'
  Write-Host "  $Title => $url"
  return $url
}

# ========== SPRINT 0 ==========
Write-Host "=== SPRINT 0: Repo Restructuring ===" -ForegroundColor Cyan

New-GhIssue -Title "S0-1: Move .github/webapp/ to src/webapp/" -Labels "S0,P0-critical,scope-change,refactor" -Milestone "M0: Repo Restructuring (AUDIT)" -Body @"
## Story: S0-1 — Move Application Source to src/webapp/

**Sprint:** S0 | **Priority:** P0 | **Points:** 8 | **Source:** Audit v1.2 Section 3.1

### Description
Move all application source code from ``.github/webapp/`` to ``src/webapp/``. GitHub reserves ``.github/`` for repository configuration. Having 80% of project files there is the #1 structural issue.

### Acceptance Criteria
- [ ] All files from ``.github/webapp/`` (62 files) moved to ``src/webapp/``
- [ ] All imports and require() paths updated across the codebase
- [ ] All test files referencing webapp paths updated
- [ ] CI workflows updated to reference new paths
- [ ] MCP server configuration updated if referencing webapp paths
- [ ] All 1,172 existing tests pass after the move
- [ ] No broken links in documentation
"@

New-GhIssue -Title "S0-2: Move .github/skills/ to agents/" -Labels "S0,P0-critical,scope-change,refactor" -Milestone "M0: Repo Restructuring (AUDIT)" -Body @"
## Story: S0-2 — Move Agent Skills to agents/

**Sprint:** S0 | **Priority:** P0 | **Points:** 3 | **Source:** Audit v1.2 Section 3.1

### Description
Move all agent skill files from ``.github/skills/`` to ``agents/``. These are core project content (38 agent definitions), not GitHub repository configuration.

### Acceptance Criteria
- [ ] All files from ``.github/skills/`` (38 files) moved to ``agents/``
- [ ] Agent loading code updated to reference new path
- [ ] copilot-instructions.md references updated
- [ ] All agent invocation tests pass
- [ ] MCP tool paths updated if applicable
"@

New-GhIssue -Title "S0-3: Merge .github/docs/ into root docs/" -Labels "S0,P0-critical,scope-change,refactor,documentation" -Milestone "M0: Repo Restructuring (AUDIT)" -Body @"
## Story: S0-3 — Unify Documentation Directories

**Sprint:** S0 | **Priority:** P0 | **Points:** 5 | **Source:** Audit v1.2 Section 3.1

### Description
Merge ``.github/docs/`` (269 files) into the root ``docs/`` directory. Two docs/ directories causes confusion.

### Acceptance Criteria
- [ ] All unique files from ``.github/docs/`` merged into ``docs/``
- [ ] Conflicts resolved (files existing in both locations)
- [ ] GitHub Pages configuration works with unified structure
- [ ] All cross-references between documents updated
- [ ] Contracts, guardrails, playbooks, synthesis artifacts accessible from docs/
"@

New-GhIssue -Title "S0-4: Unify tests into tests/" -Labels "S0,P0-critical,scope-change,refactor" -Milestone "M0: Repo Restructuring (AUDIT)" -Body @"
## Story: S0-4 — Consolidate Test Directories

**Sprint:** S0 | **Priority:** P0 | **Points:** 3 | **Source:** Audit v1.2 Section 3.1

### Description
Unify test files split across ``__tests__/``, ``.github/tests/``, and inline test files into a single ``tests/`` directory.

### Acceptance Criteria
- [ ] All test files consolidated into ``tests/`` with subdirs (unit/, integration/, smoke/, e2e/)
- [ ] Single Jest/Vitest configuration covering all tests
- [ ] All 1,172 tests pass with the unified config
- [ ] Coverage reporting works from single test root
- [ ] CI workflows reference the unified test location
"@

New-GhIssue -Title "S0-5: Single package.json + ESLint config" -Labels "S0,P0-critical,scope-change,refactor,infra" -Milestone "M0: Repo Restructuring (AUDIT)" -Body @"
## Story: S0-5 — Unify Package and Lint Configuration

**Sprint:** S0 | **Priority:** P0 | **Points:** 3 | **Source:** Audit v1.2 Section 3.1

### Description
Merge ``.github/package.json`` into the root ``package.json`` and consolidate ESLint configs.

### Acceptance Criteria
- [ ] Single root ``package.json`` with all dependencies merged
- [ ] ``.github/package.json`` deleted
- [ ] Single ESLint config at root level
- [ ] ``npm install`` from root installs everything needed
- [ ] ``npm test`` from root runs all tests
- [ ] ``npm run lint`` covers the entire project
- [ ] CI pipeline uses root-level commands only
"@

New-GhIssue -Title "S0-6: Gitignore runtime files + fix naming" -Labels "S0,P1-high,scope-change,refactor" -Milestone "M0: Repo Restructuring (AUDIT)" -Body @"
## Story: S0-6 — Gitignore Runtime Files and Fix Naming

**Sprint:** S0 | **Priority:** P1 | **Points:** 2 | **Source:** Audit v1.2 Sections 3.2, 3.3

### Description
Add runtime-generated files to .gitignore and fix naming inconsistencies across phases.

### Acceptance Criteria
- [ ] .gitignore updated to exclude: session-state.json, github-state-snapshot.json, runtime-metrics.json, velocity-log.json, vitest.out, npm-audit.json, *.bak
- [ ] Existing runtime files removed from git tracking
- [ ] Phase 3: sprint-plan.md renamed to sprintplan.md (consistent with other phases)
- [ ] Phase 3: UPPERCASE critic/risk files renamed to lowercase
"@

New-GhIssue -Title "S0-7: Update CI workflows + MCP paths" -Labels "S0,P1-high,scope-change,infra" -Milestone "M0: Repo Restructuring (AUDIT)" -Body @"
## Story: S0-7 — Update CI and MCP After Restructuring

**Sprint:** S0 | **Priority:** P1 | **Points:** 2 | **Source:** Audit v1.2 Section 3.1

### Description
Update all CI workflow files and MCP server configuration to reference the new file paths.

### Acceptance Criteria
- [ ] All .github/workflows/*.yml files updated with new paths
- [ ] MCP server tool paths updated
- [ ] CI pipeline runs green on all jobs after path updates
- [ ] MCP tools resolve correctly with new paths
- [ ] No hardcoded .github/webapp/, .github/skills/, or .github/docs/ references remain
"@

# ========== SPRINT 1 ==========
Write-Host "=== SPRINT 1: Sprint 2 Completion ===" -ForegroundColor Cyan

New-GhIssue -Title "S1-1: CI Job 7 verification on main" -Labels "S1,P1-high,scope-change,infra" -Milestone "M1: Sprint 2 Completion" -Body @"
## Story: S1-1 — CI Job 7 Verification

**Sprint:** S1 | **Priority:** P1 | **Points:** 3

### Acceptance Criteria
- [ ] CI Job 7 passes on main branch
- [ ] Translation validation covers all locale files (en-US, de-DE, fr-FR)
- [ ] Failure mode documented
- [ ] No false positives in last 5 CI runs
"@

New-GhIssue -Title "S1-2: CI Job 8 accessibility gate" -Labels "S1,P1-high,scope-change,accessibility" -Milestone "M1: Sprint 2 Completion" -Body @"
## Story: S1-2 — Accessibility CI Gate

**Sprint:** S1 | **Priority:** P1 | **Points:** 5

### Acceptance Criteria
- [ ] axe-core accessibility tests running in CI
- [ ] Lighthouse accessibility audit included
- [ ] Minimum score threshold enforced (90+)
- [ ] Accessibility violations block merge
"@

New-GhIssue -Title "S1-3: TMS setup and integration" -Labels "S1,P1-high,scope-change" -Milestone "M1: Sprint 2 Completion" -Body @"
## Story: S1-3 — Translation Management System

**Sprint:** S1 | **Priority:** P1 | **Points:** 3

### Acceptance Criteria
- [ ] TMS connected to repository locale files
- [ ] Translation workflow documented
- [ ] Sync mechanism between TMS and repo
- [ ] At least en-US, de-DE, fr-FR locales managed
"@

New-GhIssue -Title "S1-4: Landing page + GTM messaging" -Labels "S1,P1-high,scope-change,marketing" -Milestone "M1: Sprint 2 Completion" -Body @"
## Story: S1-4 — Landing Page with GTM

**Sprint:** S1 | **Priority:** P1 | **Points:** 3

### Acceptance Criteria
- [ ] Landing page live and accessible
- [ ] GTM messaging reflects current value proposition
- [ ] Analytics (Matomo) tracking verified
- [ ] Social meta tags present
"@

New-GhIssue -Title "S1-5: Matomo + Buttondown + Social publishing" -Labels "S1,P1-high,scope-change,marketing" -Milestone "M1: Sprint 2 Completion" -Body @"
## Story: S1-5 — Analytics, Email and Social Setup

**Sprint:** S1 | **Priority:** P1 | **Points:** 5

### Acceptance Criteria
- [ ] Matomo analytics tracking live on all pages
- [ ] Buttondown email subscription form functional
- [ ] Social cards published
- [ ] CORS configuration correct for analytics
"@

New-GhIssue -Title "S1-6: Pilot rubric + feedback validation" -Labels "S1,P2-medium,scope-change,documentation" -Milestone "M1: Sprint 2 Completion" -Body @"
## Story: S1-6 — Pilot Validation Framework

**Sprint:** S1 | **Priority:** P2 | **Points:** 3

### Acceptance Criteria
- [ ] Pilot rubric document with scoring criteria
- [ ] Feedback collection mechanism
- [ ] Evaluation criteria covering all 4 disciplines
- [ ] At least 3 pilot scenarios defined
"@

# ========== SPRINT 2 ==========
Write-Host "=== SPRINT 2: Pipeline Hardening ===" -ForegroundColor Cyan

New-GhIssue -Title "S2-1: Raise test coverage to 80%" -Labels "S2,P0-critical,scope-change" -Milestone "M2: Pipeline Hardening (AUDIT)" -Body @"
## Story: S2-1 — Coverage Gate at 80%

**Sprint:** S2 | **Priority:** P0 | **Points:** 5 | **Source:** Audit v1.2

### Acceptance Criteria
- [ ] Jest/Vitest coverage threshold set to 80% (lines + branches)
- [ ] CI job fails if coverage drops below 80%
- [ ] Coverage report published as CI artifact
- [ ] Current gaps identified and critical paths tested
"@

New-GhIssue -Title "S2-2: E2E smoke test - full CREATE pipeline" -Labels "S2,P0-critical,scope-change" -Milestone "M2: Pipeline Hardening (AUDIT)" -Body @"
## Story: S2-2 — End-to-End Pipeline Smoke Test

**Sprint:** S2 | **Priority:** P0 | **Points:** 8 | **Source:** Audit v1.2

### Acceptance Criteria
- [ ] Automated test script that runs CREATE for a test project
- [ ] Session state correctly initialized and persisted
- [ ] Onboarding output generated and validated against contract
- [ ] At least Phase 1 produces valid deliverables
- [ ] Test runs in CI within 5 minutes
"@

New-GhIssue -Title "S2-3: Fix Gitleaks hard gate" -Labels "S2,P1-high,scope-change,infra" -Milestone "M2: Pipeline Hardening (AUDIT)" -Body @"
## Story: S2-3 — Gitleaks Hard Gate

**Sprint:** S2 | **Priority:** P1 | **Points:** 1

### Acceptance Criteria
- [ ] Gitleaks CI job configured as required status check
- [ ] PR cannot merge if secrets detected
- [ ] .gitleaks.toml allowlist reviewed and minimized
"@

New-GhIssue -Title "S2-4: Add middleware + route tests (85% coverage)" -Labels "S2,P1-high,scope-change" -Milestone "M2: Pipeline Hardening (AUDIT)" -Body @"
## Story: S2-4 — Middleware and Route Test Coverage

**Sprint:** S2 | **Priority:** P1 | **Points:** 5

### Acceptance Criteria
- [ ] All middleware functions have unit tests
- [ ] All route handlers have integration tests
- [ ] Edge cases tested: malformed input, missing headers, timeout
- [ ] 85% line coverage, 80% branch coverage for middleware + routes
"@

New-GhIssue -Title "S2-5: Consolidate ESLint to flat config" -Labels "S2,P1-high,scope-change,infra" -Milestone "M2: Pipeline Hardening (AUDIT)" -Body @"
## Story: S2-5 — ESLint Flat Config

**Sprint:** S2 | **Priority:** P1 | **Points:** 3

### Acceptance Criteria
- [ ] Single eslint.config.js at project root
- [ ] Covers all JS files (src/, tests/, scripts/)
- [ ] No legacy .eslintrc files remain
- [ ] Zero lint errors on current codebase
"@

New-GhIssue -Title "S2-6: Pre-commit hook for lint + test" -Labels "S2,P1-high,scope-change,infra" -Milestone "M2: Pipeline Hardening (AUDIT)" -Body @"
## Story: S2-6 — Pre-Commit Hook

**Sprint:** S2 | **Priority:** P1 | **Points:** 1

### Acceptance Criteria
- [ ] husky pre-commit hook installed and configured
- [ ] lint-staged runs ESLint on staged files
- [ ] Fast unit tests run on affected files
- [ ] Broken code cannot be committed locally
"@

# ========== SPRINT 3 ==========
Write-Host "=== SPRINT 3: Code Orchestrator ===" -ForegroundColor Cyan

New-GhIssue -Title "S3-1: Harden state machine engine (P0)" -Labels "S3,P0-critical,scope-change,tech" -Milestone "M3: Code Orchestrator (FEAT-05)" -Body @"
## Story: S3-1 — State Machine Engine Hardening

**Sprint:** S3 | **Priority:** P0 | **Points:** 5 | **Source:** Audit v1.2 Section 4.3 (formerly #80)

### Description
The state machine engine (state-machine.js, 418 lines) has transition logic, crash recovery, and serialization but lacks comprehensive tests. Harden and close.

### Acceptance Criteria
- [ ] 90%+ test coverage for state-machine.js
- [ ] Edge cases: invalid transitions, corrupt state file, concurrent writes
- [ ] Crash recovery tested: kill mid-transition, verify recovery
- [ ] Serialization round-trip tested
- [ ] All transition paths validated against the phase sequence
- [ ] Documentation: state diagram and transition table
"@

New-GhIssue -Title "S3-2: Harden agent dispatcher (P0)" -Labels "S3,P0-critical,scope-change,tech" -Milestone "M3: Code Orchestrator (FEAT-05)" -Body @"
## Story: S3-2 — Agent Dispatcher Hardening

**Sprint:** S3 | **Priority:** P0 | **Points:** 5 | **Source:** Audit v1.2 Section 4.3 (formerly #81)

### Description
The agent dispatcher (dispatcher.js, 334 lines) has context injection, multi-platform routing, and retry logic. Needs comprehensive testing.

### Acceptance Criteria
- [ ] 90%+ test coverage for dispatcher.js
- [ ] Timeout handling: configurable per-agent timeout with graceful cancellation
- [ ] Fallback behavior: retry, skip, escalate on failure
- [ ] Context injection validated per agent
- [ ] Multi-platform routing tested
- [ ] Documentation: dispatcher flow diagram
"@

New-GhIssue -Title "S3-3: Gate validation (Critic + Risk) engine" -Labels "S3,P1-high,scope-change,tech" -Milestone "M3: Code Orchestrator (FEAT-05)" -Body @"
## Story: S3-3 — Code-Based Critic + Risk Validation

**Sprint:** S3 | **Priority:** P1 | **Points:** 5

### Acceptance Criteria
- [ ] CriticValidator class: checks output against contract schema
- [ ] RiskValidator class: identifies UNCERTAIN:, INSUFFICIENT_DATA:, missing sections
- [ ] Gate returns PASS/FAIL with detailed findings list
- [ ] Integration with state machine: gate failure blocks phase transition
- [ ] Test suite covering all contract types across 4 phases
"@

New-GhIssue -Title "S3-4: Sprint Gate engine (Definition of Ready)" -Labels "S3,P1-high,scope-change,tech" -Milestone "M3: Code Orchestrator (FEAT-05)" -Body @"
## Story: S3-4 — Sprint Gate Engine

**Sprint:** S3 | **Priority:** P1 | **Points:** 5

### Acceptance Criteria
- [ ] DoR checklist validated programmatically
- [ ] Lessons-learned injection from previous sprints
- [ ] Velocity data loaded from velocity-log.json
- [ ] Sprint Gate blocks execution if DoR not met
- [ ] Gate report generated with pass/fail per criterion
"@

New-GhIssue -Title "S3-5: Orchestrator CLI and API" -Labels "S3,P2-medium,scope-change,tech" -Milestone "M3: Code Orchestrator (FEAT-05)" -Body @"
## Story: S3-5 — Orchestrator Command Interface

**Sprint:** S3 | **Priority:** P2 | **Points:** 3

### Acceptance Criteria
- [ ] CLI commands: start, status, stop, resume, gate-check
- [ ] Programmatic API: importable module with same capabilities
- [ ] Status output: current phase, agent, gate results, elapsed time
- [ ] Command validation with help text
"@

New-GhIssue -Title "S3-6: Webapp pipeline visualization" -Labels "S3,P2-medium,scope-change,tech,enhancement" -Milestone "M3: Code Orchestrator (FEAT-05)" -Body @"
## Story: S3-6 — Pipeline Visualization in Web UI

**Sprint:** S3 | **Priority:** P2 | **Points:** 3

### Acceptance Criteria
- [ ] Pipeline view shows all phases with current status
- [ ] Active agent highlighted with progress indicator
- [ ] Gate results displayed inline (pass/fail badges)
- [ ] SSE-driven real-time updates
- [ ] Historical runs viewable
"@

# ========== SPRINT 4 ==========
Write-Host "=== SPRINT 4: Canonical Schema ===" -ForegroundColor Cyan

New-GhIssue -Title "S4-1: Canonical agent schema (platform-neutral)" -Labels "S4,P1-high,scope-change,tech" -Milestone "M4: Canonical Schema (FEAT-03)" -Body @"
## Story: S4-1 — Canonical Agent Schema

**Sprint:** S4 | **Priority:** P1 | **Points:** 5

### Acceptance Criteria
- [ ] Schema defines: agent ID, role, phase, domain, predecessor dependencies
- [ ] Includes: system prompt template, output contract reference, guardrail references
- [ ] All 38 agents encoded in canonical format
- [ ] JSON Schema validation for the canonical format
- [ ] Schema versioned (semver)
- [ ] Stored in canonical/agents/ directory
"@

New-GhIssue -Title "S4-2: Canonical flow schema (phases, gates, handoffs)" -Labels "S4,P1-high,scope-change,tech" -Milestone "M4: Canonical Schema (FEAT-03)" -Body @"
## Story: S4-2 — Canonical Flow Schema

**Sprint:** S4 | **Priority:** P1 | **Points:** 5

### Acceptance Criteria
- [ ] Flow schema captures: phase sequence (1-5), agent ordering, gate conditions, handoff requirements
- [ ] Supports CREATE, AUDIT, FEATURE, SCOPE CHANGE, HOTFIX command variants
- [ ] Partial/combination execution modes representable
- [ ] Sprint Gate steps defined declaratively
- [ ] Validated against real execution traces
"@

New-GhIssue -Title "S4-3: Canonical tool contract schema" -Labels "S4,P1-high,scope-change,tech" -Milestone "M4: Canonical Schema (FEAT-03)" -Body @"
## Story: S4-3 — Canonical Tool Contract

**Sprint:** S4 | **Priority:** P1 | **Points:** 3

### Acceptance Criteria
- [ ] Tool contract schema: tool ID, description, parameter schema, return type, side effects
- [ ] All platform tools catalogued: file ops, terminal, GitHub, memory, MCP
- [ ] Capability flags: supports_background, supports_timeout, read_only
- [ ] Validation script confirms all agent skills reference valid tool IDs
"@

New-GhIssue -Title "S4-4: Copilot instruction generator (transpiler 1)" -Labels "S4,P1-high,scope-change,tech" -Milestone "M4: Canonical Schema (FEAT-03)" -Body @"
## Story: S4-4 — Copilot Transpiler Target

**Sprint:** S4 | **Priority:** P1 | **Points:** 3

### Acceptance Criteria
- [ ] generate-platform.js copilot outputs all Copilot instruction files
- [ ] Generated output functionally identical to current hand-written files
- [ ] YAML frontmatter correctly generated
- [ ] Idempotent: running twice produces identical output
"@

New-GhIssue -Title "S4-5: Claude instruction generator (transpiler 2)" -Labels "S4,P1-high,scope-change,tech" -Milestone "M4: Canonical Schema (FEAT-03)" -Body @"
## Story: S4-5 — Claude Transpiler Target

**Sprint:** S4 | **Priority:** P1 | **Points:** 3

### Acceptance Criteria
- [ ] generate-platform.js claude outputs CLAUDE.md at repo root
- [ ] .claude/ directory structure generated
- [ ] Agent roles adapted to Claude Code format
- [ ] Memory Management Protocol adapted for 200k context
"@

New-GhIssue -Title "S4-6: OpenAI Codex instruction generator (transpiler 3)" -Labels "S4,P1-high,scope-change,tech" -Milestone "M4: Canonical Schema (FEAT-03)" -Body @"
## Story: S4-6 — Codex Transpiler Target

**Sprint:** S4 | **Priority:** P1 | **Points:** 3

### Acceptance Criteria
- [ ] generate-platform.js codex outputs codex.md and .codex/ directory
- [ ] Agent configs and tool definitions in function-calling schema
- [ ] Guardrails adapted for sandbox execution model
"@

New-GhIssue -Title "S4-7: Transpiler CI pipeline (sync validation)" -Labels "S4,P2-medium,scope-change,infra" -Milestone "M4: Canonical Schema (FEAT-03)" -Body @"
## Story: S4-7 — Transpiler CI Pipeline

**Sprint:** S4 | **Priority:** P2 | **Points:** 2

### Acceptance Criteria
- [ ] GitHub Actions workflow: generate-and-validate.yml
- [ ] Runs transpiler for all 3 targets on every push/PR
- [ ] Detects drift between generated and committed files
- [ ] Runs in less than 30 seconds
"@

# ========== SPRINT 5 ==========
Write-Host "=== SPRINT 5: Security + TypeScript ===" -ForegroundColor Cyan

New-GhIssue -Title "S5-1: Rate limiting (100 req/min)" -Labels "S5,P0-critical,scope-change,tech" -Milestone "M5: Security + TypeScript (AUDIT)" -Body @"
## Story: S5-1 — Rate Limiting

**Sprint:** S5 | **Priority:** P0 | **Points:** 5

### Acceptance Criteria
- [ ] Rate limiter middleware applied to all routes
- [ ] 100 requests/minute per IP (configurable)
- [ ] Returns HTTP 429 with Retry-After header on exceed
- [ ] SSE connections excluded from rate limit
- [ ] Tests verify rate limiting behavior
"@

New-GhIssue -Title "S5-2: Content Security Policy headers" -Labels "S5,P0-critical,scope-change,tech" -Milestone "M5: Security + TypeScript (AUDIT)" -Body @"
## Story: S5-2 — CSP Headers

**Sprint:** S5 | **Priority:** P0 | **Points:** 3

### Acceptance Criteria
- [ ] CSP header set on all HTML responses
- [ ] Inline scripts blocked (script-src self)
- [ ] Inline styles handled via nonce or hash
- [ ] All existing webapp functionality works with CSP enabled
"@

New-GhIssue -Title "S5-3: Session auth for web UI" -Labels "S5,P0-critical,scope-change,tech" -Milestone "M5: Security + TypeScript (AUDIT)" -Body @"
## Story: S5-3 — Session Authentication

**Sprint:** S5 | **Priority:** P0 | **Points:** 5

### Acceptance Criteria
- [ ] Login page with username/password (configurable via env vars)
- [ ] Session cookie (httpOnly, secure, sameSite=strict)
- [ ] Read endpoints remain public (GET /api/*)
- [ ] Write endpoints require authentication (POST/PUT/DELETE /api/*)
- [ ] CSRF protection on all forms
"@

New-GhIssue -Title "S5-4: Docker deployment readiness" -Labels "S5,P1-high,scope-change,infra" -Milestone "M5: Security + TypeScript (AUDIT)" -Body @"
## Story: S5-4 — Docker Deployment

**Sprint:** S5 | **Priority:** P1 | **Points:** 3

### Acceptance Criteria
- [ ] Dockerfile builds and runs the application
- [ ] docker-compose.yml with health check configured
- [ ] .dockerignore present
- [ ] Container starts and serves /health within 10 seconds
"@

New-GhIssue -Title "S5-5: Migrate core modules to TypeScript" -Labels "S5,P1-high,scope-change,tech,refactor" -Milestone "M5: Security + TypeScript (AUDIT)" -Body @"
## Story: S5-5 — TypeScript Migration (Core)

**Sprint:** S5 | **Priority:** P1 | **Points:** 8

### Acceptance Criteria
- [ ] tsconfig.json configured with strict mode
- [ ] server.js, store.js, state-machine.js, dispatcher.js migrated to .ts
- [ ] All existing tests pass (or migrated to .ts)
- [ ] Build step added to CI (tsc to dist/)
- [ ] Source maps for debugging
"@

# ========== SPRINT 6 ==========
Write-Host "=== SPRINT 6: v1.0 GA ===" -ForegroundColor Cyan

New-GhIssue -Title "S6-1: Tag v1.0.0 + GitHub Release" -Labels "S6,P0-critical,scope-change" -Milestone "M6: v1.0 GA" -Body @"
## Story: S6-1 — v1.0.0 Release

**Sprint:** S6 | **Priority:** P0 | **Points:** 3

### Acceptance Criteria
- [ ] Git tag v1.0.0 on main branch
- [ ] GitHub Release created with full changelog
- [ ] Release notes cover: features, breaking changes, migration guide
"@

New-GhIssue -Title "S6-2: Domain glossary document" -Labels "S6,P1-high,scope-change,documentation" -Milestone "M6: v1.0 GA" -Body @"
## Story: S6-2 — Domain Glossary

**Sprint:** S6 | **Priority:** P1 | **Points:** 2

### Acceptance Criteria
- [ ] All domain terms defined (agent, phase, gate, contract, guardrail, etc.)
- [ ] Acronyms expanded
- [ ] Alphabetically sorted
- [ ] Stored in docs/glossary.md
"@

New-GhIssue -Title "S6-3: Lesson-to-decision promotion mechanism" -Labels "S6,P1-high,scope-change,tech" -Milestone "M6: v1.0 GA" -Body @"
## Story: S6-3 — PROMOTE_TO_DECISION Flag

**Sprint:** S6 | **Priority:** P1 | **Points:** 3

### Acceptance Criteria
- [ ] PROMOTE_TO_DECISION flag recognized in lessons-learned.md
- [ ] Promotion creates entry in decisions.md with source reference
- [ ] Integration with Sprint Gate
"@

New-GhIssue -Title "S6-4: GitHub Pages documentation site" -Labels "S6,P1-high,scope-change,documentation" -Milestone "M6: v1.0 GA" -Body @"
## Story: S6-4 — Documentation Site

**Sprint:** S6 | **Priority:** P1 | **Points:** 5

### Acceptance Criteria
- [ ] GitHub Pages enabled on the repository
- [ ] Jekyll or static site generator configured
- [ ] Navigation structure mirrors docs/ directory
- [ ] Quick start guide prominently featured
- [ ] Mobile-responsive layout
"@

New-GhIssue -Title "S6-5: Contributor onboarding guide" -Labels "S6,P1-high,scope-change,documentation" -Milestone "M6: v1.0 GA" -Body @"
## Story: S6-5 — Contributor Guide (setup-to-PR in 30 min)

**Sprint:** S6 | **Priority:** P1 | **Points:** 5

### Acceptance Criteria
- [ ] Step-by-step setup guide (prerequisites, clone, install, run, test)
- [ ] Architecture overview (key modules, data flow, extension points)
- [ ] Contribution workflow (branch naming, commit conventions, PR template)
- [ ] Testing guide (how to write tests, coverage requirements)
- [ ] Verified: fresh developer can follow guide end-to-end
"@

New-GhIssue -Title "S6-6: Label CAT-* issues as on-detection (dormant)" -Labels "S6,P2-medium,scope-change" -Milestone "M6: v1.0 GA" -Body @"
## Story: S6-6 — CAT-* Issue Labeling

**Sprint:** S6 | **Priority:** P2 | **Points:** 1

### Acceptance Criteria
- [ ] on-detection label created
- [ ] All 9 CAT-* issues labeled
- [ ] README explains the on-detection pattern
"@

New-GhIssue -Title "S6-7: Demo video or GIF (CREATE walkthrough)" -Labels "S6,P2-medium,scope-change,marketing" -Milestone "M6: v1.0 GA" -Body @"
## Story: S6-7 — Demo Video

**Sprint:** S6 | **Priority:** P2 | **Points:** 1

### Acceptance Criteria
- [ ] Video/GIF shows: project creation, agent execution, deliverable output
- [ ] 2-3 minutes duration
- [ ] Embedded in README.md
"@

# ========== SPRINTS 7-10: EPICS ==========
Write-Host "=== SPRINTS 7-10: Feature Roadmap ===" -ForegroundColor Cyan

New-GhIssue -Title "S7: Tool Abstraction Layer (FEAT-04) - Epic" -Labels "S7,P1-high,scope-change,tech,enhancement" -Milestone "M7: Tool Abstraction (FEAT-04)" -Body @"
## Epic: Sprint 7 — Tool Abstraction (FEAT-04)

**Target:** Sep 2026 | **Points:** 24

### Stories (5)
1. FEAT-04-A: Tool abstraction interface — platform-agnostic API
2. FEAT-04-B: Copilot tool adapter
3. FEAT-04-C: Claude tool adapter
4. FEAT-04-D: OpenAI Codex tool adapter
5. FEAT-04-E: Tool capability matrix and fallback strategies

### Dependencies
- Requires: M4 (Canonical Schema) completed
- Enables: M8 (Claude + OpenAI), M10 (MCP + Context)
"@

New-GhIssue -Title "S8: Claude + OpenAI Integration (FEAT-06/07) - Epic" -Labels "S8,P1-high,scope-change,tech,enhancement" -Milestone "M8: Claude + OpenAI (FEAT-06/07)" -Body @"
## Epic: Sprint 8 — Claude + OpenAI (FEAT-06/07)

**Target:** Oct 2026 | **Points:** 24

### Stories (8)
1. FEAT-06-A: CLAUDE.md generation
2. FEAT-06-B: Claude API integration layer
3. FEAT-06-C: Claude sub-agent invocation
4. FEAT-06-D: Claude E2E pipeline validation
5. FEAT-07-A: codex.md generation
6. FEAT-07-B: OpenAI API integration layer
7. FEAT-07-C: Codex multi-agent threading
8. FEAT-07-D: Codex E2E pipeline validation

### Dependencies
- Requires: M4, M7
- Enables: M10
"@

New-GhIssue -Title "S9: Enterprise UI Redesign (FEAT-02) - Epic" -Labels "S9,P2-medium,scope-change,enhancement" -Milestone "M9: Enterprise UI (FEAT-02)" -Body @"
## Epic: Sprint 9 — Enterprise UI (FEAT-02)

**Target:** Nov 2026 | **Points:** 24

### Stories (7)
1. FEAT-02-A: Design system foundation
2. FEAT-02-B: Navigation and layout
3. FEAT-02-C: Card and panel components
4. FEAT-02-D: Data tables and lists
5. FEAT-02-E: Forms and inputs
6. FEAT-02-F: Feedback system
7. FEAT-02-G: Dashboard home

### Dependencies
- Independent track — can be parallelized with any milestone
"@

New-GhIssue -Title "S10: MCP + Context Portability (FEAT-08/09) - Epic" -Labels "S10,P2-medium,scope-change,tech,enhancement" -Milestone "M10: MCP + Context (FEAT-08/09)" -Body @"
## Epic: Sprint 10 — MCP + Context (FEAT-08/09)

**Target:** Dec 2026 | **Points:** 24

### Stories (9)
1. FEAT-08-A: MCP server config per platform
2. FEAT-08-B: Custom MCP server for orchestrator tools
3. FEAT-08-C: GitHub MCP cross-platform testing
4. FEAT-08-D: MCP server health monitoring
5. FEAT-09-A: Platform-aware context window manager
6. FEAT-09-B: Memory path adapters
7. FEAT-09-C: Session state portability
8. FEAT-09-D: Token budget tracking
9. FEAT-09-E: Multi-platform documentation

### Dependencies
- Requires: M3, M7, M8
"@

Write-Host "`n=== ALL ISSUES CREATED ===" -ForegroundColor Green
