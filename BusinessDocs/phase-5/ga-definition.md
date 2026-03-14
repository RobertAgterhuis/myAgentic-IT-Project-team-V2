# GA Definition — Agentic SDLC Platform v1.0

| Field             | Value                                                                          |
| ----------------- | ------------------------------------------------------------------------------ |
| **Document**      | GA Definition and Governance Model                                             |
| **Version**       | 1.0                                                                            |
| **Status**        | DRAFT — Pending go/no-go review                                                |
| **Created**       | 2026-03-12                                                                     |
| **Owner**         | Robert Agterhuis                                                               |
| **Audit Finding** | F-01 (CRITICAL) — GA definition and governance model are still under-specified |
| **Issue**         | #137                                                                           |

---

## 1. What "GA" Means for This Product

**General Availability (GA)** is a **governance milestone**, not a feature
milestone.

GA means the platform is:

- **Packaged** — Published as a versioned GitHub Release with reproducible
  install/run steps
- **Documented** — Operator quick-start, technical manual, and known limitations
  are current
- **Governed** — Security boundaries, privacy posture, and data retention are
  defined and enforced
- **Verified** — Test suite passes, coverage is measured, and claims match
  verifiable evidence
- **Supervised** — The default operating mode is human-in-the-loop
  (CONTINUE-to-proceed)

GA does **NOT** mean:

- Feature-complete (the backlog will still have open items)
- Enterprise-ready (multi-tenant, SSO, audit-trail SLA are post-GA)
- Fully autonomous (orchestrator state machine and unattended execution are
  post-GA)

---

## 2. Deployment Profile — v1 GA

### Scope: Localhost / Single Operator

| Attribute             | v1 GA Posture                                     |
| --------------------- | ------------------------------------------------- |
| **Deployment target** | Local machine (developer workstation)             |
| **Network binding**   | `127.0.0.1` only — not exposed to LAN or internet |
| **Operator model**    | Single operator (repo owner)                      |
| **Authentication**    | None required (localhost trust boundary)          |
| **Data persistence**  | File-backed (JSON, Markdown) in repo directory    |
| **Container support** | Docker Compose for analytics only (Matomo)        |
| **Platform**          | Windows, macOS, Linux — Node.js 22+ required      |

### Future Profiles (Post-GA)

| Profile              | When  | Key additions                                                                    |
| -------------------- | ----- | -------------------------------------------------------------------------------- |
| **Internal Team**    | v1.1+ | Basic auth or token-based access, HTTPS, multi-user session isolation            |
| **Internet-Exposed** | v2.0+ | OAuth/OIDC (Entra ID), TLS mandatory, rate limiting, encrypted persistence, RBAC |

### Profile Boundary Rule

All documentation, marketing claims, and README statements must be consistent
with the **v1 GA profile** (localhost/single-operator). Claims about
capabilities that require Internal Team or Internet-Exposed profiles must be
annotated as "Planned" or "Designed".

---

## 3. Go/No-Go Criteria

The following criteria must ALL be met before GA can be declared. Each criterion
has a measurable threshold.

### 3.1 MUST-PASS (Blocking)

| #   | Criterion                                       | Threshold                                                      | Verification Method                                     |
| --- | ----------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| G1  | All CRITICAL audit findings resolved            | F-01, F-02, F-03 closed                                        | Issue status = CLOSED on GitHub                         |
| G2  | All HIGH audit findings resolved                | F-04, F-05, F-06, F-07 closed or mitigated                     | Issue status = CLOSED or MITIGATED with documented plan |
| G3  | Test suite passes                               | 0 failures across both Jest and Vitest                         | `npm test` (root) + `npm test` (.github/) exit code 0   |
| G4  | Evidence consistency verified                   | 0 discrepancies between README and actual metrics              | Manual review against truth-source checklist            |
| G5  | First release published                         | GitHub Releases shows ≥1 release with tag, notes, known issues | Release exists on GitHub Releases page                  |
| G6  | Security design documented                      | `docs/security/security-design.md` exists with 3 deployment profiles | File exists and reviewed                                |
| G7  | Privacy model documented                        | `docs/security/data-inventory.md` + `docs/privacy-policy.md` exist | Files exist and reviewed                                |
| G8  | Operator can complete quick-start in ≤5 minutes | Clone → install → first run → health check                     | Manual walkthrough validation                           |
| G9  | No secret/credential leaks in repository        | 0 findings                                                     | GitHub secret scanning + manual `grep` for patterns     |

### 3.2 SHOULD-PASS (Advisory)

| #   | Criterion                       | Threshold                                                 | Notes                               |
| --- | ------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| A1  | MEDIUM audit findings addressed | F-08, F-09, F-11, F-12 closed or tracked                  | Can defer with documented rationale |
| A2  | Coverage ≥80%                   | Statement coverage ≥80% in both test suites               | Badge updated to actual number      |
| A3  | All sprint items delivered      | Sprint 4 velocity ≥87%                                    | Consistent with velocity trend      |
| A4  | Backlog triaged into GA lanes   | All open issues labeled GA-REQUIRED, POST-GA, or DEFERRED | At least 90% labeled                |

---

## 4. Release Checklist

This is the reproducible sequence from code-complete to published release.

### Pre-Release

- [ ] All Go/No-Go MUST-PASS criteria met (Section 3.1)
- [ ] Sprint branch squash-merged to `main` via PR
- [ ] `main` branch is clean: `git status` shows no uncommitted changes
- [ ] Version bumped in `package.json`
- [ ] `CHANGELOG.md` updated with release notes
- [ ] All tests pass: `npm run test:all`
- [ ] Linting passes: `npm run lint`
- [ ] Secret scan: no credentials, tokens, or API keys in tracked files
- [ ] README claims verified against truth-source checklist
- [ ] Known issues documented in release notes

### Release

- [ ] Create annotated git tag:
      `git tag -a v1.0.0-rc.1 -m "Release candidate 1"`
- [ ] Push tag: `git push origin v1.0.0-rc.1`
- [ ] Verify release workflow runs successfully
- [ ] If workflow doesn't auto-create: manually create GitHub Release from tag
- [ ] Attach release notes with: summary, changes, breaking changes, known
      issues, install steps

### Post-Release Validation

- [ ] Fresh clone test: `git clone` → `npm install` → `npm start` → health check
      at `http://127.0.0.1:3000`
- [ ] Verify `src/webapp/server.js` starts without errors
- [ ] Verify `CREATE` command produces expected output in a fresh session
- [ ] Release is visible on GitHub Releases page with correct tag and notes

---

## 5. Ownership Model

| Responsibility        | Owner                     | Backup | Notes                                                 |
| --------------------- | ------------------------- | ------ | ----------------------------------------------------- |
| **Codebase**          | Robert Agterhuis          | —      | Sole maintainer for v1 GA                             |
| **Releases**          | Robert Agterhuis          | —      | Manual release process via checklist                  |
| **Security response** | Robert Agterhuis          | —      | Per SECURITY.md: 48h acknowledgment, 30d critical fix |
| **Issue triage**      | Robert Agterhuis          | —      | Milestone-based triage with GA lanes                  |
| **Documentation**     | Robert Agterhuis          | —      | Maintained alongside code in-repo                     |
| **Support model**     | Community (GitHub Issues) | —      | No SLA; best-effort response                          |

### Support Expectations (v1 GA)

- **Support channel:** GitHub Issues only
- **SLA:** None — this is an open-source project maintained by a sole operator
- **Response target:** Best-effort within 7 days for bug reports
- **Security issues:** Per SECURITY.md — private disclosure, 48h ack, 30d fix
  for critical
- **Feature requests:** Triaged into backlog milestones; no delivery commitment

---

## 6. Pilot Exit Criteria

The internal pilot phase is considered **complete** when the following evidence
exists:

| #   | Criterion                          | Evidence Required                                      | Status                      |
| --- | ---------------------------------- | ------------------------------------------------------ | --------------------------- |
| P1  | Internal pilot validation executed | Issue #107 CLOSED with results documented              | ✅ DONE (Sprint 3)          |
| P2  | Pilot rubric applied               | Issue #110 CLOSED with scoring rubric applied          | ✅ DONE (Sprint 3)          |
| P3  | Landing experiment deployed        | Issue #115 CLOSED with deployment verified             | ✅ DONE (Sprint 3)          |
| P4  | Adoption blockers identified       | Pilot report documents friction points and resolutions | ✅ DONE (Sprint 3)          |
| P5  | GA governance documents exist      | This document + security design + privacy model        | 🔄 In progress (Sprint 4)   |
| P6  | First release candidate published  | GitHub Release exists                                  | ❌ Not yet (Sprint 4 Day 4) |

**Pilot exit decision:** The pilot phase can be formally closed once P5 and P6
are complete (expected end of Sprint 4).

---

## 7. GA Scope vs Backlog

### In GA Scope (Must close before release)

| Category              | Issues/Findings | Sprint         |
| --------------------- | --------------- | -------------- |
| Governance definition | F-01 (#137)     | Sprint 4 Day 1 |
| Security design       | F-02 (#138)     | Sprint 4 Day 2 |
| Privacy/compliance    | F-03 (#139)     | Sprint 4 Day 2 |
| Claims alignment      | F-04 (#140)     | Sprint 4 Day 3 |
| Evidence consistency  | F-07 (#142)     | Sprint 4 Day 3 |
| Release maturity      | F-05 (#141)     | Sprint 4 Day 4 |
| PR discipline         | F-08 (#143)     | Sprint 4 Day 4 |
| Operator docs         | F-12 (#144)     | Sprint 4 Day 5 |

### Post-GA Backlog (Explicitly deferred)

| Category                    | Issues                 | Rationale                                                      |
| --------------------------- | ---------------------- | -------------------------------------------------------------- |
| Orchestrator engine         | FEAT-05 (#80-#85)      | Core feature work, not governance                              |
| Cross-platform adapters     | FEAT-03/04/06/07/08/09 | Platform expansion, not v1 GA                                  |
| Category decisions          | CAT-01–09 (#27-#35)    | Governance framework first (F-01), then populate               |
| Content marketing           | SP-3-DEVTO (#133)      | Post-GA launch activity                                        |
| Backlog triage (F-06)       | Existing FEAT issues   | Triage complete via cross-ref comments; execution is Sprint 5+ |
| Platform abstraction (F-09) | Existing FEAT chains   | Multi-platform is post-v1 scope                                |
| Category frameworks (F-11)  | #27-#35                | Depends on governance model from F-01                          |

---

## 8. Decision Record

| Decision                 | Choice                                       | Rationale                                               | Date       |
| ------------------------ | -------------------------------------------- | ------------------------------------------------------- | ---------- |
| v1 GA deployment profile | Localhost / single operator                  | Matches current implementation reality; audit agrees    | 2026-03-12 |
| Autonomy posture         | Supervised (human-in-the-loop)               | Orchestrator state machine not yet enforced; audit F-04 | 2026-03-12 |
| Support model            | Community, no SLA                            | Solo maintainer; honest about capacity                  | 2026-03-12 |
| Release versioning       | Semver, starting at 1.0.0-rc.1               | Signals readiness intent while acknowledging RC status  | 2026-03-12 |
| Privacy scope            | Localhost data only; no telemetry collection | Matomo is opt-in local analytics; no cloud data flows   | 2026-03-12 |
| Pilot exit               | Sprint 3 items + Sprint 4 governance docs    | P1–P4 done; P5–P6 close in Sprint 4                     | 2026-03-12 |

---

## 9. Cross-Reference to Audit Findings

| Finding         | This Document Section                        | Status                                |
| --------------- | -------------------------------------------- | ------------------------------------- |
| F-01 (CRITICAL) | Entire document                              | ADDRESSED                             |
| F-02 (CRITICAL) | Section 2 (profile), Section 3 (G6)          | SCOPED — detail in security-design.md |
| F-03 (CRITICAL) | Section 2 (profile), Section 3 (G7)          | SCOPED — detail in data-inventory.md  |
| F-04 (HIGH)     | Section 1 (supervised), Section 8 (decision) | SCOPED — execution in #140            |
| F-05 (HIGH)     | Section 4 (release checklist)                | SCOPED — execution in #141            |
| F-06 (HIGH)     | Section 7 (backlog triage)                   | TRIAGED                               |
| F-07 (HIGH)     | Section 3 (G4, evidence consistency)         | SCOPED — execution in #142            |
| F-08 (MEDIUM)   | Section 4 (PR in release checklist)          | SCOPED — execution in #143            |
| F-09 (MEDIUM)   | Section 7 (post-GA)                          | DEFERRED                              |
| F-10 (MEDIUM)   | Section 6 (pilot exit)                       | ADDRESSED (Sprint 3)                  |
| F-11 (MEDIUM)   | Section 7 (post-GA)                          | DEFERRED                              |
| F-12 (MEDIUM)   | Section 3 (G8, quick-start)                  | SCOPED — execution in #144            |

---

_This document is the authoritative GA definition for the Agentic SDLC Platform.
All sprint planning, release decisions, and documentation claims must be
consistent with this document._
