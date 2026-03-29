# Workflow Contracts

This document defines kernel-level workflow contracts introduced for the framework-decoupling foundation.

## WorkflowDefinition

`WorkflowDefinition` is the normalized runtime contract used by the engine to represent a pack-neutral workflow.

Fields:

- `pack`: identity and version metadata for the active pack.
- `commands`: command catalog entries exposed to API/UI layers.
- `stages`: ordered stage definitions.
- `transitions`: state transition edges.
- `gates`: gate definitions and required conditions.
- `assignments`: stage-to-agent assignment records.
- `artifactNamespaces`: named artifact namespace map.
- `help`: pack help metadata.

## StageDefinition

`StageDefinition` describes one stage in runtime orchestration.

Fields:

- `id`: stable stage id.
- `label`: display label.
- `order`: stage order index.
- `structural`: whether the stage is structural (always included).

## Source Of Truth

Type definitions and normalization logic live in:

- `platform/engine/pack-contract.ts`
- `platform/engine/workflow-contract.ts`
- `platform/engine/flow-loader.ts`
