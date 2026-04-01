# Decisions: Agency Pack Topology

> Stack: agency-pack | Status: ACTIVE | Applicable: YES
>
> Created 2026-03-30. Architecture decisions governing the topology of the
> agency-agents-markdown template pack: single root manifest now, optional
> domain sub-packs as a future evolution.

---

## Decided Items

| ID          | Priority | Scope                              | Decision                                                                               | Notes                                                                                                                                                                                                                                                                                                                                                                                     | Date       |
| ----------- | -------- | ---------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| DEC-AGT-001 | HIGH     | All sprints (Agency Pack Topology) | Single root manifest topology is the authoritative model for M0 and M1.                | `templates/agency-agents-markdown/manifest.json` is the single source of truth for the pack. All domain agent folders (engineering, design, marketing, …) are co-located under this single pack root. Domain-specific sub-pack manifests are deferred to a post-M1 evolution milestone. The orchestrator references the root manifest exclusively for delegation and metadata validation. | 2026-03-30 |
| DEC-AGT-002 | HIGH     | All sprints (Domain Sub-packs)     | Domain sub-packs (per-vertical manifests) are DEFERRED to post-M1.                     | Each domain folder (e.g. `engineering/`, `design/`) may eventually carry its own `manifest.json` with isolated modes and commands. Until then, all domain agents are discovered via the root manifest `agentsDir: "."` glob and registered as flat entries. No orchestrator logic should depend on domain-level manifests in M0/M1.                                                       | 2026-03-30 |
| DEC-AGT-003 | MEDIUM   | Phase M0 (Governance References)   | Agency pack delegates governance artifacts to the SDLC pack by relative reference.     | The agency pack manifest references `contractsDir`, `guardrailsDir`, `playbooksDir`, and `decisionsDir` pointing into `templates/sdlc/`. Native agency-specific governance files (agency-specific playbooks, guardrails) live inside the sdlc folders with an `agency-` prefix and are referenced from the agency manifest. No duplication of SDLC artifacts.                             | 2026-03-30 |
| DEC-AGT-004 | MEDIUM   | Phase M0 (Orchestrator Delegation) | Orchestrator delegation map is defined inside the root manifest under `delegationMap`. | The `delegationMap` key in `agency-agents-markdown/manifest.json` provides a domain → agent-file mapping for the orchestrator. This avoids an external lookup file and keeps topology metadata co-located with the manifest. The map can be extended incrementally without a topology refactor.                                                                                           | 2026-03-30 |

---

## Open Questions

_None at this time._
