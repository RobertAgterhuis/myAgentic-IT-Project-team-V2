# Recommendations – DevOps Engineer – 2026-03-10

## Metadata

- Agent: DevOps Engineer (07)
- Phase: 2
- Date: 2026-03-10
- Mode: CREATE
- Upstream input: `07-devops-engineer-analysis.md`

## Recommendation Overview

This document resolves all `Critical` and `High` DevOps gaps/risks identified in
analysis:

- Gaps: `GAP-701`, `GAP-702`, `GAP-703`, `GAP-704`, `GAP-705`, `GAP-706`
- Risks: `RISK-701`, `RISK-702`, `RISK-703`, `RISK-704`, `RISK-705`

## Recommendations

### REC-701 – Introduce staged delivery pipeline with mandatory smoke gates

- Addresses: `GAP-701`, `GAP-702`, `RISK-701`
- Priority: P1
- Action:
  - Add a `deploy-staging` workflow job gated on successful `syntax-check`,
    `test`, `secret-scan`, `sast`, and `npm-audit`.
  - Add post-deploy smoke checks for `/health` and `/metrics` with explicit
    timeout/retry policy.
  - Block release tagging or publish when smoke checks fail.
- Rationale: Prevent release progression without runtime verification.
- Dependencies: Security severity threshold policy
  (`INSUFFICIENT_DATA: IND-701`)
- Owner: DevOps Engineer + Release Owner
- Evidence source: `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- SMART success criteria:
  - By Sprint 10 end, 100% releases include automated staging smoke checks.
  - Release workflow failure rate due to missing smoke checks = 0.

### REC-702 – Formalize environment promotion contract

- Addresses: `GAP-702`, `RISK-701`
- Priority: P1
- Action:
  - Define `dev -> staging -> production` promotion policy in phase-2 docs.
  - Require artifact immutability between environments (same image digest).
  - Require approver role and rollback criteria per promotion.
- Rationale: Removes ambiguity in release governance.
- Dependencies: Product/Operations sign-off (`QUESTIONNAIRE_REQUEST: DO-Q-701`)
- Owner: DevOps Engineer + Product Manager
- Evidence source: workflow and docs baseline
- SMART success criteria:
  - Promotion checklist exists and is enforced for all production deployments.
  - 0 production promotions bypass documented approval criteria.

### REC-703 – Establish IaC baseline for cloud-ready evolution

- Addresses: `GAP-703`
- Priority: P1
- Action:
  - Select `Bicep` as primary Azure IaC baseline (aligned with existing
    Microsoft-first toolchain), while preserving Docker Compose for local dev.
  - Create initial IaC structure (`/infra/`) with environment parameter files
    and naming conventions.
  - Add drift detection job for IaC plan/what-if checks in PR validation.
- Rationale: Enables controlled transition from local-only runtime to managed
  environments.
- Dependencies: Target environment confirmation
  (`QUESTIONNAIRE_REQUEST: DO-Q-701`)
- Owner: DevOps Engineer + Software Architect
- Evidence source: absence of Terraform/Bicep/Pulumi in repository
- SMART success criteria:
  - IaC skeleton and validation workflow merged by Sprint 11.
  - 100% infrastructure changes reviewed through IaC pull requests.

### REC-704 – Enforce reproducible container builds

- Addresses: `GAP-704`, `RISK-703`
- Priority: P1
- Action:
  - Change Docker production dependency installation to `npm ci --omit=dev`.
  - Add CI check to fail when lockfile is out of sync.
  - Add SBOM generation artifact in CI for release candidates.
- Rationale: Reduces runtime drift and strengthens supply-chain traceability.
- Dependencies: None
- Owner: Senior Developer + DevOps Engineer
- Evidence source: `Dockerfile`, `package-lock.json`
- SMART success criteria:
  - 100% release builds use lockfile-strict install.
  - Dependency drift incidents attributable to container build policy: 0.

### REC-705 – Implement startup preflight and collision-safe runtime policy

- Addresses: `RISK-702`
- Priority: P1
- Action:
  - Add startup preflight check and configurable fallback strategy controlled by
    env var (e.g., `PORT_FALLBACK_ENABLED`).
  - Add integration test that simulates occupied default port and validates
    expected behavior.
  - Document startup policy for local/dev and staging/prod separately.
- Rationale: Prevents avoidable boot failures and clarifies expected behavior.
- Dependencies: Policy decision on fixed vs fallback ports
  (`QUESTIONNAIRE_REQUEST: DO-Q-702`)
- Owner: Senior Developer + DevOps Engineer
- Evidence source: runtime terminal output; `src/webapp/server.js`;
  `src/webapp/start.ps1`
- SMART success criteria:
  - Port-collision startup scenario covered by automated test in CI.
  - Startup-related incidents from port collision reduced by at least 80% over
    next two sprints.

### REC-706 – Add operational alerting and incident routing

- Addresses: `GAP-705`, `RISK-704`
- Priority: P1
- Action:
  - Define alert thresholds for health failures, startup errors, elevated error
    rate, and failed smoke checks.
  - Integrate alert channel (email/Teams/webhook) and runbook links.
  - Add weekly alert quality review to reduce false positives.
- Rationale: Improves MTTD and incident response effectiveness.
- Dependencies: Incident owner/escalation roster
  (`QUESTIONNAIRE_REQUEST: DO-Q-703`)
- Owner: DevOps Engineer + Security Architect
- Evidence source: observability and workflow baseline scans
- SMART success criteria:
  - Alert routing configured for all P1/P2 incidents by Sprint 11.
  - Median detection time for staged failures under 5 minutes.

### REC-707 – Introduce DR restore drills with RTO/RPO reporting

- Addresses: `GAP-706`, `RISK-705`
- Priority: P1
- Action:
  - Create scheduled workflow (at least monthly) to execute backup restore drill
    in isolated environment.
  - Capture measured RTO and RPO metrics as workflow artifact.
  - Fail workflow if drill exceeds agreed targets.
- Rationale: Converts theoretical backup confidence into validated
  recoverability.
- Dependencies: RTO/RPO targets (`QUESTIONNAIRE_REQUEST: DO-Q-704`)
- Owner: DevOps Engineer + Data Architect
- Evidence source: `src/webapp/store.js` + absence of restore-drill
  automation
- SMART success criteria:
  - Monthly restore drill success rate >= 95%.
  - RTO/RPO measurement report generated for every scheduled drill.

## Priority Matrix

| Recommendation | Priority | Primary Type             | Blocks                      |
| -------------- | -------- | ------------------------ | --------------------------- |
| REC-701        | P1       | CI/CD reliability        | release governance quality  |
| REC-702        | P1       | release governance       | production promotion safety |
| REC-703        | P1       | IaC strategy             | cloud-ready scaling         |
| REC-704        | P1       | supply-chain reliability | deterministic deployments   |
| REC-705        | P1       | runtime reliability      | startup stability           |
| REC-706        | P1       | observability/operations | incident response           |
| REC-707        | P1       | disaster recovery        | recoverability confidence   |

## Dependency and Sequence Notes

1. REC-701 and REC-702 should be implemented first to establish promotion
   control.
2. REC-704 can proceed in parallel with REC-701.
3. REC-705 depends on startup policy decision from questionnaire.
4. REC-706 and REC-707 depend on incident ownership and DR targets.
5. REC-703 can start with skeleton structure immediately, even if final target
   environment is pending.

## UNCERTAIN and INSUFFICIENT_DATA Carry Forward

- `UNCERTAIN: release frequency baseline` remains open for KPI benchmarking.
- `INSUFFICIENT_DATA: IND-701` (security thresholds) blocks complete gate
  hardening.
- `INSUFFICIENT_DATA: IND-702` (on-call model) blocks final alert routing
  ownership.
- `INSUFFICIENT_DATA: IND-703` (RTO/RPO baseline) blocks definitive DR SLOs.

## HANDOFF CHECKLIST

- [x] Every Critical/High GAP item has at least one recommendation
- [x] Every Critical/High RISK item has at least one recommendation
- [x] Recommendations are specific and testable
- [x] Priorities and owners are assigned
- [x] Dependencies and sequencing are documented
- [x] UNCERTAIN/INSUFFICIENT_DATA items are preserved and escalated
- [x] Output is machine-readable and ready for sprint planning
- [x] No contradictory statements detected
- [x] Guardrail compliance checked
