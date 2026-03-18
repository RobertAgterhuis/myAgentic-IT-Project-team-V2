# Product Completeness Remediation

## Current Assessment

The repository is a substantial MVP. It has real breadth across backend, UI, orchestration, docs, tests, Storybook, and CI. The blocker to calling it a complete platform is not missing pages or missing modules. It is the gap between breadth and operable reliability.

## Validated Findings

- `src/webapp/ui/src/App.tsx` exposes a broad routed application across runtime, operations, data, observability, and cockpit areas.
- `src/webapp/ui/package.json` confirms dedicated build, test, lint, and Storybook workflows for the UI package.
- `src/webapp/server.ts` explicitly allows startup without a storage provider after initialization failure.
- `src/webapp/README.md` and `docs/reference/technical-manual.md` still do not tell one fully coherent operational story.
- `src/webapp/app.ts` still allows a degraded non-local security posture when auth is absent.

## My Opinion

The repository should be described today as a serious platform MVP with real operational intent. It should not be described as production-ready until runtime, security, and documentation are aligned. The current product surface is already wide enough. More surface area is not the priority. Hardening and consolidation are the priority.

## Target State

To deserve a stronger platform label, the repository needs:

- a single supported operating model
- startup rules that reject unsafe or incomplete production configurations
- documentation that a new maintainer can trust without reverse-engineering the code
- real end-to-end operational confidence for the most important user workflows

## How I Would Fix It

### Fix 1: Stop starting in invalid production states

Do not continue startup in production profiles when critical dependencies are missing or initialization fails.

### Fix 2: Publish one reference operating model

Document:

- supported deployment shapes
- storage and queue expectations
- auth and proxy expectations
- backup and recovery assumptions
- observability and maintenance expectations

### Fix 3: Align product claims with reality

Use language such as:

- current: platform MVP
- target after hardening: production-ready profile

Do not over-claim before the runtime contract and security boundary are fixed.

### Fix 4: Prioritize depth over breadth

Do not add major new feature surfaces until:

- non-local auth is fail-closed
- runtime profile is canonical
- docs are aligned
- highest-risk workflow tests exist

## Milestone Candidate

Milestone: Production Readiness and Operability

## Epic Candidates

### Epic: Fail-closed production startup

Suggested issues:

- reject startup on missing production dependencies
- reject insecure production auth posture
- enforce validated runtime profiles

### Epic: Operability documentation

Suggested issues:

- publish production reference architecture
- publish operational runbook
- rewrite outdated runtime and persistence docs

### Epic: Product readiness evidence

Suggested issues:

- define production-readiness checklist
- map critical workflows to automated verification
- align release language and release gates with actual readiness

## Acceptance Criteria

- The platform has one trustworthy production operating model.
- Startup rejects invalid production states.
- Documentation is sufficient for a maintainer other than the author.
- Release positioning matches actual hardening state.
