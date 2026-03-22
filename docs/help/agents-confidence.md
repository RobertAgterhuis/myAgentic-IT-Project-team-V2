---
title: Confidence Scores
description: How to interpret confidence indicators for agent outputs.
keywords:
  - agents
  - confidence
  - quality
---

# Confidence Scores

Confidence values indicate how strongly an agent output is supported by available evidence and validation.

## Interpretation bands

- High confidence: Evidence is explicit, sources are cited, and checks are complete.
- Medium confidence: Core findings are supported, but one or more assumptions remain.
- Low confidence: Missing inputs, unresolved uncertainty, or limited verification.

## How confidence is improved

- Add concrete source references.
- Resolve `UNCERTAIN` and `INSUFFICIENT_DATA` items.
- Complete mandatory checklists and gate validations.

## Operator guidance

Treat low-confidence outputs as candidates for reevaluation, additional research, or questionnaire follow-up before execution-critical decisions.
