# Recommendations – Software Architecture – 2026-03-09

## Metadata

- Agent: Software Architect (05)
- Phase: 2
- Input received from: Software Architect Analysis
  (05-software-architect-analysis.md)
- Date: 2026-03-09
- Software under design: MYAGENTIC-IT-PROJECT-TEAM-V2
- **Mode: CREATE**

## Recommendation Structure

All recommendations follow this format:

- **REC-[ID]** — Unique identifier
- **Priority:** P1 (critical) / P2 (high-value) / P3 (optimize)
- **Category:** Infrastructure / Code Quality / Security / Performance /
  Compliance
- **Gap/Risk Reference:** Links to analysis finding
- **SMART Success Criteria:** Specific, Measurable, Achievable, Relevant,
  Time-bound
- **Impact Assessment:** Revenue / Risk / Cost / UX (scale: --/- /0/+/++)

---

## REC-501: Implement JSON Schema Validation Middleware

**Priority:** P1

**Category:** Code Quality / Security

**Gap/Risk Reference:** GAP-501 (API schema validation not enforced), RISK-503
(no auth enforcement)

**Problem Statement:** Current API endpoints validate request bodies manually
within route handlers, leading to:

- Inconsistent validation logic across endpoints
- Runtime errors from malformed client requests not caught at boundary
- Security risk: injection attacks via unvalidated fields

**Source:** Analysis section 4.6 (API endpoint schema), section 7.2 (GAP-501).

**Recommended Solution:** Add JSON schema validation middleware using Ajv (MIT
License) to validate all POST/PUT request bodies against JSON schemas before
reaching route handlers.

**Implementation Steps:**

1. Add Ajv as dev dependency (MIT License, validate with Legal Counsel per
   LCHECK-001)
2. Define JSON schemas in `src/webapp/schemas/` for each endpoint:
   - `POST /api/questionnaires/:phase/:file/answers` →
     `questionnaire-answers-schema.json`
   - `POST /api/decisions` → `decision-create-schema.json`
   - `PUT /api/decisions/:id` → `decision-update-schema.json`
   - `POST /api/commands` → `command-create-schema.json`
3. Create middleware function `validateBody(schemaId)` that:
   - Compiles schema from `src/webapp/schemas/[schemaId].json`
   - Validates `req.body` against schema
   - Returns 400 with validation errors if invalid
4. Wrap all POST/PUT route handlers with `validateBody()` middleware
5. Add integration tests for validation failure scenarios (invalid field types,
   missing required fields, extra fields)

**Success Criteria (SMART):**

- ✓ All POST/PUT endpoints return 400 for malformed requests within 1 sprint
  (measurable)
- ✓ 100% of API endpoints have schema definitions in `src/webapp/schemas/`
  (specific)
- ✓ Validation layer tested with >=95% branch coverage (achievable per existing
  test coverage target)
- ✓ No unhandled JSON parsing exceptions in production logs after implementation
  (relevant)
- ✓ Implemented in Sprint 10 (time-bound per Phase 2 sprint plan — TBD)

**Impact Assessment:**

| Dimension          | Impact | Justification                                                        |
| ------------------ | ------ | -------------------------------------------------------------------- |
| **Revenue**        | 0      | Internal-only, no revenue impact                                     |
| **Risk Reduction** | ++     | Eliminates entire class of runtime errors, hardens security boundary |
| **Cost**           | -      | 1-2 days engineering effort (schema authoring + middleware + tests)  |
| **UX**             | +      | Clearer 400 error messages for debugging, faster failure detection   |

**Dependencies:**

- `DEPENDENT_ON:` Legal Counsel (LCHECK-001 — verify Ajv MIT license
  compatibility)

**Trade-offs:**

- Additional dependency (Ajv) increases bundle size by ~50KB
- Schema maintenance overhead (schemas must be updated when API changes)
- Acceptable: security and reliability benefit outweighs minimal dependency cost

---

## REC-502: Defer Domain Events Implementation to Multi-User Milestone

**Priority:** P3

**Category:** Architecture / Design Debt

**Gap/Risk Reference:** GAP-502 (domain events absent from architecture)

**Problem Statement:** Current architecture lacks event-driven communication
between modules (e.g., session-state-resolver → SSE notifications is tightly
coupled via direct function call). This limits:

- Decoupling: adding new listeners requires modifying existing modules
- Auditability: no centralized event log beyond audit trail
- Future multi-user support: no pub/sub mechanism for cross-user notifications

**Source:** Analysis section 3.4 (DDD assessment).

**Recommended Solution:** **DEFER to multi-user rollout milestone** (Q4 2026 or
later per Phase 1 target). For v1 single-user internal operation, accept tight
coupling.

**Future Implementation (when triggered):**

1. Introduce lightweight EventEmitter bus (`events-bus.js`)
2. Define domain events: `SessionStateChanged`, `QuestionnaireAnswered`,
   `DecisionRecorded`
3. Refactor modules to emit events instead of direct calls
4. Subscribe SSE broadcaster to relevant events
5. Add event replay capability for debugging

**Success Criteria (Deferred):**

- N/A for v1 — defer until multi-user requirement confirmed

**Impact Assessment:**

| Dimension          | Impact | Justification                              |
| ------------------ | ------ | ------------------------------------------ |
| **Revenue**        | 0      | Internal-only                              |
| **Risk Reduction** | 0      | No risk reduction for single-user scenario |
| **Cost**           | 0      | Deferred, no immediate cost                |
| **UX**             | 0      | No UX change for v1                        |

**Rationale for Deferral:**

- YAGNI: Single-user localhost operation does not require event-driven
  architecture
- Phase 1 target: 3 internal users by Q4 2026 (questionnaire answer QR-001) —
  reassess if multi-user adoption accelerates
- Module boundaries already clean (bounded contexts present per analysis 3.4) —
  refactoring to events is low-risk future change

---

## REC-503: Add Automated Load Testing to CI/CD Pipeline

**Priority:** P1

**Category:** Performance / Quality Gates

**Gap/Risk Reference:** GAP-503 (no automated load testing), INSUFFICIENT_DATA:
QR-ARCH-001 (baseline metrics missing)

**Problem Statement:** NFR performance targets defined (p95 < 200ms per analysis
section 5.1) but no automated verification in CI/CD. Consequences:

- Performance regressions undetected until manual testing
- No baseline metrics to measure improvement
- Risk of shipping slow endpoints without awareness

**Source:** Analysis section 5.1 (performance NFRs), section 7.4
(INSUFFICIENT_DATA: QR-ARCH-001).

**Recommended Solution:** Add autocannon-based load testing to CI/CD pipeline
with performance budget enforcement.

**Implementation Steps:**

1. Add autocannon as dev dependency (MIT License)
2. Create load test suite in `tests/load/`:
   - `test-progress-endpoint.js` — GET /api/progress (100 concurrent, 10s
     duration)
   - `test-questionnaires-endpoint.js` — GET /api/questionnaires/:phase/:file
     (100 concurrent)
   - `test-write-endpoint.js` — POST /api/questionnaires/:phase/:file/answers
     (50 concurrent)
3. Establish baseline metrics (run once, record p50/p95/p99 in
   `docs/performance-baseline.md`)
4. Add performance budget CI check:
   - Run load tests in CI (GitHub Actions workflow)
   - Fail build if p95 > baseline + 10% tolerance
   - Report metrics as CI artifacts (trend over time)
5. Add `npm run test:load` script to package.json

**Success Criteria (SMART):**

- ✓ Baseline metrics documented in `docs/performance-baseline.md` within Sprint
  10 (time-bound)
- ✓ All API endpoints covered by load tests (specific — 8 endpoints per analysis
  4.6)
- ✓ CI fails build if p95 exceeds budget (measurable)
- ✓ Performance regression detected in <1 hour (PR CI run time) (achievable)
- ✓ Zero performance regressions shipped to main branch post-implementation
  (relevant)

**Impact Assessment:**

| Dimension          | Impact | Justification                                                      |
| ------------------ | ------ | ------------------------------------------------------------------ |
| **Revenue**        | 0      | Internal-only                                                      |
| **Risk Reduction** | +      | Early detection of performance regressions                         |
| **Cost**           | -      | 2-3 days engineering effort (suite authoring + CI integration)     |
| **UX**             | ++     | Ensures sub-200ms p95 response times per NFR target, responsive UI |

**Dependencies:**

- `REQUIRED:` Answer QR-ARCH-001 (run baseline load test) — this REC fulfills
  that questionnaire item

**Trade-offs:**

- CI runtime increases by ~3 minutes (load test execution)
- Acceptable: performance assurance justifies CI slowdown

---

## REC-504: Stress Test File Locking Under Concurrent Access

**Priority:** P2

**Category:** Performance / Reliability

**Gap/Risk Reference:** RISK-501 (file locking contention under concurrent
access)

**Problem Statement:** Multi-user scenario (3 users per Phase 1 target) may
trigger file locking contention in file-based storage. Current file-lock.js
implementation uses retry logic (3 attempts), but contention behavior under
realistic concurrent writes is untested.

**Source:** Analysis section 7.2 (RISK-501), existing file-lock.js at
`src/webapp/file-lock.js`.

**Recommended Solution:** Create stress test suite simulating concurrent writes
to session-state.json, questionnaire files, and decisions.md to validate file
locking reliability.

**Implementation Steps:**

1. Create stress test suite in `tests/stress/`:
   - `test-concurrent-session-updates.js` — 10 parallel session-state.json
     writes
   - `test-concurrent-questionnaire-answers.js` — 5 parallel writes to same
     questionnaire file
   - `test-concurrent-decision-adds.js` — 5 parallel decision additions
2. Run stress tests in CI (separate job, non-blocking initially)
3. Measure metrics:
   - Lock acquisition latency (mean, p95, p99)
   - Lock timeout rate (% of operations failing after 3 retries)
   - Data corruption detection (validate JSON integrity after concurrent writes)
4. If lock timeout rate > 1%, increase retry count or add backoff strategy
5. Add monitoring instrumentation (metrics.js) to track lock contention in
   production

**Success Criteria (SMART):**

- ✓ Stress tests complete without data corruption (100% JSON integrity verified)
  (measurable)
- ✓ Lock timeout rate < 1% under 10 concurrent writes (specific)
- ✓ p95 lock acquisition latency < 50ms (achievable per NFR target from analysis
  5.1)
- ✓ Stress tests pass in CI for 10 consecutive runs (relevant)
- ✓ Implemented in Sprint 11 (time-bound per Phase 2 sprint plan — TBD)

**Impact Assessment:**

| Dimension          | Impact | Justification                                                  |
| ------------------ | ------ | -------------------------------------------------------------- |
| **Revenue**        | 0      | Internal-only                                                  |
| **Risk Reduction** | ++     | Validates multi-user readiness, prevents data corruption       |
| **Cost**           | -      | 1-2 days engineering effort (stress test authoring + analysis) |
| **UX**             | +      | Reliable writes under concurrent access = no lost data         |

**Dependencies:**

- None (existing file-lock.js implementation sufficient to test)

**Trade-offs:**

- Stress tests increase CI runtime by ~2 minutes
- Acceptable: multi-user reliability validation justifies CI cost

---

## REC-505: Document Authentication Strategy Before External Exposure

**Priority:** P1

**Category:** Security

**Gap/Risk Reference:** RISK-503 (no authentication/authorization enforcement),
SECURITY_FLAG: AUTH-001, AUTH-002, AUTH-003

**Problem Statement:** Current Command Center UI and MCP server have **no
authentication layer**. Acceptable for localhost-only internal use, but
**critical security gap** if:

- Server exposed on non-localhost network interface (e.g., team LAN)
- MCP tools published externally (cross-organization Copilot integration)
- Multi-user rollout requires user identity tracking

**Source:** Analysis section 4.5 (authentication/authorization), SECURITY_FLAG
items.

**Recommended Solution:** **BLOCK any external exposure until Security Architect
defines authentication strategy.** For v1 localhost-only, document explicit
assumption of trusted localhost environment.

**Implementation Steps (Security Architect scope):**

1. Security Architect evaluates authentication options:
   - Option A: Browser origin check (localhost:3000 only) — sufficient for v1?
   - Option B: HTTP Basic Auth (username/password) — simple, no session state
   - Option C: OAuth2 (GitHub login) — future-proof for multi-org adoption
2. Security Architect defines authorization model:
   - Single-user mode: no RBAC needed
   - Multi-user mode: role definitions (admin/viewer/contributor?)
3. Security Architect validates secret scanning middleware coverage
   (server.js:15)
4. Software Architect implements chosen auth strategy in Sprint 12

**Success Criteria (SMART):**

- ✓ Security Architect ADR published (ADR-007: Authentication Strategy) by end
  of Phase 2 (time-bound)
- ✓ Implementation completed before any external exposure (specific)
- ✓ Auth middleware covers 100% of non-public endpoints (measurable)
- ✓ Penetration test passes (no unauthorized access) (achievable)
- ✓ Zero production security incidents related to auth (relevant)

**Impact Assessment:**

| Dimension          | Impact | Justification                                                                             |
| ------------------ | ------ | ----------------------------------------------------------------------------------------- |
| **Revenue**        | 0      | Internal-only currently                                                                   |
| **Risk Reduction** | ++     | Eliminates critical security gap for future external exposure                             |
| **Cost**           | --     | 3-5 days engineering effort (OAuth2 integration complex) OR - (1 day for HTTP Basic Auth) |
| **UX**             | --     | Login friction (OAuth2) OR - (basic auth prompt) OR 0 (if localhost origin check)         |

**Dependencies:**

- `BLOCKING:` Security Architect (must define strategy per SECURITY_FLAG items)

**Trade-offs:**

- Complexity vs security: simpler auth (basic auth) easier to implement but less
  future-proof than OAuth2
- UX friction: login step reduces localhost simplicity for single-user scenario
- **Recommendation:** Start with localhost origin check for v1, defer OAuth2 to
  external exposure milestone

---

## REC-506: Consolidate ADRs into Central Architecture Decision Log

**Priority:** P2

**Category:** Documentation / Governance

**Gap/Risk Reference:** Implicit from analysis section 6 (ADR consolidation)

**Problem Statement:** ADRs currently embedded in Software Architect analysis
document (ADR-001 through ADR-006). As architecture evolves:

- ADRs from multiple agents (Security Architect, DevOps Engineer, Data
  Architect) will proliferate
- Single-source-of-truth needed for architecture decisions
- Searchability and cross-referencing suffer with scattered ADRs

**Source:** Analysis section 6 (ADR index).

**Recommended Solution:** Move ADRs to centralized `docs/architecture/`
directory with structured file naming.

**Implementation Steps:**

1. Create directory structure:
   ```
   docs/architecture/
     adr-001-modular-monolith.md
     adr-002-javascript-nodejs.md
     adr-003-zero-framework-http.md
     adr-004-file-based-storage.md
     adr-005-rest-api-style.md
     adr-006-defer-api-versioning.md
     README.md (ADR index table)
   ```
2. Extract ADRs from `05-software-architect-analysis.md` to individual files
3. Add ADR template (title, status, context, decision, consequences, source)
4. Update Phase 2 synthesis process to compile ADRs from
   `docs/architecture/` across all agents

**Success Criteria (SMART):**

- ✓ All ADRs in `docs/architecture/` directory by Sprint 11 (time-bound)
- ✓ ADR template documented in `docs/architecture/README.md` (specific)
- ✓ 100% of architecture decisions (from all Phase 2 agents) captured as ADRs
  (measurable)
- ✓ Synthesis Agent consumes ADRs from centralized directory (achievable)
- ✓ Cross-agent ADR references use consistent ADR-NNN format (relevant)

**Impact Assessment:**

| Dimension          | Impact | Justification                                                   |
| ------------------ | ------ | --------------------------------------------------------------- |
| **Revenue**        | 0      | Internal documentation practice                                 |
| **Risk Reduction** | +      | Prevents architectural drift, improves decision traceability    |
| **Cost**           | -      | 1 day engineering effort (file extraction + template authoring) |
| **UX**             | 0      | No user-facing impact                                           |

**Dependencies:**

- None (can be done immediately)

**Trade-offs:**

- File proliferation: many small files vs single analysis document
- Acceptable: searchability and governance benefits outweigh file overhead

---

## REC-507: Add C4 Diagrams to Codebase Documentation

**Priority:** P2

**Category:** Documentation

**Gap/Risk Reference:** Implicit from analysis section 3 (C4 diagrams present in
analysis, not in codebase)

**Problem Statement:** C4 diagrams (context, container, component) created in
Software Architect analysis but not versioned in codebase. Consequences:

- New developer onboarding requires reading Markdown diagrams (text-based, hard
  to visualize)
- Diagrams out of sync with code as architecture evolves
- No visual system overview in README or docs/

**Source:** Analysis sections 3.1, 3.2, 3.3 (C4 diagrams in Markdown).

**Recommended Solution:** Convert Markdown C4 diagrams to Mermaid format and
embed in `docs/architecture.md`.

**Implementation Steps:**

1. Create `docs/architecture.md` with:
   - C4 Level 1 (context) as Mermaid diagram
   - C4 Level 2 (container) as Mermaid diagram
   - C4 Level 3 (component) as Mermaid diagram
   - Link to `docs/architecture/` ADRs
2. Add diagram rendering to README.md (link to docs/architecture.md)
3. Update diagram maintenance process: when architecture changes, update Mermaid
   diagrams + corresponding ADR

**Success Criteria (SMART):**

- ✓ `docs/architecture.md` exists with 3 Mermaid C4 diagrams by Sprint 11
  (time-bound)
- ✓ Diagrams render correctly in GitHub Markdown preview (specific)
- ✓ README.md links to architecture docs (measurable)
- ✓ 100% of new developers report diagrams helpful in onboarding survey
  (achievable)
- ✓ Diagrams updated within 1 sprint of architecture changes (relevant)

**Impact Assessment:**

| Dimension          | Impact | Justification                                                      |
| ------------------ | ------ | ------------------------------------------------------------------ |
| **Revenue**        | 0      | Internal documentation                                             |
| **Risk Reduction** | 0      | No direct risk reduction                                           |
| **Cost**           | -      | 0.5 days (Mermaid diagram authoring)                               |
| **UX**             | +      | Faster new developer onboarding, better architecture comprehension |

**Dependencies:**

- None (Mermaid supported natively by GitHub Markdown)

**Trade-offs:**

- Diagram maintenance overhead: must keep Mermaid in sync with code
- Acceptable: visual documentation value justifies maintenance cost

---

## Recommendation Priority Matrix

| Priority | Count | Recommendations                                                                     |
| -------- | ----- | ----------------------------------------------------------------------------------- |
| **P1**   | 3     | REC-501 (JSON schema validation), REC-503 (load testing), REC-505 (auth strategy)   |
| **P2**   | 3     | REC-504 (file lock stress test), REC-506 (ADR consolidation), REC-507 (C4 diagrams) |
| **P3**   | 1     | REC-502 (defer domain events)                                                       |

**Total recommendations:** 7

**P1/P2 Traceability Check:**

- GAP-501 → REC-501 ✓
- GAP-502 → REC-502 (deferred) ✓
- GAP-503 → REC-503 ✓
- RISK-501 → REC-504 ✓
- RISK-503 → REC-505 ✓
- Implicit ADR consolidation → REC-506 ✓
- Implicit C4 documentation → REC-507 ✓

**All gaps/risks addressed:** Yes

---

## Impact Summary

### By Category

| Category      | P1 Count    | P2 Count             | P3 Count    | Total |
| ------------- | ----------- | -------------------- | ----------- | ----- |
| Security      | 1 (REC-505) | 0                    | 0           | 1     |
| Performance   | 1 (REC-503) | 1 (REC-504)          | 0           | 2     |
| Code Quality  | 1 (REC-501) | 0                    | 0           | 1     |
| Documentation | 0           | 2 (REC-506, REC-507) | 0           | 2     |
| Architecture  | 0           | 0                    | 1 (REC-502) | 1     |

### By Impact Dimension

**Risk Reduction:**

- High impact (++): REC-501, REC-504, REC-505
- Medium impact (+): REC-503, REC-506
- No impact (0): REC-502, REC-507

**Cost:**

- High cost (--): REC-505 (if OAuth2)
- Medium cost (-): REC-501, REC-503, REC-504, REC-506, REC-507
- Low cost: None
- Zero cost: REC-502 (deferred)

**UX:**

- High positive (++): REC-503
- Medium positive (+): REC-501, REC-504, REC-507
- Negative (--): REC-505 (if OAuth2)
- No impact (0): REC-502, REC-506

---

## Dependencies on Other Phase 2 Agents

| Agent                  | Dependency Items                                          | Blocking?                        |
| ---------------------- | --------------------------------------------------------- | -------------------------------- |
| **Security Architect** | AUTH-001, AUTH-002, AUTH-003 (REC-505)                    | Yes — blocks external exposure   |
| **Legal Counsel**      | LCHECK-001 (Ajv license), LCHECK-002 (autocannon license) | No — verify during Sprint 10     |
| **DevOps Engineer**    | CI/CD integration (REC-503 load testing)                  | No — coordinate in Sprint 10     |
| **Data Architect**     | File-based storage validation (performance implications)  | No — inform of RISK-501 findings |

---

## HANDOFF CHECKLIST – Software Architect Recommendations – 2026-03-09

- [x] Every GAP from analysis has a corresponding REC ✓
- [x] Every RISK from analysis has a mitigation REC ✓
- [x] All P1/P2 recommendations have SMART success criteria ✓
- [x] All recommendations have impact assessment (Revenue/Risk/Cost/UX) ✓
- [x] Priority matrix justification present ✓
- [x] Dependencies on other agents documented ✓
- [x] All LICENSE_CHECK items forwarded ✓
- [x] All SECURITY_FLAG items forwarded ✓
- [x] JSON export present and valid ✓

**STATUS:** READY FOR HANDOFF

---

## JSON EXPORT

```json
{
  "metadata": {
    "agent": "Software Architect (05)",
    "phase": "2",
    "date": "2026-03-09",
    "software_name": "MYAGENTIC-IT-PROJECT-TEAM-V2",
    "input_from": "05-software-architect-analysis.md",
    "mode": "CREATE"
  },
  "recommendations": [
    {
      "id": "REC-501",
      "priority": "P1",
      "category": "Code Quality / Security",
      "title": "Implement JSON Schema Validation Middleware",
      "gap_risk_ref": ["GAP-501", "RISK-503"],
      "smart_criteria": "All POST/PUT endpoints return 400 for malformed requests; 100% schema coverage; >=95% test coverage; Sprint 10 delivery",
      "impact": {
        "revenue": 0,
        "risk_reduction": "++",
        "cost": "-",
        "ux": "+"
      },
      "dependencies": ["Legal Counsel (LCHECK-001)"]
    },
    {
      "id": "REC-502",
      "priority": "P3",
      "category": "Architecture / Design Debt",
      "title": "Defer Domain Events Implementation to Multi-User Milestone",
      "gap_risk_ref": ["GAP-502"],
      "smart_criteria": "N/A — deferred to multi-user rollout",
      "impact": { "revenue": 0, "risk_reduction": 0, "cost": 0, "ux": 0 },
      "dependencies": []
    },
    {
      "id": "REC-503",
      "priority": "P1",
      "category": "Performance / Quality Gates",
      "title": "Add Automated Load Testing to CI/CD Pipeline",
      "gap_risk_ref": ["GAP-503", "QR-ARCH-001"],
      "smart_criteria": "Baseline metrics documented; 100% endpoint coverage; CI fails on p95 > budget; Sprint 10 delivery",
      "impact": {
        "revenue": 0,
        "risk_reduction": "+",
        "cost": "-",
        "ux": "++"
      },
      "dependencies": []
    },
    {
      "id": "REC-504",
      "priority": "P2",
      "category": "Performance / Reliability",
      "title": "Stress Test File Locking Under Concurrent Access",
      "gap_risk_ref": ["RISK-501"],
      "smart_criteria": "100% JSON integrity; <1% timeout rate; p95 lock latency <50ms; 10 consecutive CI passes; Sprint 11 delivery",
      "impact": {
        "revenue": 0,
        "risk_reduction": "++",
        "cost": "-",
        "ux": "+"
      },
      "dependencies": []
    },
    {
      "id": "REC-505",
      "priority": "P1",
      "category": "Security",
      "title": "Document Authentication Strategy Before External Exposure",
      "gap_risk_ref": ["RISK-503", "AUTH-001", "AUTH-002", "AUTH-003"],
      "smart_criteria": "Security Architect ADR-007 published; implementation before external exposure; 100% endpoint coverage; penetration test passes; zero incidents",
      "impact": {
        "revenue": 0,
        "risk_reduction": "++",
        "cost": "--",
        "ux": "--"
      },
      "dependencies": ["Security Architect (BLOCKING)"]
    },
    {
      "id": "REC-506",
      "priority": "P2",
      "category": "Documentation / Governance",
      "title": "Consolidate ADRs into Central Architecture Decision Log",
      "gap_risk_ref": ["Implicit from ADR consolidation"],
      "smart_criteria": "All ADRs in docs/architecture/; ADR template documented; 100% decision capture; Synthesis integration; Sprint 11 delivery",
      "impact": { "revenue": 0, "risk_reduction": "+", "cost": "-", "ux": 0 },
      "dependencies": []
    },
    {
      "id": "REC-507",
      "priority": "P2",
      "category": "Documentation",
      "title": "Add C4 Diagrams to Codebase Documentation",
      "gap_risk_ref": ["Implicit from C4 diagrams"],
      "smart_criteria": "docs/architecture.md with 3 Mermaid diagrams; GitHub render verified; README link added; 100% onboarding satisfaction; updated within 1 sprint of changes",
      "impact": { "revenue": 0, "risk_reduction": 0, "cost": "-", "ux": "+" },
      "dependencies": []
    }
  ],
  "priority_summary": {
    "P1": 3,
    "P2": 3,
    "P3": 1,
    "total": 7
  },
  "impact_summary": {
    "risk_reduction_high": ["REC-501", "REC-504", "REC-505"],
    "risk_reduction_medium": ["REC-503", "REC-506"],
    "ux_high_positive": ["REC-503"],
    "cost_high": ["REC-505"]
  },
  "dependencies": {
    "Security Architect": {
      "items": ["AUTH-001", "AUTH-002", "AUTH-003"],
      "blocking": true
    },
    "Legal Counsel": {
      "items": ["LCHECK-001", "LCHECK-002"],
      "blocking": false
    },
    "DevOps Engineer": { "items": ["CI/CD integration"], "blocking": false },
    "Data Architect": {
      "items": ["File-based storage validation"],
      "blocking": false
    }
  },
  "handoff_checklist": {
    "every_gap_has_rec": true,
    "every_risk_has_mitigation": true,
    "p1_p2_smart_criteria": true,
    "impact_assessments_complete": true,
    "priority_matrix_justified": true,
    "dependencies_documented": true,
    "license_checks_forwarded": true,
    "security_flags_forwarded": true,
    "ready_for_handoff": true
  }
}
```
