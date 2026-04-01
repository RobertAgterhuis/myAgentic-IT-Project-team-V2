# To-Delete Report

Date: 2026-03-31
Scope: full repository static scan (tracked files)

## Scan Method

1. Path and filename inventory of tracked files.
2. Repository-wide marker scan for deprecated and legacy signals.
3. Reference scan for scripts (referenced from package scripts, workflows, and code).
4. Classification by confidence.

## High-Confidence Delete Candidates

1. scripts/migrate-storage.ts

- Reason: no references found outside scripts folder.
- Signal: UNREFERENCED_SCRIPT from repository grep-based reference scan.
- Suggested action: delete.

## Previously Removed in This Branch

1. scripts/audit-handoff-compliance.mjs
2. scripts/coverage-aggregate.js
3. scripts/import-final-traceability-to-github.mjs
4. scripts/install-hooks.js
5. scripts/migrate-decisions-answer-format.ts

## Legacy Signals Found But Not Safe To Delete

1. platform/engine/state-machine.ts

- Uses legacy/schema dual-source flow handling.
- Appears to be active compatibility logic.

2. platform/engine/flow-loader.ts

- Uses legacy transformation helpers for flow compatibility.

3. platform/engine/agent-registry.ts and platform/schema/agent-registry files

- Contains legacyId compatibility fields that are still referenced.

4. package.json legacy test lanes

- test:legacy and test:coverage:legacy are still wired into test and coverage workflows.

## Generated/Artifact Files Reviewed

1. eslint-output.json

- Referenced by src/webapp/services/policy-service.ts and related tests.
- Not safe to delete.

## Result Summary

- Confirmed deletable now: 1 file
- Already removed in branch: 5 files
- Legacy code paths retained: active compatibility/runtime usage detected
