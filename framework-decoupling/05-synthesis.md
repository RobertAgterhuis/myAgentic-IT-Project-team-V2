# Framework Decoupling Synthesis

Date: 2026-03-28

## Decision

Proceed with progressive decoupling.
Keep the current SDLC implementation as domain pack-v1.
Evolve core into a domain-agnostic governed agent framework.

## Why this is the right move now

1. The codebase already has a generic kernel foundation:

- Template loader and manifest model
- Governance and policy plane
- Runtime adapter infrastructure
- Workspace/project/repository model
- Persistence and memory primitives

2. The codebase remains deeply SDLC-coupled in orchestration and UX:

- Hardcoded command and state model
- Hardcoded dispatcher groups and skills paths
- Hardcoded gate and artifact conventions
- UI contracts and help content bound to SDLC wording

3. Delaying decoupling increases future cost:

- Every new domain would require kernel surgery instead of pack composition.

## Program synthesis

The plan in this folder intentionally separates work into:

- Foundation contracts (P0)
- Runtime decoupling (P0/P1)
- SDLC pack extraction with parity (P1)
- API/UI metadata-driven migration (P1/P2)
- Monaco editor subsystem in framework shell (P1/P2)
- Second-pack proof and hardening (P2/P3)

This avoids big-bang rewrite risk while still delivering architectural separation.

## Non-negotiable blockers

1. Generic contract model must land before runtime extraction.
2. Runtime extraction must land before UI/API metadata-driven migration.
3. SDLC parity must be proven before onboarding a second pack.
4. Monaco must be implemented as URI-driven framework infrastructure, not SDLC-specific widgets.
5. Second pack must succeed before removing compatibility adapters.

## Monaco placement decision

Monaco belongs in framework core shell, not inside SDLC pack.

Core owns:

- Monaco ESM integration, worker-safe runtime, model/URI registry, diff/editor surfaces, lifecycle/disposal.

Packs own:

- Provider contributions (hover/completion/codelens), schema bindings, governance overlays, domain-specific decorations.

Boundary:

- Monaco is the editing substrate; it is not terminal/debugger/extension-host substrate.

## Expected outcomes

If executed in order, the platform shifts from:

- SDLC-first runtime with partial framework traits

To:

- Framework-first runtime with SDLC as one of multiple supported domain packs.

## Success metrics

- Kernel files contain no mandatory SDLC literals for execution semantics.
- UI command/pipeline/help surfaces are metadata-driven.
- Monaco subsystem is URI-based and pack-extensible, with stable lifecycle and provider contracts.
- At least two packs run end-to-end without core runtime edits.
- Legacy compatibility removed only after measured zero usage.

## Final advisory

The architecture should be decoupled now, incrementally, with strict compatibility controls. The generated milestones, epics, and issues in this folder define a practical path that protects delivery while completing the framework transition.
