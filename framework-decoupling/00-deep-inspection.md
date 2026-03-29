# Framework Decoupling Deep Inspection

Date: 2026-03-28
Scope: Platform kernel, orchestration runtime, route/API contracts, and UI behavior

## 1. Inspection Method

1. Reviewed core engine, dispatcher, gate-validator, template-loader, canonical schema, and SDLC modules.
2. Reviewed orchestration API routes and command validation surface.
3. Reviewed UI routes, pipeline/commands screens, intervention controls, API types, and help content.
4. Classified coupling points by severity and migration risk.

## 2. Executive Findings

The repository has a strong generic base (workspace/project model, governance and approvals, memory, provider/runtime abstractions), but orchestration behavior and UX still assume a single SDLC domain in many critical paths.

### Coupling severity summary

- Critical coupling: runtime state model, command model, gate model, agent grouping, and artifact path conventions.
- High coupling: route contract enums and UI types/help text hardcoded to SDLC commands and phases.
- Medium coupling: defaults and naming in logs/messages and identity/governance defaults.

## 3. Platform Findings (Backend + Engine)

### 3.1 Workflow state model is SDLC-specific at schema level

Evidence:

- [platform/schema/flows.json](platform/schema/flows.json)

Findings:

- Canonical states include PHASE_1..PHASE_5_EXECUTING, CRITIC_1..4, SYNTHESIS, SPRINT_GATE.
- Mode catalog is SDLC-specific (CREATE, AUDIT, FEATURE, HOTFIX, CREATE_BUSINESS variants).
- Gate definitions encode SDLC phase boundaries explicitly.

Impact:

- Current canonical flow schema is not reusable for non-SDLC domain packs without schema and runtime changes.

### 3.2 Dispatcher is hardwired to SDLC phase topology and agent IDs

Evidence:

- [platform/engine/dispatcher.ts](platform/engine/dispatcher.ts)
- [platform/schema/agents.json](platform/schema/agents.json)

Findings:

- Runtime mapping is tied to specific SDLC states via RUNTIME_TO_SCHEMA_PHASE.
- AGENT_GROUPS are hardcoded with fixed numeric agent IDs per SDLC phase.
- Default skillsDir points to templates/sdlc/agents.
- Comments and defaults explicitly document SDLC assumptions.

Impact:

- Any second pack would require core dispatcher edits instead of pack configuration.

### 3.3 Engine still contains SDLC gate and artifact assumptions

Evidence:

- [platform/engine/engine.ts](platform/engine/engine.ts)
- [platform/engine/artifact-registration.ts](platform/engine/artifact-registration.ts)

Findings:

- PHASE_GATE_TRANSITION_MAP is hardcoded to CRITIC_N -> PHASE_N transitions.
- Default artifact output path remains BusinessDocs.
- Imports from platform/sdlc/artifacts are directly inside engine core.

Impact:

- Core lifecycle cannot remain domain-agnostic while carrying SDLC transition and artifact semantics.

### 3.4 Gate validator still embeds SDLC contract/guardrail map defaults

Evidence:

- [platform/engine/gate-validator.ts](platform/engine/gate-validator.ts)

Findings:

- CONTRACTS_DIR and GUARDRAILS_DIR defaults point to templates/sdlc.
- CRITIC_TO_PHASE, PHASE_GUARDRAILS, PHASE_CONTRACTS are in core code.

Impact:

- Gating strategy is not pack-provided yet; core is domain-coupled.

### 3.5 Template system exists and is the strongest decoupling lever

Evidence:

- [platform/engine/template-loader.ts](platform/engine/template-loader.ts)
- [templates/sdlc/manifest.json](templates/sdlc/manifest.json)

Findings:

- Template discovery, loading, and validation are in place.
- Manifest already carries phase contracts, guardrails, criticToPhase, modes, artifacts, lineage.
- This is the right abstraction point to move hardcoded runtime behavior into pack manifests.

Impact:

- Decoupling can be done incrementally without rewrite by moving ownership from hardcoded constants to pack metadata.

### 3.6 SDLC domain module boundary exists but is not isolated from kernel

Evidence:

- [platform/sdlc/index.ts](platform/sdlc/index.ts)
- [platform/sdlc/entities.ts](platform/sdlc/entities.ts)
- [platform/sdlc/artifacts.ts](platform/sdlc/artifacts.ts)

Findings:

- SDLC domain package is explicit and rich.
- Engine-level imports still pull SDLC module types/classes directly.

Impact:

- Clear extraction path exists: invert dependencies so kernel consumes generic interfaces and packs provide implementations.

## 4. API and Route Surface Findings

### 4.1 Orchestrator command endpoint validates SDLC command set directly

Evidence:

- [src/webapp/routes/orchestrator.ts](src/webapp/routes/orchestrator.ts)

Findings:

- VALID_COMMANDS is hardcoded to SDLC set.
- Decisions seeding writes into BusinessDocs convention directly.

Impact:

- Command catalog cannot vary by pack; route contract migration required.

### 4.2 State-to-session mapping is SDLC-specific

Evidence:

- [src/webapp/routes/orchestrator.ts](src/webapp/routes/orchestrator.ts)

Findings:

- toSessionPhase maps PHASE_N and CRITIC_N to PHASE-1..PHASE-5 labels.
- Parallel tracked states currently fixed.

Impact:

- Session telemetry and dashboards remain tied to SDLC nomenclature.

### 4.3 Multiple routes assume BusinessDocs artifact namespace

Evidence:

- [src/webapp/routes/chat.ts](src/webapp/routes/chat.ts)
- [src/webapp/routes/rag.ts](src/webapp/routes/rag.ts)
- [src/webapp/routes/misc-observability.ts](src/webapp/routes/misc-observability.ts)
- [src/webapp/routes/cockpit.ts](src/webapp/routes/cockpit.ts)

Findings:

- File-system path assumptions are hardcoded for BusinessDocs and SDLC phase folders.

Impact:

- Pack-specific storage layout is currently unsupported without route modifications.

## 5. UI Findings

### 5.1 UI API types hardcode SDLC command enum

Evidence:

- [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts)

Findings:

- OrchestratorCommandName type is a fixed SDLC union.

Impact:

- UI cannot dynamically render command catalog from pack metadata.

### 5.2 Pipeline page and intervention controls use phase/mode assumptions

Evidence:

- [src/webapp/ui/src/pages/pipeline/pipeline-page.tsx](src/webapp/ui/src/pages/pipeline/pipeline-page.tsx)
- [src/webapp/ui/src/components/cockpit/intervention-console.tsx](src/webapp/ui/src/components/cockpit/intervention-console.tsx)

Findings:

- Guidance text references CREATE/AUDIT/FEATURE/HOTFIX.
- Default reroute phase is PHASE_5_EXECUTING.

Impact:

- UI cannot be reused as-is for a non-SDLC pack.

### 5.3 Help docs encode SDLC pipeline and gate taxonomy

Evidence:

- [src/webapp/ui/src/help/pipeline-phases.md](src/webapp/ui/src/help/pipeline-phases.md)
- [src/webapp/ui/src/help/pipeline-gates.md](src/webapp/ui/src/help/pipeline-gates.md)
- [src/webapp/ui/src/pages/commands/commands-page.tsx](src/webapp/ui/src/pages/commands/commands-page.tsx)

Findings:

- User-facing guidance is SDLC-first language and sequence.

Impact:

- Needs pack-aware content registry and dynamic documentation selection.

### 5.4 No Monaco editor subsystem exists yet (strategic gap)

Evidence:

- [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx)
- [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx)
- [src/webapp/ui/src/pages/commands/commands-page.tsx](src/webapp/ui/src/pages/commands/commands-page.tsx)

Findings:

- Current UI is React/Vite and ready for Monaco ESM integration, but there is no centralized editor runtime.
- There is no model registry keyed by stable workspace/repo/artifact URIs.
- There is no standardized diff review pane with reusable lifecycle/disposal semantics.
- Provider hooks (hover/completion/codelens) are not abstracted as pack-provided capabilities.

Impact:

- Decoupled framework lacks a reusable editing substrate for multi-pack workflows.
- If Monaco is added as ad hoc widgets per page, coupling and lifecycle risks will increase.

## 6. What Is Already Reusable (Core Candidate)

- Workspace/project/repository abstraction and corresponding UI pages.
- Governance/approvals identity and policy surfaces.
- Runtime adapter patterns and provider abstraction.
- State persistence, run history, and event tracking patterns.
- Template/manifest loading foundation.

## 7. Blocking Order (Technical Critical Path)

1. Define generic kernel contracts and backward-compatible adapters.
2. Move dispatcher/engine/gate defaults behind pack manifest resolver.
3. Introduce command and state metadata endpoint for UI dynamic rendering.
4. Introduce Monaco editor subsystem in framework shell (ESM, URI model registry, diff/editor surfaces, provider registry, worker-safe setup, lifecycle management).
5. Migrate UI to metadata-driven commands, phases, help, and editor integration.
6. Prove with second non-SDLC pack and pack-provided Monaco capabilities.

## 8. Risk Register (Top)

- Contract break risk: existing route consumers rely on fixed command/state enums.
- Data migration risk: BusinessDocs path assumptions across indexing, cockpit, and chat.
- Test fragility risk: large set of tests and fixtures encode SDLC constants.
- Operational risk: without compatibility mode, in-flight sessions may become unreadable.

## 9. Recommendation

Proceed with progressive extraction using compatibility mode and schema-versioned contracts. Do not remove SDLC assumptions in one cut. Keep SDLC as pack-v1 and prove abstraction with pack-v2 before hard deprecations.
