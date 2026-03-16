# Phase 6 — Artifact Model

> Formal artifact model design with full lifecycle traceability.  
> Reviewed: 2026-03-15 | Reviewer: Principal Software Architect

---

## Current Artifact Model Assessment

The existing `platform/sdlc/artifacts.ts` defines:

```typescript
// 8 artifact types
DOCUMENT | SCHEMA | CODE | TEST_REPORT | DEPLOYMENT_MANIFEST | DESIGN_ASSET | CONFIGURATION | BINARY

// 6 statuses
DRAFT → REVIEW → APPROVED → PUBLISHED → ARCHIVED → SUPERSEDED

// Lineage edge types
PRODUCES | CONSUMES | TRANSFORMS | VALIDATES | SUPERSEDES

// ArtifactRegistry API
register(artifact) → Artifact
update(id, updates) → Artifact
getVersion(id, version) → ArtifactVersion
addLineageEdge(from, to, type) → LineageEdge
```

**Assessment**: The type system is correct and comprehensive. The registry
provides the right operations. The lineage model captures the right
relationships. What's missing is:

1. Integration with the engine (artifacts not created during workflow)
2. SDLC-specific artifact categorization (which artifacts map to which phases)
3. Content integrity verification (beyond checksums)
4. Artifact dependency resolution (what must exist before X can be created)

---

## Phase-Artifact Mapping

This mapping defines which artifacts are produced by each SDLC phase. It
enables automatic artifact registration when the engine transitions through
phases.

### Phase 1 — Requirements & Strategy

| Artifact ID Pattern     | Type     | Status After Gate | Description                   |
| ----------------------- | -------- | ----------------- | ----------------------------- |
| `P1-BA-analysis`        | DOCUMENT | APPROVED          | Business analysis deliverable |
| `P1-BA-recommendations` | DOCUMENT | APPROVED          | Business recommendations      |
| `P1-BA-sprint-plan`     | DOCUMENT | APPROVED          | Sprint plan                   |
| `P1-BA-guardrails`      | DOCUMENT | APPROVED          | Business guardrails           |
| `P1-DE-analysis`        | DOCUMENT | APPROVED          | Domain expert analysis        |
| `P1-SS-analysis`        | DOCUMENT | APPROVED          | Sales strategy analysis       |
| `P1-FA-analysis`        | DOCUMENT | APPROVED          | Financial analysis            |
| `P1-PM-analysis`        | DOCUMENT | APPROVED          | Product manager analysis      |

### Phase 2 — Architecture & Design

| Artifact ID Pattern     | Type     | Status After Gate | Description                   |
| ----------------------- | -------- | ----------------- | ----------------------------- |
| `P2-SA-analysis`        | DOCUMENT | APPROVED          | Architecture analysis         |
| `P2-SA-recommendations` | DOCUMENT | APPROVED          | Architecture recommendations  |
| `P2-SD-analysis`        | DOCUMENT | APPROVED          | Senior dev analysis           |
| `P2-DO-analysis`        | DOCUMENT | APPROVED          | DevOps analysis               |
| `P2-SEC-analysis`       | DOCUMENT | APPROVED          | Security architecture         |
| `P2-DA-analysis`        | DOCUMENT | APPROVED          | Data architecture             |
| `P2-ADR-*`              | DOCUMENT | APPROVED          | Architecture Decision Records |
| `P2-schema-*`           | SCHEMA   | PUBLISHED         | JSON schemas                  |

### Phase 3 — Experience Design

| Artifact ID Pattern    | Type         | Status After Gate | Description             |
| ---------------------- | ------------ | ----------------- | ----------------------- |
| `P3-UXR-analysis`      | DOCUMENT     | APPROVED          | UX research             |
| `P3-UXD-wireframes`    | DESIGN_ASSET | APPROVED          | Wireframes / prototypes |
| `P3-UID-design-system` | DESIGN_ASSET | APPROVED          | UI design system        |
| `P3-A11Y-baseline`     | DOCUMENT     | APPROVED          | Accessibility baseline  |
| `P3-CS-strategy`       | DOCUMENT     | APPROVED          | Content strategy        |
| `P3-L10N-plan`         | DOCUMENT     | APPROVED          | Localization plan       |

### Phase 4 — Brand & Growth

| Artifact ID Pattern   | Type          | Status After Gate | Description              |
| --------------------- | ------------- | ----------------- | ------------------------ |
| `P4-BR-strategy`      | DOCUMENT      | APPROVED          | Brand strategy           |
| `P4-BR-design-tokens` | CONFIGURATION | PUBLISHED         | Design tokens JSON       |
| `P4-BR-guidelines`    | DOCUMENT      | PUBLISHED         | Brand guidelines         |
| `P4-GM-strategy`      | DOCUMENT      | APPROVED          | Growth marketing         |
| `P4-CRO-strategy`     | DOCUMENT      | APPROVED          | CRO strategy             |
| `P4-SB-inventory`     | DOCUMENT      | APPROVED          | Storybook component spec |

### Phase 5 — Implementation (per sprint)

| Artifact ID Pattern    | Type                | Status After Gate | Description              |
| ---------------------- | ------------------- | ----------------- | ------------------------ |
| `SP-N-code-*`          | CODE                | PUBLISHED         | Implementation code      |
| `SP-N-test-report`     | TEST_REPORT         | PUBLISHED         | Test execution report    |
| `SP-N-deploy-manifest` | DEPLOYMENT_MANIFEST | PUBLISHED         | Deployment configuration |
| `SP-N-kpi-report`      | DOCUMENT            | PUBLISHED         | Sprint KPI report        |
| `SP-N-retrospective`   | DOCUMENT            | PUBLISHED         | Sprint retrospective     |

### Synthesis

| Artifact ID Pattern  | Type     | Status After Gate | Description                 |
| -------------------- | -------- | ----------------- | --------------------------- |
| `SYN-master-report`  | DOCUMENT | PUBLISHED         | Final master report         |
| `SYN-dept-business`  | DOCUMENT | PUBLISHED         | Business department report  |
| `SYN-dept-tech`      | DOCUMENT | PUBLISHED         | Tech department report      |
| `SYN-dept-ux`        | DOCUMENT | PUBLISHED         | UX department report        |
| `SYN-dept-marketing` | DOCUMENT | PUBLISHED         | Marketing department report |
| `SYN-blocker-matrix` | DOCUMENT | PUBLISHED         | Cross-team blocker matrix   |

---

## Lineage Model

### Automatic Lineage Rules

Lineage edges are created automatically based on phase relationships and
contract declarations:

```
Phase 1 artifacts ──PRODUCES──→ Phase 1 deliverables
Phase 1 artifacts ──CONSUMED_BY──→ Phase 2 (architecture references requirements)
Phase 2 artifacts ──CONSUMED_BY──→ Phase 3 (UX references architecture constraints)
Phase 2 artifacts ──CONSUMED_BY──→ Phase 5 (implementation follows architecture)
Phase 3 artifacts ──CONSUMED_BY──→ Phase 4 (brand follows UX direction)
Phase 3 artifacts ──CONSUMED_BY──→ Phase 5 (implementation follows UX specs)
All phase artifacts ──CONSUMED_BY──→ Synthesis (master report references all)
```

### Contract-Driven Lineage

Each agent contract already declares its inputs and outputs. The lineage system
should parse these declarations:

```yaml
# Example from a contract (conceptual)
agent: software-architect
inputs:
  - P1-BA-analysis # CONSUMES edge
  - P1-PM-analysis # CONSUMES edge
outputs:
  - P2-SA-analysis # PRODUCES edge
  - P2-SA-recommendations # PRODUCES edge
```

When the dispatcher completes an agent, the `afterTransition` hook reads the
contract, identifies inputs and outputs, and creates lineage edges automatically.

### Validation Lineage

When the gate validator checks an artifact, a VALIDATES edge is created:

```
Gate Validator ──VALIDATES──→ P2-SA-analysis (result: PASS)
Gate Validator ──VALIDATES──→ P2-SA-recommendations (result: FAIL, re-check)
```

This creates a complete validation history for every artifact.

### Supersession Lineage

When a REEVALUATE or SCOPE_CHANGE command triggers re-execution of a phase,
the new artifacts get SUPERSEDES edges to the old ones:

```
P2-SA-analysis (v2) ──SUPERSEDES──→ P2-SA-analysis (v1)
```

The old artifacts move to SUPERSEDED status; the new ones become the active
versions.

---

## Artifact Lifecycle State Machine

```
                 ┌─────────────────────────────┐
                 │                               │
                 ▼                               │
  ┌──────┐   ┌──────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐
  │ DRAFT│──→│REVIEW│──→│ APPROVED │──→│ PUBLISHED │──→│ ARCHIVED │
  └──────┘   └──────┘   └──────────┘   └───────────┘   └──────────┘
     │           │             │                              ▲
     │           │             │                              │
     │           ▼             ▼                              │
     │      ┌──────┐    ┌───────────┐                        │
     └─────→│DRAFT │    │SUPERSEDED │────────────────────────┘
             │(v+1) │    └───────────┘
             └──────┘
```

**Transition rules** (already defined in `artifacts.ts`, formalized here):

| From      | To         | Trigger                               |
| --------- | ---------- | ------------------------------------- |
| DRAFT     | REVIEW     | Agent completes deliverable           |
| REVIEW    | APPROVED   | Gate validator passes all checks      |
| REVIEW    | DRAFT      | Gate validator fails (rework needed)  |
| APPROVED  | PUBLISHED  | Synthesis complete / Sprint complete  |
| PUBLISHED | ARCHIVED   | New version supersedes this artifact  |
| PUBLISHED | SUPERSEDED | REEVALUATE / SCOPE_CHANGE replaces it |
| APPROVED  | SUPERSEDED | REEVALUATE / SCOPE_CHANGE replaces it |
| \*        | ARCHIVED   | Manual archive (end-of-life)          |

---

## Content Integrity

### Hash Computation

```typescript
function computeArtifactHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
```

Every artifact version stores:

- `content_hash`: SHA-256 of the file content at registration time
- `registered_at`: Timestamp of registration
- `registered_by`: Agent name or system identifier

### Integrity Verification

The gate validator should verify content hashes before validation:

1. Read the artifact file from disk
2. Compute SHA-256
3. Compare against the registered `content_hash`
4. If mismatch → `INTEGRITY_VIOLATION` finding, block gate passage

This detects unauthorized modifications to artifacts after registration.

---

## Artifact Query API

### Required Queries

These queries should be exposed through both the HTTP API and MCP:

| Query                      | Input               | Output                             |
| -------------------------- | ------------------- | ---------------------------------- |
| List artifacts by phase    | phase_id            | Artifact[] with status             |
| Get artifact with versions | artifact_id         | Artifact + ArtifactVersion[]       |
| Get lineage graph          | artifact_id         | Forward + backward trace           |
| Get coverage report        | project_id          | Requirements → deployed coverage   |
| Find unvalidated artifacts | phase_id (optional) | Artifacts in DRAFT/REVIEW status   |
| Get supersession chain     | artifact_id         | Original → ... → current version   |
| Get phase readiness        | phase_id            | All input artifacts present/valid? |

### MCP Tool Extensions

```json
[
  {
    "name": "artifact_list",
    "description": "List artifacts by phase, type, or status",
    "parameters": { "phase": "string?", "type": "string?", "status": "string?" }
  },
  {
    "name": "artifact_lineage",
    "description": "Get the lineage graph for an artifact",
    "parameters": {
      "artifact_id": "string",
      "direction": "forward|backward|both"
    }
  },
  {
    "name": "artifact_coverage",
    "description": "Get the requirements-to-deployment coverage report",
    "parameters": {}
  }
]
```

---

## Integration Points

### Engine → Artifact Store

```
afterTransition hook:
  1. Determine which agent just completed
  2. Read agent contract → identify declared outputs
  3. For each output file that exists on disk:
     a. Compute content hash
     b. Register artifact (type from contract, status DRAFT → REVIEW)
     c. Create PRODUCES edge from agent to artifact
     d. Create CONSUMES edges from declared inputs
  4. Audit log: artifact_registered
```

### Gate Validator → Artifact Store

```
During gate validation:
  1. For each artifact in REVIEW status:
     a. Verify content hash (integrity check)
     b. Run contract checks
     c. Run guardrail checks
     d. If all pass: transition to APPROVED, create VALIDATES edge
     e. If any fail: keep in REVIEW, create VALIDATES edge (result: FAIL)
  2. Audit log: artifact_validated
```

### Sprint Gate → Artifact Store

```
Before sprint planning:
  1. Query all APPROVED artifacts for the target sprint
  2. Verify all prerequisite artifacts are APPROVED or PUBLISHED
  3. If missing prerequisites → BLOCKER in sprint gate output
```

---

## What the Existing Code Already Provides

| Capability                | Status   | Location               |
| ------------------------- | -------- | ---------------------- |
| Artifact type definitions | Complete | `artifacts.ts`         |
| Artifact status enum      | Complete | `artifacts.ts`         |
| ArtifactRegistry CRUD     | Complete | `artifacts.ts`         |
| Version history tracking  | Complete | `artifacts.ts`         |
| Lineage edge model        | Complete | `artifacts.ts`         |
| JSON Schema validation    | Complete | `sdlc-artifact.schema` |
| File-based persistence    | Usable   | `store.ts` (FileStore) |
| Audit trail integration   | Usable   | `audit.ts`             |

**Estimated new code**: ~150 lines for engine integration hooks + ~100 lines
for API routes. The artifact model itself requires zero redesign.
