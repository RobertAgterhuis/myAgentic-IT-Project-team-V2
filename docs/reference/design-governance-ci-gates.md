---
title: Design Governance CI Gates
parent: Reference
nav_order: 21
permalink: /design-governance-ci-gates/
description: CI governance gates for design-system quality and traceability mapping to recommendations and findings.
---

# Design Governance CI Gates

This reference maps each active design-governance CI gate to traceability IDs from the UI audit.

## Scope

The gates below cover lint, tests, and Storybook governance checks for design-system consistency and readability regressions.

## Gate-to-Traceability Map

| Gate                                   | Command                                                                                 | CI Location                                                                                               | Recommendation IDs | Finding IDs      | Purpose                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| UI token/typography governance         | `npm run lint:ui:tokens`                                                                | `.github/workflows/ci.yml` → `Lint & Code Quality` → `Run ESLint` (root `lint` script includes this gate) | `R-010`            | `F-010`, `F-012` | Fails on hardcoded color/font drift and disallowed micro-typography in dense runtime/table targets.                                        |
| Storybook governance                   | `npm run test:storybook-governance --prefix src/webapp/ui`                              | `.github/workflows/ci.yml` → `Unit Tests & Coverage` → `Run Storybook governance gate`                    | `R-010`            | `F-010`, `F-012` | Fails if design-system Storybook governance checks regress.                                                                                |
| Dense-surface contrast regression      | `npm run test:dense-surface-contrast --prefix src/webapp/ui`                            | `.github/workflows/ci.yml` → `Unit Tests & Coverage` → `Run dense-surface contrast gate`                  | `R-011`            | `F-011`          | Validates contrast/readability for dense badges, metadata labels, and table contexts; emits exact `theme/component/state` failure context. |
| Monaco contrast/readability regression | `npm run test:monaco-contrast --prefix src/webapp/ui` (via `test:monaco-governance`)    | `.github/workflows/ci.yml` → `Unit Tests & Coverage` → `Run Monaco governance gate`                       | `R-011`            | `F-011`          | Validates Monaco viewer/editor/diff readability in both themes and reports exact `theme/surface` on failure.                               |
| Monaco contract governance             | `npm run test:monaco-conformance --prefix src/webapp/ui` (via `test:monaco-governance`) | `.github/workflows/ci.yml` → `Unit Tests & Coverage` → `Run Monaco governance gate`                       | `R-010`            | `F-010`, `F-012` | Fails if Monaco contract governance regresses (provider uniqueness, schema bindings, lifecycle/disposal, worker-safety assertions).        |

## Source Traceability

- Recommendation and finding relationships are defined in `ui-audit/design-verdict.md` and `ui-audit/milestones-epics-issues.md`.
- Related implementation issue IDs: `I-014`, `I-015`, `I-018`, `I-019`.

## Maintenance

When adding or renaming governance gates:

1. Update this table with command, CI location, and traceability IDs.
2. Keep CI step names synchronized with the gate labels in this document.
3. Ensure every gate failure emits actionable context (component/state or owner/module).
