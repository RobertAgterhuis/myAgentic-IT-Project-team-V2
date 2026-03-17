# Definition of Done — System Level

> Canonical reference for system-level completion criteria. Referenced by the
> Synthesis Agent and Orchestrator for final sign-off.

---

## Design & Strategy Phases (1–4)

The system is complete when:

1. All four design/strategy phases have been completed
2. All Critic + Risk validations have passed
3. The Synthesis Agent has produced the following documents in
   `BusinessDocs/synthesis/`:
   - `final-report-master.md` (Executive Summary, Solution Blueprint Heatmap,
     Risk Matrix, Roadmap, Guardrails, KPIs, Open Items)
   - `final-report-business.md`, `final-report-tech.md`, `final-report-ux.md`,
     `final-report-marketing.md` (per discipline, each with blocker section)
   - `cross-team-blocker-matrix.md` (all cross-team dependencies classified as
     BLOCKING or ADVISORY)
4. Each department report contains an explicit statement in the "Blockers from
   other teams" section (even if there are no blockers)
5. `BusinessDocs/brand/design-tokens.json` is present (or `SKIPPED_NO_TOKEN`
   documented) AND `BusinessDocs/brand/brand-guidelines.md` is present with
   sections 1–6 (also when `SKIPPED_NO_TOKEN`)
6. `BusinessDocs/storybook/component-inventory.md` is present with guardrail for
   Implementation Agent
7. No open `UNCERTAIN:` or `INSUFFICIENT_DATA:` items without resolution —
   unresolvable items have a corresponding question in
   `BusinessDocs/[PHASE]/Questionnaires/`
8. `BusinessDocs/questionnaire-index.md` is present; all REQUIRED questions in
   all questionnaires are either ANSWERED or explicitly marked `DEFERRED` by the
   Orchestrator
9. `BusinessDocs/OfficialDocuments/document-registry.md` is present; all 8
   official documents exist (completeness may be < 100% when questionnaires are
   still open)

## Implementation Phase (5) — Per Sprint

10. All stories in the sprint are IMPLEMENTED or BLOCKED (with escalation)
11. Sprint Completion Report APPROVED by Critic + Risk Agent
12. Secret scan PASSED
13. KPI report written (`sprint-[SP-N]-kpi.json`)
14. PR merged into main branch
15. `user-manual.md` and `technical-manual.md` updated
16. GitHub board updated (all implemented issues closed)
17. Retrospective COMPLETE (`sprint-[SP-N]-retrospective.md`)
18. `BusinessDocs/retrospectives/velocity-log.json` updated
19. `lessons-learned.md` updated
