---
title: Pipeline Phases
description: The phase sequence and what each phase produces.
keywords:
  - pipeline
  - phases
  - sdlc
---

# Pipeline Phases

The platform uses a phased SDLC pipeline with specialized agents per phase.

## Sequence

`IDLE -> ONBOARDING -> PHASE_1 -> CRITIC_1 -> PHASE_2 -> CRITIC_2 -> PHASE_3 -> CRITIC_3 -> PHASE_4 -> CRITIC_4 -> SYNTHESIS -> SPRINT_GATE -> PHASE_5_EXECUTING -> COMPLETED`

## Phase intent

- `ONBOARDING`: Collect context and initialize execution framing.
- `PHASE_1`: Business discovery and product framing.
- `PHASE_2`: Technical architecture and implementation planning.
- `PHASE_3`: UX, accessibility, and content definition.
- `PHASE_4`: Marketing, brand, and growth planning.
- `SYNTHESIS`: Consolidate outputs and blockers across streams.
- `SPRINT_GATE`: Confirm readiness and backlog quality.
- `PHASE_5_EXECUTING`: Implement, test, review, document, and integrate.

## Critic and risk checks

`CRITIC_1` through `CRITIC_4` act as phase boundary control points for quality, consistency, and risk.
