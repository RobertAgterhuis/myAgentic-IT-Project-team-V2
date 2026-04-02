# Cross-Domain Go-Live Checklist

Issue: I-041

This checklist is the release contract for M7 readiness. The automation gate evaluates the same controls from `BusinessDocs/release/go-live-checklist.json` and fails release promotion when any critical control fails.

## Domains Covered

- reliability
- quality
- operations
- cost
- governance
- security

## How To Run

```bash
npm run test:autonomy-benchmark
npm run test:autonomous-trust-dashboard
npm run test:release-readiness-gate
```

## Release Blocking Policy

- Any failing control with `critical: true` blocks release.
- Non-critical control failures are surfaced in the report and should be triaged before production rollout.
- Gate output is written to `BusinessDocs/metrics/release-readiness-report.json`.
