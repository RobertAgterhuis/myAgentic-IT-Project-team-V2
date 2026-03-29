---
title: Pipeline Phases
description: How phase sequencing is defined by the active runtime pack.
keywords:
  - pipeline
  - phases
  - runtime-pack
---

# Pipeline Phases

Pipeline sequencing is defined by the active runtime pack, not by fixed SDLC constants in the UI.

## Where sequence comes from

The phase order shown in the Pipeline page is sourced from pack metadata at runtime.

- Source endpoint: `/api/orchestrator/pack-metadata`
- Primary fields: `stages`, `labels.stages`, and runtime flow metadata
- Fallback behavior: if pack metadata is unavailable, the UI falls back to baseline guidance

## Reading phase intent

Each pack stage can represent a different lifecycle step. Use the stage label and description from metadata as the source of truth for intent and expected outcomes.

## Why this matters

A pack can redefine stage names, sequencing, and operational boundaries without requiring UI code changes. The help panel mirrors that model by treating the active pack as authoritative.
