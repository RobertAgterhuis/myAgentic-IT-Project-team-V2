# A5 — Human-in-the-Loop

**Dimension:** Agentic System Design — Human Oversight, Approval Gates, Confidence Escalation  
**Score: 8 / 10**

---

## What Was Evaluated

Whether agents can escalate to humans. Whether approval workflows are real. Whether the system is safe to run unattended or requires human checkpoints. Whether role-based access is enforced.

---

## Findings

### 1. Confidence Scoring with Escalation Flag — Real

`platform/engine/dispatcher.ts` implements `assessConfidence()` which returns:

```typescript
{
  confidence: number;          // 0.0–1.0
  uncertainty_reasons: string[];
  needs_human_review: boolean; // triggers escalation
}
```

Five weighted factors contribute to the confidence score. When `needs_human_review` is true, the dispatcher does not auto-advance the state machine — it emits a human review request and pauses progression.

The `ExecuteAgentResult` from `src/webapp/services/agent-execution-service.ts` surfaces `confidence`, `uncertainty_reasons`, and `needs_human_review` in the API response, so the frontend can display the escalation state.

Source: `platform/engine/dispatcher.ts` lines 1–100, `src/webapp/services/agent-execution-service.ts` lines 1–120.

### 2. Approval Center — Real API Endpoints + SSE Notifications

`src/webapp/routes/approvals.ts` (1–80 lines confirmed):

- `GET /approvals` — list pending approvals with metadata
- `POST /approvals/:id/approve` — approve with actor identity + timestamp
- `POST /approvals/:id/reject` — reject with reason + actor identity
- SSE notification pushed on both approve and reject (real-time frontend update)

Approvals are required at multiple points:

1. CRITIC gate transitions (gate-validator.ts validation failures block)
2. Tool execution: `tool-execution-middleware.ts` resolves approval tokens per tool call
3. Sprint Gate: DoR check produces a `READY / NOT_READY` with a blocker list that must be resolved

Source: `src/webapp/routes/approvals.ts` lines 1–80.

### 3. Gate Validator — Mandatory Deliverable Checks

`platform/engine/gate-validator.ts` (215 lines, 78% coverage) enforces at every critic gate:

1. Contract section presence (CONTRACTS_DIR checked per phase)
2. Anti-hallucination tag detection — `UNCERTAIN:`, `INSUFFICIENT_DATA:` are caught and flagged
3. Placeholder detection — `TODO`, `TBD`, `FILL IN`, `[PLACEHOLDER]` patterns block advancement
4. Handoff checklist (9 item checklist must have all boxes checked `[x]`)
5. Guardrail compliance (GUARDRAILS_DIR, per PHASE_GUARDRAILS map)
6. Governance advisory

An agent cannot advance from PHASE_1 to PHASE_2 if any of these checks fail. This is the primary automated human-equivalent gate — it enforces that LLM outputs are not placeholder fragments.

Source: `platform/engine/gate-validator.ts` lines 1–100.

### 4. RBAC — Three Roles, Enforced at Multiple Layers

**Backend RBAC** (`src/webapp/auth.ts`):

- Roles: `admin | operator | viewer`
- Every authenticated API request carries role information from the SQLite session
- `requireRole('admin')`, `requireRole('operator')` middleware wraps sensitive routes

**Frontend RBAC** (`src/webapp/ui/src/App.tsx`):

```tsx
<AccessGuard requiredRole="operator">
  <DecisionsPage />
</AccessGuard>
<AccessGuard requiredRole="operator">
  <ApprovalCenterPage />
</AccessGuard>
```

Decisions and Approvals are operator-only. The UI enforces this visually; the backend enforces it cryptographically.

**Tool-level RBAC** (`platform/engine/tool-execution-middleware.ts`):

- Per-tool authorization check at invocation time
- Role is carried through `AgentExecutionContext` to the tool middleware

Source: `src/webapp/auth.ts` lines 1–80, `src/webapp/ui/src/App.tsx` lines 1–80.

### 5. Sprint Gate — Structured Pre-Execution Human Checkpoint

`platform/engine/sprint-gate.ts` (254 lines, 68% coverage) before Phase 5:

1. Loads reevaluate triggers
2. Performs Definition of Ready check (acceptance criteria, estimates)
3. Injects lessons learned from previous sprints
4. Velocity/capacity check (DORA metrics via `observability.ts`)
5. Produces blocker matrix

Output is `READY / NOT_READY` — a NOT_READY result halts the pipeline and surfaces blockers to the approval center. A human must resolve and re-trigger.

Source: `platform/engine/sprint-gate.ts` lines 1–80.

### 6. Audit Trail — Forensic-Grade

Every tool invocation produces an `ToolExecutionAuditEvent` with `paramsHash` and `resultHash`. This provides:

- A non-repudiation trail for all agent actions
- Change tracking without storing raw sensitive data
- Evidence for post-incident investigation

Source: `platform/engine/tool-execution-middleware.ts` lines 1–100.

---

## Strengths

1. **Layered HITL** — Three distinct escalation mechanisms coexist: confidence scoring (soft), gate validation (automated hard), approval center (human hard). This is a well-designed risk-tiered approach.
2. **SSE real-time notifications** — Approval events are pushed immediately; operators don't need to poll.
3. **Placeholder detection at gate** — Prevents LLM "fill in later" outputs from advancing the pipeline. This is a common failure mode in agentic systems.
4. **RBAC at three layers** — Session, route middleware, and tool execution. Cannot be bypassed by a malicious frontend call.
5. **Sprint Gate DoR** — Velocity-based capacity check prevents over-committing sprints, a classic project management failure.

---

## Weaknesses

1. **Sprint-gate.ts at 68% coverage** — The most complex HITL checkpoint in the system has significant untested branches. Source: `coverage-summary.json`.
2. **`needs_human_review` threshold hardcoded** — The confidence threshold that triggers escalation appears to be a fixed value in the dispatcher. Different pipeline phases may warrant different thresholds (a security-critical Phase 2 output deserves a lower trigger than a marketing Phase 4 output).
3. **No timeout on pending approvals** — If an approval request is created but never acted on, the pipeline stalls indefinitely. There is no configurable SLA-based escalation or auto-timeout.
4. **Viewer role cannot see confidence scores** — The `ExecuteAgentResult` API response is not clearly restricted by role. A viewer may be able to observe confidence and escalation data but not act on it, creating an informational surface without a corresponding action surface.
5. **Audit events in memory/file only** — The `ToolExecutionAuditEvent` structure is well-designed but it is not clear whether events are persisted durably (e.g., append-only log file, SQLite audit table) or are in-memory only. In-memory audit events are lost on server restart.

---

## Recommended Improvements

1. Add configurable per-phase confidence thresholds to `flows.yaml` so security-critical phases have lower auto-pass thresholds.
2. Add approval TTL: if an approval is not actioned within N hours, escalate to `admin` role and optionally auto-reject with a logged reason.
3. Add a durable audit log sink — append event records to a SQLite audit table with non-deletable schema.
4. Raise sprint-gate.ts test coverage to ≥80% — it is the last gate before potentially destructive Phase 5 actions.

---

## Source References

| File                                           | Lines Read                  | Key Finding                                  |
| ---------------------------------------------- | --------------------------- | -------------------------------------------- |
| `platform/engine/dispatcher.ts`                | 1–100                       | Confidence scoring, needs_human_review       |
| `src/webapp/routes/approvals.ts`               | 1–80                        | Approval API + SSE                           |
| `platform/engine/gate-validator.ts`            | 1–100                       | Checklist, placeholder detection, guardrails |
| `platform/engine/sprint-gate.ts`               | 1–80                        | DoR, velocity, blocker matrix                |
| `platform/engine/tool-execution-middleware.ts` | 1–100                       | RBAC per-tool, audit trail                   |
| `src/webapp/auth.ts`                           | 1–80                        | Role definitions, session, CSRF              |
| `src/webapp/ui/src/App.tsx`                    | 1–80                        | AccessGuard on operator-only pages           |
| `coverage/coverage-summary.json`               | sprint-gate, gate-validator | Coverage gaps                                |
