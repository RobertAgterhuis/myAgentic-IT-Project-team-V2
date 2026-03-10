# Guardrails – Software Architecture – 2026-03-09

## Metadata

- Agent: Software Architect (05)
- Phase: 2
- Input received from: Software Architect Analysis + Recommendations + Sprint
  Plan
- Date: 2026-03-09
- Software under design: MYAGENTIC-IT-PROJECT-TEAM-V2
- **Mode: CREATE**

---

## Purpose of Guardrails

These guardrails enforce architectural principles and prevent common violations
during Phase 5 implementation. Each guardrail is:

- **Testable:** Automated verification possible (CI check, linter rule, test
  assertion)
- **Specific:** Clear pass/fail criteria
- **Actionable:** Violation triggers defined remediation action

**Enforcement timing:**

- **Pre-merge:** CI checks before PR approval
- **Post-merge:** Monitoring + alerts for runtime violations
- **Sprint gate:** Manual review during sprint retrospective

---

## GUARDRAIL ARCH-G-001: Zero Runtime Dependencies Constraint

**Category:** Dependency Management

**Rule:** `package.json` MUST have zero entries in `dependencies` object. All
external packages MUST be in `devDependencies` only.

**Rationale:** Preserves operational simplicity, minimizes attack surface,
enables license audit simplification (Phase 1 REC-005).

**Source:**

- Analysis ADR-003 (zero-framework HTTP server)
- Existing implementation: `package.json:10` (dependencies object empty)

**Verification Method:**

```bash
# CI check script
if [ -n "$(jq -r '.dependencies | keys[]' package.json 2>/dev/null)" ]; then
  echo "VIOLATION: Runtime dependencies detected in package.json"
  echo "Only devDependencies permitted per ARCH-G-001"
  exit 1
fi
```

**Automated enforcement:** CI workflow `.github/workflows/guardrails.yml` (runs
on PR, push to main)

**Violation Action:**

1. CI build fails with error message referencing ARCH-G-001
2. Developer must refactor to remove dependency OR escalate to Software
   Architect if legitimate need (triggers ADR review)
3. If approved: update ADR-003 with exception and rationale

**Exception Process:**

- Propose ADR amendment with business justification (e.g., "cryptographic
  library required per Security Architect mandate")
- Software Architect + Security Architect review
- If approved: update guardrail with explicit exception list

**Test Coverage Requirement:** N/A (static check)

---

## GUARDRAIL ARCH-G-002: File-Based Storage Only (No Database)

**Category:** Data Persistence

**Rule:** No database client libraries (e.g., `pg`, `mysql2`, `mongodb`,
`redis`) SHALL be added to codebase. All data persistence MUST use FileStore
abstraction (`store.js`).

**Rationale:** Maintains zero-infrastructure deployment per ADR-004, ensures
Git-based audit trail.

**Source:**

- Analysis ADR-004 (file-based JSON/Markdown storage)
- Analysis section 2.5 (database selection)

**Verification Method:**

```bash
# CI check script
FORBIDDEN_DEPS="pg mysql2 mysql mongodb redis ioredis sqlite3 better-sqlite3"
for dep in $FORBIDDEN_DEPS; do
  if jq -e ".dependencies.\"$dep\" or .devDependencies.\"$dep\"" package.json > /dev/null 2>&1; then
    echo "VIOLATION: Database dependency '$dep' detected (ARCH-G-002)"
    exit 1
  fi
done
```

**Automated enforcement:** Same CI workflow as ARCH-G-001

**Violation Action:**

1. CI build fails
2. Developer must refactor to use FileStore OR escalate if file-based storage
   insufficient (triggers architecture re-evaluation per REEVALUATE command)
3. If scope change required (e.g., performance demands real database): trigger
   SCOPE CHANGE TECH procedure

**Exception Process:**

- Escalate to Reevaluate Agent with performance data justifying database need
- If approved: ADR-004 superseded by new ADR, guardrail archived

**Test Coverage Requirement:** FileStore integration tests cover all data access
patterns (existing coverage in `tests/store.test.js`)

---

## GUARDRAIL ARCH-G-003: Atomic File Writes Mandatory

**Category:** Data Integrity

**Rule:** All file write operations MUST use the atomic write pattern
(temp-file-then-rename) implemented in `FileStore.write()`. Direct
`fs.writeFile()` calls to data files FORBIDDEN.

**Rationale:** Prevents partial writes and data corruption, especially critical
for multi-user scenarios (RISK-501 mitigation).

**Source:**

- Analysis section 2.6 (ADR-004 atomic writes)
- Existing implementation: `store.js:68-78`

**Verification Method:**

```bash
# Static analysis with grep
FILES=$(grep -r "fs\.writeFile\|fs\.writeFileSync" .github/webapp --include="*.js" --exclude="store.js" | grep -v "test" | wc -l)
if [ "$FILES" -gt 0 ]; then
  echo "VIOLATION: Direct fs.writeFile() detected outside store.js (ARCH-G-003)"
  grep -r "fs\.writeFile\|fs\.writeFileSync" .github/webapp --include="*.js" --exclude="store.js" | grep -v "test"
  exit 1
fi
```

**Automated enforcement:** CI workflow (runs on every PR)

**Violation Action:**

1. CI build fails with file paths showing violations
2. Developer refactors to use `FileStore.write(path, content)` instead of direct
   `fs` calls
3. No exceptions permitted (architectural invariant)

**Exception Process:** None (atomic writes are non-negotiable for data
integrity)

**Test Coverage Requirement:** Integration tests verify FileStore.write() uses
temp-file-then-rename (existing test in `tests/store.test.js:45`)

---

## GUARDRAIL ARCH-G-004: API Schema Validation Enforcement

**Category:** API Quality

**Rule:** Every POST/PUT endpoint MUST have:

1. JSON schema file in `.github/webapp/schemas/[endpoint-name]-schema.json`
2. `validateBody(schemaId)` middleware applied in route handler

**Rationale:** Enforces REC-501 (API schema validation), prevents malformed
requests from reaching business logic.

**Source:**

- Recommendations REC-501
- Sprint plan story SA-001

**Verification Method:**

```javascript
// CI test script (tests/ci/verify-api-schemas.test.js)
const routes = require('../.github/webapp/server.js'); // Import route definitions
const fs = require('fs');

test('All POST/PUT endpoints have schema validation', () => {
  const endpoints = extractPostPutEndpoints(routes); // Helper function
  for (const endpoint of endpoints) {
    const schemaPath = `.github/webapp/schemas/${endpoint.schemaId}.json`;
    expect(
      fs.existsSync(schemaPath),
      `Missing schema for ${endpoint.path}`
    ).toBe(true);
    expect(
      endpoint.middleware.includes('validateBody'),
      `Missing validateBody for ${endpoint.path}`
    ).toBe(true);
  }
});
```

**Automated enforcement:** Test suite runs in CI (fails if any endpoint missing
schema)

**Violation Action:**

1. CI test fails with endpoint name
2. Developer creates missing schema OR adds `validateBody()` middleware
3. No merge until guardrail passes

**Exception Process:**

- Public endpoints (e.g., `/healthz`, static assets) exempt
- Explicit exemption list in `tests/ci/schema-exemptions.json` with rationale

**Test Coverage Requirement:** Schema validation middleware itself tested
at >=95% coverage (per SA-001 acceptance criteria)

---

## GUARDRAIL ARCH-G-005: Performance Budget Compliance

**Category:** Performance

**Rule:** API endpoint p95 response time MUST NOT exceed baseline + 10%
tolerance. CI load tests fail if performance budget violated.

**Rationale:** Enforces NFR performance targets (p95 < 200ms per analysis
section 5.1), prevents performance regressions from shipping.

**Source:**

- Analysis section 5.1 (performance NFRs)
- Recommendations REC-503
- Sprint plan story SA-003

**Verification Method:**

```bash
# CI load test script (integrated in SA-003)
npm run test:load
# Script internally compares p95 to baseline, exits 1 if exceeded
```

**Automated enforcement:** GitHub Actions workflow `load-tests.yml` (runs on PR
to main)

**Violation Action:**

1. CI job fails with p95 comparison table (baseline vs current)
2. Developer profiles endpoint to identify regression cause
3. Fix performance issue OR justify with trade-off analysis (e.g., "added
   encryption, 5% slowdown acceptable per Security Architect")
4. If justified: update baseline in `docs/performance-baseline.md` with ADR
   documenting trade-off

**Exception Process:**

- Requires Software Architect + Product Manager approval if p95 > baseline + 10%
- Document in ADR with user impact analysis

**Test Coverage Requirement:** Load test suite covers all API endpoints (SA-002
acceptance criteria)

---

## GUARDRAIL ARCH-G-006: C4 Diagram Sync with Code

**Category:** Documentation

**Rule:** When architectural changes occur (new container/component, technology
stack change), `docs/architecture.md` Mermaid diagrams MUST be updated within
same PR.

**Rationale:** Prevents documentation drift, ensures diagrams remain valuable
for onboarding (REC-507).

**Source:**

- Recommendations REC-507
- Sprint plan story SA-009

**Verification Method:**

```bash
# Manual checklist in PR template
## Architecture Changes Checklist
- [ ] If new component/container added: `docs/architecture.md` diagrams updated
- [ ] If technology stack changed: ADRs updated + diagrams reflect new tech
- [ ] Diagrams render correctly in GitHub preview (verified manually)
```

**Automated enforcement:** Partial (PR template enforces checklist; human
reviewer verifies)

**Violation Action:**

1. Reviewer flags missing diagram update in PR review
2. Developer updates Mermaid diagrams OR confirms no architecture change
   occurred
3. No merge until checklist complete

**Exception Process:** None (documentation updates are low-cost, always
feasible)

**Test Coverage Requirement:** N/A (documentation guardrail, not code)

---

## GUARDRAIL ARCH-G-007: ADR Required for Architecture Decisions

**Category:** Governance

**Rule:** Any change affecting:

- Technology stack (new language, framework, library with runtime dependency)
- Data persistence strategy
- API contract (versioning change, breaking change)
- Authentication/authorization model

MUST have a corresponding ADR in `.github/docs/architecture/` before
implementation.

**Rationale:** Maintains decision traceability, prevents ad-hoc architecture
drift (REC-506).

**Source:**

- Recommendations REC-506
- Sprint plan story SA-008
- Analysis section 6 (ADR consolidation)

**Verification Method:**

```bash
# PR checklist (manual verification)
## Architecture Decision Checklist
- [ ] If architecture decision made: ADR-XXX created in `.github/docs/architecture/`
- [ ] ADR follows template (Title, Status, Context, Decision, Consequences, Source)
- [ ] ADR index (`README.md`) updated with new entry
```

**Automated enforcement:** PR template + human review

**Violation Action:**

1. Reviewer identifies missing ADR during PR review
2. Developer creates ADR before merge OR demonstrates no architecture decision
   occurred
3. If uncertainty: escalate to Software Architect for classification

**Exception Process:**

- Trivial changes (bug fixes, refactoring without architecture impact) exempt
- Burden of proof on developer to justify exemption in PR description

**Test Coverage Requirement:** N/A (governance guardrail, not code)

---

## GUARDRAIL ARCH-G-008: Authentication Required Before External Exposure

**Category:** Security

**Rule:** Server MUST NOT be configured to bind to non-localhost interface
(e.g., `0.0.0.0`, public IP) unless authentication middleware is enabled per
Security Architect ADR-007.

**Rationale:** Prevents accidental exposure of unauthenticated orchestration
controls (RISK-503 mitigation, REC-505).

**Source:**

- Recommendations REC-505
- Sprint plan story SA-007
- Analysis SECURITY_FLAG: AUTH-001, AUTH-002, AUTH-003

**Verification Method:**

```javascript
// CI test script (tests/ci/verify-localhost-only.test.js)
const serverConfig = require('../.github/webapp/server.js');

test('Server binds to localhost only OR authentication enabled', () => {
  const host = serverConfig.HOST || '127.0.0.1';
  const authEnabled = serverConfig.AUTH_MIDDLEWARE_ENABLED || false;

  if (host !== '127.0.0.1' && host !== 'localhost' && !authEnabled) {
    throw new Error(
      'VIOLATION ARCH-G-008: Non-localhost binding without authentication'
    );
  }
});
```

**Automated enforcement:** CI test suite

**Violation Action:**

1. CI test fails if `HOST !== localhost` AND `AUTH_MIDDLEWARE_ENABLED === false`
2. Developer either:
   - Reverts HOST to localhost (for internal use)
   - OR enables authentication per Security Architect ADR-007 (for external
     exposure)
3. No merge until guardrail passes

**Exception Process:** None (security invariant, no exceptions)

**Test Coverage Requirement:** Authentication middleware tested for 100%
endpoint coverage (per SA-007 acceptance criteria)

---

## GUARDRAIL ARCH-G-009: File Lock Contention Monitoring

**Category:** Reliability

**Rule:** Production metrics MUST track file lock acquisition latency (p95, p99)
and timeout rate. Alert if:

- p95 lock latency > 50ms
- Lock timeout rate > 1%

**Rationale:** Early warning system for multi-user contention issues (RISK-501
mitigation, REC-504).

**Source:**

- Recommendations REC-504
- Sprint plan story SA-004
- Analysis RISK-501 (file locking contention)

**Verification Method:**

```javascript
// Runtime monitoring (integrated in store.js)
const { recordMetric } = require('./metrics.js');

function acquireLock(filePath) {
  const startTime = Date.now();
  const lock = fileLock.lock(filePath, { retries: 3, timeout: 5000 });
  const latency = Date.now() - startTime;

  recordMetric('file_lock_latency', latency, { filePath });
  if (!lock) {
    recordMetric('file_lock_timeout', 1, { filePath });
  }
  return lock;
}
```

**Automated enforcement:** Metrics-based alerting (CI monitors `metrics.json`
for anomalies)

**Violation Action:**

1. If p95 lock latency > 50ms for 10 consecutive measurements: alert in CI
   artifacts
2. Developer investigates contention source (log file paths with high latency)
3. Mitigations: increase retry count, add backoff, optimize file access patterns
4. If persistent: escalate to REEVALUATE TECH (may require database per ADR-004
   revision)

**Exception Process:** None (monitoring requirement, not a fail/pass gate)

**Test Coverage Requirement:** Stress tests validate lock behavior under
contention (SA-004 acceptance criteria)

---

## GUARDRAIL ARCH-G-010: MIT License Compatibility Only

**Category:** Legal Compliance

**Rule:** All dependencies (runtime and dev) MUST have MIT-compatible licenses.
Forbidden licenses: GPL, AGPL, proprietary.

**Rationale:** Ensures project MIT License integrity, simplifies legal audit,
aligns with Phase 1 REC-005.

**Source:**

- Analysis section 2 (technology stack licensing)
- Phase 1 REC-005 (license governance)
- Existing README.md license declaration

**Verification Method:**

```bash
# CI license check script (using license-checker or similar)
npm install -g license-checker
license-checker --production --onlyAllow "MIT;ISC;BSD;Apache-2.0;CC0-1.0" --failOn "GPL;AGPL;Proprietary"
```

**Automated enforcement:** CI workflow `license-audit.yml` (runs on dependency
updates)

**Violation Action:**

1. CI fails with list of non-compliant dependencies
2. Developer removes dependency OR finds MIT-compatible alternative
3. If no alternative exists: escalate to Legal Counsel for review
4. Legal Counsel decision: approve with exemption OR mandate replacement

**Exception Process:**

- Requires Legal Counsel approval (LCHECK-XXX item created)
- Document in `.github/docs/legal/license-exemptions.md` with rationale

**Test Coverage Requirement:** N/A (dependency audit, not code)

---

## Guardrail Compliance Summary

| Guardrail ID   | Category              | Enforcement                  | Exceptions Allowed?           |
| -------------- | --------------------- | ---------------------------- | ----------------------------- |
| **ARCH-G-001** | Dependency Management | Automated (CI)               | Yes (with ADR amendment)      |
| **ARCH-G-002** | Data Persistence      | Automated (CI)               | Yes (via SCOPE CHANGE)        |
| **ARCH-G-003** | Data Integrity        | Automated (CI)               | No                            |
| **ARCH-G-004** | API Quality           | Automated (CI test)          | Yes (explicit exemption list) |
| **ARCH-G-005** | Performance           | Automated (CI load test)     | Yes (with ADR + approval)     |
| **ARCH-G-006** | Documentation         | Manual (PR checklist)        | No                            |
| **ARCH-G-007** | Governance            | Manual (PR checklist)        | Yes (trivial changes exempt)  |
| **ARCH-G-008** | Security              | Automated (CI test)          | No                            |
| **ARCH-G-009** | Reliability           | Automated (metrics alert)    | N/A (monitoring only)         |
| **ARCH-G-010** | Legal Compliance      | Automated (CI license check) | Yes (Legal Counsel review)    |

**Total guardrails:** 10

**Automated guardrails:** 7 (70%)

**Manual guardrails:** 2 (20%) — ARCH-G-006, ARCH-G-007

**Monitoring guardrails:** 1 (10%) — ARCH-G-009

---

## Enforcement Integration Plan

### Phase 5 Implementation Agent Instructions

When Implementation Agent begins sprint work:

1. Read this guardrails document before any code changes
2. For each story, identify applicable guardrails (cross-reference by category)
3. Before creating PR: run local guardrail checks (`npm run guardrails:check`)
4. Verify PR checklist items (ARCH-G-006, ARCH-G-007) manually
5. If CI guardrail fails: fix violation before requesting review (do NOT
   override)

### Sprint Gate Integration

At each Sprint Gate (end of sprint):

1. Retrospective Agent reviews guardrail violation log from CI
2. If >3 violations per sprint: escalate to Software Architect (indicates
   training gap or guardrail clarity issue)
3. Update guardrails document if violations reveal ambiguity

### CI/CD Pipeline Structure

```yaml
# .github/workflows/guardrails.yml
name: Architecture Guardrails
on: [push, pull_request]
jobs:
  dependency-guardrails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: .github/scripts/check-zero-runtime-deps.sh # ARCH-G-001
      - run: .github/scripts/check-no-database-deps.sh # ARCH-G-002
      - run: .github/scripts/check-license-compliance.sh # ARCH-G-010

  code-guardrails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: .github/scripts/check-atomic-writes.sh # ARCH-G-003
      - run: npm ci
      - run: npm run test:ci:schemas # ARCH-G-004
      - run: npm run test:ci:localhost-binding # ARCH-G-008

  performance-guardrails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:load # ARCH-G-005
```

---

## Guardrail Violation Log Template

When violations occur, log in
`.github/docs/violations/YYYY-MM-DD-[guardrail-id].md`:

```markdown
# Violation Report: [GUARDRAIL-ID] — [Date]

## Summary

- **Guardrail violated:** [ID + Title]
- **PR/Commit:** [SHA or PR number]
- **Detected by:** [CI job name or human reviewer]

## Root Cause

[Brief description of what caused violation]

## Resolution

[What action was taken to fix]

## Prevention

[How to prevent similar violations in future — update docs? add test?]

## Lesson Learned

[For retrospective review]
```

---

## HANDOFF CHECKLIST – Software Architect Guardrails – 2026-03-09

- [x] All guardrails are testable (automated check or manual checklist) ✓
- [x] Every guardrail has violation action defined ✓
- [x] Every guardrail has verification method (script, test, or checklist) ✓
- [x] Guardrails reference source gaps/risks from analysis ✓
- [x] Exception process documented for each guardrail ✓
- [x] Integration plan for Phase 5 Implementation Agent provided ✓
- [x] CI/CD pipeline structure outlined ✓
- [x] Guardrail compliance summary table present ✓
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
    "input_from": "05-software-architect-analysis.md, 05-software-architect-recommendations.md, 05-software-architect-sprintplan.md",
    "mode": "CREATE"
  },
  "guardrails": [
    {
      "id": "ARCH-G-001",
      "category": "Dependency Management",
      "rule": "Zero runtime dependencies in package.json",
      "rationale": "Operational simplicity, attack surface minimization",
      "source": "ADR-003, existing package.json",
      "enforcement": "Automated (CI jq check)",
      "violation_action": "CI fails, refactor or escalate to ADR review",
      "exceptions_allowed": true,
      "exception_process": "ADR amendment with Software Architect approval"
    },
    {
      "id": "ARCH-G-002",
      "category": "Data Persistence",
      "rule": "No database client libraries permitted",
      "rationale": "Zero-infrastructure deployment per ADR-004",
      "source": "ADR-004, analysis section 2.5",
      "enforcement": "Automated (CI dependency scan)",
      "violation_action": "CI fails, use FileStore or trigger SCOPE CHANGE",
      "exceptions_allowed": true,
      "exception_process": "REEVALUATE TECH with performance justification"
    },
    {
      "id": "ARCH-G-003",
      "category": "Data Integrity",
      "rule": "Atomic file writes mandatory (temp-file-then-rename)",
      "rationale": "Prevent data corruption, RISK-501 mitigation",
      "source": "ADR-004, store.js:68-78",
      "enforcement": "Automated (CI grep check)",
      "violation_action": "CI fails, refactor to FileStore.write()",
      "exceptions_allowed": false,
      "exception_process": "None (architectural invariant)"
    },
    {
      "id": "ARCH-G-004",
      "category": "API Quality",
      "rule": "All POST/PUT endpoints must have JSON schema validation",
      "rationale": "REC-501 enforcement, prevent malformed requests",
      "source": "REC-501, SA-001",
      "enforcement": "Automated (CI test suite)",
      "violation_action": "CI test fails, create schema + add middleware",
      "exceptions_allowed": true,
      "exception_process": "Explicit exemption list for public endpoints"
    },
    {
      "id": "ARCH-G-005",
      "category": "Performance",
      "rule": "API p95 response time <= baseline + 10%",
      "rationale": "NFR enforcement (p95 < 200ms), prevent regressions",
      "source": "Analysis 5.1, REC-503, SA-003",
      "enforcement": "Automated (CI load tests)",
      "violation_action": "CI fails, profile and fix OR justify with ADR",
      "exceptions_allowed": true,
      "exception_process": "Software Architect + Product Manager approval, documented trade-off"
    },
    {
      "id": "ARCH-G-006",
      "category": "Documentation",
      "rule": "C4 diagrams updated within same PR as architecture changes",
      "rationale": "REC-507, prevent documentation drift",
      "source": "REC-507, SA-009",
      "enforcement": "Manual (PR checklist + human review)",
      "violation_action": "Reviewer flags, developer updates diagrams",
      "exceptions_allowed": false,
      "exception_process": "None (low-cost requirement)"
    },
    {
      "id": "ARCH-G-007",
      "category": "Governance",
      "rule": "ADR required for architecture decisions before implementation",
      "rationale": "REC-506, maintain decision traceability",
      "source": "REC-506, SA-008, analysis section 6",
      "enforcement": "Manual (PR checklist + human review)",
      "violation_action": "Reviewer requests ADR creation",
      "exceptions_allowed": true,
      "exception_process": "Trivial changes exempt (burden of proof on developer)"
    },
    {
      "id": "ARCH-G-008",
      "category": "Security",
      "rule": "Authentication required before non-localhost binding",
      "rationale": "RISK-503 mitigation, REC-505",
      "source": "REC-505, SA-007, SECURITY_FLAG items",
      "enforcement": "Automated (CI test)",
      "violation_action": "CI fails, revert to localhost OR enable auth",
      "exceptions_allowed": false,
      "exception_process": "None (security invariant)"
    },
    {
      "id": "ARCH-G-009",
      "category": "Reliability",
      "rule": "File lock latency monitoring with alerts (p95 > 50ms, timeout > 1%)",
      "rationale": "RISK-501 mitigation, REC-504 early warning",
      "source": "REC-504, SA-004, RISK-501",
      "enforcement": "Automated (metrics-based alerting)",
      "violation_action": "Alert generated, investigate contention source",
      "exceptions_allowed": "N/A",
      "exception_process": "Monitoring only, not a fail/pass gate"
    },
    {
      "id": "ARCH-G-010",
      "category": "Legal Compliance",
      "rule": "MIT-compatible licenses only (no GPL/AGPL/proprietary)",
      "rationale": "Phase 1 REC-005, project MIT License integrity",
      "source": "Analysis section 2, Phase 1 REC-005",
      "enforcement": "Automated (CI license-checker)",
      "violation_action": "CI fails, remove dependency or find alternative",
      "exceptions_allowed": true,
      "exception_process": "Legal Counsel approval required (LCHECK-XXX)"
    }
  ],
  "enforcement_summary": {
    "total_guardrails": 10,
    "automated": 7,
    "manual": 2,
    "monitoring": 1
  },
  "ci_integration": {
    "workflow_file": ".github/workflows/guardrails.yml",
    "jobs": [
      "dependency-guardrails",
      "code-guardrails",
      "performance-guardrails"
    ],
    "enforcement_timing": "Pre-merge (all PRs)"
  },
  "handoff_checklist": {
    "all_guardrails_testable": true,
    "violation_actions_defined": true,
    "verification_methods_documented": true,
    "source_references_present": true,
    "exception_processes_documented": true,
    "phase_5_integration_plan_provided": true,
    "ci_pipeline_structure_outlined": true,
    "compliance_summary_present": true,
    "ready_for_handoff": true
  }
}
```
