# Phase 9 — Template System Evolution

> Evolution of the template system to define workflows, artifacts, gates, roles, and tool integrations.  
> Reviewed: 2026-03-15 | Reviewer: Principal Software Architect

---

## Current Template System

### manifest.json Structure

```json
{
  "name": "SDLC Template Pack",
  "version": "1.0.0",
  "schema_version": "1.0.0",
  "phases": [
    {
      "id": "phase1",
      "name": "Requirements & Strategy",
      "agents": [
        { "role": "business-analyst", "file": "agents/business-analyst.md", "contract": "contracts/phase1-business-analyst.md" }
      ],
      "guardrails": ["guardrails/01-phase1-guardrails.md"],
      "critic": { "contract": "contracts/critic-phase1.md" }
    }
  ],
  "workflows": ["workflows/feature-delivery.yaml"],
  "decision_categories": ["azure-devops", "bicep-iac", ...],
  "output_templates": ["output-templates/analysis.md"]
}
```

### What the Template System Controls

- Agent definitions (38 agents with roles, skill files, contracts)
- Guardrails (10 guardrail files covering global + per-phase rules)
- Contracts (28 contract files defining input/output obligations)
- Workflows (6 YAML workflow definitions)
- Decision categories (20 categories for structured decision tracking)
- Output templates (6 templates for deliverable formatting)

### Template Loader

`template-loader.ts` discovers template packs by scanning for `manifest.json`,
validates against `template-manifest.schema.json`, and returns structured
configuration consumed by the engine.

**Assessment**: The template system is the backbone of the platform's
configurability. It already defines agent behavior, contracts, guardrails, and
workflows. The evolution needed is making templates define the **complete SDLC
process** — including artifact types, approval gates, tool requirements, and
lifecycle rules.

---

## Evolution 1: Artifact Declarations in Templates

### Problem

Templates define what agents produce (contracts), but not the artifact types,
lineage rules, or lifecycle expectations. The artifact model (Phase 6) needs
template-level configuration.

### Design

Add `artifacts` section to phase definitions:

```json
{
  "phases": [
    {
      "id": "phase2",
      "name": "Architecture & Design",
      "agents": [...],
      "artifacts": {
        "produces": [
          {
            "id": "P2-SA-analysis",
            "type": "DOCUMENT",
            "agent": "software-architect",
            "output_path": "Phase2-Tech/architecture-analysis.md",
            "required": true
          },
          {
            "id": "P2-ADR-*",
            "type": "DOCUMENT",
            "agent": "software-architect",
            "output_path": "Phase2-Tech/decisions/*.md",
            "required": false,
            "pattern": true
          }
        ],
        "consumes": [
          { "id": "P1-BA-analysis", "required": true },
          { "id": "P1-PM-analysis", "required": true }
        ]
      }
    }
  ]
}
```

### Behavior

- **On phase start**: Verify all `consumes` artifacts with `required: true`
  exist and are in APPROVED or PUBLISHED status.
- **On phase complete**: Register all `produces` artifacts that exist on disk.
  Flag missing `required: true` artifacts as BLOCKER.
- **Lineage**: CONSUMES edges created automatically from `consumes` list.
  PRODUCES edges from `produces` list.

### Schema Extension

Add artifact declarations to `template-manifest.schema.json`:

```json
{
  "artifacts": {
    "type": "object",
    "properties": {
      "produces": {
        "type": "array",
        "items": { "$ref": "#/definitions/artifact-declaration" }
      },
      "consumes": {
        "type": "array",
        "items": { "$ref": "#/definitions/artifact-reference" }
      }
    }
  }
}
```

---

## Evolution 2: Governance Policy References

### Problem

Governance policies are hardcoded. Templates should define which policies
apply to which gates.

### Design

Add `governance` section to the manifest:

```json
{
  "governance": {
    "default_mode": "advisory",
    "policies_file": "governance-policies.json",
    "gates": {
      "CRITIC_1": {
        "policy": "REQUIREMENT_TO_DESIGN",
        "override_allowed": true
      },
      "CRITIC_2": {
        "policy": "DESIGN_TO_DEVELOPMENT",
        "override_allowed": false
      },
      "SPRINT_GATE": {
        "policy": "DEVELOPMENT_TO_TESTING",
        "override_allowed": true
      }
    }
  }
}
```

### Behavior

- Template loader loads `governance-policies.json` alongside the manifest
- Gate validator reads the governance configuration for the current gate
- If `override_allowed: false`, the policy cannot be bypassed even with
  `--force` flag
- Governance mode (off/advisory/enforcing) can be set per-project, overriding
  `default_mode`

### Separate Policy File

```json
// templates/sdlc/governance-policies.json
{
  "policies": [
    {
      "id": "REQUIREMENT_TO_DESIGN",
      "required_approvals": 1,
      "required_roles": ["ARCHITECT"],
      "timeout_hours": 48,
      "auto_approve_when": "all_contract_checks_pass"
    }
  ]
}
```

---

## Evolution 3: Tool Requirements per Phase

### Problem

Templates define what agents do, but not what tools they need. The engine
doesn't know which adapters to health-check before starting a phase.

### Design

Add `tools` section to phase definitions:

```json
{
  "phases": [
    {
      "id": "phase5",
      "name": "Implementation",
      "agents": [...],
      "tools": {
        "required": [
          { "adapter": "git", "operations": ["create_branch", "list_commits"] },
          { "adapter": "testing", "operations": ["run_unit_tests"] }
        ],
        "optional": [
          { "adapter": "ci", "operations": ["trigger_workflow"] },
          { "adapter": "security", "operations": ["run_sast", "scan_secrets"] }
        ]
      }
    }
  ]
}
```

### Behavior

- **Before phase start**: Health-check all `required` adapters. If any is
  unhealthy, the phase cannot start (BLOCKER).
- **Optional tools**: Health-check and log status. If unhealthy, log WARNING
  but proceed. Agents are informed which optional tools are unavailable.
- **Sprint gate integration**: Sprint readiness includes tool health status
  for the upcoming sprint's required tools.

---

## Evolution 4: Lifecycle Rules in Templates

### Problem

The lifecycle model (`lifecycle.ts`) defines stage transitions and gate
conditions, but these are hardcoded. Different template packs might need
different lifecycle rules.

### Design

Add `lifecycle` section to the manifest:

```json
{
  "lifecycle": {
    "stages": [
      "IDEA",
      "REQUIREMENT",
      "DESIGN",
      "DEVELOPMENT",
      "TESTING",
      "STAGING",
      "RELEASE",
      "PRODUCTION",
      "MONITORING",
      "IMPROVEMENT"
    ],
    "transitions": [
      {
        "from": "DESIGN",
        "to": "DEVELOPMENT",
        "gates": [
          {
            "id": "G-DEV-01",
            "description": "Architecture review completed",
            "type": "artifact_approved",
            "artifact": "P2-SA-analysis"
          },
          {
            "id": "G-DEV-02",
            "description": "Security review completed",
            "type": "artifact_approved",
            "artifact": "P2-SEC-analysis"
          },
          {
            "id": "G-DEV-03",
            "description": "Sprint plan approved",
            "type": "governance_approved",
            "policy": "DESIGN_TO_DEVELOPMENT"
          }
        ]
      }
    ]
  }
}
```

### Gate Types

| Type                  | Evaluation                                             |
| --------------------- | ------------------------------------------------------ |
| `artifact_approved`   | Referenced artifact is in APPROVED or PUBLISHED status |
| `governance_approved` | Referenced governance policy has been satisfied        |
| `tool_healthy`        | Referenced adapter passes health check                 |
| `metric_threshold`    | Referenced metric meets threshold value                |
| `manual_confirmation` | Human confirmation received via CLI or UI              |

### Behavior

- Template loader parses lifecycle rules and passes them to the engine
- Lifecycle transitions are validated against these rules
- Custom template packs can define different stage sequences and gate conditions
- The default template retains the current 10-stage lifecycle

---

## Evolution 5: Workflow Extension Points

### Problem

Workflow YAML files define stage sequences, but they cannot currently reference
artifacts, governance gates, or tool requirements. They are documentation-like
definitions.

### Design

Extend workflow YAML with executable declarations:

```yaml
# workflows/feature-delivery.yaml (extended)
name: Feature Delivery
stages:
  - name: DESIGN
    agents: [software-architect, senior-developer]
    artifacts:
      produces: [P2-SA-analysis, P2-SA-recommendations]
      consumes: [P1-BA-analysis]
    governance:
      policy: REQUIREMENT_TO_DESIGN
      mode_override: null # Use default mode
    tools:
      required: [git]
    gates:
      - id: G-DES-01
        check: artifact_approved
        target: P2-SA-analysis
      - id: G-DES-02
        check: governance_approved
        target: REQUIREMENT_TO_DESIGN

  - name: DEVELOPMENT
    agents: [implementation-agent]
    artifacts:
      produces: [SP-N-code-*]
      consumes: [P2-SA-analysis, P3-UXD-wireframes]
    tools:
      required: [git, testing]
      optional: [ci, security]
    gates:
      - id: G-DEV-01
        check: tool_result
        adapter: testing
        operation: run_unit_tests
        condition: 'passed >= total * 0.95'
```

### Flow Loader Evolution

The custom YAML parser in `flow-loader.ts` would need to handle the extended
sections. Since it's already a custom parser, the additional sections are
additions, not structural changes.

**Alternative**: Rather than extending the YAML parser, workflows could
reference the manifest's artifact and governance declarations by ID, keeping
workflow YAML lean and the manifest as the single source of truth.

### Recommendation

Keep workflows referential, not declarative:

```yaml
stages:
  - name: DESIGN
    agents: [software-architect]
    manifest_refs:
      artifacts: phase2.artifacts # Reference manifest
      governance: governance.gates.CRITIC_2 # Reference manifest
      tools: phase2.tools # Reference manifest
```

This avoids duplication between manifest.json and workflow YAML. The manifest
remains the authoritative source.

---

## Evolution 6: Template Pack Composition

### Problem

Currently there is one template pack. As the platform evolves, organizations
will want to create custom template packs for different project types
(microservice, SPA, mobile app, data pipeline).

### Design: Template Inheritance

```json
// custom-template/manifest.json
{
  "name": "Microservice Template Pack",
  "extends": "../sdlc/manifest.json",
  "version": "1.0.0",
  "overrides": {
    "phases": {
      "phase2": {
        "agents": [
          {
            "add": { "role": "api-designer", "file": "agents/api-designer.md" }
          },
          { "remove": "data-architect" }
        ],
        "artifacts": {
          "produces": [
            {
              "add": {
                "id": "P2-API-spec",
                "type": "SCHEMA",
                "output_path": "Phase2-Tech/api-spec.yaml"
              }
            }
          ]
        }
      }
    },
    "governance": {
      "gates": {
        "CRITIC_2": {
          "policy": "API_REVIEW_REQUIRED"
        }
      }
    }
  }
}
```

### Inheritance Rules

1. Child pack inherits all definitions from parent
2. `overrides` section specifies per-phase modifications
3. `add` and `remove` operations for agents, artifacts, tools
4. Governance policies can be overridden or extended
5. Lifecycle stages can be added (not removed — safety invariant)

### Template Resolution

```
Template Loader:
  1. Load parent manifest
  2. Load child manifest
  3. Apply overrides (deep merge with add/remove semantics)
  4. Validate merged result against template-manifest.schema.json
  5. Return merged configuration
```

### When to Implement

Template composition is a P3 feature. The current single template pack serves
the immediate use case. Composition becomes relevant when:

- Multiple project types are supported
- Organizations want to standardize their SDLC process
- Community template packs emerge

---

## Transpiler Integration

### Current State

The `generate-platform.js` transpiler converts canonical schemas (agents,
flows, tools) into platform-specific instruction files (Copilot, Claude, OpenAI).

### Evolution

As templates gain artifact declarations, governance rules, and tool requirements,
the transpiler needs to include this information in generated instructions:

```markdown
## Agent: Software Architect

### Inputs (artifacts you must consume)

- P1-BA-analysis (Business analysis) — REQUIRED
- P1-PM-analysis (Product management analysis) — REQUIRED

### Outputs (artifacts you must produce)

- P2-SA-analysis (Architecture analysis) — REQUIRED, write to Phase2-Tech/
- P2-SA-recommendations (Architecture recommendations) — REQUIRED

### Tools Available

- git: list_branches, list_commits, get_diff
- testing: run_unit_tests (for validating PoC code)

### Governance

- Your output will require ARCHITECT approval before advancing
```

This gives agents full awareness of their context without requiring them to
parse the manifest.

---

## Summary of Template Evolutions

| #   | Evolution                    | Priority | Impact                             |
| --- | ---------------------------- | -------- | ---------------------------------- |
| E1  | Artifact declarations        | P0       | Enables artifact lineage           |
| E2  | Governance policy references | P1       | Enables configurable governance    |
| E3  | Tool requirements per phase  | P1       | Enables tool health verification   |
| E4  | Lifecycle rules              | P2       | Enables customizable SDLC stages   |
| E5  | Workflow extension points    | P2       | Enables executable workflow defs   |
| E6  | Template pack composition    | P3       | Enables organization customization |

### Backward Compatibility

All evolutions are additive. The existing manifest structure is preserved.
New sections are optional — the template loader should handle their absence
gracefully (falling back to current behavior when sections are missing).

### Schema Versioning

The manifest schema version should be bumped:

- E1 + E2: `1.1.0` (minor: new optional sections)
- E3 + E4 + E5: `1.2.0` (minor: more optional sections)
- E6: `2.0.0` (major: `extends` changes resolution semantics)

Template loader validates against the declared `schema_version` and applies
appropriate parsing rules.
