# M22: Policy-as-Code Governance Framework

> **Impact:** MEDIUM | **Breaking changes:** NONE (additive) | **Blocks:**
> nothing | **Blocked by:** nothing
>
> **Audit reference:** Phase 5 recommendation — "You already have governance
> direction in the engine and schema layers. To become a full platform, this
> should evolve into: policy packs, org/repo/team policy inheritance, exception
> workflows, approval chains, evidence capture, continuous compliance views."
>
> **Validation:** CONFIRMED. `platform/sdlc/governance.ts` exists with
> governance abstractions. `platform/engine/governance-config.ts` provides
> configuration. `gate-validator.ts` enforces contracts, guardrails,
> anti-hallucination markers, and handoff checklists. The MCP server has
> approve/reject governance tools. The foundation is solid — what's missing is
> the policy-pack pattern and inheritance model.

---

## Rationale

The existing governance layer validates process compliance (contracts, guardrails,
handoff checklists). Policy-as-code extends this to **rule-based constraints**
that can be composed, inherited, overridden, and audited — enabling different
teams, repos, or orgs to have different governance profiles while sharing a
common framework.

---

## Issues

### M22-001: Define policy schema

**Labels:** `architecture`, `governance`

Create `platform/schema/policy.schema.json` defining:

```
Policy {
  id: string            // e.g. "POL-001"
  name: string
  scope: "global" | "org" | "team" | "repo" | "sprint"
  category: "security" | "quality" | "compliance" | "process" | "architecture"
  severity: "blocking" | "warning" | "advisory"
  condition: PolicyCondition   // what triggers this policy
  action: PolicyAction         // what happens when triggered
  exceptions: ExceptionRule[]  // approved overrides
  metadata: { owner, created, expires, evidence_required }
}
```

**Acceptance criteria:**

- [ ] JSON Schema validates policy definitions
- [ ] Schema supports all severity levels
- [ ] Exception rules have approval requirements
- [ ] Schema is added to `platform/schema/` barrel

---

### M22-002: Create built-in policy pack (security baseline)

**Labels:** `governance`, `security`

Create `platform/sdlc/policies/security-baseline.json` with policies:

- POL-SEC-001: Secret scanning required before merge (blocking)
- POL-SEC-002: SAST scan required before merge (blocking)
- POL-SEC-003: Dependency vulnerability scan required (blocking for
  HIGH/CRITICAL)
- POL-SEC-004: Container image scan required for Docker builds (blocking)
- POL-SEC-005: API key rotation reminder every 90 days (warning)

**Acceptance criteria:**

- [ ] Policy pack validates against policy schema
- [ ] All policies have clear conditions and actions
- [ ] Pack is loadable by the governance config module

---

### M22-003: Create built-in policy pack (quality baseline)

**Labels:** `governance`, `quality`

Create `platform/sdlc/policies/quality-baseline.json` with policies:

- POL-QA-001: Unit test coverage > 60% on changed files (warning)
- POL-QA-002: No `FIXME` or `TODO` without linked issue (advisory)
- POL-QA-003: All public functions have JSDoc (advisory)
- POL-QA-004: E2E tests pass before production deploy (blocking)
- POL-QA-005: Accessibility audit score > 90 (warning)

**Acceptance criteria:**

- [ ] Policy pack validates against policy schema
- [ ] Policies reference measurable conditions
- [ ] Pack is loadable by the governance config module

---

### M22-004: Implement policy evaluator

**Labels:** `engine`, `governance`

Create `platform/engine/policy-evaluator.ts`:

- Load policy packs from configuration
- Evaluate policies against a context (sprint gate, PR, deploy, artifact)
- Return: `{ passed: Policy[], failed: Policy[], warnings: Policy[] }`
- Support policy inheritance: global → org → team → repo (most specific wins)
- Exception handling: skip policy if approved exception exists

**Acceptance criteria:**

- [ ] Evaluator loads and applies policies correctly
- [ ] Inheritance chain resolves correctly
- [ ] Exceptions are honored with audit trail
- [ ] Unit tests cover: pass, fail, warning, inheritance, exception

---

### M22-005: Integrate policy evaluator into sprint gate

**Labels:** `engine`, `governance`

Wire `policy-evaluator.ts` into `sprint-gate.ts`:

- Evaluate all applicable policies at sprint gate
- Blocking policies → gate fails
- Warning policies → gate passes with warnings in output
- Log all policy evaluation results to audit trail

**Acceptance criteria:**

- [ ] Sprint gate evaluates policies
- [ ] Blocking policy failure prevents sprint progression
- [ ] Warnings are visible in UI (governance page) and SSE events
- [ ] Audit trail records all policy evaluations

---

### M22-006: Add governance policy management to MCP

**Labels:** `mcp`, `governance`

Add MCP tools for policy management:

- `list_policies` — list all active policies with status
- `get_policy_evaluation` — get latest evaluation results per scope
- `create_exception` — request exception for a policy (requires approval)

**Acceptance criteria:**

- [ ] Three new MCP tools registered
- [ ] Tools use the service layer (not direct file access)
- [ ] Policy evaluation results are queryable
- [ ] Exception creation triggers approval workflow

---

### M22-007: Add policy compliance view to UI

**Labels:** `frontend`, `governance`

Add a "Policy Compliance" section to the Governance page:

- Table of all active policies with status (passing/failing/warning)
- Filter by category, severity, scope
- Exception management (request, approve, reject)
- Policy evaluation history (last 10 evaluations)

**Acceptance criteria:**

- [ ] Governance page shows policy compliance overview
- [ ] Filtering works for all dimensions
- [ ] Exception workflow is accessible from the UI
- [ ] Real-time updates via SSE
