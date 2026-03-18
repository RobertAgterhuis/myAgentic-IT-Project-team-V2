# DevOps And CI/CD Remediation

## Current Assessment

This is one of the stronger dimensions in the repository. The breadth of CI is real. The main problem is hardening consistency, not absence of pipelines.

## Validated Findings

- `.github/workflows/ci.yml` covers lint, format, typecheck, coverage, translations, integration, smoke, multiple security scans, Docker build and scan, and accessibility.
- `.github/workflows/ci.yml` uses Node 22.
- `.github/workflows/storybook.yml` uses Node 20.
- `.github/workflows/ci.yml` pins several actions by SHA, but still uses `aquasecurity/trivy-action@master`.
- `.github/workflows/storybook.yml` uses floating `@v4` tags.
- `vitest.config.mjs` excludes `src/webapp/ui/**` from root coverage, which makes the coverage story less complete at the platform level.
- `src/webapp/ui/src/App.test.tsx` is minimal and only validates shell render at the app level.

## My Opinion

The repository already behaves like a serious engineering effort in CI. The missing step is to make the CI posture match the strength of the product claims. Right now the pipelines are strong enough for active development, but not yet uniform enough for a production-grade supply-chain story.

## Target State

The repository should have:

- one coherent toolchain version policy
- no floating GitHub Actions
- explicit and traceable quality coverage across root and UI packages
- stronger workflow-level confidence in actual user journeys

## How I Would Fix It

### Fix 1: Standardize the Node version contract

Choose one supported active runtime and one planned upgrade path. Then align:

- root development docs
- CI
- Storybook CI
- any release workflows

### Fix 2: Pin all remaining GitHub Actions

The repository already started doing this in the main CI workflow. Finish the job across all workflows.

### Fix 3: Improve coverage traceability

Make it obvious how coverage is measured across:

- root backend and platform code
- UI package tests
- E2E coverage confidence

Do not rely on a strong-looking root coverage number if important UI behavior sits outside that aggregate.

### Fix 4: Raise behavior-level test confidence

The repository already has structure for UI tests, Storybook, and Playwright. Use that to add more workflow-level assertions around:

- CREATE flow
- AUDIT flow
- questionnaire save and reevaluate
- decisions workflow
- route protection behavior

## Milestone Candidate

Milestone: CI/CD Consistency and Delivery Confidence

## Epic Candidates

### Epic: Toolchain and workflow standardization

Suggested issues:

- Align Node version across development and CI
- Pin remaining GitHub Actions by SHA
- review workflow permissions and cache policy

### Epic: Quality and coverage reporting convergence

Suggested issues:

- document how root and UI coverage are reported
- add UI coverage visibility to release readiness
- reduce misleading exclusions where practical

### Epic: Workflow-level automation confidence

Suggested issues:

- add CREATE and AUDIT E2E scenarios
- add security behavior regression tests
- add route-level smoke tests for production profile assumptions

## Acceptance Criteria

- Toolchain versions are aligned and documented.
- All GitHub Actions are pinned.
- Coverage reporting is honest across backend and UI layers.
- CI proves more real workflow behavior, not only unit structure.
