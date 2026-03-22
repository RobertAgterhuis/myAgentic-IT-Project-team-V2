---
title: Session Lifecycle
description: How sessions start, progress through phases, and finalize.
keywords:
  - sessions
  - lifecycle
  - state
---

# Session Lifecycle

Sessions track the state of work from intake to completion.

## Lifecycle stages

- Session starts with context loading and mode selection.
- Execution proceeds through phase and gate transitions.
- Outputs are persisted to project files and state artifacts.
- Session ends when execution completes or is paused for reevaluation.

## Persistence model

- Session state captures active phase, completed work, and pending actions.
- Deliverables are written to disk as the source of record.
- Follow-up runs use saved state to continue without losing context.

## Operational guidance

- Keep scope stable within a session when possible.
- Use reevaluation mode when questionnaire answers or requirements change.
- Record unresolved items clearly so subsequent runs can continue predictably.
