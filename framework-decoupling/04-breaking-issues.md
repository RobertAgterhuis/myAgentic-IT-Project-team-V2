# Framework Decoupling Breaking Issues Register

Date: 2026-03-28

Purpose:

- Central register for planned breaking changes, impact zones, and mitigation strategy.

## BR-001

Title: Command contract migration from fixed enum to metadata-driven catalog
Related issues: I-FD-003, I-FD-040, I-FD-050
Impact:

- Backend command validation
- UI type models and forms
- Existing clients expecting fixed enum values
  Mitigation:
- Versioned endpoint response
- Legacy aliases preserved for one deprecation cycle
- Compatibility adapter in route layer

## BR-002

Title: State model migration from SDLC literals to generic stage keys
Related issues: I-FD-021, I-FD-041, I-FD-052
Impact:

- Session status serialization
- Pipeline rendering
- Telemetry and logs
  Mitigation:
- Stage alias map for old sessions
- Migration adapter for session-state read path
- Dual-write stage keys in transition period

## BR-003

Title: Dispatcher execution groups no longer static AGENT_GROUPS
Related issues: I-FD-011
Impact:

- Agent scheduling semantics
- Execution ordering assumptions in tests
  Mitigation:
- Deterministic graph compiler
- Contract tests for group ordering per pack

## BR-004

Title: Gate evaluation no longer tied to CRITIC_TO_PHASE constants
Related issues: I-FD-020, I-FD-021
Impact:

- Gate validator behavior
- Existing gate diagnostics consumers
  Mitigation:
- Canonical GateEvaluationResult response
- Legacy field mapping in diagnostics route

## BR-005

Title: Artifact namespace no longer BusinessDocs-only
Related issues: I-FD-031, I-FD-043
Impact:

- Chat, RAG, observability, cockpit file lookups
- Indexing path assumptions
  Mitigation:
- Namespace resolver service
- Pack-defined artifact collections
- Fallback compatibility to BusinessDocs during migration

## BR-006

Title: Help and UX guidance rendered from pack metadata
Related issues: I-FD-054
Impact:

- Static markdown references and test snapshots
- User education and onboarding flow
  Mitigation:
- Pack help registry with defaults
- Snapshot refresh strategy and migration notes

## BR-007

Title: Removal of compatibility shims
Related issues: I-FD-070
Impact:

- Any old clients still depending on SDLC hardcoded API surface
  Mitigation:
- Track compatibility usage telemetry
- Remove only after zero-usage threshold period

## BR-008

Title: Monaco integration contract shift from plain text surfaces to URI-driven editor subsystem
Related issues: I-FD-081, I-FD-082, I-FD-092
Impact:

- UI editing/viewing flows and diff review behavior
- Artifact and policy document editing assumptions
- Provider integration contracts for packs
  Mitigation:
- EditorShell abstraction over Monaco public API only
- URI mapper and model registry compatibility layer for legacy paths
- Incremental rollout by feature flag and pack capability checks

## Breaking Change Priority

P0:

- BR-001, BR-002, BR-004

P1:

- BR-003, BR-005

P2:

- BR-006

P3:

- BR-007

Monaco-related:

- BR-008 (P1/P2)

## Breaking Change Release Policy

1. Breaking changes require schema version bump and changelog entry.
2. Every breaking issue must include rollback path and data migration test.
3. No breaking removal allowed until compatibility telemetry confirms safe cutoff.
