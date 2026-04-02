# Executive Release Dashboard (M7)

Issue: I-042
Milestone: M7 Release Readiness & Operational Insights

The executive dashboard is available through:

- API: `GET /api/v1/cockpit/executive-dashboard`
- Artifact: `BusinessDocs/metrics/executive-release-dashboard.json`

## KPI Domains

- reliability: autonomy benchmark p95 latency, benchmark max error rate, autonomous trust success rate
- security: synthesis evidence availability, game-day block status
- quality: line coverage, branch coverage, release gate status
- cost: total FinOps cost and token usage from ledger

## Traceability Model

Each dashboard payload includes traceability rows for M7 items:

- I-041: checklist + release gate report
- I-042: this dashboard spec + generated artifact
- I-043: game-day report artifact

Source evidence chain follows the gap synthesis set listed in M7 issue definitions.
