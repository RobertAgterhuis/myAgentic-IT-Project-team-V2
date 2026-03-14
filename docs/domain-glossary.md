---
title: Domain Glossary
nav_order: 11
description: Protocol markers, output types, orchestration states, and domain terms used across the platform.
---

# Domain Glossary

Canonical terminology for workflow states, protocol markers, and orchestration
signals used across skills, guardrails, and contracts.

## Core Protocol Markers

| Term                    | Canonical Meaning                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `UNCERTAIN:`            | A claim that cannot be verified from available evidence and must not be treated as a fact.                       |
| `INSUFFICIENT_DATA:`    | Required information is missing; analysis must continue with explicit escalation.                                |
| `QUESTIONNAIRE_REQUEST` | A structured follow-up request for the Questionnaire Agent to convert missing data into client-facing questions. |
| `OUT_OF_SCOPE:`         | A finding belongs to another discipline and must be handed to Orchestrator.                                      |

## Agent Output Types

| Term              | Canonical Meaning                                                       |
| ----------------- | ----------------------------------------------------------------------- |
| `Analysis`        | Evidence-based findings, gaps, risks, and KPI baseline.                 |
| `Recommendations` | Prioritized, actionable changes tied to findings.                       |
| `Sprint Plan`     | Story-level implementation plan with estimates and acceptance criteria. |
| `Guardrails`      | Enforceable rules and failure responses.                                |

## Orchestration States

| Term                    | Canonical Meaning                                                |
| ----------------------- | ---------------------------------------------------------------- |
| `ONBOARDING`            | Intake and workspace/tooling scan stage.                         |
| `PHASE-1` ... `PHASE-4` | Sequential design/strategy phases by discipline.                 |
| `SYNTHESIS`             | Consolidation phase that produces master and department reports. |
| `PHASE-5`               | Implementation sprints with test/review/KPI loops.               |
| `IN_PROGRESS`           | Work is active for a phase, sprint, or story.                    |
| `DEFERRED`              | Item intentionally postponed; requires explicit resume trigger.  |
| `BLOCKED`               | Work cannot proceed due to unresolved dependency.                |
| `DONE`                  | Completion criteria satisfied and artifacts delivered.           |

## Decision Lifecycle Terms

| Term                     | Canonical Meaning                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `OPEN`                   | Decision exists but has no final answer.                                                |
| `DECIDED`                | Final decision is active and enforceable.                                               |
| `DEFERRED`               | Decision postponed until trigger condition is met.                                      |
| `EXPIRED`                | Decision is no longer actionable due to passed deadline/context.                        |
| `DEFERRED_TECH_REQUIRED` | Implementation attempted to introduce deferred technology and must halt for activation. |

## Sprint Controls

| Term                  | Canonical Meaning                                                           |
| --------------------- | --------------------------------------------------------------------------- |
| `Sprint Gate`         | Readiness checkpoint before implementation begins.                          |
| `Definition of Ready` | Minimum quality bar a story must meet before coding starts.                 |
| `BACKLOG`             | Prioritized work not selected for the active sprint.                        |
| `HOTFIX`              | Emergency flow with abbreviated gating and mandatory retrospective updates. |

## Notes

- This glossary is the source of truth for shared workflow terminology.
- When introducing new protocol markers or statuses, add them here and in
  related contracts/guardrails.
