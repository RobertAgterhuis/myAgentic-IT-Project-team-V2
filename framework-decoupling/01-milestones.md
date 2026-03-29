# Framework Decoupling Milestones

Date: 2026-03-28
Program: Domain-agnostic framework extraction with SDLC as pack-v1

## Milestone Overview

## M-FD-01 (P0): Kernel Contract Foundation and Compatibility Layer

Goal:

- Define framework contracts independent of SDLC semantics while keeping current runtime behavior stable.

Success criteria:

- New generic contract types are introduced and versioned.
- Existing SDLC behavior runs unchanged via compatibility adapters.
- No production route contract break.

Blockers:

- Must complete before M-FD-02 and all downstream milestones.

Primary outputs:

- Generic workflow, stage, gate, assignment, artifact namespace contract definitions.
- Compatibility mapping from existing SDLC states/commands.

## M-FD-02 (P0/P1): Runtime Decoupling (Engine, Dispatcher, Gateing)

Goal:

- Move hardcoded SDLC logic out of runtime core into pack-provided metadata.

Success criteria:

- Engine, dispatcher, and gate-validator consume resolved pack definitions only.
- No hardcoded AGENT_GROUPS, CRITIC_TO_PHASE, or templates/sdlc defaults in kernel.

Blockers:

- Depends on M-FD-01 contract definitions.

Primary outputs:

- Pack resolver service.
- Runtime execution graph compilation from pack manifest.
- Gate policy/contract resolution from active pack.

## M-FD-03 (P1): SDLC Pack-v1 Formalization

Goal:

- Re-home all SDLC semantics as explicit pack assets and APIs.

Success criteria:

- SDLC behavior remains functionally identical.
- SDLC-specific state/mode/artifact/help definitions live in pack-owned assets.

Blockers:

- Depends on M-FD-02 runtime support.

Primary outputs:

- templates/sdlc upgraded to full pack contract.
- Legacy compatibility flags documented and tested.

## M-FD-04 (P1/P2): API and UI Pack-aware Experience

Goal:

- Make route contracts and UI render from pack metadata rather than SDLC literals.

Success criteria:

- Command list, phase sequence, gate labels, and help content are metadata-driven.
- UI can switch packs without code edits in core pages.

Blockers:

- Depends on M-FD-02 and M-FD-03.

Primary outputs:

- New metadata endpoints.
- UI type/model migration from unions to schema-driven models.

## M-FD-05 (P2/P3): Second Pack Proof and Hardening

Goal:

- Prove decoupling with a second non-SDLC domain pack and run full E2E validations.

Success criteria:

- Second pack executes without kernel edits.
- Regression matrix passes for both SDLC and second pack.

Blockers:

- Depends on M-FD-04 pack-aware UI and APIs.

Primary outputs:

- Pack-v2 reference implementation.
- Cross-pack compatibility/performance test suite.

## M-FD-06 (P1/P2): Monaco Editor Subsystem in Framework Shell

Goal:

- Implement Monaco as a framework-core editor subsystem (not SDLC-specific) with URI-driven models and pack-extensible providers.

Success criteria:

- Monaco ESM integration is stable in React/Vite with worker-safe setup.
- Central model registry uses stable URIs for workspace/repo/artifact/decision/policy objects.
- Three editor surfaces exist: read-only viewer, single-file editor, and diff review editor.
- Provider registry supports pack-contributed hover/completion/codelens and decorations.
- Lifecycle management includes model/editor disposal and per-URI view-state restore.

Blockers:

- Depends on M-FD-04 API/UI metadata and pack model availability.

Primary outputs:

- EditorShell, MonacoModelRegistry, UriMapper, ViewStateStore, ProviderRegistry, DecorationManager.
- Pack capability contracts for Monaco providers.

## Cross-Milestone Dependency Chain

1. M-FD-01 -> 2. M-FD-02 -> 3. M-FD-03 -> 4. M-FD-04 -> 5. M-FD-06 -> 6. M-FD-05

Critical path:

- Contracts first, then runtime decoupling, then SDLC extraction, then UI/API dynamic rendering, then Monaco core subsystem, then second-pack proof.

## Milestone Risk Gates

Before closing each milestone:

- P0 gate: no API break without compatibility shim.
- P1 gate: SDLC parity tests pass.
- P2 gate: pack metadata completeness check passes.
- Monaco gate: editor subsystem passes model lifecycle, worker, and diff review reliability checks.
- P3 gate: second-pack E2E pass plus migration docs complete.
