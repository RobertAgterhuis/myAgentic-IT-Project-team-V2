# Sprint 4 Plan — GA Readiness (Audit Wave 1+2)

| Field               | Value                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| **Sprint**          | 4                                                                                              |
| **Milestone**       | #26 — Sprint 4 — GA Readiness (Audit Wave 1+2)                                                 |
| **Branch**          | `feature/sprint-4-implementation`                                                              |
| **Start**           | 2026-03-12                                                                                     |
| **Duration**        | 5 days                                                                                         |
| **Theme**           | Close the governance, security, evidence, and release gaps identified by the external GA audit |
| **Velocity target** | 8 items / 59 ACs (based on Sprint 2: 80% @ 10 items, Sprint 3: 86% @ 7 items)                  |
| **Source**          | External GA Audit Report (2026-03-12), score 8.4/10, 12 findings                               |

---

## Sprint Goal

> **Treat GA as a governance milestone, not a feature milestone.** Close the
> control-plane gaps before expanding autonomy claims. — GA Audit Report,
> Executive Summary

Sprint 4 targets Audit Waves 1 and 2: define the GA scope, close
security/privacy design gaps, align evidence with reality, establish release
discipline, and produce operator-ready documentation. No new feature work. Every
item directly resolves or advances an audit finding.

---

## Item Summary

| #   | Item ID     | Issue                                                                              | Finding | Severity | ACs | Day |
| --- | ----------- | ---------------------------------------------------------------------------------- | ------- | -------- | --- | --- |
| 1   | SP-4-GA-DEF | [#137](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues/137) | F-01    | CRITICAL | 8   | 1   |
| 2   | SP-4-SEC    | [#138](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues/138) | F-02    | CRITICAL | 8   | 2   |
| 3   | SP-4-PRIV   | [#139](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues/139) | F-03    | CRITICAL | 8   | 2   |
| 4   | SP-4-CLAIMS | [#140](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues/140) | F-04    | HIGH     | 7   | 3   |
| 5   | SP-4-TRUTH  | [#142](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues/142) | F-07    | HIGH     | 8   | 3   |
| 6   | SP-4-REL    | [#141](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues/141) | F-05    | HIGH     | 8   | 4   |
| 7   | SP-4-PR     | [#143](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues/143) | F-08    | MEDIUM   | 6   | 4   |
| 8   | SP-4-DOCS   | [#144](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues/144) | F-12    | MEDIUM   | 6   | 5   |

**Total: 8 items, 59 ACs**

---

## Dependency Chain

```
Day 1:  #137 (F-01 GA Definition)  ← MUST BE FIRST — scopes deployment profile
           │
           ├──────────────────────┐
           ▼                      ▼
Day 2:  #138 (F-02 Security)   #139 (F-03 Privacy)  ← Both depend on deployment profile from F-01
           │                      │
           ▼                      ▼
Day 3:  #140 (F-04 Claims)    #142 (F-07 Truth)     ← README/docs overhaul; need F-01 scope decisions
           │                      │
           ▼                      ▼
Day 4:  #141 (F-05 Release)   #143 (F-08 PR)        ← Infrastructure/process; independent of Day 3
           │
           ▼
Day 5:  #144 (F-12 Docs)  +  Sprint completion       ← Operator docs + wrap-up
```

---

## Day-by-Day Schedule

### Day 1 — Governance Foundation

**Theme:** Define what GA means — this scopes everything else.

| Item        | Issue | ACs | Deliverables                    |
| ----------- | ----- | --- | ------------------------------- |
| SP-4-GA-DEF | #137  | 8   | `docs/ga-definition.md` |

**Key decisions to make:**

1. GA deployment profile: localhost-only (v1) or internal-team?
2. Go/no-go criteria: what measurable thresholds?
3. Pilot exit criteria: what evidence closes the pilot phase?
4. Ownership model: who owns code, releases, support, security?

**Day 1 Definition of Done:**

- [ ] GA definition document written and committed
- [ ] Deployment profile for v1 explicitly stated
- [ ] Go/no-go criteria defined with thresholds
- [ ] All 8 ACs for #137 checked off

---

### Day 2 — Security & Privacy Design

**Theme:** Close the two remaining CRITICAL audit findings using the deployment
profile from Day 1.

| Item      | Issue | ACs | Deliverables                                               |
| --------- | ----- | --- | ---------------------------------------------------------- |
| SP-4-SEC  | #138  | 8   | `docs/security-design.md`                          |
| SP-4-PRIV | #139  | 8   | `docs/data-inventory.md`, `docs/privacy-policy.md` |

**SP-4-SEC deliverables:**

- 3-tier deployment profiles (localhost / team / exposed) with security reqs per
  tier
- STRIDE threat model for webapp + MCP server
- Hardening checklist with pass/fail criteria

**SP-4-PRIV deliverables:**

- Data inventory: all data categories with type, location, format, retention
- Privacy policy (user-facing)
- DSAR procedure (data export + deletion)
- ROPA skeleton

**Day 2 Definition of Done:**

- [ ] Security design document committed
- [ ] Data inventory document committed
- [ ] Privacy policy committed
- [ ] All 16 ACs for #138 + #139 checked off

---

### Day 3 — Evidence Alignment

**Theme:** Make the README and docs tell the truth. Align claims with reality.

| Item        | Issue | ACs | Deliverables                           |
| ----------- | ----- | --- | -------------------------------------- |
| SP-4-CLAIMS | #140  | 7   | Updated README.md, landing.html        |
| SP-4-TRUTH  | #142  | 8   | Updated README.md, truth-source policy |

**SP-4-CLAIMS (F-04) work:**

- Reword "autonomous sprint-by-sprint implementation" → supervised/assisted
  framing
- Distinguish designed vs implemented vs planned features
- Document default runtime posture as supervised (CONTINUE-to-proceed)

**SP-4-TRUTH (F-07) work:**

- Fix test count badge: 363 (Jest) + 780 (Vitest) = 1143 total (after fixing
  contrast.test.js)
- Fix Technology Stack table: Root = Jest 29 + ESLint 8; .github/ = Vitest 4 +
  ESLint 10
- Fix Testing section: accurate counts, file counts, coverage
- Verify coverage badge against actual run
- Create truth-source policy document
- Fix the `contrast.test.js` failure (tokens.color.light undefined)

**Day 3 Definition of Done:**

- [ ] README fully updated with accurate claims
- [ ] Landing page aligned
- [ ] Truth-source policy committed
- [ ] All 15 ACs for #140 + #142 checked off
- [ ] All tests passing (both Jest and Vitest)

---

### Day 4 — Release & Process Infrastructure

**Theme:** Establish release discipline and PR governance.

| Item     | Issue | ACs | Deliverables                                                |
| -------- | ----- | --- | ----------------------------------------------------------- |
| SP-4-REL | #141  | 8   | `CHANGELOG.md`, release templates, first release            |
| SP-4-PR  | #143  | 6   | `.github/PULL_REQUEST_TEMPLATE.md`, updated CONTRIBUTING.md |

**SP-4-REL (F-05) work:**

- Adopt semver; bump version in both package.json files
- Create CHANGELOG.md with Sprint 1-3 history
- Create release notes template
- Create release checklist document
- Verify release workflow runs on tag push
- Publish first GitHub Release (v1.0.0-rc.1 or 0.4.0)
- Validate install: fresh clone → npm install → npm start → health check

**SP-4-PR (F-08) work:**

- Create `.github/PULL_REQUEST_TEMPLATE.md` with description, issue refs, test
  results, checklist
- Update CONTRIBUTING.md with PR workflow section
- Document branch protection rules
- Sprint 4 PR will dogfood this template

**Day 4 Definition of Done:**

- [ ] CHANGELOG.md committed
- [ ] Release checklist and notes template committed
- [ ] PR template committed
- [ ] CONTRIBUTING.md updated
- [ ] First release candidate prepared (publish after merge to main)
- [ ] All 14 ACs for #141 + #143 checked off

---

### Day 5 — Operator Documentation & Sprint Completion

**Theme:** Make the platform operator-friendly. Close the sprint.

| Item      | Issue | ACs | Deliverables                                                           |
| --------- | ----- | --- | ---------------------------------------------------------------------- |
| SP-4-DOCS | #144  | 6   | `docs/quick-start.md`, `docs/operating-handbook.md`, doc index |

**SP-4-DOCS (F-12) work:**

- Operator Quick Start guide: clone → install → first run → first CREATE in
  under 5 mins
- Role-based documentation index
- GA operating handbook: monitoring, troubleshooting, recovery
- Cross-reference with #16 (glossary) and #102 (multi-platform docs)

**Sprint completion activities:**

- Run full test suite (both Jest + Vitest)
- Run linting (both ESLint configs)
- Update `session-state.json` and `velocity-log.json`
- Create Sprint 4 PR using new template (#143 dogfooding)
- Update sprint-4-completion-report.md
- Publish first release (if deferred from Day 4)

**Day 5 Definition of Done:**

- [ ] Quick start guide committed
- [ ] Operating handbook committed
- [ ] All 6 ACs for #144 checked off
- [ ] Full test suite passing
- [ ] Sprint 4 PR created (using PR template)
- [ ] Sprint 4 completion report written

---

## Audit Findings Coverage

| Finding | Severity | Sprint 4 Action                                          | Issue                     |
| ------- | -------- | -------------------------------------------------------- | ------------------------- |
| F-01    | CRITICAL | ✅ Direct — Day 1                                        | #137                      |
| F-02    | CRITICAL | ✅ Direct — Day 2                                        | #138                      |
| F-03    | CRITICAL | ✅ Direct — Day 2                                        | #139                      |
| F-04    | HIGH     | ✅ Direct — Day 3                                        | #140                      |
| F-05    | HIGH     | ✅ Direct — Day 4                                        | #141                      |
| F-06    | HIGH     | ⏳ Deferred — backlog triage done via cross-ref comments | Existing FEAT-05 issues   |
| F-07    | HIGH     | ✅ Direct — Day 3                                        | #142                      |
| F-08    | MEDIUM   | ✅ Direct — Day 4                                        | #143                      |
| F-09    | MEDIUM   | ⏳ Deferred — Sprint 5+ (cross-ref comments added)       | Existing FEAT chains      |
| F-10    | MEDIUM   | ✅ Addressed — Sprint 3 closed pilot items               | #107, #110, #115 (closed) |
| F-11    | MEDIUM   | ⏳ Deferred — depends on F-01 governance framework       | CAT-01 through CAT-09     |
| F-12    | MEDIUM   | ✅ Direct — Day 5                                        | #144                      |

**Sprint 4 directly addresses:** 8 of 12 findings (3 CRITICAL + 3 HIGH + 2
MEDIUM) **Deferred to Sprint 5+:** F-06, F-09, F-11 (all require feature
implementation, not governance) **Already addressed:** F-10 (Sprint 3 closed
pilot items)

---

## Risk Register

| Risk                                       | Likelihood | Impact | Mitigation                                                                                     |
| ------------------------------------------ | ---------- | ------ | ---------------------------------------------------------------------------------------------- |
| F-01 scope decision delays downstream work | Medium     | High   | Time-box Day 1 to 1 day; default to localhost-only if undecided                                |
| 59 ACs may exceed sprint capacity          | Medium     | Medium | Day 2 items (F-02/F-03) are documentation-heavy; can overlap. Prioritize CRITICAL over MEDIUM. |
| Release workflow may have issues           | Low        | Medium | Test workflow in dry-run mode before tagging                                                   |
| contrast.test.js fix may cascade           | Low        | Low    | Isolated to design tokens; fix is straightforward                                              |

---

## Carry-Over from Sprint 3

| Item       | Issue | Status            | Sprint 4 Action                                |
| ---------- | ----- | ----------------- | ---------------------------------------------- |
| SP-3-DEVTO | #133  | BACKLOG (2/6 ACs) | Not in Sprint 4 scope — post-GA per audit F-10 |

---

## Success Criteria

Sprint 4 is COMPLETE when:

1. All 3 CRITICAL findings (F-01, F-02, F-03) have governance documents
   committed
2. All 3 HIGH findings (F-04, F-05, F-07) have remediation implemented
3. Both MEDIUM findings (F-08, F-12) have deliverables committed
4. All tests pass (both Jest and Vitest suites)
5. First release candidate is published on GitHub Releases
6. Sprint 4 PR is created using the new PR template
7. Sprint completion report is written

**Target velocity:** ≥87% (7/8 items, improving on Sprint 3's 86%)

---

## Predecessor Context

| Sprint       | Items | Completed    | Velocity        | ACs         |
| ------------ | ----- | ------------ | --------------- | ----------- |
| Sprint 1     | —     | —            | —               | —           |
| Sprint 2     | 10    | 8            | 80%             | ~60         |
| Sprint 3     | 7     | 6            | 86%             | 35/37 (95%) |
| **Sprint 4** | **8** | **target 8** | **target ≥87%** | **59**      |

---

_Sprint plan created: 2026-03-12_ _Source: GA Audit Response
(`docs/phase-5/ga-audit-response.md`)_ _Audit report:
`word/transformed_doc/myAgentic-IT-Project-team-V2_GA_Audit_Report_2026-03-12.md`_
