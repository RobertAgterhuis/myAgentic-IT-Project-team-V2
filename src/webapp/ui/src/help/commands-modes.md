---
title: Command Modes
description: Execution modes supported by the platform and how to choose one.
keywords:
  - commands
  - modes
  - create
  - audit
  - feature
---

# Command Modes

Use command modes to select how much of the SDLC flow the platform should run.

## Full-cycle modes

- `CREATE`: Runs business, technical, UX, and marketing phases before synthesis and sprint gate.
- `AUDIT`: Runs a full audit-oriented cycle across the same phase structure.
- `FEATURE`: Runs the full feature cycle across all phases.

## Partial modes

- `CREATE_BUSINESS`: Business-only creation flow.
- `CREATE_TECH`: Technical-only creation flow.
- `CREATE_UX`: UX-only creation flow.
- `CREATE_MARKETING`: Marketing-only creation flow.

## Exception modes

- `SCOPE_CHANGE`: Re-analysis for scope changes.
- `HOTFIX`: Emergency path that allows expedited handling.

## Choosing a mode

Use full-cycle modes when a change needs cross-functional alignment. Use partial modes for focused, low-risk updates in one discipline. Use exception modes only when governance and delivery constraints justify it.
