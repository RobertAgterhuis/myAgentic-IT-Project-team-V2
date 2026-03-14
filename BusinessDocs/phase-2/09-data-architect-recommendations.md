# Recommendations – Data Architect – 2026-03-10

## Metadata

- Agent: Data Architect (09)
- Phase: 2
- Based on analysis: `docs/phase-2/09-data-architect-analysis.md`
- Date: 2026-03-10
- Mode: CREATE

## Recommendation REC-901

### Problem

No formal ownership/stewardship model exists for data domains. **Analysis
reference:** `GAP-901`, `RISK-904`

### Solution

Create a data ownership register covering each domain and entity family.

**Implementation approach:**

1. Define domain owners for Orchestration, User Input, Audit/Observability, and
   Analytics.
2. Define stewardship responsibilities (schema changes, quality incidents,
   retention sign-off).
3. Publish ownership matrix in `docs/data-dictionary.md` and enforcement
   references in sprint checklists.

### Impact

| Dimension      | Expected effect      | Rationale                                         |
| -------------- | -------------------- | ------------------------------------------------- |
| Revenue        | `INSUFFICIENT_DATA:` | Internal platform with no direct revenue metric   |
| Risk Reduction | Medium-High          | Clear ownership reduces unresolved data incidents |
| Cost           | Low                  | Documentation and governance assignment effort    |
| UX             | Low                  | Indirectly improves reliability and consistency   |

### Rationale

Governance accountability is foundational for quality and compliance controls.

### Dependencies

- Requires: none
- Blocked by: none
- Depends on output of: Product Manager (role confirmation)

### Risk of Not Implementing

Incidents and data-policy decisions remain slow and ambiguous.

### Measurement Criterion

- KPI: Data domains with assigned owner
- Baseline: 0
- Target: 100%
- Measurement method: ownership matrix audit
- Time horizon: Sprint 11

---

## Recommendation REC-902

### Problem

Classification and retention matrix is incomplete. **Analysis reference:**
`GAP-902`, `RISK-901`

### Solution

Define and enforce entity-level classification and retention policy.

**Implementation approach:**

1. Classify all entities/fields into `Public/Internal/Confidential/Restricted`.
2. Define retention windows and deletion rules per entity with Legal Counsel
   alignment.
3. Add policy checks for retention and redaction in data write and export flows.

### Impact

| Dimension      | Expected effect      | Rationale                                           |
| -------------- | -------------------- | --------------------------------------------------- |
| Revenue        | `INSUFFICIENT_DATA:` | Internal tool                                       |
| Risk Reduction | High                 | Addresses privacy and security control gaps         |
| Cost           | Medium               | Cross-team policy and implementation effort         |
| UX             | Medium               | Better predictability for data lifecycle operations |

### Rationale

Security architect constraints require this matrix to complete privacy-by-design
controls.

### Dependencies

- Requires: Legal Counsel retention requirements
- Blocked by: pending Legal Counsel output (`33`)
- Depends on output of: Security Architect, Legal Counsel

### Risk of Not Implementing

Privacy and retention violations become likely during growth.

### Measurement Criterion

- KPI: Entity classification coverage
- Baseline: INSUFFICIENT_DATA
- Target: 100% entities classified with retention rule
- Measurement method: classification matrix completeness check
- Time horizon: Sprint 12

---

## Recommendation REC-903

### Problem

Schema evolution/versioning policy is missing. **Analysis reference:**
`GAP-903`, `RISK-902`

### Solution

Implement schema versioning and migration conventions across persistent
entities.

**Implementation approach:**

1. Add `schema_version` metadata to persisted JSON entities.
2. Define migration handlers for breaking changes and compatibility tests.
3. Add CI checks to validate current and one-version-backward compatibility.

### Impact

| Dimension      | Expected effect      | Rationale                                |
| -------------- | -------------------- | ---------------------------------------- |
| Revenue        | `INSUFFICIENT_DATA:` | Internal platform                        |
| Risk Reduction | High                 | Prevents incompatible data changes       |
| Cost           | Medium               | Requires migration scaffolding and tests |
| UX             | Medium               | Fewer breakages in UI/API flows          |

### Rationale

Data contract stability is critical as phase outputs and entities evolve.

### Dependencies

- Requires: Senior Developer support for test patterns
- Blocked by: none
- Depends on output of: Senior Developer

### Risk of Not Implementing

Future updates can break parsing and orchestration state continuity.

### Measurement Criterion

- KPI: Versioned entities coverage
- Baseline: 0%
- Target: 100% core JSON entities with version metadata
- Measurement method: schema audit in CI
- Time horizon: Sprint 11

---

## Recommendation REC-904

### Problem

No automated integrity health checks exist. **Analysis reference:** `GAP-904`,
`RISK-903`

### Solution

Add scheduled data integrity workflows.

**Implementation approach:**

1. Create nightly integrity workflow to validate schema, markdown parseability,
   and cross-reference consistency.
2. Emit integrity report artifact and fail on critical inconsistencies.
3. Add alert/issue creation for repeat integrity failures.

### Impact

| Dimension      | Expected effect      | Rationale                                           |
| -------------- | -------------------- | --------------------------------------------------- |
| Revenue        | `INSUFFICIENT_DATA:` | Internal tool                                       |
| Risk Reduction | High                 | Detects corruption and drift early                  |
| Cost           | Low-Medium           | CI job and parser checks                            |
| UX             | Medium               | Improves reliability and trust in dashboard outputs |

### Rationale

Continuous integrity validation is essential for file-based storage systems.

### Dependencies

- Requires: DevOps workflow support
- Blocked by: none
- Depends on output of: DevOps Engineer

### Risk of Not Implementing

Data errors remain latent until users encounter failures.

### Measurement Criterion

- KPI: Integrity check execution cadence
- Baseline: 0 runs/week
- Target: >=7 runs/week (nightly)
- Measurement method: scheduled workflow run count
- Time horizon: Sprint 10

---

## Recommendation REC-905

### Problem

Storage growth and backup sizing forecast is absent. **Analysis reference:**
`GAP-905`

### Solution

Implement storage telemetry and capacity forecast model.

**Implementation approach:**

1. Capture weekly storage size for core data domains and backup folders.
2. Publish monthly trend report with 3/6/12-month forecast.
3. Define threshold-based cleanup or archival triggers.

### Impact

| Dimension      | Expected effect      | Rationale                               |
| -------------- | -------------------- | --------------------------------------- |
| Revenue        | `INSUFFICIENT_DATA:` | Internal platform                       |
| Risk Reduction | Medium               | Avoids surprise capacity/latency issues |
| Cost           | Low                  | Lightweight telemetry and reporting     |
| UX             | Low-Medium           | Prevents performance degradation        |

### Rationale

Forecasting keeps file-based persistence sustainable.

### Dependencies

- Requires: DevOps metrics collection support
- Blocked by: data horizon decision (`DA-Q-901`)
- Depends on output of: DevOps Engineer

### Risk of Not Implementing

Scaling risks emerge late with limited reaction time.

### Measurement Criterion

- KPI: Monthly storage forecast publication
- Baseline: 0 reports/month
- Target: 1 report/month
- Measurement method: artifact presence check
- Time horizon: Sprint 12

---

## Recommendation REC-906

### Problem

KPI semantics/lineage are not centralized. **Analysis reference:** `GAP-906`,
`RISK-905`

### Solution

Create a governed metric catalog tied to dashboard KPI calculations.

**Implementation approach:**

1. Document KPI definitions, formulas, source files, and owners.
2. Link each dashboard metric to catalog IDs.
3. Add review step for metric changes in pull requests.

### Impact

| Dimension      | Expected effect      | Rationale                                   |
| -------------- | -------------------- | ------------------------------------------- |
| Revenue        | `INSUFFICIENT_DATA:` | Internal platform                           |
| Risk Reduction | Medium               | Reduces interpretation and reporting errors |
| Cost           | Low                  | Documentation and review changes            |
| UX             | Medium               | More trustworthy metrics presentation       |

### Rationale

Governed metric lineage improves reporting consistency.

### Dependencies

- Requires: KPI owner confirmation (`DA-Q-904`)
- Blocked by: ownership decision
- Depends on output of: Product Manager, DevOps Engineer

### Risk of Not Implementing

Conflicting KPI interpretations undermine decision-making.

### Measurement Criterion

- KPI: Dashboard metrics mapped to catalog
- Baseline: 0%
- Target: 100%
- Measurement method: catalog-to-code mapping audit
- Time horizon: Sprint 11

## PRIORITY MATRIX (MANDATORY)

| Recommendation ID | Impact | Effort | Priority | Sprint    |
| ----------------- | ------ | ------ | -------- | --------- |
| REC-901           | Medium | Low    | P1       | Sprint 11 |
| REC-902           | High   | Medium | P1       | Sprint 12 |
| REC-903           | High   | Medium | P1       | Sprint 11 |
| REC-904           | High   | Medium | P1       | Sprint 10 |
| REC-905           | Medium | Low    | P2       | Sprint 12 |
| REC-906           | Medium | Low    | P1       | Sprint 11 |

## HANDOFF CHECKLIST

- [x] All recommendations reference an analysis finding (GAP/RISK/CS/DESIGN ID)
- [x] All impacts have rationale (no empty cells)
- [x] All INSUFFICIENT_DATA: items are documented
- [x] Measurement criteria are SMART formulated
- [x] Priority matrix is fully completed
- [x] Dependencies are documented
- [x] No recommendations outside competence domain
- [x] All INSUFFICIENT_DATA: items tagged with QUESTIONNAIRE_REQUEST in handoff
      message
- [x] Scope Change Impact: NOT_APPLICABLE
- [x] JSON export is valid and complete
