# Questionnaire Answers — COMBO AUDIT (TECH + UX)

> Source: Product Owner Proxy | Date: 2026-03-14
> Cycle: COMBO_AUDIT | Scope: TECH + UX

---

## Technology Questions

| Q-ID      | Question                             | Answer                                                                    | Status   |
| --------- | ------------------------------------ | ------------------------------------------------------------------------- | -------- |
| Q-TECH-01 | Purpose/trigger of `ci-pipeline.yml` | CI checks on PR to main on GitHub                                         | ANSWERED |
| Q-TECH-02 | Purpose/trigger of `release.yml`     | Create a release on GitHub                                                | ANSWERED |
| Q-TECH-03 | Target deployment model              | Local only — Docker container or Node.js webapp on localhost              | ANSWERED |
| Q-TECH-04 | Node.js version policy               | Latest LTS                                                                | ANSWERED |
| Q-TECH-05 | Localhost-only vs network exposure   | Localhost only for now; network/internet exposure is an epic out of scope | ANSWERED |

## UX Questions

| Q-ID    | Question                       | Answer                                                                               | Status   |
| ------- | ------------------------------ | ------------------------------------------------------------------------------------ | -------- |
| Q-UX-01 | Target locale coverage for MVP | English only (en-US)                                                                 | ANSWERED |
| Q-UX-02 | Dark mode priority             | Required for GA                                                                      | ANSWERED |
| Q-UX-03 | User personas                  | All personas involved in an SDLC process (developer, team lead, PM, architect, etc.) | ANSWERED |
| Q-UX-04 | Timestamp format standard      | ISO 8601                                                                             | ANSWERED |
| Q-UX-05 | WCAG compliance target         | AA (industry standard)                                                               | ANSWERED |

---

## Impact Assessment

### Findings Affected by Answers

| Answer                                 | Impact on Audit                                                                                                                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-TECH-03 + Q-TECH-05 (localhost only) | **TECH-C01 severity reduced** from CRITICAL to HIGH — no auth is defense-in-depth concern, not an exposure risk. Network auth is a future epic.                                   |
| Q-TECH-04 (latest LTS)                 | **TECH-I03 confirmed** — Dockerfile Node 20 must be updated to Node 22 (current LTS).                                                                                             |
| Q-UX-01 (en-US only)                   | **UX-C01 severity reduced** from CRITICAL to LOW — i18n integration is not needed for MVP. Locale files for fr-FR/de-DE are premature. REC-U01 (8 SP) can be deferred to post-GA. |
| Q-UX-02 (dark mode required)           | **UX-I05 elevated** from MEDIUM to HIGH — dark mode must ship with GA. REC-U10 moves to Sprint 2.                                                                                 |
| Q-UX-03 (all SDLC personas)            | **CON-02 confirmed** — command guidance and onboarding are important for non-developer personas (PM, architect).                                                                  |
| Q-UX-04 (ISO 8601)                     | **Timestamp format resolved** — all UI timestamps should use ISO 8601 format.                                                                                                     |
| Q-UX-05 (AA)                           | **Confirms current approach** — WCAG AA is the target. No need for AAA contrast ratios.                                                                                           |

### Sprint Plan Adjustments

1. **REC-U01 (i18n, 8 SP) → DEFERRED** to post-GA. Only en-US needed.
2. **REC-U10 (dark mode, 5 SP) → ELEVATED** to Sprint 2 (was Sprint 3).
3. **TECH-C01 (auth, 5 SP) → remains Sprint 1** as defense-in-depth but severity context updated.
4. **Sprint 1 freed 8 SP** from i18n deferral — reallocate to dark mode prep or test coverage.
