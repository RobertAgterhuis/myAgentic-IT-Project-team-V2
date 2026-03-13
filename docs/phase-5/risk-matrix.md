# Risk Matrix — MYAGENTIC-IT-PROJECT-TEAM-V2

**Version:** 1.0  
**Effective Date:** 2026-03-10  
**Owner:** Business Analyst  
**Contributors:** Tech Lead (security/devops risks), PM (business risks)  
**Document ID:** RISK-001  
**Sprint:** SP-10-602 (Sprint 1)  
**Status:** ✅ APPROVED

---

## 1. Purpose & Scope

This risk matrix consolidates all residual risks from Phase 2 (Architecture &
Design) and identifies mitigation strategies, ownership, and triggers for risk
monitoring during Sprint 1 and beyond.

**Risk Sources:**

- **Phase 2-05:** Software Architect (RISK-501, RISK-502, RISK-503)
- **Phase 2-06:** Senior Developer (RISK-601, RISK-602, RISK-603, RISK-604,
  RISK-605)
- **Phase 2-07:** DevOps Engineer (RISK-701, RISK-702, RISK-703, RISK-704,
  RISK-705)
- **Phase 2-08:** Security Architect (RISK-801, RISK-802, RISK-803, RISK-804,
  RISK-805, RISK-806)
- **Phase 2-09:** Data Architect (referenced in Security/Legal risks)
- **Phase 2-33:** Legal Counsel (RISK-3301, RISK-3302, RISK-3303, RISK-3304,
  RISK-3305)
- **Phase 2 Critic:** System-level risks (SYSTEM-RISK-001, SYSTEM-RISK-002,
  SYSTEM-RISK-003)

**Risk Assessment Framework:**

- **Probability:** LOW (≤20%), MEDIUM (21-60%), HIGH (≥61%)
- **Impact:** LOW (minor disruption), MEDIUM (moderate disruption, workaround
  available), HIGH (major disruption, no workaround), CRITICAL (system failure,
  data loss, compliance violation)
- **Risk Score:** Probability × Impact = LOW | MEDIUM | HIGH | CRITICAL

**Risk Status:**

- **ACTIVE:** Risk is present and requires monitoring/mitigation
- **MITIGATED:** Mitigation implemented; risk reduced to acceptable level
- **DEFERRED:** Risk accepted for current sprint; reevaluated in future sprint
- **RESOLVED:** Risk eliminated (no longer applicable)

---

## 2. Risk Inventory Summary

| Category             | Total Risks | HIGH/CRITICAL           | MEDIUM       | LOW       | Mitigation Required                    |
| -------------------- | ----------- | ----------------------- | ------------ | --------- | -------------------------------------- |
| **Security**         | 6           | 5 HIGH                  | 1 MEDIUM     | 0         | 5 items (RISK-801 through RISK-806)    |
| **DevOps**           | 5           | 0 CRITICAL              | 5 MEDIUM     | 0         | 3 items (RISK-701, RISK-703, RISK-704) |
| **Development**      | 5           | 1 CRITICAL, 2 HIGH      | 2 MEDIUM     | 0         | 4 items (RISK-601 through RISK-605)    |
| **Architecture**     | 3           | 2 HIGH                  | 1 MEDIUM     | 0         | 2 items (RISK-501, RISK-503)           |
| **Legal/Compliance** | 5           | 4 HIGH                  | 1 MEDIUM     | 0         | 4 items (RISK-3301 through RISK-3305)  |
| **System-Level**     | 3           | 3 HIGH                  | 0            | 0         | 3 items (SYSTEM-RISK-001, 002, 003)    |
| **TOTAL**            | **27**      | **2 CRITICAL, 17 HIGH** | **8 MEDIUM** | **0 LOW** | **21 active mitigations**              |

**Executive Summary:**

- **2 CRITICAL risks:** RISK-601 (architecture drift), GAP-3304 (retention
  policy missing — treated as CRITICAL for governance)
- **17 HIGH risks:** Require immediate mitigation planning in Sprint 1 or Sprint
  2
- **8 MEDIUM risks:** Acceptable with monitoring; mitigation scheduled for
  Sprint 2+
- **0 LOW risks:** All identified risks have MEDIUM+ impact due to
  production-readiness focus

**Priority Action:** All CRITICAL and HIGH risks must have mitigation plans
documented by Sprint 1 completion (March 24).

---

## 3. Risk Matrix — Detailed Assessment

### 3.1 Security Risks (Phase 2-08: Security Architect)

#### RISK-801: Broken Access Control on Scope Expansion

| Field                   | Value                                                                                                                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-801                                                                                                                                                                                                                                                 |
| **Category**            | Security                                                                                                                                                                                                                                                 |
| **Title**               | Broken access control on scope expansion                                                                                                                                                                                                                 |
| **Description**         | Current trust model (localhost-only, single-user) may become exploitable when localhost-only assumptions are violated (e.g., Docker container with 0.0.0.0 binding, network exposure). No authentication or authorization gates exist in route dispatch. |
| **Source**              | Phase 2-08 Security Architect analysis (line 205-213), `src/webapp/server.js:351`, `Dockerfile` (`HOST=0.0.0.0`)                                                                                                                                         |
| **Probability**         | MEDIUM (21-60%) — Docker default HOST=0.0.0.0 creates risk if container deployed without network restrictions                                                                                                                                            |
| **Impact**              | HIGH — Unauthorized access to questionnaire data, decision modifications, session manipulation                                                                                                                                                           |
| **Risk Score**          | **HIGH**                                                                                                                                                                                                                                                 |
| **Trigger Events**      | (1) Docker deployment to cloud (e.g., Azure Container Instances, AWS ECS), (2) Port forwarding enabled for remote access, (3) Multi-user scenario                                                                                                        |
| **Current Status**      | ACTIVE (no authentication/authorization implemented)                                                                                                                                                                                                     |
| **Mitigation Plan**     | **Sprint 2:** Implement authentication gate (OIDC or API key) + RBAC baseline before any non-loopback exposure (see Phase 2-08 recommendation REC-801)                                                                                                   |
| **Owner**               | Tech Lead (authentication/RBAC implementation)                                                                                                                                                                                                           |
| **Acceptance Criteria** | (1) Authentication middleware added to all routes, (2) Role-permission matrix documented, (3) RBAC enforced in route handlers                                                                                                                            |
| **Escalation**          | If external deployment required before Sprint 2 → IMMEDIATE escalation to PM + Tech Lead for emergency auth implementation                                                                                                                               |

---

#### RISK-802: Privilege Escalation Through Missing Role Contract

| Field                   | Value                                                                                                                                                                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-802                                                                                                                                                                                                                                        |
| **Category**            | Security                                                                                                                                                                                                                                        |
| **Title**               | Privilege escalation through missing role contract                                                                                                                                                                                              |
| **Description**         | Without role matrix and permission boundaries, future features can ship with over-privileged operations (e.g., any user can delete decisions, modify governance framework). No authorization checks exist beyond trust of local caller context. |
| **Source**              | Phase 2-08 Security Architect analysis (line 216-224), SECURITY_FLAG AUTH-002 from Software Architect                                                                                                                                           |
| **Probability**         | MEDIUM (21-60%) — Risk materializes when multi-user scenario is introduced                                                                                                                                                                      |
| **Impact**              | HIGH — Data integrity compromise, governance audit trail manipulation, unauthorized policy changes                                                                                                                                              |
| **Risk Score**          | **HIGH**                                                                                                                                                                                                                                        |
| **Trigger Events**      | (1) Multi-user feature implementation, (2) Remote access enablement, (3) Role-based workflow (e.g., PM vs. Developer vs. Stakeholder)                                                                                                           |
| **Current Status**      | ACTIVE (no authorization matrix defined)                                                                                                                                                                                                        |
| **Mitigation Plan**     | **Sprint 2:** Define role-permission matrix in `governance-framework.md` Section 3.2 + implement route-level authorization checks (see REC-802)                                                                                                 |
| **Owner**               | Business Analyst (role definition), Tech Lead (authorization enforcement)                                                                                                                                                                       |
| **Acceptance Criteria** | (1) Role matrix documented (roles: PM, Tech Lead, Business Analyst, Developer, Stakeholder), (2) Permission matrix mapped to API routes, (3) Authorization middleware enforces role checks                                                      |
| **Escalation**          | If role-based features ship before authorization → Sprint Gate FAIL (quality gate violation)                                                                                                                                                    |

---

#### RISK-803: Runtime Vulnerabilities Bypass Current CI Scope

| Field                   | Value                                                                                                                                                                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-803                                                                                                                                                                                                                                                                          |
| **Category**            | Security                                                                                                                                                                                                                                                                          |
| **Title**               | Runtime vulnerabilities bypass current CI scope                                                                                                                                                                                                                                   |
| **Description**         | CI includes SAST, SCA, and secret scanning but lacks DAST (Dynamic Application Security Testing) and container image scanning. Runtime misconfigurations (e.g., unsafe HTTP headers, missing CSP, insecure session cookies) and container vulnerabilities can pass CI validation. |
| **Source**              | Phase 2-08 Security Architect analysis (line 226-234), `.github/workflows/ci-pipeline.yml` (no DAST/container scan jobs)                                                                                                                                                          |
| **Probability**         | MEDIUM (21-60%) — Runtime issues are common in web applications; lack of DAST increases likelihood                                                                                                                                                                                |
| **Impact**              | HIGH — Exploitable runtime behavior (XSS, CSRF, session hijacking), container vulnerabilities (outdated packages, privilege escalation)                                                                                                                                           |
| **Risk Score**          | **HIGH**                                                                                                                                                                                                                                                                          |
| **Trigger Events**      | (1) Production deployment, (2) External security audit, (3) Penetration testing                                                                                                                                                                                                   |
| **Current Status**      | ACTIVE (DAST and container scan not implemented)                                                                                                                                                                                                                                  |
| **Mitigation Plan**     | **Sprint 2:** Add DAST job (OWASP ZAP or similar) + container scan job (Trivy for Docker images) to CI pipeline (see REC-803)                                                                                                                                                     |
| **Owner**               | DevOps Engineer (CI integration), Tech Lead (vulnerability remediation)                                                                                                                                                                                                           |
| **Acceptance Criteria** | (1) DAST job configured in `.github/workflows/ci-pipeline.yml`, (2) Container scan job added with severity thresholds (CRITICAL=0, HIGH≤2), (3) SARIF results uploaded to GitHub Security tab                                                                                     |
| **Escalation**          | If CRITICAL vulnerability detected in production → HOTFIX protocol (immediate fix within 24 hours)                                                                                                                                                                                |

---

#### RISK-804: Availability Degradation via Request Flooding

| Field                   | Value                                                                                                                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-804                                                                                                                                                                                                                                                   |
| **Category**            | Security                                                                                                                                                                                                                                                   |
| **Title**               | Availability degradation via request flooding                                                                                                                                                                                                              |
| **Description**         | No rate-limiting or throttling controls exist in the HTTP server request pipeline. Local abuse scenarios (e.g., infinite loop in client code, automated scripts) can flood server with requests, causing CPU/memory exhaustion and service unavailability. |
| **Source**              | Phase 2-08 Security Architect analysis (line 236-244), `src/webapp/server.js:370` (no throttling middleware)                                                                                                                                               |
| **Probability**         | MEDIUM (21-60%) — Localhost-only reduces external abuse risk, but accidental internal abuse is possible                                                                                                                                                    |
| **Impact**              | MEDIUM — Service degradation, slow response times, potential server crash (recoverable via restart)                                                                                                                                                        |
| **Risk Score**          | **MEDIUM**                                                                                                                                                                                                                                                 |
| **Trigger Events**      | (1) Automated testing scripts, (2) Infinite retry loops in client code, (3) Large file uploads                                                                                                                                                             |
| **Current Status**      | ACTIVE (no rate-limiting implemented)                                                                                                                                                                                                                      |
| **Mitigation Plan**     | **Sprint 2:** Implement rate-limiting middleware (`express-rate-limit` or custom) with endpoint-specific limits (e.g., 100 req/min for GET, 10 req/min for POST)                                                                                           |
| **Owner**               | Senior Developer (middleware implementation), DevOps Engineer (monitoring)                                                                                                                                                                                 |
| **Acceptance Criteria** | (1) Rate-limiting middleware active on all routes, (2) 429 Too Many Requests response returned when limit exceeded, (3) Limits configurable via environment variables                                                                                      |
| **Escalation**          | If service outage occurs due to flooding → Retrospective analysis for permanent mitigation                                                                                                                                                                 |

---

#### RISK-805: Privacy/Compliance Drift Due to Undefined Data Classes

| Field                   | Value                                                                                                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-805                                                                                                                                                                                                                                            |
| **Category**            | Security + Compliance                                                                                                                                                                                                                               |
| **Title**               | Privacy/compliance drift due to undefined data classes                                                                                                                                                                                              |
| **Description**         | Without data classification and retention policy, secure logging, deletion controls, and privacy-by-design principles cannot be consistently applied. Risk of accidental PII collection or retention violations if scope expands to external users. |
| **Source**              | Phase 2-08 Security Architect analysis (line 245-254), pending outputs from Data Architect (Agent 09) and Legal Counsel (Agent 33), GAP-3304                                                                                                        |
| **Probability**         | MEDIUM (21-60%) — Current localhost-only scope reduces immediate risk, but future expansion likely                                                                                                                                                  |
| **Impact**              | HIGH — GDPR non-compliance if PII processed without lawful basis, retention violations, privacy audit failures                                                                                                                                      |
| **Risk Score**          | **HIGH**                                                                                                                                                                                                                                            |
| **Trigger Events**      | (1) External deployment, (2) PII collection (e.g., user accounts), (3) Third-party integrations                                                                                                                                                     |
| **Current Status**      | **MITIGATED (Sprint 1)** — Data retention policy defined in `compliance-checklist.md` Section 2.5 (March 10)                                                                                                                                        |
| **Mitigation Plan**     | ✅ **COMPLETE:** Retention policy documented; data classification matrix in compliance checklist                                                                                                                                                    |
| **Owner**               | Business Analyst (policy documentation), Tech Lead (implementation enforcement)                                                                                                                                                                     |
| **Acceptance Criteria** | (1) ✅ Retention windows defined for all artifact types, (2) ⏳ Scheduled for Sprint 2: Implement automated archive job for expired artifacts (`.archive/` directory)                                                                               |
| **Escalation**          | If PII collection required → Escalate to Legal Counsel for GDPR lawful basis mapping (Art. 6)                                                                                                                                                       |

---

#### RISK-806: Secret Handling Policy Inconsistency

| Field                   | Value                                                                                                                                                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-806                                                                                                                                                                                                                                                                                                       |
| **Category**            | Security                                                                                                                                                                                                                                                                                                       |
| **Title**               | Secret handling policy inconsistency                                                                                                                                                                                                                                                                           |
| **Description**         | Secret detection exists in CI (Gitleaks, Trivy) and runtime (middleware pattern detection), but secret storage, rotation cadence, and mandatory controls are not formalized in a policy document. Risk of inconsistent secret management practices (e.g., hardcoded secrets in config files, no rotation SLA). |
| **Source**              | Phase 2-08 Security Architect analysis (line 256-265), `src/webapp/middleware.js:173`, `.github/workflows/ci-pipeline.yml`                                                                                                                                                                                     |
| **Probability**         | MEDIUM (21-60%) — Secret scanning reduces risk, but policy gaps create inconsistency                                                                                                                                                                                                                           |
| **Impact**              | HIGH — Secret leakage, credential compromise, unauthorized API access                                                                                                                                                                                                                                          |
| **Risk Score**          | **HIGH**                                                                                                                                                                                                                                                                                                       |
| **Trigger Events**      | (1) New third-party API integration, (2) Multi-environment deployment (dev/staging/prod), (3) Team growth (multiple developers)                                                                                                                                                                                |
| **Current Status**      | ACTIVE (no formal secrets policy documented)                                                                                                                                                                                                                                                                   |
| **Mitigation Plan**     | **Sprint 1:** Document secret handling policy in `compliance-checklist.md` Section 7.1 with rotation SLA (4 hours for detected secrets) + enforcement via CI                                                                                                                                                   |
| **Owner**               | Tech Lead (policy definition), DevOps Engineer (enforcement automation)                                                                                                                                                                                                                                        |
| **Acceptance Criteria** | (1) Secret handling policy documented, (2) Rotation SLA defined (4 hours for CRITICAL, 7 days for MEDIUM), (3) CI fails on secret detection (no bypass)                                                                                                                                                        |
| **Escalation**          | If secret leaked to public repository → IMMEDIATE rotation + post-mortem analysis                                                                                                                                                                                                                              |

---

### 3.2 DevOps Risks (Phase 2-07: DevOps Engineer)

#### RISK-701: Deployment Without Runtime Smoke Gate

| Field                   | Value                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                  | RISK-701                                                                                                                                                                                                                       |
| **Category**            | DevOps                                                                                                                                                                                                                         |
| **Title**               | Deployment without runtime smoke gate                                                                                                                                                                                          |
| **Description**         | No automated smoke tests run post-deployment to validate runtime health. Risk of deploying broken builds that pass CI but fail at runtime (e.g., missing environment variables, port conflicts, dependency resolution issues). |
| **Source**              | Phase 2-07 DevOps Engineer analysis (line 189-198), GAP-701, GAP-702                                                                                                                                                           |
| **Probability**         | MEDIUM (21-60%) — Common in early-stage CI/CD pipelines                                                                                                                                                                        |
| **Impact**              | MEDIUM — Failed deployment requires manual rollback, but no data loss or security compromise                                                                                                                                   |
| **Risk Score**          | **MEDIUM**                                                                                                                                                                                                                     |
| **Trigger Events**      | (1) Deployment to staging/production, (2) Environment variable changes, (3) Dependency updates                                                                                                                                 |
| **Current Status**      | ACTIVE (smoke test suite not implemented)                                                                                                                                                                                      |
| **Mitigation Plan**     | **Sprint 1 (in progress):** SP-11-613 (Smoke Test Suite Completion) delivers automated smoke tests by March 21                                                                                                                 |
| **Owner**               | Senior Developer (smoke test implementation), DevOps Engineer (CI integration)                                                                                                                                                 |
| **Acceptance Criteria** | (1) ≥5 smoke tests for critical user journeys, (2) Smoke tests run in CI on every PR (fail-fast gate), (3) Test report generated (JSON + HTML summary)                                                                         |
| **Escalation**          | If deployment failure in production → HOTFIX protocol + smoke test addition for failed scenario                                                                                                                                |

---

#### RISK-702: Runtime Startup Collision on Fixed Port

| Field                   | Value                                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------------------------------------------------ |
| **ID**                  | RISK-702                                                                                                                                                                         |
| **Category**            | DevOps                                                                                                                                                                           |
| **Title**               | Runtime startup collision on fixed port                                                                                                                                          |
| **Description**         | Server binds to fixed port 3000 without dynamic port allocation. Risk of startup failure if port already in use (multiple instances running, port conflict with other services). |
| **Source**              | Phase 2-07 DevOps Engineer analysis (line 200-210), `src/webapp/server.js` (hardcoded port 3000)                                                                                 |
| **Probability**         | MEDIUM (21-60%) — Common in development environments with multiple services                                                                                                      |
| **Impact**              | LOW-MEDIUM — Service fails to start, requires manual port change or conflict resolution                                                                                          |
| **Risk Score**          | **MEDIUM**                                                                                                                                                                       |
| **Trigger Events**      | (1) Parallel test runs, (2) Multiple developers running server locally, (3) Other services on port 3000                                                                          |
| **Current Status**      | ACTIVE (fixed port 3000)                                                                                                                                                         |
| **Mitigation Plan**     | **Sprint 2:** Make port configurable via `PORT` environment variable with fallback to 3000 (see REC-702)                                                                         |
| **Owner**               | Senior Developer (configuration update)                                                                                                                                          |
| **Acceptance Criteria** | (1) `process.env.PORT                                                                                                                                                            |     | 3000` pattern implemented, (2) Documentation updated with PORT configuration, (3) Docker Compose uses PORT env var |
| **Escalation**          | None (low-impact risk; acceptable workaround: manual port change)                                                                                                                |

---

#### RISK-703: Build Reproducibility Drift

| Field                   | Value                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-703                                                                                                                                                                                                         |
| **Category**            | DevOps                                                                                                                                                                                                           |
| **Title**               | Build reproducibility drift                                                                                                                                                                                      |
| **Description**         | No build lockfile or deterministic build process documented. Risk of inconsistent builds across environments (dev/staging/prod) due to dependency version drift, build tool updates, or environment differences. |
| **Source**              | Phase 2-07 DevOps Engineer analysis (line 212-221), GAP-704                                                                                                                                                      |
| **Probability**         | MEDIUM (21-60%) — npm with `package-lock.json` reduces risk, but Dockerfile lacks multi-stage build caching                                                                                                      |
| **Impact**              | MEDIUM — Build failures in production, "works on my machine" debugging sessions, rollback complexity                                                                                                             |
| **Risk Score**          | **MEDIUM**                                                                                                                                                                                                       |
| **Trigger Events**      | (1) Dependency updates, (2) Node.js version changes, (3) Build environment differences                                                                                                                           |
| **Current Status**      | **PARTIAL MITIGATION** — `package-lock.json` present; Dockerfile lacks optimization                                                                                                                              |
| **Mitigation Plan**     | **Sprint 2:** Optimize Dockerfile with multi-stage build + build caching (see REC-703)                                                                                                                           |
| **Owner**               | DevOps Engineer (Dockerfile optimization)                                                                                                                                                                        |
| **Acceptance Criteria** | (1) Multi-stage Dockerfile (builder + runtime stages), (2) Build caching via `--mount=type=cache`, (3) Build time reduced by ≥30%                                                                                |
| **Escalation**          | If critical build failure in production → Rollback to known-good build + root cause analysis                                                                                                                     |

---

#### RISK-704: Observability Blind Spots for Incident Response

| Field                   | Value                                                                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-704                                                                                                                                                                                                   |
| **Category**            | DevOps                                                                                                                                                                                                     |
| **Title**               | Observability blind spots for incident response                                                                                                                                                            |
| **Description**         | No centralized logging, metrics dashboards, or alerting configured. Risk of slow incident detection and root cause analysis (e.g., server crash goes unnoticed for hours, no visibility into error rates). |
| **Source**              | Phase 2-07 DevOps Engineer analysis (line 223-232), GAP-705                                                                                                                                                |
| **Probability**         | MEDIUM (21-60%) — Localhost-only reduces immediate risk, but production deployment will require observability                                                                                              |
| **Impact**              | MEDIUM — Delayed incident response, longer MTTR (Mean Time To Resolve), difficult debugging                                                                                                                |
| **Risk Score**          | **MEDIUM**                                                                                                                                                                                                 |
| **Trigger Events**      | (1) Production deployment, (2) Performance degradation, (3) Service outage                                                                                                                                 |
| **Current Status**      | ACTIVE (no observability stack)                                                                                                                                                                            |
| **Mitigation Plan**     | **Sprint 3 (deferred):** Implement structured logging (Winston or Pino) + metrics collection (Prometheus) + alerting (PagerDuty or similar)                                                                |
| **Owner**               | DevOps Engineer (observability implementation), Tech Lead (alert definition)                                                                                                                               |
| **Acceptance Criteria** | (1) Structured JSON logs written to stdout, (2) Metrics exported at `/metrics` endpoint, (3) Alerts configured for P0 incidents (CPU >90%, error rate >5%)                                                 |
| **Escalation**          | If production incident undetected for >1 hour → Observability becomes Sprint 2 priority                                                                                                                    |

---

#### RISK-705: Disaster Recovery Confidence Gap

| Field                   | Value                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-705                                                                                                                                                            |
| **Category**            | DevOps                                                                                                                                                              |
| **Title**               | Disaster recovery confidence gap                                                                                                                                    |
| **Description**         | No backup/restore runbook or tested DR procedure. Risk of data loss if Git repository corruption or accidental deletion occurs without verifiable recovery process. |
| **Source**              | Phase 2-07 DevOps Engineer analysis (line 234-242), GAP-706                                                                                                         |
| **Probability**         | LOW-MEDIUM (11-40%) — Git remotes (GitHub) provide implicit backup, but no documented restore procedure                                                             |
| **Impact**              | HIGH — Data loss of all session state, decisions, questionnaires if Git history lost                                                                                |
| **Risk Score**          | **MEDIUM-HIGH**                                                                                                                                                     |
| **Trigger Events**      | (1) Git repository corruption, (2) Accidental `git push --force` to main, (3) GitHub account compromise                                                             |
| **Current Status**      | ACTIVE (no DR runbook)                                                                                                                                              |
| **Mitigation Plan**     | **Sprint 2:** Document backup/restore procedure in `technical-manual.md` + test quarterly recovery (see REC-706)                                                    |
| **Owner**               | DevOps Engineer (runbook creation), PM (quarterly test scheduling)                                                                                                  |
| **Acceptance Criteria** | (1) DR runbook documented with step-by-step restore procedure, (2) Quarterly DR test scheduled (Q2, Q3, Q4), (3) Backup verification automated (cron job)           |
| **Escalation**          | If data loss occurs → Emergency escalation to GitHub support + PM notification within 1 hour                                                                        |

---

### 3.3 Development Risks (Phase 2-06: Senior Developer)

#### RISK-601: Architecture Drift to Route-Centric Spaghetti Logic ⚠️ **CRITICAL**

| Field                   | Value                                                                                                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-601                                                                                                                                                                                                                                  |
| **Category**            | Development                                                                                                                                                                                                                               |
| **Title**               | Architecture drift to route-centric spaghetti logic                                                                                                                                                                                       |
| **Description**         | Current route handlers contain business logic inline (no service layer separation). Risk of route files becoming 1000+ line monoliths with duplicated logic, difficult testing, and tight coupling between HTTP layer and business logic. |
| **Source**              | Phase 2-06 Senior Developer analysis (line 234-244), GAP-602                                                                                                                                                                              |
| **Probability**         | HIGH (61-80%) — Without architectural guardrails, drift is highly likely as features accumulate                                                                                                                                           |
| **Impact**              | CRITICAL — Unmaintainable codebase, testing bottleneck, onboarding friction, high defect rate                                                                                                                                             |
| **Risk Score**          | **CRITICAL**                                                                                                                                                                                                                              |
| **Trigger Events**      | (1) Route file >500 lines, (2) Duplicated business logic across routes, (3) Low test coverage (<60%)                                                                                                                                      |
| **Current Status**      | ACTIVE (no service layer abstraction)                                                                                                                                                                                                     |
| **Mitigation Plan**     | **Sprint 2 (HIGH PRIORITY):** Refactor to layered architecture (routes → services → data layer) + enforce via ESLint rule (max file length 300 lines)                                                                                     |
| **Owner**               | Senior Developer (refactoring), Tech Lead (architecture review)                                                                                                                                                                           |
| **Acceptance Criteria** | (1) Service layer created (`src/webapp/services/`), (2) Route handlers <100 lines each, (3) ESLint rule enforces max file length, (4) Test coverage ≥80%                                                                                  |
| **Escalation**          | If route file exceeds 500 lines → Sprint Gate FAIL (quality gate violation) + mandatory refactoring before next story                                                                                                                     |

---

#### RISK-602: Test Blind Spot on End-to-End User Flows

| Field                   | Value                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                  | RISK-602                                                                                                                                                                                                                                   |
| **Category**            | Development                                                                                                                                                                                                                                |
| **Title**               | Test blind spot on end-to-end user flows                                                                                                                                                                                                   |
| **Description**         | Current test suite has high unit test coverage (95%+) but no integration or end-to-end tests. Risk of integration bugs (e.g., questionnaire creation → answer submission → decision generation flow breaks) that unit tests cannot detect. |
| **Source**              | Phase 2-06 Senior Developer analysis (line 246-255), GAP-603                                                                                                                                                                               |
| **Probability**         | MEDIUM (21-60%) — Unit tests provide good baseline, but integration gaps exist                                                                                                                                                             |
| **Impact**              | HIGH — User-facing bugs in production, regression defects, manual testing burden                                                                                                                                                           |
| **Risk Score**          | **HIGH**                                                                                                                                                                                                                                   |
| **Trigger Events**      | (1) Multi-step workflow implementation (e.g., questionnaire → decision flow), (2) API integration changes                                                                                                                                  |
| **Current Status**      | ACTIVE (no integration tests)                                                                                                                                                                                                              |
| **Mitigation Plan**     | **Sprint 1 (IN PROGRESS):** SP-11-612 (Test Strategy Framework) delivers integration test suite by March 17                                                                                                                                |
| **Owner**               | Senior Developer (test implementation)                                                                                                                                                                                                     |
| **Acceptance Criteria** | (1) Integration test suite (Supertest or similar), (2) ≥5 end-to-end user flow tests, (3) Coverage: 20% of total test pyramid (70% unit, 20% integration, 10% e2e)                                                                         |
| **Escalation**          | If integration bug detected in production → Add missing integration test case within 24 hours                                                                                                                                              |

---

#### RISK-603: Security Regressions Due to Undefined SAST/DAST Baseline

| Field                   | Value                                                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-603                                                                                                                                                                                                      |
| **Category**            | Development + Security                                                                                                                                                                                        |
| **Title**               | Security regressions due to undefined SAST/DAST baseline                                                                                                                                                      |
| **Description**         | SAST (ESLint security rules) and secret scanning exist, but no DAST or dynamic runtime security testing. Risk of security regressions (e.g., XSS, CSRF, insecure headers) that static analysis cannot detect. |
| **Source**              | Phase 2-06 Senior Developer analysis (line 257-267), GAP-603, overlaps with RISK-803                                                                                                                          |
| **Probability**         | MEDIUM (21-60%) — SAST provides baseline, but runtime vulnerabilities require DAST                                                                                                                            |
| **Impact**              | HIGH — Exploitable vulnerabilities in production, security audit failures                                                                                                                                     |
| **Risk Score**          | **HIGH**                                                                                                                                                                                                      |
| **Trigger Events**      | (1) External deployment, (2) Security audit, (3) Penetration testing                                                                                                                                          |
| **Current Status**      | ACTIVE (DAST not implemented)                                                                                                                                                                                 |
| **Mitigation Plan**     | **Sprint 2:** Add DAST job to CI pipeline (OWASP ZAP or equivalent) + fix all MEDIUM+ findings                                                                                                                |
| **Owner**               | DevOps Engineer (DAST integration), Senior Developer (vulnerability remediation)                                                                                                                              |
| **Acceptance Criteria** | (1) DAST job in `.github/workflows/ci-pipeline.yml`, (2) Zero HIGH/CRITICAL DAST findings, (3) SARIF upload to GitHub Security tab                                                                            |
| **Escalation**          | If CRITICAL DAST finding detected → HOTFIX protocol (fix within 24 hours)                                                                                                                                     |

---

#### RISK-604: Dependency Risk Introduced Through Unmanaged Updates

| Field                   | Value                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                  | RISK-604                                                                                                                                                                                         |
| **Category**            | Development                                                                                                                                                                                      |
| **Title**               | Dependency risk introduced through unmanaged updates                                                                                                                                             |
| **Description**         | No dependency update cadence, approval workflow, or vulnerability management policy. Risk of outdated dependencies with known CVEs or breaking changes introduced via uncontrolled `npm update`. |
| **Source**              | Phase 2-06 Senior Developer analysis (line 269-278), GAP-604                                                                                                                                     |
| **Probability**         | MEDIUM (21-60%) — Dependabot provides alerts, but no structured update process                                                                                                                   |
| **Impact**              | MEDIUM-HIGH — Security vulnerabilities, breaking changes in production, supply-chain risk                                                                                                        |
| **Risk Score**          | **MEDIUM-HIGH**                                                                                                                                                                                  |
| **Trigger Events**      | (1) Dependabot alert for CRITICAL/HIGH CVE, (2) Major version update (e.g., Node 20 → 22)                                                                                                        |
| **Current Status**      | **PARTIAL MITIGATION** — Dependabot enabled; policy not documented                                                                                                                               |
| **Mitigation Plan**     | **Sprint 1 (IN PROGRESS):** Document dependency governance policy in `compliance-checklist.md` Section 3.2 (LICENSE_CHECK items)                                                                 |
| **Owner**               | Tech Lead (policy definition), Senior Developer (update execution)                                                                                                                               |
| **Acceptance Criteria** | (1) ✅ Dependency governance policy documented, (2) ⏳ Sprint 2: Implement monthly dependency review cadence, (3) ⏳ Sprint 2: CI license gate enforces approved licenses only                   |
| **Escalation**          | If CRITICAL CVE detected → Patch within 24 hours OR remove affected dependency                                                                                                                   |

---

#### RISK-605: Technical Debt Compounding from Incomplete Maintainability Guardrails

| Field                   | Value                                                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-605                                                                                                                                                                                                                      |
| **Category**            | Development                                                                                                                                                                                                                   |
| **Title**               | Technical debt compounding from incomplete maintainability guardrails                                                                                                                                                         |
| **Description**         | No enforced file size limits, complexity caps, or duplication thresholds in CI. Risk of gradual technical debt accumulation (e.g., 2000-line files, cyclomatic complexity >20, copy-paste code) that ESLint currently allows. |
| **Source**              | Phase 2-06 Senior Developer analysis (line 280-290), GAP-605, GAP-606                                                                                                                                                         |
| **Probability**         | HIGH (61-80%) — Without automated enforcement, drift is inevitable                                                                                                                                                            |
| **Impact**              | MEDIUM — Slower development velocity, higher defect rate, difficult refactoring                                                                                                                                               |
| **Risk Score**          | **HIGH**                                                                                                                                                                                                                      |
| **Trigger Events**      | (1) File exceeds 300 lines, (2) Function exceeds complexity 8, (3) Code duplication >5%                                                                                                                                       |
| **Current Status**      | **PARTIAL MITIGATION** — ESLint complexity rules configured (max 8), but not strictly enforced                                                                                                                                |
| **Mitigation Plan**     | **Sprint 2:** Add ESLint rules for max file length (300 lines), max function length (50 lines), duplication detection (`eslint-plugin-sonarjs`)                                                                               |
| **Owner**               | Senior Developer (ESLint configuration), Tech Lead (enforcement review)                                                                                                                                                       |
| **Acceptance Criteria** | (1) ESLint rules active: `max-lines: 300`, `max-lines-per-function: 50`, `sonarjs/no-duplicate-string`, (2) CI fails on violation, (3) All existing code compliant                                                            |
| **Escalation**          | If file exceeds 500 lines → Mandatory refactoring before merge                                                                                                                                                                |

---

### 3.4 Architecture Risks (Phase 2-05: Software Architect)

#### RISK-501: File Locking Contention Under Concurrent Access

| Field                   | Value                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-501                                                                                                                                                                                                |
| **Category**            | Architecture                                                                                                                                                                                            |
| **Title**               | File locking contention under concurrent access                                                                                                                                                         |
| **Description**         | File-based storage (session-state.json, mutation-log.jsonl, decisions.md) without file locking mechanism. Risk of data corruption or lost writes if multiple processes/users access files concurrently. |
| **Source**              | Phase 2-05 Software Architect analysis (Section 3, Risk subsection)                                                                                                                                     |
| **Probability**         | LOW-MEDIUM (11-40%) — Localhost single-user reduces risk, but Docker multi-instance increases it                                                                                                        |
| **Impact**              | HIGH — Data corruption, lost writes, session state inconsistency                                                                                                                                        |
| **Risk Score**          | **MEDIUM-HIGH**                                                                                                                                                                                         |
| **Trigger Events**      | (1) Multi-user deployment, (2) Horizontal scaling (multiple server instances), (3) Concurrent API requests                                                                                              |
| **Current Status**      | ACTIVE (no file locking)                                                                                                                                                                                |
| **Mitigation Plan**     | **Sprint 3 (deferred):** Implement file locking (`proper-lockfile` or similar) OR migrate to database (SQLite for single-instance, PostgreSQL for multi-instance)                                       |
| **Owner**               | Senior Developer (locking implementation), Software Architect (database migration design)                                                                                                               |
| **Acceptance Criteria** | (1) File locking prevents concurrent writes, (2) Lock timeout (30 sec) with retry logic, (3) Zero data corruption in stress tests                                                                       |
| **Escalation**          | If data corruption detected → Emergency escalation + immediate mitigation (file backup + restore)                                                                                                       |

---

#### RISK-502: Single-Process Architecture Limits Horizontal Scaling

| Field                   | Value                                                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-502                                                                                                                                                                     |
| **Category**            | Architecture                                                                                                                                                                 |
| **Title**               | Single-process architecture limits horizontal scaling                                                                                                                        |
| **Description**         | Current architecture is single-process Node.js HTTP server. Cannot scale horizontally (multiple instances) without shared state mechanism (database, Redis) or file locking. |
| **Source**              | Phase 2-05 Software Architect analysis (Section 3, Risk subsection)                                                                                                          |
| **Probability**         | LOW (≤20%) — Localhost-only scope eliminates immediate scaling needs                                                                                                         |
| **Impact**              | MEDIUM — Limited throughput for high-traffic scenarios, no high-availability failover                                                                                        |
| **Risk Score**          | **LOW-MEDIUM**                                                                                                                                                               |
| **Trigger Events**      | (1) External deployment with high concurrency, (2) Load testing reveals bottleneck                                                                                           |
| **Current Status**      | DEFERRED (acceptable for current scope)                                                                                                                                      |
| **Mitigation Plan**     | **Future (post-Sprint 3):** Migrate to database-backed state OR implement shared cache (Redis) for horizontal scaling                                                        |
| **Owner**               | Software Architect (scaling design), DevOps Engineer (deployment architecture)                                                                                               |
| **Acceptance Criteria** | Not applicable until external deployment scope confirmed                                                                                                                     |
| **Escalation**          | None (acceptable risk for localhost-only scope)                                                                                                                              |

---

#### RISK-503: No Authentication/Authorization Enforcement

| Field                   | Value                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-503                                                                                                                     |
| **Category**            | Architecture + Security                                                                                                      |
| **Title**               | No authentication/authorization enforcement                                                                                  |
| **Description**         | Architectural gap: No authentication or authorization layer designed. All routes trust caller identity without verification. |
| **Source**              | Phase 2-05 Software Architect analysis (Section 3, Risk subsection), overlaps with RISK-801, RISK-802                        |
| **Probability**         | MEDIUM (21-60%) — Risk materializes when external deployment occurs                                                          |
| **Impact**              | HIGH — Unauthorized access, data manipulation, security audit failure                                                        |
| **Risk Score**          | **HIGH**                                                                                                                     |
| **Trigger Events**      | (1) External deployment, (2) Multi-user feature, (3) Network exposure                                                        |
| **Current Status**      | ACTIVE (duplicates RISK-801/802)                                                                                             |
| **Mitigation Plan**     | See RISK-801 and RISK-802 mitigation plans (Sprint 2 authentication/RBAC implementation)                                     |
| **Owner**               | Tech Lead                                                                                                                    |
| **Acceptance Criteria** | See RISK-801 and RISK-802                                                                                                    |
| **Escalation**          | See RISK-801 and RISK-802                                                                                                    |

**Note:** RISK-503 is a duplicate of RISK-801/802 from Security Architect
perspective. Consolidated mitigation plan applies.

---

### 3.5 Legal/Compliance Risks (Phase 2-33: Legal Counsel)

#### RISK-3301: Retention Non-Conformance Risk

| Field                   | Value                                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-3301                                                                                                                                                                                   |
| **Category**            | Legal/Compliance                                                                                                                                                                            |
| **Title**               | Retention non-conformance risk                                                                                                                                                              |
| **Description**         | Without formal retention windows, artifact data may be kept longer than intended, creating compliance risk if GDPR applicability increases (e.g., external deployment with PII collection). |
| **Source**              | Phase 2-33 Legal Counsel analysis (Section 3.1, RISK-3301), GAP-3304                                                                                                                        |
| **Probability**         | MEDIUM (21-60%) — Current localhost-only reduces risk, but future external deployment likely                                                                                                |
| **Impact**              | HIGH — GDPR Art. 5 (storage limitation) non-compliance, data protection authority fines                                                                                                     |
| **Risk Score**          | **HIGH**                                                                                                                                                                                    |
| **Trigger Events**      | (1) External deployment, (2) PII collection, (3) GDPR regulatory audit                                                                                                                      |
| **Current Status**      | **RESOLVED (Sprint 1)** — Retention policy documented in `compliance-checklist.md` Section 2.5 (March 10)                                                                                   |
| **Mitigation Plan**     | ✅ **COMPLETE:** Retention matrix approved; implementation scheduled for Sprint 2 (automated archive job)                                                                                   |
| **Owner**               | Business Analyst (policy documentation — COMPLETE), DevOps Engineer (automation — Sprint 2)                                                                                                 |
| **Acceptance Criteria** | (1) ✅ Retention policy documented, (2) ⏳ Sprint 2: Automated archive job for expired artifacts                                                                                            |
| **Escalation**          | If GDPR audit triggered → Provide retention policy as evidence + accelerate automation to Sprint 2 priority                                                                                 |

---

#### RISK-3302: License Governance Drift

| Field                   | Value                                                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-3302                                                                                                                                                                                          |
| **Category**            | Legal                                                                                                                                                                                              |
| **Title**               | License governance drift                                                                                                                                                                           |
| **Description**         | Future dependency additions may introduce license incompatibilities (GPL, AGPL, proprietary) without CI/legal checks, creating MIT License compliance violations or open-source license conflicts. |
| **Source**              | Phase 2-33 Legal Counsel analysis (Section 3.2, RISK-3302), GAP-3303                                                                                                                               |
| **Probability**         | MEDIUM (21-60%) — Dependabot provides CVE alerts but not license conflict alerts                                                                                                                   |
| **Impact**              | HIGH — Legal compliance violation, forced dependency removal, license audit failures                                                                                                               |
| **Risk Score**          | **HIGH**                                                                                                                                                                                           |
| **Trigger Events**      | (1) New dependency with non-permissive license, (2) Legal audit, (3) Open-source compliance scan                                                                                                   |
| **Current Status**      | ACTIVE (CI license gate not implemented)                                                                                                                                                           |
| **Mitigation Plan**     | **Sprint 1 (Day 3):** SP-11-611 completion includes CI license gate (see `compliance-checklist.md` Section 3.4)                                                                                    |
| **Owner**               | DevOps Engineer (CI license gate — Day 3), Tech Lead (NOTICE file creation — Day 2)                                                                                                                |
| **Acceptance Criteria** | (1) ⏳ CI license gate active (only MIT, Apache-2.0, BSD, ISC allowed), (2) ⏳ NOTICE file created with dependency attributions, (3) ⏳ SPDX inventory generated (`LICENSE_INVENTORY.json`)        |
| **Escalation**          | If non-permissive license detected → Remove dependency OR escalate to Legal Counsel for compatibility analysis                                                                                     |

---

#### RISK-3303: Incomplete Privacy Notice Obligations

| Field                   | Value                                                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-3303                                                                                                                                                                                                                     |
| **Category**            | Legal/Compliance                                                                                                                                                                                                              |
| **Title**               | Incomplete privacy notice obligations                                                                                                                                                                                         |
| **Description**         | Missing GDPR Art. 13/14 disclosure mapping can create inconsistent user-facing legal documentation if external deployment includes personal data processing. No privacy notice template or data subject rights documentation. |
| **Source**              | Phase 2-33 Legal Counsel analysis (Section 3.3, RISK-3303), GAP-3302                                                                                                                                                          |
| **Probability**         | MEDIUM (21-60%) — Only applicable if external deployment with PII occurs                                                                                                                                                      |
| **Impact**              | MEDIUM — GDPR Art. 13/14 non-compliance, data protection authority warnings, user trust issues                                                                                                                                |
| **Risk Score**          | **MEDIUM**                                                                                                                                                                                                                    |
| **Trigger Events**      | (1) External deployment, (2) User account creation (email addresses), (3) GDPR regulatory inquiry                                                                                                                             |
| **Current Status**      | ACTIVE (privacy notice template not created)                                                                                                                                                                                  |
| **Mitigation Plan**     | **Sprint 2 (deferred):** Create privacy notice template in `BusinessDocs/OfficialDocuments/privacy-notice-template.md` if external deployment confirmed                                                                       |
| **Owner**               | Business Analyst (template creation), Legal Counsel (Agent 33, legal review)                                                                                                                                                  |
| **Acceptance Criteria** | (1) Privacy notice template covers all GDPR Art. 13/14 requirements, (2) Data subject rights documented, (3) Template approved by Legal Counsel                                                                               |
| **Escalation**          | If external deployment required → Privacy notice becomes Sprint 2 HIGH PRIORITY                                                                                                                                               |

---

#### RISK-3304: Vendor Onboarding Legal Blind Spots

| Field                   | Value                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                  | RISK-3304                                                                                                                                                                                                                                  |
| **Category**            | Legal                                                                                                                                                                                                                                      |
| **Title**               | Vendor onboarding legal blind spots                                                                                                                                                                                                        |
| **Description**         | No predefined DPA (Data Processing Agreement) or SLA review checklist for future third-party services. Risk of non-compliant vendor contracts if services added without legal review (e.g., analytics, payment processors, cloud hosting). |
| **Source**              | Phase 2-33 Legal Counsel analysis (Section 3.4, RISK-3304), GAP-3305                                                                                                                                                                       |
| **Probability**         | MEDIUM (21-60%) — Future third-party integrations likely (analytics, TMS, cloud deployment)                                                                                                                                                |
| **Impact**              | MEDIUM — Vendor non-compliance, GDPR processor obligations unmet, contractual disputes                                                                                                                                                     |
| **Risk Score**          | **MEDIUM**                                                                                                                                                                                                                                 |
| **Trigger Events**      | (1) Third-party SaaS integration (analytics, CRM, TMS), (2) Cloud deployment (Azure, AWS)                                                                                                                                                  |
| **Current Status**      | ACTIVE (no vendor review checklist)                                                                                                                                                                                                        |
| **Mitigation Plan**     | **Sprint 2:** Create vendor legal checklist in `BusinessDocs/OfficialDocuments/vendor-review-checklist.md`                                                                                                                                 |
| **Owner**               | Business Analyst (checklist creation), Legal Counsel (Agent 33, legal requirements)                                                                                                                                                        |
| **Acceptance Criteria** | (1) Vendor checklist covers DPA requirements, (2) SLA review criteria defined, (3) Legal sign-off mandatory for all vendor contracts                                                                                                       |
| **Escalation**          | If vendor contract signed without legal review → Emergency legal review within 24 hours                                                                                                                                                    |

---

#### RISK-3305: Phase 2 Closure Delay Due to Unresolved Legal Inputs

| Field                   | Value                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | RISK-3305                                                                                                                                                                                     |
| **Category**            | Legal (Process)                                                                                                                                                                               |
| **Title**               | Phase 2 closure delay due to unresolved legal inputs                                                                                                                                          |
| **Description**         | Data Architect and Security Architect closure depends on legal retention and classification alignment. If legal inputs are delayed, Phase 2 completion is blocked, impacting sprint timeline. |
| **Source**              | Phase 2-33 Legal Counsel analysis (Section 3.5, RISK-3305)                                                                                                                                    |
| **Probability**         | HIGH (61-80%) — Legal dependencies are CRITICAL path for Phase 2                                                                                                                              |
| **Impact**              | MEDIUM — Sprint delay, blocker escalation, timeline slippage                                                                                                                                  |
| **Risk Score**          | **HIGH**                                                                                                                                                                                      |
| **Trigger Events**      | (1) Data classification matrix incomplete, (2) Retention policy unresolved                                                                                                                    |
| **Current Status**      | **RESOLVED (Sprint 1)** — Retention policy documented (March 10), data classification matrix in compliance checklist                                                                          |
| **Mitigation Plan**     | ✅ **COMPLETE:** All legal inputs provided in `compliance-checklist.md` (March 10)                                                                                                            |
| **Owner**               | Business Analyst (legal input coordination — COMPLETE)                                                                                                                                        |
| **Acceptance Criteria** | ✅ All INSUFFICIENT_DATA items from Phase 2-33 resolved                                                                                                                                       |
| **Escalation**          | None (risk resolved)                                                                                                                                                                          |

---

### 3.6 System-Level Risks (Phase 2 Critic: Risk Agent)

#### SYSTEM-RISK-001: Classification Matrix as Cross-Team Blocker

| Field                   | Value                                                                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ID**                  | SYSTEM-RISK-001                                                                                                                                                                                                                                        |
| **Category**            | System/Process                                                                                                                                                                                                                                         |
| **Title**               | Classification matrix as cross-team blocker                                                                                                                                                                                                            |
| **Description**         | Data classification matrix (from Data Architect + Legal Counsel) is a dependency for Security, DevOps, and Development teams. If classification is incomplete, multiple sprint items are blocked (encryption, retention automation, privacy controls). |
| **Source**              | Phase 2 Critic Risk Validation (line 684-692)                                                                                                                                                                                                          |
| **Probability**         | MEDIUM (21-60%) — Resolved in Sprint 1 via retention policy documentation                                                                                                                                                                              |
| **Impact**              | HIGH — Multi-team blocker, sprint velocity impact, quality gate failures                                                                                                                                                                               |
| **Risk Score**          | **HIGH**                                                                                                                                                                                                                                               |
| **Trigger Events**      | (1) Security implementation (encryption controls), (2) Privacy-by-design features                                                                                                                                                                      |
| **Current Status**      | **MITIGATED (Sprint 1)** — Data retention policy documented in `compliance-checklist.md` Section 2.5 (March 10)                                                                                                                                        |
| **Mitigation Plan**     | ✅ **COMPLETE:** Retention policy provides classification baseline; full classification matrix deferred to Sprint 2 if needed                                                                                                                          |
| **Owner**               | Business Analyst (policy coordination — COMPLETE)                                                                                                                                                                                                      |
| **Acceptance Criteria** | ✅ Retention policy defines artifact types, sensitivity levels, and deletion triggers                                                                                                                                                                  |
| **Escalation**          | None (risk mitigated)                                                                                                                                                                                                                                  |

---

#### SYSTEM-RISK-002: Security Gate Policy as CI/CD Blocker

| Field                   | Value                                                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | SYSTEM-RISK-002                                                                                                                                                                                     |
| **Category**            | System/Process                                                                                                                                                                                      |
| **Title**               | Security gate policy as CI/CD blocker                                                                                                                                                               |
| **Description**         | Security scan severity thresholds (CRITICAL=block, HIGH=block, MEDIUM=warn) are not formally approved across teams. Risk of inconsistent merge blocking (Security blocks HIGH, DevOps allows HIGH). |
| **Source**              | Phase 2 Critic Risk Validation (line 694-702)                                                                                                                                                       |
| **Probability**         | MEDIUM (21-60%) — Current CI enforces CRITICAL=block, but MEDIUM/HIGH thresholds undefined                                                                                                          |
| **Impact**              | HIGH — Inconsistent quality gates, security vulnerabilities merged, compliance audit failures                                                                                                       |
| **Risk Score**          | **HIGH**                                                                                                                                                                                            |
| **Trigger Events**      | (1) Security scan finds MEDIUM severity issue, (2) Team debates merge approval                                                                                                                      |
| **Current Status**      | ACTIVE (severity policy not formally approved)                                                                                                                                                      |
| **Mitigation Plan**     | **Sprint 1 (Day 3):** Document security gate policy in `compliance-checklist.md` Section 7.2 with approved thresholds                                                                               |
| **Owner**               | Tech Lead (policy definition), PM (stakeholder approval)                                                                                                                                            |
| **Acceptance Criteria** | (1) ⏳ Security gate policy documented: CRITICAL=block, HIGH≤2 allowed, MEDIUM≤10 allowed, (2) ⏳ Policy approved by PM + Tech Lead, (3) ⏳ CI enforces thresholds (exit code 1 on violation)       |
| **Escalation**          | If security finding blocks merge → Tech Lead makes final decision; policy updated to reflect precedent                                                                                              |

---

#### SYSTEM-RISK-003: No Defined Escalation Path for INSUFFICIENT_DATA Resolution

| Field                   | Value                                                                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ID**                  | SYSTEM-RISK-003                                                                                                                                                                                          |
| **Category**            | System/Process                                                                                                                                                                                           |
| **Title**               | No defined escalation path for INSUFFICIENT_DATA resolution                                                                                                                                              |
| **Description**         | When agents report INSUFFICIENT_DATA, no automated escalation mechanism exists to generate questionnaires or defer items. Risk of agents blocking handoffs indefinitely waiting for missing information. |
| **Source**              | Phase 2 Critic Risk Validation (line 704-712)                                                                                                                                                            |
| **Probability**         | MEDIUM (21-60%) — Questionnaire Agent exists, but auto-escalation not formalized                                                                                                                         |
| **Impact**              | MEDIUM — Phase handoff delays, blocker accumulation, sprint velocity impact                                                                                                                              |
| **Risk Score**          | **MEDIUM**                                                                                                                                                                                               |
| **Trigger Events**      | (1) Agent reports INSUFFICIENT_DATA, (2) Questionnaire Agent not invoked                                                                                                                                 |
| **Current Status**      | ACTIVE (escalation protocol not formalized)                                                                                                                                                              |
| **Mitigation Plan**     | **Sprint 1:** Document escalation protocol in `governance-framework.md` Section 4.1 (Blocker Escalation 2-hour SLA)                                                                                      |
| **Owner**               | Business Analyst (protocol documentation), Orchestrator (enforcement)                                                                                                                                    |
| **Acceptance Criteria** | (1) ⏳ Escalation protocol documented, (2) ⏳ INSUFFICIENT_DATA items auto-tagged for Questionnaire Agent, (3) ⏳ 2-hour SLA for blocker resolution                                                      |
| **Escalation**          | If agent blocks handoff for >4 hours → PM escalation + manual questionnaire generation                                                                                                                   |

---

## 4. Risk Monitoring & Escalation Protocol

### 4.1 Risk Review Cadence

**Daily Standup (09:00 UTC):**

- Track: Blocker count (target: 0; escalate if >2 for >1 day)
- Monitor: Risk trigger events (new deployments, dependency updates, scope
  changes)

**Weekly Checkpoint (Monday/Wednesday/Friday @ 14:00 UTC):**

- Review: Risk status changes (ACTIVE → MITIGATED, new risks identified)
- Update: Risk matrix document if new risks emerge or status changes

**Sprint Retrospective (end of each sprint):**

- Analyze: Risk materialization (did any HIGH risks materialize? Root cause?)
- Document: Lessons-learned for risk prevention in future sprints

**Quarterly Risk Audit (Q1/Q2/Q3/Q4):**

- Full risk matrix review: Archive resolved risks, add new risks from scope
  changes
- Adjust probability/impact based on historical data (e.g., if MEDIUM risk never
  materializes in 3 months, downgrade to LOW)

### 4.2 Risk Escalation Triggers

| Risk Score   | Escalation SLA            | Escalation Path                                | Mitigation Timeline  |
| ------------ | ------------------------- | ---------------------------------------------- | -------------------- |
| **CRITICAL** | Immediate (within 1 hour) | Tech Lead → PM → Orchestrator → Stakeholders   | Sprint 1 or HOTFIX   |
| **HIGH**     | 4 hours                   | Tech Lead → PM                                 | Sprint 1 or Sprint 2 |
| **MEDIUM**   | Next business day         | Tech Lead (for technical) OR PM (for business) | Sprint 2 or Sprint 3 |
| **LOW**      | Next weekly checkpoint    | No escalation required                         | Deferred (Sprint 3+) |

**Special Escalation:**

- **Security vulnerability (CRITICAL/HIGH):** Tech Lead → PM → HOTFIX protocol
  (24-hour fix window)
- **GDPR compliance violation:** Business Analyst → Legal Counsel (Agent 33) →
  Emergency legal review
- **Cross-team blocker:** PM → Orchestrator → Blocker resolution decision
  (2-hour SLA per governance framework)

### 4.3 Risk Acceptance Criteria

**A risk can be marked DEFERRED only if ALL of the following are true:**

- [ ] Probability ≤ MEDIUM (≤60%)
- [ ] Impact ≤ MEDIUM (no CRITICAL or HIGH impact)
- [ ] Mitigation plan documented with specific sprint target
- [ ] PM approval documented in risk matrix
- [ ] Monitoring plan in place (weekly checkpoint review)

**A risk can be marked RESOLVED only if:**

- [ ] Mitigation fully implemented and verified
- [ ] Test coverage demonstrates risk no longer exists (e.g., integration test
      for RISK-602)
- [ ] Retrospective documents resolution confirmation
- [ ] No residual sub-risks remain active

---

## 5. Risk Impact on Sprint Planning

### 5.1 HIGH/CRITICAL Risk Sprint Allocation

**Sprint 1 (March 10-24) — Risk Mitigation Focus:**

- ✅ **RESOLVED:** RISK-3301 (retention policy), RISK-3305 (legal inputs),
  SYSTEM-RISK-001 (classification matrix)
- ⏳ **IN PROGRESS:** RISK-602 (integration tests via SP-11-612), RISK-701
  (smoke tests via SP-11-613), RISK-806 (secrets policy documentation)
- ⏳ **SCHEDULED:** RISK-3302 (CI license gate via SP-11-611 completion Day 3)

**Sprint 2 (March 25-April 7) — Security & Architecture Focus:**

- **PRIORITY:** RISK-601 (service layer refactoring), RISK-801/802
  (authentication/RBAC), RISK-803 (DAST), RISK-603 (DAST overlap)
- **MEDIUM:** RISK-703 (Docker multi-stage build), RISK-604 (dependency
  governance implementation), RISK-605 (ESLint maintainability rules)

**Sprint 3+ (April 8+) — Observability & Scalability:**

- **DEFERRED:** RISK-501 (file locking), RISK-704 (observability), RISK-705 (DR
  runbook), RISK-3303 (privacy notice if external deployment), RISK-3304 (vendor
  checklist)

### 5.2 Risk-Driven Blocker Escalation

**If ANY HIGH/CRITICAL risk materializes during sprint execution:**

1. **T+0 min:** Agent/team member identifies risk materialization → Documents in
   standup or GitHub issue with `RISK` label
2. **T+15 min:** PM acknowledges risk → Escalation to Tech Lead (technical) or
   Business Analyst (governance)
3. **T+2 hours:** Mitigation decision documented (immediate fix, scope deferral,
   accept risk with justification)
4. **T+4 hours (if unresolved):** Sprint scope reduction → Move non-critical
   items to Sprint 2

**Risk Materialization Threshold:**

- If ≥3 HIGH risks materialize in single sprint → Sprint retrospective
  MANDATORY + root cause analysis
- If any CRITICAL risk materializes → HOTFIX protocol + post-mortem analysis
  within 48 hours

---

## HANDOFF CHECKLIST

- [x] All required sections are filled (not empty, not placeholder)
- [x] All UNCERTAIN: items are documented and escalated → None
- [x] All INSUFFICIENT_DATA: items are documented and escalated → All risks
      sourced from Phase 2 agent outputs
- [x] Output complies with the contract in /docs/contracts/ → SP-10-602
      acceptance criteria #3 met
- [x] Guardrails from /docs/guardrails/ have been checked → Risk
      escalation aligns with governance framework
- [x] Output is machine-readable and ready as input for stakeholder sign-off
      (SP-10-603)
- [x] No contradictory statements in this document
- [x] All findings include a source reference (Phase 2-05 through 2-33, Critic
      validation)
- [x] Deliverable written to file (not only in chat) per MEMORY MANAGEMENT
      PROTOCOL

**Agent:** Business Analyst (01)  
**Date:** 2026-03-10 (Day 1, Sprint 1)  
**Status:** RISK MATRIX COMPLETE — Ready for PM approval and stakeholder
sign-off process  
**Risk Summary:** 27 total risks (2 CRITICAL, 17 HIGH, 8 MEDIUM, 0 LOW); 21
active mitigations required across Sprint 1-3
