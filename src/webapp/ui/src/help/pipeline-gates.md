---
title: Gate Types and Overrides
description: How gate checks are defined by the active runtime pack and enforced at runtime.
keywords:
  - pipeline
  - gates
  - approvals
  - overrides
  - runtime-pack
---

# Gate Types and Overrides

Gate definitions are supplied by the active runtime pack.

## Where gate definitions come from

The Pipeline page and help guidance read gate metadata at runtime.

- Source endpoint: `/api/orchestrator/pack-metadata`
- Primary fields: `gates`, `labels.gates`, and gate capability flags
- Runtime diagnostics: gate outcomes and violations from orchestrator diagnostics APIs

## Blocking behavior

A gate remains closed when the pack-declared criteria for that transition are not satisfied, or when required approvals and validations are missing.

## Overrides and exceptions

Use overrides only through governed approval paths. Every exception should remain traceable to an auditable decision record with approver identity, timestamp, and accepted risk.
