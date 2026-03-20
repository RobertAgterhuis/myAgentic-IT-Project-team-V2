# Changelog

All notable changes to the Agentic SDLC Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- M3/E-C5: Operational Runbooks and Release Maturity (#691, #724, #725, #726)
  - Added release topology and environment contract documentation defining the
    four runtime profiles (`local-dev`, `ci-test`, `production-single-node`,
    `production-distributed`) and the three-tier promotion pipeline in
    [docs/operations/release-topology.md](docs/operations/release-topology.md)
  - Added incident runbooks for Redis outage (RB-001), provider outage (RB-002),
    queue backlog (RB-003), and schema mismatch (RB-004) with testable simulation
    commands and rollback steps in
    [docs/operations/runbooks.md](docs/operations/runbooks.md)
  - Added post-deploy health gate documentation and rollback decision matrix
    covering single-node and distributed rollback sequences in
    [docs/operations/post-deploy-health-gates.md](docs/operations/post-deploy-health-gates.md)
  - Added automated post-deploy health gate script (`scripts/post-deploy-check.mjs`)
    with six gates (liveness, readiness, orchestrator status, metrics, Redis,
    session state), profile-aware skip logic, and exit-code–driven rollback trigger
  - Updated [docs/operations/index.md](docs/operations/index.md) with navigation
    links to all three new docs

- M3/E-A4: Semantic Memory and Context Optimization (#689, #718, #719, #720)
  - Added three-tier semantic memory abstraction (`run`, `project`, `org`) with
    per-tier retention policies (0 / 30 days / 90 days) and lazy TTL eviction in
    [platform/engine/semantic-memory.ts](platform/engine/semantic-memory.ts)
  - Added context budgeter with deterministic rank -> truncate pipeline (`budget`,
    `rankItems`, `hardTruncate`, `assembleContext`) and byte-level payload metrics in
    [platform/engine/context-budgeter.ts](platform/engine/context-budgeter.ts)
  - Added citation-enforced retrieval API with keyword search over decisions and docs,
    producing `CitedSnippet` objects with `Citation` metadata, compatible with the
    context budgeter in [platform/engine/retrieval-api.ts](platform/engine/retrieval-api.ts)
  - Added 74 unit tests covering all three modules in
    [tests/unit/semantic-memory.test.js](tests/unit/semantic-memory.test.js),
    [tests/unit/context-budgeter.test.js](tests/unit/context-budgeter.test.js),
    and [tests/unit/retrieval-api.test.js](tests/unit/retrieval-api.test.js)

- M2/E-A5: Human override and provenance groundwork (starts #688, #715)
  - Extended dispatcher invocation result schema with
    `confidence`, `uncertainty_reasons`, and `needs_human_review` in
    [platform/engine/dispatcher.ts](platform/engine/dispatcher.ts)
  - Propagated confidence metadata to agent execution APIs and SSE payloads in
    [src/webapp/services/agent-execution-service.ts](src/webapp/services/agent-execution-service.ts)
    and [src/webapp/routes/agents.ts](src/webapp/routes/agents.ts)
  - Added unit coverage for confidence metadata propagation in
    [tests/unit/dispatcher.test.js](tests/unit/dispatcher.test.js),
    [tests/unit/agent-execution-service.test.js](tests/unit/agent-execution-service.test.js),
    and [tests/unit/routes-agents-execute.test.js](tests/unit/routes-agents-execute.test.js)
  - Added orchestrator control APIs for human intervention with rationale:
    `POST /api/orchestrator/pause`, `POST /api/orchestrator/override`, and
    `POST /api/orchestrator/resume` in
    [src/webapp/routes/orchestrator.ts](src/webapp/routes/orchestrator.ts)
  - Added paused-state guard on `POST /api/orchestrator/advance` plus
    `human_override` status surface for machine-readable control state
  - Added route/OpenAPI coverage for override controls in
    [tests/unit/routes-orchestrator.test.js](tests/unit/routes-orchestrator.test.js)
    and [tests/unit/openapi-spec.test.js](tests/unit/openapi-spec.test.js)
  - Added decision provenance feed endpoint `GET /api/v1/cockpit/provenance`
    combining human override events and governance/audit decisions in
    [src/webapp/routes/cockpit.ts](src/webapp/routes/cockpit.ts)
  - Added cockpit "Decision Provenance" tab and UI view in
    [src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx](src/webapp/ui/src/pages/cockpit/cockpit-dashboard-page.tsx)
    and [src/webapp/ui/src/components/cockpit/decision-provenance-view.tsx](src/webapp/ui/src/components/cockpit/decision-provenance-view.tsx)

- M2/E-C3: Agent-specific security guardrails (starts #687)
  - Added context trust labeling and prompt sanitization for model-bound
    invocation payloads in
    [platform/engine/agent-runtime-adapter.ts](platform/engine/agent-runtime-adapter.ts)
  - Added pre-action policy gates for side-effect canonical tools
    (`tool.files.write`, `tool.git.commit`, `tool.github.issue`) with
    policy-pack evaluation and explicit `TOOL_POLICY_BLOCKED` denial path in
    [platform/engine/tool-execution-middleware.ts](platform/engine/tool-execution-middleware.ts)
  - Added C3 policy entries in
    [platform/sdlc/policies/security-baseline.json](platform/sdlc/policies/security-baseline.json)
    (`POL-SEC-C3-001` through `POL-SEC-C3-003`) to require explicit approval
    before side-effect execution
  - Added governance-linked approval derivation from session decision records
    and propagated decision references into tool audit events
  - Added adversarial prompt/context regression coverage in
    [tests/security/adversarial-prompt-context.test.js](tests/security/adversarial-prompt-context.test.js)
    and extended adapter middleware tests in
    [tests/unit/agent-runtime-adapter.test.js](tests/unit/agent-runtime-adapter.test.js)

- M2/E-A3: Unified tool-calling middleware through `ToolExecutor` (starts #686, #708, #709, #710, #711)
  - Added runtime tool execution middleware in
    [platform/engine/tool-execution-middleware.ts](platform/engine/tool-execution-middleware.ts)
    that resolves canonical tool IDs from `platform/schema/tools.json`, enforces
    role/profile authorization checks, and emits traceable audit events
  - Wired `ProviderBackedLlmRuntimeAdapter` to execute provider `toolCalls`
    through `ToolExecutor` only, feed tool results back into model context, and
    deny unauthorized operations with explicit `TOOL_UNAUTHORIZED` errors
  - Added tool invocation telemetry fields to adapter response envelopes:
    `toolTraceId`, `toolInvocationCount`, and `toolAuditEvents`
  - Added unit coverage for allowed/denied tool operations in
    [tests/unit/agent-runtime-adapter.test.js](tests/unit/agent-runtime-adapter.test.js)

- M1/E-A1: Dispatcher Runtime Adapter Integration (closes #683, #697, #698, #699, #700)
  - `AgentRuntimeAdapter` interface + `AdapterRegistry` with `NullAdapter`
    (`ci-test`) and `LogOnlyAdapter` (`local-dev`) built-ins in
    [platform/engine/agent-runtime-adapter.ts](platform/engine/agent-runtime-adapter.ts)
  - `resolveAdapter()` returns config-time error for unknown adapter names,
    surfacing misconfiguration at startup rather than first invocation
  - `Dispatcher._defaultInvoker` delegates to configured adapter instead of
    unconditionally throwing, wiring the invoke path end-to-end
  - `agent-execution-service` resolves adapter via registry on every manual
    execution — no external invoker monkey-patch required
  - `AGENT_RUNTIME_ADAPTER` env-var constant added to
    [src/webapp/config.ts](src/webapp/config.ts)
  - 26 new integration tests covering adapter contract, registry, profile
    defaults, and dispatcher wiring in
    [tests/unit/agent-runtime-adapter.test.js](tests/unit/agent-runtime-adapter.test.js)

  - Bounded parallel orchestration groups with configurable per-group concurrency
    in [platform/engine/dispatcher.ts](platform/engine/dispatcher.ts)
  - Async store I/O API (`existsAsync`, `readFileAsync`, `writeFileAsync`) for
    filesystem and in-memory stores in [src/webapp/store.ts](src/webapp/store.ts)
  - Startup scale prerequisite enforcement (`assertScalePrerequisites`) with
    profile-aware Redis connectivity checks in [src/webapp/runtime-profiles.ts](src/webapp/runtime-profiles.ts)

- M1/E-B2: Canonical Autonomous Lane Proof (closes #685, #705, #706, #707)
  - **I-B2-001**: Reproducible benchmark scenario in [usertests/10-canonical-autonomous-lane-proof.md](usertests/10-canonical-autonomous-lane-proof.md)
    - Full end-to-end autonomous workflow test: Issue → Plan → Code → Test → PR → Review
    - Demonstrates deterministic agent execution with mock runtime adapter
    - Machine-readable artifact capture for CI replay and traceability
    - Integration test suite in [tests/integration/autonomous-lane.test.js](tests/integration/autonomous-lane.test.js)
  - **I-B2-002**: CI job for autonomous lane smoke path in [.github/workflows/ci.yml](.github/workflows/ci.yml)
    - Gate 6 job: `autonomous-lane-smoke` runs on main and feature branches
    - Artifact traceability with JSONL trace files and failure classification
    - PR comments with lane execution summary and artifact links
    - Timeout: 10 minutes; runs after lint/test/build gates
  - **I-B2-003**: Failure classification report generator [scripts/classify-lane-failures.js](scripts/classify-lane-failures.js)
    - Taxonomy: `config`, `runtime`, `agent-logic`, `external-dependency`, `data`
    - Machine-readable JSON report with remediation hints and severity levels
    - Integrated into CI job for automated failure analysis
  - New npm script: `test:autonomous-lane` for local development
  - Updated [usertests/README.md](usertests/README.md) with step 10
- M28: Multi-platform instruction migration
  - `platform/schema/protocols.json` — canonical protocol data (6 protocols,
    handoff checklist, definition of done) with JSON Schema
  - `templates/sdlc/contracts/definition-of-done.md` — unified 19-item
    DoD contract (9 design + 10 implementation)
  - Transpiler now generates real platform convention files:
    - Copilot: `.github/instructions/*.instructions.md` (YAML frontmatter
      with `applyTo` scoping)
    - Claude: `CLAUDE.md` + `.claude/settings.json` + `.claude/commands/*.md`
    - OpenAI/Codex: `.codex/instructions.md` + `.codex/agents.json`
  - `--dry-run` flag for transpiler CLI
  - `npm run generate:platform` script + postinstall hook
- GA definition document (`BusinessDocs/ga-definition.md`) — defines v1 GA as
  localhost/single-operator with supervised autonomy posture
- Security design document (`docs/security-design.md`) — STRIDE threat
  model, 3 deployment profiles, hardening checklist
- Data inventory (`docs/data-inventory.md`) — all data categories,
  retention policy, DSAR procedure, ROPA skeleton
- Privacy policy (`docs/operations/privacy-policy.md`) — user-facing localhost privacy
  policy
- Truth-source policy (`docs/truth-source-policy.md`) — evidence
  accuracy rules and enforcement
- CHANGELOG.md (this file)
- Release checklist document (`docs/operations/release-checklist.md`)
- Light/dark theme color tokens in design-tokens.json

### Changed

- Startup bootstrap sequence now validates runtime profile/security model,
  enforces scale prerequisites, and then initializes storage/app startup
  in [src/webapp/server.ts](src/webapp/server.ts)
- Server context now exposes non-blocking `safeWriteAsync` in
  [src/webapp/context.ts](src/webapp/context.ts)
- M28: 14 agent skill files now reference `templates/sdlc/guardrails/00-global-guardrails.md`
  instead of `.github/copilot-instructions.md`
- M28: Handoff checklist canonical template embedded directly in guardrails (G-GLOB-20)
- M28: Transpiler outputs to real platform convention paths instead of `platform/generated/`
- M28: Documentation references updated (README, user-manual, file-system-reference, etc.)
- README.md: reworded "autonomous" claims to "supervised (human-in-the-loop)"
- README.md: updated test badge from 576 to 1172
- README.md: fixed Technology Stack — added Jest 29 (root) alongside Vitest 4,
  corrected ESLint versions (8 + 10)
- README.md: corrected coverage badge from "95%+" to "70%+ enforced"
- Landing page: updated test count from 122 to 1172
- PR template: added evidence accuracy checklist, split test commands by suite
- CONTRIBUTING.md: updated ESLint section (8 + 10), dual test suite instructions

### Fixed

- Added focused unit coverage for M4 scalability features:
  - Parallel dispatcher behavior in [tests/unit/dispatcher.test.js](tests/unit/dispatcher.test.js)
  - Async store behavior in [tests/unit/store.test.js](tests/unit/store.test.js)
  - Scale prerequisite enforcement in [tests/unit/runtime-profiles.test.js](tests/unit/runtime-profiles.test.js)
- design-tokens.json: text-muted color (#627D98 → #546A7B) to pass WCAG AA 4.5:1
  contrast ratio on light backgrounds
- contrast.test.js: all 29 tests now pass (previously failing due to missing
  `color.light`/`color.dark` structure)

### Removed

- `.github/copilot-instructions.md` — replaced by generated platform-specific
  instruction files via `npm run generate:platform`

---

## [0.3.0] — 2026-03-11 (Sprint 3)

### Added

- M3/E-A4: Semantic Memory and Context Optimization (#689, #718, #719, #720)
  - Added three-tier semantic memory abstraction (`run`, `project`, `org`) with
    per-tier retention policies (0 / 30 days / 90 days) and lazy TTL eviction in
    [platform/engine/semantic-memory.ts](platform/engine/semantic-memory.ts)
  - Added context budgeter with deterministic rank -> truncate pipeline (`budget`,
    `rankItems`, `hardTruncate`, `assembleContext`) and byte-level payload metrics in
    [platform/engine/context-budgeter.ts](platform/engine/context-budgeter.ts)
  - Added citation-enforced retrieval API with keyword search over decisions and docs,
    producing `CitedSnippet` objects with `Citation` metadata, compatible with the
    context budgeter in [platform/engine/retrieval-api.ts](platform/engine/retrieval-api.ts)
  - Added 74 unit tests covering all three modules in
    [tests/unit/semantic-memory.test.js](tests/unit/semantic-memory.test.js),
    [tests/unit/context-budgeter.test.js](tests/unit/context-budgeter.test.js),
    and [tests/unit/retrieval-api.test.js](tests/unit/retrieval-api.test.js)

- Matomo cookieless analytics integration (GDPR-compliant, no consent banner)
- A/B experiment framework on landing page (hero headline split test)
- Docker Compose stack (command-center + Matomo + MariaDB)
- Newsletter subscription endpoint with double opt-in
- Sprint 9 completion report and test plan
- 780 → 809 Vitest tests (contrast tests added)

### Changed

- Landing page social proof section updated

### Closed

- PR #136 — Sprint 3 squash-merge to main (commit `e11141b`)

---

## [0.2.0] — 2026-03-05 (Sprint 2)

### Added

- M3/E-A4: Semantic Memory and Context Optimization (#689, #718, #719, #720)
  - Added three-tier semantic memory abstraction (`run`, `project`, `org`) with
    per-tier retention policies (0 / 30 days / 90 days) and lazy TTL eviction in
    [platform/engine/semantic-memory.ts](platform/engine/semantic-memory.ts)
  - Added context budgeter with deterministic rank -> truncate pipeline (`budget`,
    `rankItems`, `hardTruncate`, `assembleContext`) and byte-level payload metrics in
    [platform/engine/context-budgeter.ts](platform/engine/context-budgeter.ts)
  - Added citation-enforced retrieval API with keyword search over decisions and docs,
    producing `CitedSnippet` objects with `Citation` metadata, compatible with the
    context budgeter in [platform/engine/retrieval-api.ts](platform/engine/retrieval-api.ts)
  - Added 74 unit tests covering all three modules in
    [tests/unit/semantic-memory.test.js](tests/unit/semantic-memory.test.js),
    [tests/unit/context-budgeter.test.js](tests/unit/context-budgeter.test.js),
    and [tests/unit/retrieval-api.test.js](tests/unit/retrieval-api.test.js)

- Command Center web UI v2 (pipeline view, questionnaire management, decisions)
- MCP server with 13 tools and 3 resources
- Mutation audit trail (append-only JSONL)
- File cache with mtime invalidation
- Schema validation for all JSON payloads
- Secret detection utility
- Error catalog with structured responses
- SSE (Server-Sent Events) for real-time updates
- 363 Jest tests (root) + initial Vitest suite
- ESLint configuration (root ESLint 8 + .github/ ESLint 9→10)

---

## [0.1.0] — 2026-02-20 (Sprint 1)

### Added

- M3/E-A4: Semantic Memory and Context Optimization (#689, #718, #719, #720)
  - Added three-tier semantic memory abstraction (`run`, `project`, `org`) with
    per-tier retention policies (0 / 30 days / 90 days) and lazy TTL eviction in
    [platform/engine/semantic-memory.ts](platform/engine/semantic-memory.ts)
  - Added context budgeter with deterministic rank -> truncate pipeline (`budget`,
    `rankItems`, `hardTruncate`, `assembleContext`) and byte-level payload metrics in
    [platform/engine/context-budgeter.ts](platform/engine/context-budgeter.ts)
  - Added citation-enforced retrieval API with keyword search over decisions and docs,
    producing `CitedSnippet` objects with `Citation` metadata, compatible with the
    context budgeter in [platform/engine/retrieval-api.ts](platform/engine/retrieval-api.ts)
  - Added 74 unit tests covering all three modules in
    [tests/unit/semantic-memory.test.js](tests/unit/semantic-memory.test.js),
    [tests/unit/context-budgeter.test.js](tests/unit/context-budgeter.test.js),
    and [tests/unit/retrieval-api.test.js](tests/unit/retrieval-api.test.js)

- Initial project structure with 38 agent skill files
- Phase 1–4 analysis pipeline (Business → Tech → UX → Marketing)
- Orchestrator with checkpoint-and-yield design
- Session state management (`session-state.json`)
- Basic Command Center web UI
- Questionnaire and decision management
- GitHub integration agent (project creation, issue publishing)
- CONTRIBUTING.md, LICENSE (MIT), SECURITY.md

---

[Unreleased]: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/releases/tag/v0.1.0
