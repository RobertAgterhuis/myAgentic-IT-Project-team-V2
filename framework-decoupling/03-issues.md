# Framework Decoupling Issue Backlog

Date: 2026-03-28

Legend:

- Priority: P0 (urgent), P1 (high), P2 (medium), P3 (hardening)
- Type: BREAKING or NON-BREAKING
- Blocking: issue IDs that must complete first

## E-FD-001 Issues

### I-FD-001 (P0, NON-BREAKING)

Title: Define PackManifestV2 schema and validator
Blocking: None
Done when:

- Schema includes commands, stages, transitions, gates, assignments, artifact namespaces, help metadata.
- Runtime loader validates against schemaVersion.

### I-FD-002 (P0, NON-BREAKING)

Title: Introduce WorkflowDefinition and StageDefinition contracts in kernel
Blocking: I-FD-001
Done when:

- Kernel interfaces exist with docs.
- Existing SDLC state model maps to contracts via adapter.

### I-FD-003 (P0, BREAKING)

Title: Replace hardcoded command enum contracts with metadata-backed command definitions
Blocking: I-FD-001
Done when:

- API supports dynamic command catalog.
- Compatibility mode still returns legacy aliases.

## E-FD-002 Issues

### I-FD-010 (P0, NON-BREAKING)

Title: Build runtime graph compiler from pack manifest
Blocking: I-FD-002
Evidence touchpoints:

- [platform/engine/dispatcher.ts](platform/engine/dispatcher.ts)
- [platform/schema/agents.json](platform/schema/agents.json)

### I-FD-011 (P0, BREAKING)

Title: Remove static AGENT_GROUPS in dispatcher and read group topology from pack
Blocking: I-FD-010
Evidence touchpoints:

- [platform/engine/dispatcher.ts](platform/engine/dispatcher.ts)

### I-FD-012 (P0, NON-BREAKING)

Title: Remove default skillsDir templates/sdlc assumption from dispatcher config
Blocking: I-FD-010
Evidence touchpoints:

- [platform/engine/dispatcher.ts](platform/engine/dispatcher.ts)

### I-FD-013 (P1, NON-BREAKING)

Title: Add runtime diagnostics endpoint for compiled pack graph
Blocking: I-FD-010
Done when:

- API exposes active pack graph, compiled states, assignments, and validation warnings.

## E-FD-003 Issues

### I-FD-020 (P0, BREAKING)

Title: Refactor gate-validator to resolve contract and guardrail sets from active pack
Blocking: I-FD-001, I-FD-010
Evidence touchpoints:

- [platform/engine/gate-validator.ts](platform/engine/gate-validator.ts)

### I-FD-021 (P0, BREAKING)

Title: Replace CRITIC_TO_PHASE hardcoding with pack transition definitions
Blocking: I-FD-020
Evidence touchpoints:

- [platform/engine/gate-validator.ts](platform/engine/gate-validator.ts)
- [platform/engine/engine.ts](platform/engine/engine.ts)

### I-FD-022 (P1, NON-BREAKING)

Title: Introduce generic GateEvaluationResult format
Blocking: I-FD-020
Done when:

- Gate result fields are pack-neutral and stable for UI rendering.

### I-FD-023 (P1, NON-BREAKING)

Title: Add pack policy resolver for gate-level governance checks
Blocking: I-FD-020

## E-FD-004 Issues

### I-FD-030 (P1, NON-BREAKING)

Title: Move SDLC command/stage definitions into templates/sdlc pack metadata section
Blocking: I-FD-001, I-FD-010
Evidence touchpoints:

- [templates/sdlc/manifest.json](templates/sdlc/manifest.json)

### I-FD-031 (P1, NON-BREAKING)

Title: Migrate SDLC artifact namespace rules from BusinessDocs assumptions to pack namespace map
Blocking: I-FD-030
Evidence touchpoints:

- [platform/engine/engine.ts](platform/engine/engine.ts)
- [platform/sdlc/artifacts.ts](platform/sdlc/artifacts.ts)

### I-FD-032 (P1, BREAKING)

Title: Extract SDLC-specific messages/log labels from kernel
Blocking: I-FD-030
Evidence touchpoints:

- [platform/engine/engine.ts](platform/engine/engine.ts)
- [platform/engine/runtime-adapter/prompt-assembly.ts](platform/engine/runtime-adapter/prompt-assembly.ts)

### I-FD-033 (P1, NON-BREAKING)

Title: Add session migration adapter for old SDLC state snapshots
Blocking: I-FD-002
Done when:

- Existing session-state files can be loaded after contract migration.

## E-FD-005 Issues

### I-FD-040 (P0, BREAKING)

Title: Refactor orchestrator command endpoint to use pack command catalog
Blocking: I-FD-003, I-FD-030
Evidence touchpoints:

- [src/webapp/routes/orchestrator.ts](src/webapp/routes/orchestrator.ts)

### I-FD-041 (P1, BREAKING)

Title: Replace state-to-session phase mapping with pack lifecycle metadata
Blocking: I-FD-040
Evidence touchpoints:

- [src/webapp/routes/orchestrator.ts](src/webapp/routes/orchestrator.ts)

### I-FD-042 (P1, NON-BREAKING)

Title: Add endpoint GET /api/orchestrator/pack-metadata
Blocking: I-FD-040
Done when:

- Endpoint returns commands, stages, gates, labels, help topics, and capabilities for active pack.

### I-FD-043 (P1, BREAKING)

Title: Generalize artifact path assumptions in chat/rag/cockpit routes
Blocking: I-FD-031
Evidence touchpoints:

- [src/webapp/routes/chat.ts](src/webapp/routes/chat.ts)
- [src/webapp/routes/rag.ts](src/webapp/routes/rag.ts)
- [src/webapp/routes/misc-observability.ts](src/webapp/routes/misc-observability.ts)
- [src/webapp/routes/cockpit.ts](src/webapp/routes/cockpit.ts)

## E-FD-006 Issues

### I-FD-050 (P1, BREAKING)

Title: Convert OrchestratorCommandName UI type from static union to API-driven model
Blocking: I-FD-042
Evidence touchpoints:

- [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts)

### I-FD-051 (P1, BREAKING)

Title: Make commands page render dynamic quick actions and recommendations
Blocking: I-FD-050
Evidence touchpoints:

- [src/webapp/ui/src/pages/commands/commands-page.tsx](src/webapp/ui/src/pages/commands/commands-page.tsx)

### I-FD-052 (P1, BREAKING)

Title: Make pipeline page render dynamic stage sequence and gate guidance
Blocking: I-FD-042
Evidence touchpoints:

- [src/webapp/ui/src/pages/pipeline/pipeline-page.tsx](src/webapp/ui/src/pages/pipeline/pipeline-page.tsx)

### I-FD-053 (P1, BREAKING)

Title: Make intervention console reroute options stage/mode metadata-driven
Blocking: I-FD-042
Evidence touchpoints:

- [src/webapp/ui/src/components/cockpit/intervention-console.tsx](src/webapp/ui/src/components/cockpit/intervention-console.tsx)

### I-FD-054 (P1, NON-BREAKING)

Title: Introduce pack-aware help content registry and route mapping
Blocking: I-FD-042
Evidence touchpoints:

- [src/webapp/ui/src/help/pipeline-phases.md](src/webapp/ui/src/help/pipeline-phases.md)
- [src/webapp/ui/src/help/pipeline-gates.md](src/webapp/ui/src/help/pipeline-gates.md)

### I-FD-055 (P2, NON-BREAKING)

Title: Add pack switch UX in admin/runtime settings
Blocking: I-FD-050

## E-FD-007 Issues

### I-FD-060 (P2, NON-BREAKING)

Title: Create second reference domain pack (non-SDLC)
Blocking: I-FD-030, I-FD-050
Done when:

- Pack declares unique commands/stages and runs end-to-end.

### I-FD-061 (P2, BREAKING)

Title: Validate two-pack coexistence in one deployment
Blocking: I-FD-060
Done when:

- Switching active pack does not require kernel code change.

### I-FD-062 (P2, NON-BREAKING)

Title: Add cross-pack regression suite for runtime + UI + routes
Blocking: I-FD-061

## E-FD-008 Issues

### I-FD-070 (P3, BREAKING)

Title: Remove deprecated legacy SDLC compatibility adapters
Blocking: I-FD-062

### I-FD-071 (P3, NON-BREAKING)

Title: Publish migration runbook and operational rollback procedures
Blocking: I-FD-062

### I-FD-072 (P3, NON-BREAKING)

Title: Enforce pack metadata completeness checks in CI
Blocking: I-FD-062

## E-FD-009 Issues

### I-FD-080 (P1, NON-BREAKING)

Title: Integrate Monaco ESM in React/Vite UI shell with worker-safe configuration
Blocking: I-FD-042, I-FD-050
Done when:

- Monaco loads from ESM bundle with explicit worker setup over http/https.
- Editor boot path is centralized in an EditorShell module.
  Evidence touchpoints:
- [src/webapp/ui/src/main.tsx](src/webapp/ui/src/main.tsx)
- [src/webapp/ui/src/App.tsx](src/webapp/ui/src/App.tsx)

### I-FD-081 (P1, BREAKING)

Title: Implement MonacoModelRegistry with stable URI strategy for workspace/repo/artifact/decision/policy objects
Blocking: I-FD-080
Done when:

- URI mapper supports workspace-aware object namespaces.
- Editor instances attach to existing models instead of ad hoc buffers.
  Evidence touchpoints:
- [src/webapp/ui/src/lib/api-types.ts](src/webapp/ui/src/lib/api-types.ts)
- [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx)

### I-FD-082 (P1, NON-BREAKING)

Title: Implement three Monaco surfaces: read-only viewer, editable file editor, and diff review pane
Blocking: I-FD-081
Done when:

- DiffReviewPane supports original/modified models and review workflows.
- ArtifactViewerPane and CodeEditorPane share EditorShell lifecycle.
  Evidence touchpoints:
- [src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx](src/webapp/ui/src/pages/artifacts/artifact-browser-page.tsx)
- [src/webapp/ui/src/pages/approvals/approval-center-page.tsx](src/webapp/ui/src/pages/approvals/approval-center-page.tsx)

### I-FD-083 (P1, NON-BREAKING)

Title: Add view-state persistence and disposal lifecycle controls for Monaco models/editors
Blocking: I-FD-081
Done when:

- Per-URI editor view state is restored.
- Model and editor disposables are cleaned on close/unmount.
  Evidence touchpoints:
- [src/webapp/ui/src/pages/sessions/session-detail-page.tsx](src/webapp/ui/src/pages/sessions/session-detail-page.tsx)

### I-FD-084 (P2, NON-BREAKING)

Title: Add line-level evidence rendering and patch review overlays in Monaco diff pane
Blocking: I-FD-082, I-FD-083
Done when:

- Gate failures, approvals, and evidence references can decorate diff lines.
  Evidence touchpoints:
- [src/webapp/ui/src/components/cockpit/intervention-console.tsx](src/webapp/ui/src/components/cockpit/intervention-console.tsx)
- [src/webapp/ui/src/pages/observability/observability-page.tsx](src/webapp/ui/src/pages/observability/observability-page.tsx)

## E-FD-010 Issues

### I-FD-090 (P2, NON-BREAKING)

Title: Implement pack-capable Monaco ProviderRegistry (hover/completion/codelens)
Blocking: I-FD-082, I-FD-042
Done when:

- Packs can register providers via metadata contracts.
- Core editor remains domain-agnostic.

### I-FD-091 (P2, NON-BREAKING)

Title: Implement governance overlays in Monaco (read-only by policy, provenance, decision/gate annotations)
Blocking: I-FD-090, I-FD-023
Done when:

- Governance mode can enforce read-only and annotate risk/decision context.

### I-FD-092 (P2, BREAKING)

Title: Introduce URI-aware schema binding for JSON/YAML contracts and policy documents
Blocking: I-FD-090
Done when:

- Schema resolution follows stable URI mapping across packs.

### I-FD-093 (P3, NON-BREAKING)

Title: Add pack-level Monaco capability conformance tests in CI
Blocking: I-FD-090, I-FD-072
Done when:

- CI validates provider registration, model lifecycle, and worker behavior per pack.

## Priority Buckets

## P0 (must start first)

- I-FD-001, I-FD-002, I-FD-003, I-FD-010, I-FD-011, I-FD-020, I-FD-021, I-FD-040

## P1 (build once P0 foundations are stable)

- I-FD-012, I-FD-013, I-FD-022, I-FD-023, I-FD-030, I-FD-031, I-FD-032, I-FD-033, I-FD-041, I-FD-042, I-FD-043, I-FD-050, I-FD-051, I-FD-052, I-FD-053, I-FD-054, I-FD-080, I-FD-081, I-FD-082, I-FD-083

## P2 (proof and expansion)

- I-FD-055, I-FD-060, I-FD-061, I-FD-062, I-FD-084, I-FD-090, I-FD-091, I-FD-092

## P3 (cleanup and long-tail hardening)

- I-FD-070, I-FD-071, I-FD-072, I-FD-093

## Explicit Blocking Sequence (Program Order)

1. I-FD-001 -> I-FD-002 -> I-FD-010
2. I-FD-010 -> I-FD-011 and I-FD-020
3. I-FD-020 -> I-FD-021 -> I-FD-030
4. I-FD-030 -> I-FD-040 -> I-FD-042 -> I-FD-050
5. I-FD-050 -> I-FD-051, I-FD-052, I-FD-053
6. I-FD-031 -> I-FD-043
7. I-FD-042 -> I-FD-080 -> I-FD-081 -> I-FD-082 -> I-FD-090
8. I-FD-090 -> I-FD-091 and I-FD-092
9. I-FD-060 -> I-FD-061 -> I-FD-062 -> I-FD-070/71/72/93
