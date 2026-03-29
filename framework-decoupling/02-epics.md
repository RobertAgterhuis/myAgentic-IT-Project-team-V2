# Framework Decoupling Epics

Date: 2026-03-28

## E-FD-001 (P0): Generic Workflow Contract Model

Objective:

- Introduce pack-neutral runtime contracts and schema versioning.

Scope:

- WorkflowDefinition, StageDefinition, GateDefinition, AssignmentDefinition, ArtifactNamespaceDefinition, PackManifestV2.

Depends on:

- None.

Blocks:

- E-FD-002, E-FD-003, E-FD-005.

## E-FD-002 (P0): Runtime Graph Compilation from Pack Metadata

Objective:

- Replace static state/agent/group constants with compiled execution graphs from active pack.

Scope:

- Dispatcher graph compiler.
- Runtime to schema mapping removal.
- Dynamic agent-group scheduling.

Depends on:

- E-FD-001.

Blocks:

- E-FD-003, E-FD-004, E-FD-006.

## E-FD-003 (P0/P1): Gate and Validation Decoupling

Objective:

- Externalize gate, phase-contract, and guardrail decisions from core runtime.

Scope:

- Gate-validator resolver plugin.
- Critic/phase mapping via pack metadata.
- Pack-owned gate policies.

Depends on:

- E-FD-001 and E-FD-002.

Blocks:

- E-FD-006.

## E-FD-004 (P1): SDLC Pack-v1 Extraction and Parity

Objective:

- Move all SDLC semantics out of kernel into SDLC pack with no behavior regression.

Scope:

- Pack-owned commands, phases, artifacts, help metadata.
- Legacy adapter for active sessions.

Depends on:

- E-FD-002 and E-FD-003.

Blocks:

- E-FD-005 and E-FD-007.

## E-FD-005 (P1): API Contract Modernization (Pack-aware)

Objective:

- Replace hardcoded command/state enums in APIs with metadata-driven contract responses.

Scope:

- New endpoints for pack capabilities and lifecycle metadata.
- Route-level compatibility mode responses.

Depends on:

- E-FD-001 and E-FD-004.

Blocks:

- E-FD-006.

## E-FD-006 (P1/P2): UI Metadata-driven Runtime Experience

Objective:

- Remove SDLC literals from command selection, pipeline rendering, intervention controls, and help.

Scope:

- UI model migration to runtime metadata.
- Dynamic labels, statuses, and gate cards.

Depends on:

- E-FD-005.

Blocks:

- E-FD-007.

## E-FD-007 (P2): Second Pack Reference Implementation

Objective:

- Build a non-SDLC pack to prove architecture validity.

Scope:

- Minimal but complete pack with commands, stages, gates, artifacts, help content.
- E2E test pack switching.

Depends on:

- E-FD-004 and E-FD-006.

Blocks:

- E-FD-008.

## E-FD-008 (P3): Deprecation, Cleanup, and Operational Hardening

Objective:

- Remove legacy SDLC assumptions from kernel and finalize migration docs.

Scope:

- Delete compatibility shims after adoption window.
- Final docs and runbook updates.

Depends on:

- E-FD-007.

Blocks:

- Program closure.

## E-FD-009 (P1/P2): Monaco Core Editor Subsystem

Objective:

- Implement Monaco as a framework-shell subsystem with URI-driven model registry and first-class diff/editor surfaces.

Scope:

- Monaco ESM + worker-safe integration.
- EditorShell, CodeEditorPane, DiffReviewPane, ArtifactViewerPane.
- MonacoModelRegistry, UriMapper, ViewStateStore, disposal management.

Depends on:

- E-FD-005 and E-FD-006.

Blocks:

- E-FD-010 and E-FD-007.

## E-FD-010 (P2): Pack-Provided Monaco Intelligence and Governance Overlays

Objective:

- Enable domain packs to contribute Monaco providers and governance overlays without core editor rewrites.

Scope:

- ProviderRegistry for hover/completion/codelens.
- DecorationManager for decisions/gates/risks/provenance markers.
- Pack capability contracts for schema mapping and URI-aware metadata resolution.

Depends on:

- E-FD-009.

Blocks:

- E-FD-008.
