---
title: Gate Types and Overrides
description: How gate checks work, what blocks movement, and how exceptions are handled.
keywords:
  - pipeline
  - gates
  - approvals
  - overrides
---

# Gate Types and Overrides

Pipeline progression is controlled by explicit gates.

## Gate types

- `gate.critic-risk-1`: PHASE_1 -> PHASE_2
- `gate.critic-risk-2`: PHASE_2 -> PHASE_3
- `gate.critic-risk-3`: PHASE_3 -> PHASE_4
- `gate.critic-risk-4`: PHASE_4 -> SYNTHESIS
- `gate.synthesis-approval`: SYNTHESIS -> SPRINT_GATE
- `gate.sprint-gate`: SPRINT_GATE -> PHASE_5_EXECUTING

## Blocking conditions

A gate remains closed when required phase outputs are incomplete, unresolved blocking items remain, or mandatory validations are missing.

## Overrides and exceptions

Use overrides only through approved governance paths. Every exception should be traceable to an auditable decision record, including who approved it, when it was approved, and what risk was accepted.
