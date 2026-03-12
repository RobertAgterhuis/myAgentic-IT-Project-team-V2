# Sprint 2 — Team Briefing

**Sprint:** Sprint 2 (March 25 – April 7, 2026)  
**Milestone:** #24  
**Capacity:** 11 items across 5 tracks  
**Sprint Gate:** APPROVED (10/11 READY, 1 CONDITIONAL self-resolving)  
**Predecessor:** Sprint 1 (87% velocity, 13/15 items, all DoD met)

---

## Sprint 2 Objectives

1. **CI Pipeline Completion** — Verify CI Jobs 1-7 on `main`, implement Job 8
   (accessibility gate)
2. **Analytics Infrastructure** — Deploy Matomo (privacy-first analytics)
3. **Business Validation** — Internal pilot + feedback rubric
4. **Marketing Launch** — Landing page, email (Buttondown), social content
   publication
5. **Localization Foundation** — TMS vendor selection + setup
6. **Documentation** — Technical manual updated to v1.7

## Lessons-Learned Injection (from Sprint 1)

| Lesson                            | Application                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| L1: Pre-Sprint Blocker Resolution | All blockers identified and resolved during Sprint 1 Day 11-12. Zero unresolved at Sprint 2 start.      |
| L2: Track Independence            | Cross-track dependencies explicitly mapped. Only 1 cross-track: SP-2-MAT (Tech) → SP-2-201 (Marketing). |
| L3: Sequential Tech Build         | CI Job 7 verify → Job 8 implement. Strictly sequential.                                                 |
| L5: Prerequisite Validation       | All prerequisites validated within sprint window. Matomo by April 7, TMS eval by April 1.               |
| L6: Two-Checkpoint Cadence        | Day 4 (March 28): 25-35%. Day 9 (April 4): 70-80%.                                                      |

## Track Assignments

### Tech Track (3 items)

| #   | ID       | Issue | Title                           | Days | Dependencies |
| --- | -------- | ----- | ------------------------------- | ---- | ------------ |
| 1   | SP-2-CI7 | #123  | CI Job 7 verification on `main` | 1    | None         |
| 2   | SP-2-CI8 | #124  | CI Job 8 accessibility gate     | 2-3  | SP-2-CI7     |
| 3   | SP-2-MAT | #125  | Matomo analytics deployment     | 3-4  | None         |

### Business Track (2 items)

| #   | ID         | Issue | Title                | Days | Dependencies |
| --- | ---------- | ----- | -------------------- | ---- | ------------ |
| 4   | SP-2-201-P | #107  | Internal pilot setup | 1-3  | None         |
| 5   | SP-2-202   | #110  | Pilot rubric         | 3-4  | SP-2-201-P   |

### UX Track (1 item)

| #   | ID       | Issue | Title                     | Days | Dependencies |
| --- | -------- | ----- | ------------------------- | ---- | ------------ |
| 6   | SP-2-501 | #117  | TMS setup and integration | 1-4+ | SP-1-501 ✅  |

### Marketing Track (4 items)

| #   | ID       | Issue | Title                            | Days        | Dependencies |
| --- | -------- | ----- | -------------------------------- | ----------- | ------------ |
| 7   | SP-2-201 | #115  | Landing experiment deployment    | Pending MAT | SP-2-MAT     |
| 8   | SP-2-BTN | #126  | Buttondown ESP + email templates | 1-2         | SP-12-704 ✅ |
| 9   | SP-2-SOC | #127  | Social content publication       | 1-3         | SP-12-703 ✅ |
| 10  | SP-2-LND | #128  | Landing page with GTM messaging  | 2-4         | SP-12-702 ✅ |

### Docs Track (1 item)

| #   | ID       | Issue | Title                          | Days | Dependencies |
| --- | -------- | ----- | ------------------------------ | ---- | ------------ |
| 11  | SP-2-DOC | #129  | Technical manual update (v1.7) | 1-2  | None         |

## Dependency Map

```
SP-2-CI7 (#123) ──→ SP-2-CI8 (#124)
SP-2-201-P (#107) ──→ SP-2-202 (#110)
SP-2-MAT (#125) ──→ SP-2-201 (#115)   [CROSS-TRACK: Tech → Marketing]
SP-2-501 (#117) — independent
SP-2-BTN (#126), SP-2-SOC (#127), SP-2-LND (#128) — independent
SP-2-DOC (#129) — independent
```

## Execution Model

```
Week 1 (March 25-28):
  Tech:       SP-2-CI7 (Day 1) → SP-2-CI8 (Days 2-3) → SP-2-MAT (Days 3-4)
  Business:   SP-2-201-P (Days 1-3) → SP-2-202 (Days 3-4)
  UX:         SP-2-501 (Days 1-4, vendor eval underway)
  Marketing:  SP-2-BTN (Days 1-2) | SP-2-SOC (Days 1-3) | SP-2-LND (Days 2-4)
  Docs:       SP-2-DOC (Day 1-2)
  → Checkpoint 1 (Day 4, March 28): Target 25-35% (3-4 items)

Week 2 (March 31 – April 4):
  Tech:       SP-2-MAT continued → Matomo live by Day 6
  Business:   SP-2-202 completion
  UX:         SP-2-501 vendor decision (April 1) → setup
  Marketing:  SP-2-201 (#115, pending Matomo) | remaining items close
  → Checkpoint 2 (Day 9, April 4): Target 70-80% (8-9 items)

Week 3 (April 7):
  Sprint close: SP-2-201 final verification (Matomo live)
```

## Standup Protocol

- **Time:** Daily 09:00 UTC
- **Format:** Yesterday → Today → Blockers → Metrics
- **Checkpoints:** Day 4 (March 28) + Day 9 (April 4)
- **Reports:** Daily summary →
  `.github/docs/phase-5/sprint-2-day-{N}-summary.md`
