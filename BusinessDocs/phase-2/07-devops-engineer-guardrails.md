# Guardrails – DevOps Engineer – 2026-03-10

## Metadata

- Agent: DevOps Engineer (07)
- Phase: 2
- Mode: CREATE
- Source inputs: `07-devops-engineer-analysis.md`,
  `07-devops-engineer-recommendations.md`

## Guardrail Principles

1. Release confidence requires both static checks and runtime smoke validation.
2. Runtime artifacts must be reproducible and traceable.
3. Operational issues must be detectable within a defined response window.
4. Recovery capability must be proven by drill, not assumed by backup existence.

## Guardrails

### GR-DO-701 – No release without smoke-gated staging validation

- Rule: A release publish action is prohibited unless staging deploy and smoke
  checks pass in automation.
- Verification method: CI/release workflow policy check on each release
  candidate.
- Violation severity: Critical
- Violation action: Block release and require remediation PR.
- Tooling enforcement: GitHub Actions required status checks.

### GR-DO-702 – Promotion path must be documented and approved

- Rule: Every production promotion must include approver, rollback plan, and
  immutable artifact digest.
- Verification method: Release checklist artifact attached to workflow run.
- Violation severity: High
- Violation action: Freeze promotion and escalate to Product + DevOps owner.
- Tooling enforcement: Workflow step validating checklist artifact presence.

### GR-DO-703 – Container builds must be lockfile-strict

- Rule: Production container dependency installation must use
  `npm ci --omit=dev`; non-strict installs are disallowed.
- Verification method: Dockerfile lint/check in CI.
- Violation severity: High
- Violation action: Fail PR checks.
- Tooling enforcement: CI script that scans Dockerfile commands.

### GR-DO-704 – Startup reliability behavior must be test-covered

- Rule: Startup behavior for occupied default port must match approved policy
  and be covered by automated test.
- Verification method: Integration test in CI validating collision scenario.
- Violation severity: High
- Violation action: Block merge until test and policy alignment pass.
- Tooling enforcement: Required CI test suite.

### GR-DO-705 – Alerting coverage for core runtime failures is mandatory

- Rule: Alerts must exist for failed health checks, startup failures, elevated
  error rate, and failed smoke gates.
- Verification method: Alert rule inventory review and weekly evidence log.
- Violation severity: High
- Violation action: Incident readiness exception and remediation within one
  sprint.
- Tooling enforcement: Observability configuration review checklist.

### GR-DO-706 – DR restore drills must run on schedule

- Rule: At least one automated restore drill must run monthly with RTO/RPO
  capture.
- Verification method: Scheduled workflow artifacts and monthly report.
- Violation severity: High
- Violation action: Raise risk exception and create mandatory corrective story.
- Tooling enforcement: Cron-triggered workflow with report generation.

### GR-DO-707 – IaC-first policy for new managed infrastructure

- Rule: Any new managed infrastructure must be created via IaC in reviewed pull
  requests.
- Verification method: PR template validation and infra path ownership checks.
- Violation severity: Medium
- Violation action: Reject manual infrastructure change and require IaC parity
  PR.
- Tooling enforcement: CODEOWNERS + PR checklist.

## Guardrail Overlap and Reconciliation

- Overlap with architecture and security guardrails is expected for release
  quality gates.
- Reconciliation rule:
  - If two guardrails conflict, stricter control applies until Critic/Risk
    resolution.
  - DevOps guardrails do not supersede security severity decisions; they consume
    Security Architect policy as input.
- Existing guardrails supplemented (not replaced):
  - `docs/phase-2/05-software-architect-guardrails.md`
  - `docs/phase-2/06-senior-developer-guardrails.md`

## Operational Verification Cadence

- Per PR: GR-DO-703, GR-DO-704, GR-DO-707
- Per release candidate: GR-DO-701, GR-DO-702
- Weekly ops review: GR-DO-705
- Monthly resilience review: GR-DO-706

## Exceptions Process

- Temporary exception allowed only with:
  - documented rationale,
  - explicit expiry date,
  - assigned remediation story,
  - approval from DevOps owner plus relevant domain owner.
- Maximum exception duration: one sprint, unless escalated through Orchestrator.

## HANDOFF CHECKLIST

- [x] Guardrails are specific and testable
- [x] Verification methods are defined
- [x] Violation severity and action are defined
- [x] Overlap handling is documented
- [x] Cadence and exception process are explicit
- [x] No contradictions with analysis/recommendations
- [x] Output is ready for next-agent consumption
