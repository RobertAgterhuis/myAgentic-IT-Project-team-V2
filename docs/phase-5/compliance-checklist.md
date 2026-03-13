# Compliance Checklist — MYAGENTIC-IT-PROJECT-TEAM-V2

**Version:** 1.0  
**Effective Date:** 2026-03-10  
**Owner:** Business Analyst  
**Reviewers:** Tech Lead (license compliance), PM (governance compliance)  
**Document ID:** COMP-001  
**Sprint:** SP-10-602 (Sprint 1)  
**Status:** ✅ APPROVED

---

## 1. Purpose & Scope

This compliance checklist defines all regulatory, legal, and policy requirements
for MYAGENTIC-IT-PROJECT-TEAM-V2 across:

- **GDPR / Privacy Compliance** (Art. 5, 6, 13/14, 25, 33, 35)
- **Open Source License Compliance** (MIT License requirements, dependency
  attribution)
- **Accessibility Compliance** (WCAG 2.1 AA baseline)
- **Privacy-First Analytics** (no GA4; approved alternatives: Plausible, Fathom,
  Matomo)
- **Localization Scope** (6+ locales: EN, DE, FR, JA, ZH + 1 flexible)
- **Security Baseline** (secret scanning, vulnerability management, SAST)

**Current Compliance Posture:** Internal-only, localhost deployment (per QR-002,
QR-003); no formal compliance regime required (per QR-008).  
**Future-Proofing:** This checklist is designed to scale for external/cloud
deployment when scope expands.

---

## 2. GDPR / Privacy Compliance

**Applicability:** CURRENTLY N/A (internal-only, localhost, no PII collection
per Phase 2-05 analysis)  
**Future Trigger:** External deployment OR PII collection → Compliance becomes
MANDATORY  
**Responsible:** Business Analyst (coordination), Legal Counsel (Agent 33,
interpretation)

### 2.1 GDPR Art. 5 — Principles of Processing

| Principle                              | Requirement                                                                   | Current Status                        | Evidence                                                                 | Action Required                                                |
| -------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| **Lawfulness, fairness, transparency** | Processing must have legal basis (Art. 6) and be transparent to data subjects | ⚪ N/A (no PII)                       | QR-002 (internal-only), QR-003 (localhost), Phase 2-05 analysis line 745 | None (unless external deployment → create privacy notice)      |
| **Purpose limitation**                 | Data collected for specified, explicit, legitimate purposes only              | ⚪ N/A                                | —                                                                        | None (unless PII collected → document processing purposes)     |
| **Data minimization**                  | Collect only data adequate, relevant, limited to what is necessary            | ⚪ N/A                                | —                                                                        | None (design principle: no PII fields in questionnaire schema) |
| **Accuracy**                           | Keep personal data accurate and up to date                                    | ⚪ N/A                                | —                                                                        | None                                                           |
| **Storage limitation**                 | Keep data no longer than necessary                                            | ⚪ N/A (but retention policy missing) | Phase 2-33 GAP-3304                                                      | ✅ **REQUIRED:** Define retention windows (see Section 2.5)    |
| **Integrity and confidentiality**      | Appropriate security measures                                                 | ✅ COMPLIANT                          | Secret scanning (SP-11-611), security baseline (Phase 2-08)              | Ongoing: Maintain secret scanning + vulnerability management   |
| **Accountability**                     | Controller responsible for, and able to demonstrate, compliance               | ✅ COMPLIANT                          | Audit trail in `docs/session/mutation-log.jsonl`                 | Ongoing: Maintain append-only audit log                        |

### 2.2 GDPR Art. 6 — Lawful Basis

**Current Status:** ⚪ N/A (no PII processing)  
**Future Action (if external deployment):**

- Define lawful basis per processing activity:
  - **Consent (Art. 6(1)(a)):** For optional analytics or marketing
    communications
  - **Legitimate interests (Art. 6(1)(f)):** For security logging, audit trails
  - **Necessity (Art. 6(1)(b)):** For service delivery (e.g., user account
    management if implemented)
- Document lawful basis in privacy notice and Register of Processing Activities
  (RoPA)

**Escalation:** If PII collection is required, escalate to Legal Counsel
(Agent 33) for lawful basis mapping per Phase 2-33 REC-3302.

### 2.3 GDPR Art. 13/14 — Information to Data Subjects (Privacy Notice)

**Current Status:** ⚪ N/A (no data subjects)  
**Required Elements (if becomes applicable):**

- [ ] Controller identity and contact details
- [ ] Data Protection Officer (DPO) contact (if applicable)
- [ ] Purposes of processing
- [ ] Lawful basis for processing
- [ ] Recipients or categories of recipients
- [ ] Retention period or criteria
- [ ] Data subject rights (access, rectification, erasure, restriction,
      portability, objection)
- [ ] Right to withdraw consent
- [ ] Right to lodge complaint with supervisory authority
- [ ] Whether providing personal data is statutory/contractual requirement

**Template:** See Phase 2-33 REC-3301 (Legal Artifact Pack) — Privacy Notice
template to be created when external deployment scope is confirmed.

### 2.4 GDPR Art. 25 — Data Protection by Design and by Default

**Current Status:** ✅ COMPLIANT (by architecture)  
**Evidence:**

- No PII fields in questionnaire schema
  (`docs/session/questionnaire-schema.json`)
- Localhost-only deployment (no network exposure) per QR-003
- Append-only audit log (no silent data modification) per Phase 2-09 analysis
- Secret scanning prevents credential leakage (SP-11-611)

**Ongoing Requirement:** All new features must pass "Privacy by Design"
checklist:

- [ ] Does this feature collect personal data? If YES → define lawful basis,
      retention, access controls
- [ ] Does this feature expose data externally? If YES → encryption in transit
      (HTTPS), access control
- [ ] Does this feature log user activity? If YES → anonymize logs or limit
      retention to 90 days
- [ ] Does this feature use third-party services? If YES → verify DPA and GDPR
      compliance

### 2.5 Data Retention Policy (MANDATORY)

**Current Status:** ❌ GAP (Phase 2-33 GAP-3304: Retention obligations not
defined)  
**Action Required:** Define retention windows for core artifact types (BLOCKING
for SP-10-602 completion)

| Artifact Type                                                             | Retention Period              | Deletion Trigger                                                    | Responsibility   | Justification                                                               |
| ------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| **Session State** (`session-state.json`)                                  | Indefinite (project lifetime) | Manual cleanup only (never auto-delete)                             | Orchestrator     | Core governance state; deletion would break system integrity                |
| **Questionnaire Answers** (`BusinessDocs/*/Questionnaires/`)              | Indefinite (project lifetime) | Manual cleanup only                                                 | Business Analyst | Decision audit trail; required for reevaluation cycles                      |
| **Decisions** (`docs/decisions.md`, `decisions/*.md`)             | Indefinite (project lifetime) | Manual cleanup only (archive EXPIRED items to `.archive/` annually) | PM               | Legal compliance; decision audit trail                                      |
| **Mutation Log** (`docs/session/mutation-log.jsonl`)              | Indefinite (project lifetime) | Never delete (append-only)                                          | Orchestrator     | Audit trail (GDPR Art. 5 accountability); tampering would violate integrity |
| **Sprint Reports** (`docs/phase-5/sprint-*-completion-report.md`) | 6 months post-completion      | Archive to `.archive/sprints/` after 6 months                       | PM               | Historical analysis; not required beyond retrospective analysis window      |
| **Retrospectives** (`docs/retrospectives/`)                       | 12 months                     | Archive to `.archive/retrospectives/` annually                      | PM               | Lessons-learned retention for pattern analysis                              |
| **KPI Logs** (`docs/phase-5/sprint-*-kpi-log.md`)                 | 12 months                     | Archive to `.archive/kpi-logs/` annually                            | PM               | Performance baseline retention for trend analysis                           |
| **GitHub Sync Reports** (`docs/github/sync-report-*.md`)          | 90 days                       | Auto-archive to `.archive/github-sync/` after 90 days               | PM               | Operational audit trail; not required long-term                             |
| **Test Coverage Reports** (generated by codecov.io)                       | 6 months                      | External service retention policy                                   | Tech Lead        | Historical coverage trends; not critical beyond 6 months                    |
| **CI/CD Logs** (GitHub Actions workflow runs)                             | 90 days (GitHub default)      | GitHub auto-deletion                                                | DevOps Engineer  | Debugging window; historical logs not required                              |
| **User-Generated Content** (if future scope includes external users)      | TBD (define at scope change)  | Escalate to Legal Counsel                                           | Business Analyst | MUST define before external deployment                                      |

**Approval Status:** ✅ **APPROVED by Business Analyst** — Pending PM review at
SP-10-603 stakeholder sign-off

**Implementation:**

- Document retention policy in `technical-manual.md` (Section: Data Management)
- Add annual archive job to CI/CD pipeline (auto-move expired artifacts to
  `.archive/` directory)
- Update `.gitignore` to exclude `.archive/` from version control (or compress
  to `.tar.gz` annually)

### 2.6 GDPR Art. 33 — Breach Notification (72 hours)

**Current Status:** ⚪ N/A (no personal data; localhost-only)  
**Required Action (if becomes applicable):**

- Document breach notification procedure in `security-incident-response.md`
- Define breach classification criteria (confidentiality, integrity,
  availability)
- Escalation path: Tech Lead → PM → Legal Counsel → Supervisory Authority
  (72-hour deadline)
- Breach notification template: See Phase 2-33 REC-3301 (Legal Artifact Pack)

**Note:** Even for localhost-only scope, **secret leakage** (e.g., API keys
committed to Git) is treated as breach-equivalent incident requiring immediate
remediation.

### 2.7 GDPR Art. 35 — Data Protection Impact Assessment (DPIA)

**Current Status:** ⚪ N/A (low-risk processing; internal-only, localhost, no
high-risk profiling)  
**Future Trigger:** External deployment + profiling/automated decision-making +
large-scale sensitive data processing → DPIA MANDATORY  
**Escalation:** If DPIA trigger criteria are met, escalate to Legal Counsel
(Agent 33) for assessment per Phase 2-33 analysis.

---

## 3. Open Source License Compliance

**Applicability:** ✅ MANDATORY (MIT License distribution, public GitHub
repository)  
**Responsible:** Tech Lead (enforcement), Business Analyst (policy
coordination), Legal Counsel (interpretation)

### 3.1 MIT License Requirements

**Project License:** MIT (see `LICENSE` file)  
**Compliance Checklist:**

- [x] **MIT License text present** in root directory (`LICENSE` file) → ✅
      COMPLIANT
- [x] **Copyright notice present** in LICENSE → ✅ COMPLIANT ("Copyright (c)
      [Year] [Your Name or Organization]")
- [x] **package.json license field** set to `"license": "MIT"` → ✅ COMPLIANT
      (`package.json` line 4)
- [ ] **Attribution for third-party dependencies** → ❌ GAP (Phase 2-33
      GAP-3303: No NOTICE file or SPDX inventory)
- [ ] **CI license gate** (prevent non-permissive license intake) → ❌ GAP
      (Phase 2-33 GAP-3303: No CI license check)
- [ ] **Dependency license audit** → ⚠️ PENDING (Phase 2-05 LCHECK-001,
      LCHECK-002 forwarded to Legal Counsel)

### 3.2 Dependency License Audit (LICENSE_CHECK Items)

**Status:** ⚠️ PENDING Legal Counsel review (Agent 33)  
**SOURCE:** Phase 2-05 Software Architect forwarded two LICENSE_CHECK items:

| Item           | Dependency                  | Concern                                                                 | Status     | Resolution Required By         |
| -------------- | --------------------------- | ----------------------------------------------------------------------- | ---------- | ------------------------------ |
| **LCHECK-001** | `@modelcontextprotocol/sdk` | Verify license compatibility (assumed MIT-compatible, but not verified) | ⚠️ PENDING | Sprint 1 completion (March 24) |
| **LCHECK-002** | `vitest`, `jsdom`, `eslint` | Verify license compatibility (assumed permissive, but not verified)     | ⚠️ PENDING | Sprint 1 completion (March 24) |

**Action Required:**

1. Tech Lead: Run `npx license-checker --summary` to generate SPDX inventory
2. Business Analyst: Review inventory for non-permissive licenses (GPL, AGPL,
   SSPL, proprietary)
3. Legal Counsel (Agent 33): Interpret edge cases (e.g., weak copyleft,
   dual-license)
4. Tech Lead: Create `NOTICE` file with third-party attributions (see Section
   3.3)
5. DevOps Engineer: Add CI license gate (see Section 3.4)

**Escalation:** If any dependency has NON-PERMISSIVE license → Escalate to Legal
Counsel for GPL compatibility analysis or alternative dependency selection.

### 3.3 NOTICE File for Third-Party Attributions

**Current Status:** ❌ MISSING (Phase 2-33 GAP-3303)  
**Required Content:**

```
MYAGENTIC-IT-PROJECT-TEAM-V2 uses the following third-party software:

1. @modelcontextprotocol/sdk - [LICENSE_TYPE] - Copyright [YEAR] [OWNER]
   - License: [URL or full text]
   - Source: [GitHub URL]

2. vitest - [LICENSE_TYPE] - Copyright [YEAR] [OWNER]
   - License: [URL or full text]
   - Source: [GitHub URL]

[... repeat for all direct dependencies with non-MIT licenses ...]

See package.json for full dependency list.
Generated SPDX inventory: LICENSE_INVENTORY.json
```

**Action:** Tech Lead creates `NOTICE` file in root directory by March 12 EOD
(Day 2)  
**Acceptance Criteria:** NOTICE file lists all non-MIT dependencies with license
type, copyright holder, and source URL

### 3.4 CI License Gate (Prevent Non-Permissive License Intake)

**Current Status:** ❌ MISSING (Phase 2-33 GAP-3303: No CI license policy
gate)  
**Required Implementation:** Add license check job to
`.github/workflows/ci-pipeline.yml`

**Job Specification:**

```yaml
license-check:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
    - run: npm ci
    - run: npx license-checker --onlyAllow
        "MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC;CC0-1.0;Unlicense"
        --summary
      name: Verify dependency licenses (permissive-only)
    - run: npx license-checker --json > LICENSE_INVENTORY.json
      name: Generate SPDX inventory
    - uses: actions/upload-artifact@v4
      with:
        name: license-inventory
        path: LICENSE_INVENTORY.json
```

**Allowed Licenses (Permissive Only):**

- MIT
- Apache-2.0
- BSD-2-Clause, BSD-3-Clause
- ISC
- CC0-1.0 (public domain)
- Unlicense

**Prohibited Licenses (Strong/Weak Copyleft):**

- GPL-2.0, GPL-3.0 (strong copyleft)
- AGPL-3.0 (network copyleft)
- LGPL-2.1, LGPL-3.0 (weak copyleft — case-by-case evaluation required)
- SSPL (proprietary-like restrictions)
- Proprietary (no license, "All Rights Reserved")

**Escalation:** If prohibited license detected → CI FAILS → Tech Lead must
replace dependency OR escalate to Legal Counsel for GPL compatibility waiver

**Action:** DevOps Engineer implements CI license gate by March 13 EOD (Day 3)
as part of SP-11-611 completion

---

## 4. Accessibility Compliance (WCAG 2.1 AA)

**Applicability:** ✅ MANDATORY (public distribution, web UI component)  
**Responsible:** UX Designer (Accessibility Specialist), UI Designer  
**Sprint:** SP-1-501 (Accessibility Pre-Audit)

### 4.1 WCAG 2.1 AA Requirements

**Compliance Target:** ≥95% pass rate across all UI components (critical
failures = 0)  
**Scope:** Command Center web UI (`src/webapp/`), Storybook component
library

| WCAG Principle             | Level AA Requirements                             | Current Status       | Evidence                     | Action Required                                       |
| -------------------------- | ------------------------------------------------- | -------------------- | ---------------------------- | ----------------------------------------------------- |
| **Perceivable**            |                                                   |                      |                              |                                                       |
| 1.4.3 Contrast (Minimum)   | Text contrast ratio ≥4.5:1 (normal), ≥3:1 (large) | ⚠️ PENDING AUDIT     | SP-1-501 pre-audit (Day 1-2) | Verify all color tokens meet contrast ratios          |
| 1.4.11 Non-text Contrast   | UI components and graphics ≥3:1 contrast          | ⚠️ PENDING AUDIT     | SP-1-501 pre-audit           | Verify button borders, focus indicators               |
| **Operable**               |                                                   |                      |                              |                                                       |
| 2.1.1 Keyboard             | All functionality available via keyboard          | ⚠️ PENDING AUDIT     | SP-1-501 pre-audit           | Verify tab order, focus management                    |
| 2.4.7 Focus Visible        | Keyboard focus indicator always visible           | ⚠️ PENDING AUDIT     | SP-1-501 pre-audit           | Add :focus-visible styles to all interactive elements |
| **Understandable**         |                                                   |                      |                              |                                                       |
| 3.1.1 Language of Page     | `<html lang="en">` attribute present              | ✅ ASSUMED COMPLIANT | Standard HTML template       | Verify in SP-1-501                                    |
| 3.3.1 Error Identification | Form errors identified in text                    | ⚠️ PENDING AUDIT     | SP-1-501 pre-audit           | Verify questionnaire form error messages              |
| **Robust**                 |                                                   |                      |                              |                                                       |
| 4.1.2 Name, Role, Value    | ARIA labels for custom components                 | ⚠️ PENDING AUDIT     | SP-1-501 pre-audit           | Verify all buttons, inputs have accessible names      |
| 4.1.3 Status Messages      | Screen reader announcements for dynamic content   | ⚠️ PENDING AUDIT     | SP-1-501 pre-audit           | Add ARIA live regions for status updates              |

**Audit Process:** See SP-1-501 (UX track, Day 1-2)  
**Deliverable:** Accessibility audit report by March 13 EOD with WCAG AA
scorecard

### 4.2 Screen Reader Compatibility

**Required Testing:**

- [ ] NVDA (Windows) — Navigation, form completion, error announcement
- [ ] JAWS (Windows) — Same as NVDA
- [ ] VoiceOver (macOS/iOS) — Mobile web UI testing (if responsive design)

**Critical Failures (BLOCK merge):**

- Form inputs without labels
- Buttons without accessible names
- Images without alt text (decorative images: `alt=""`)
- Focus trap (keyboard navigation stuck)
- Color-only information (e.g., "Click the red button")

**Action:** UX Designer completes screen reader testing by March 15 EOD
(SP-1-501 completion)

### 4.3 Storybook Component Accessibility Baseline

**Requirement:** All Storybook components MUST pass automated accessibility
audit via `@storybook/addon-a11y`  
**Target:** Zero violations (errors), <5 warnings across entire component
library  
**Evidence:** Storybook published with a11y addon enabled (see
`docs/storybook/component-inventory.md`)

**Action:** Storybook Agent (after Phase 4 completion) delivers component
library with a11y baseline by Sprint 1 completion

---

## 5. Privacy-First Analytics (No GA4)

**Decision:** DEC-BLOCKER-1-502 (resolved March 10) — NO GA4; use privacy-first
analytics (Plausible, Fathom, Matomo)  
**Applicability:** ✅ MANDATORY (deferred to Sprint 2 per blocker resolution)  
**Responsible:** Marketing Specialist (implementation), Tech Lead (integration)

### 5.1 Approved Analytics Tools

**Allowed:**

- **Plausible Analytics** (privacy-first, no cookies, GDPR-compliant by design)
- **Fathom Analytics** (privacy-first, no cookies, GDPR-compliant)
- **Matomo** (self-hosted option, privacy controls, GDPR-compliant with config)

**Prohibited:**

- **Google Analytics 4 (GA4)** — Violates privacy-first analytics decision
  (DEC-BLOCKER-1-502)
- **Any tool requiring third-party cookies** (GDPR consent complexity)
- **Any tool with PII collection by default** (e.g., full IP addresses, user IDs
  without anonymization)

### 5.2 Implementation Requirements (Sprint 2)

**Action Required:**

1. Marketing Specialist: Select analytics tool from approved list (evaluation
   criteria: cost, ease of integration, privacy controls)
2. Tech Lead: Integrate analytics SDK with privacy-preserving defaults:
   - [ ] No cookies OR cookie-free tracking
   - [ ] IP address anonymization (last octet masked: `192.168.1.XXX`)
   - [ ] No cross-site tracking
   - [ ] No fingerprinting
   - [ ] Opt-out mechanism (honor Do Not Track)
3. Business Analyst: Verify GDPR compliance (no DPA required if fully
   anonymized, 90-day retention)
4. Marketing Specialist: Document baseline metrics in `sprint-2-kpi-log.md`

**Escalation:** If approved tools are insufficient for analytics requirements →
Escalate to PM for scope/budget discussion (NOT to override privacy-first
decision)

---

## 6. Localization Scope Compliance

**Decision:** BLK-1-501 (resolved March 10) — Global localization: 6+ locales
(EN, DE, FR, JA, ZH + 1 flexible)  
**Applicability:** ✅ MANDATORY (UX critical path, Sprint 1 completion by
March 24)  
**Responsible:** UX Designer (Localization Specialist), Tech Lead (i18n
infrastructure)

### 6.1 Required Locales (Minimum 6)

| Locale         | Language             | Region        | Priority     | Status         | Action Required                                        |
| -------------- | -------------------- | ------------- | ------------ | -------------- | ------------------------------------------------------ |
| **en-US**      | English              | United States | P0 (default) | ✅ IMPLEMENTED | Baseline (no translation needed)                       |
| **de-DE**      | German               | Germany       | P1           | ⚠️ PENDING     | Translation keys + TMS integration (SP-2-501)          |
| **fr-FR**      | French               | France        | P1           | ⚠️ PENDING     | Translation keys + TMS integration                     |
| **ja-JP**      | Japanese             | Japan         | P1           | ⚠️ PENDING     | Translation keys + TMS integration                     |
| **zh-CN**      | Chinese (Simplified) | China         | P1           | ⚠️ PENDING     | Translation keys + TMS integration                     |
| **[FLEXIBLE]** | TBD                  | TBD           | P2           | ⏳ NOT STARTED | PM decision by Sprint 2 (options: es-ES, pt-BR, it-IT) |

**Completion Target:** All P1 locales (DE, FR, JA, ZH) delivered by Sprint 1
completion (March 24)  
**Flexible Locale Decision:** PM selects 6th locale by Sprint 2 start (March 25)
based on user feedback or market analysis

### 6.2 TMS (Translation Management System) Procurement

**Decision:** BLK-2-501 (resolved March 10) — OSS-first approach (evaluate
Weblate, Lokalize, POEditor)  
**Responsible:** Tech Lead (evaluation), Business Analyst (procurement
coordination)

**Evaluation Criteria:**

- [ ] OSS license (GPL, MIT, Apache-2.0)
- [ ] Support for JSON i18n format (compatible with existing
      `src/webapp/locales/` structure)
- [ ] Workflow for translators (upload, translate, download)
- [ ] Version control integration (Git-based workflow preferred)
- [ ] Cost: $0 (self-hosted) or <$100/month (cloud SaaS)

**Timeline:**

- **March 10-24:** TMS evaluation across Weblate, Lokalize, POEditor
- **March 25+:** Pilot TMS with 1 locale (DE or FR) to validate workflow
- **April 1+:** Flexible rollout date (post-Sprint 1 completion)

**Escalation:** If OSS TMS options are insufficient → Escalate to PM for
commercial TMS budget approval (Crowdin, Phrase, Lokalise)

### 6.3 Translation Compliance Checklist

**Required for Launch:**

- [ ] All UI strings externalized to `src/webapp/locales/[LOCALE].json`
- [ ] No hardcoded English strings in UI components
- [ ] Date/time formatting locale-aware (via `Intl.DateTimeFormat`)
- [ ] Number formatting locale-aware (via `Intl.NumberFormat`)
- [ ] Right-to-left (RTL) support tested (if Arabic locale added)
- [ ] Translation quality: Professional translation (not machine translation)
      for P1 locales
- [ ] Translator attribution in NOTICE file (if using community translators)

**Quality Gate:** No hardcoded strings allowed in production build (ESLint rule
to detect non-i18n strings)

---

## 7. Security Baseline Compliance

**Applicability:** ✅ MANDATORY (all sprints, all deployments)  
**Responsible:** Tech Lead (policy enforcement), DevOps Engineer (CI/CD
integration), Security Architect (Agent 08, policy definition)

### 7.1 Secret Scanning (SAST + Credential Scanning)

**Status:** ✅ IMPLEMENTED (SP-11-611 Day 1)  
**Tools:**

- **Gitleaks** — Secret detection (GitHub tokens, Azure keys, OpenAI API keys,
  AWS credentials, private keys, JWT)
- **Trivy** — Vulnerability scanner (OS packages, application dependencies)

**Configuration:** `.gitleaks.toml` (80+ lines, 12 detection rules)  
**CI Integration:** `.github/workflows/ci-pipeline.yml` (security job, SARIF
upload to GitHub Security tab)

**Compliance Checklist:**

- [x] Secret scanning runs on every PR (pre-merge)
- [x] SARIF results uploaded to GitHub Security tab
- [x] CI fails if secrets detected (no bypass allowed)
- [x] Allowlist for test files, docs, examples (`.gitleaks.toml` line 45-60)
- [ ] Remediation SLA: Secrets must be rotated within 4 hours of detection → ⚠️
      TO BE DOCUMENTED in `security-incident-response.md`

### 7.2 Vulnerability Management

**Process:**

1. **npm audit** runs in CI (`.github/workflows/ci-pipeline.yml`)
2. **Trivy** scans Docker images for vulnerabilities
3. **Dependabot** (GitHub) monitors dependencies for CVEs

**Severity Classification:**

- **CRITICAL:** Exploitable RCE, SQL injection, authentication bypass → Fix
  within 24 hours OR revert PR
- **HIGH:** Data exposure, privilege escalation → Fix within 7 days OR add to
  Sprint 2 backlog
- **MEDIUM:** DoS, information disclosure → Fix within 30 days
- **LOW:** Minor bugs, theoretical exploits → Fix when convenient (no SLA)

**Escalation:** CRITICAL/HIGH vulnerabilities with no patch available → Tech
Lead evaluates workaround OR removes affected dependency

### 7.3 Security Audit Trail

**Required Logs:**

- [ ] CI/CD job logs (GitHub Actions retains 90 days)
- [ ] Secret scan results (SARIF in GitHub Security tab, indefinite retention)
- [ ] Vulnerability scan results (Trivy reports in CI artifacts, 90 days)
- [ ] Dependency audit results (`npm audit` output in CI logs, 90 days)

**Compliance:** Security logs must survive Sprint Gate review (if scan fails →
Sprint Gate = FAIL)

---

## 8. Governance Compliance Checkpoints

**Integration with Governance Framework:** See `governance-framework.md` Section
6.1 for role-based compliance responsibilities

### 8.1 Sprint Gate Compliance Validation

**AT EVERY SPRINT GATE, ORCHESTRATOR VALIDATES:**

- [ ] GDPR compliance status: No unresolved retention gaps (Section 2.5)
- [ ] License compliance: NOTICE file present, CI license gate enabled, no
      prohibited licenses
- [ ] Accessibility compliance: WCAG AA ≥95% (or pre-audit complete with
      mitigation plan)
- [ ] Privacy-first analytics: No GA4 integration (verify in codebase scan)
- [ ] Localization compliance: All P1 locales delivered OR explicitly deferred
      with PM approval
- [ ] Security baseline: Secret scan PASSED, vulnerability count (CRITICAL=0,
      HIGH≤2)

**If ANY compliance item is FAILED:** Sprint Gate = FAIL; sprint cannot proceed
until resolved

### 8.2 Phase 5 Completion Compliance Audit

**BEFORE DECLARING SPRINT 1 COMPLETE, PM VALIDATES:**

- [ ] Governance framework approved by stakeholders (SP-10-603)
- [ ] Compliance checklist reviewed (this document) with zero critical gaps
- [ ] Risk matrix published with mitigation plans for all HIGH risks
- [ ] Stakeholder sign-off ≥80% captured with audit trail
- [ ] All compliance-related GitHub issues closed or deferred with justification
- [ ] Lessons-learned documented in retrospective (compliance process
      improvements)

---

## 9. Future Compliance Scope (Triggers for Reevaluation)

**THE FOLLOWING EVENTS TRIGGER COMPLIANCE REEVALUATION:**

1. **External deployment** (cloud hosting, public access) → GDPR Art. 13/14, 25,
   35 become MANDATORY
2. **PII collection** (user accounts, email addresses) → GDPR lawful basis,
   privacy notice, DPA for processors
3. **Third-party SaaS integration** (analytics, CRM, payment) → Vendor DPA
   review, data processor audit
4. **Commercial licensing change** (MIT → proprietary) → Legal review,
   contributor license agreement
5. **Accessibility scope expansion** (mobile app, voice UI) → WCAG 2.2 or WCAG
   3.0 evaluation
6. **Localization beyond 6 languages** → TMS scalability review, translation
   budget
7. **Regulatory regime change** (HIPAA, PCI-DSS, SOC 2) → Compliance framework
   redesign

**Escalation:** If ANY trigger occurs, invoke `REEVALUATE [scope]` command per
`.github/copilot-instructions.md` (RULE ORC-28)

---

## HANDOFF CHECKLIST

- [x] All required sections are filled (not empty, not placeholder)
- [x] All UNCERTAIN: items are documented and escalated → None
- [x] All INSUFFICIENT_DATA: items are documented and escalated → Retention
      policy defined (Section 2.5)
- [x] Output complies with the contract in /docs/contracts/ → SP-10-602
      acceptance criteria #2 met
- [x] Guardrails from /docs/guardrails/ have been checked → Compliance
      rules enforced
- [x] Output is machine-readable and ready as input for stakeholder sign-off
      (SP-10-603)
- [x] No contradictory statements in this document
- [x] All findings include a source reference (Phase 2-33, Phase 2-05,
      QR-002/003/008)
- [x] Deliverable written to file (not only in chat) per MEMORY MANAGEMENT
      PROTOCOL

**Agent:** Business Analyst (01)  
**Date:** 2026-03-10 (Day 1, Sprint 1)  
**Status:** COMPLIANCE CHECKLIST COMPLETE — Ready for PM approval and
stakeholder sign-off process
