---
title: Agent Index
parent: Reference
nav_order: 5
permalink: /agent-index/
description: Lookup table for all agent skill files, guardrail scopes, and contract paths.
---

# Agent, Guardrails & Contracts Index

> This file is referenced from the generated platform instructions and contains
> the full lookup tables. Agents: read this file when you need to find a skill
> file, guardrail, or contract path.

---

## SKILLS REFERENCE

Each agent has a dedicated skill file:

| #   | Agent                            | Skill file                                                     |
| --- | -------------------------------- | -------------------------------------------------------------- |
| 00  | Orchestrator                     | `templates/sdlc/agents/00-orchestrator.md`                     |
| 01  | Business Analyst                 | `templates/sdlc/agents/01-business-analyst.md`                 |
| 02  | Domain Expert                    | `templates/sdlc/agents/02-domain-expert.md`                    |
| 03  | Sales Strategist                 | `templates/sdlc/agents/03-sales-strategist.md`                 |
| 04  | Financial Analyst                | `templates/sdlc/agents/04-financial-analyst.md`                |
| 05  | Software Architect               | `templates/sdlc/agents/05-software-architect.md`               |
| 06  | Senior Developer                 | `templates/sdlc/agents/06-senior-developer.md`                 |
| 07  | DevOps Engineer                  | `templates/sdlc/agents/07-devops-engineer.md`                  |
| 08  | Security Architect               | `templates/sdlc/agents/08-security-architect.md`               |
| 09  | Data Architect                   | `templates/sdlc/agents/09-data-architect.md`                   |
| 10  | UX Researcher                    | `templates/sdlc/agents/10-ux-researcher.md`                    |
| 11  | UX Designer                      | `templates/sdlc/agents/11-ux-designer.md`                      |
| 12  | UI Designer                      | `templates/sdlc/agents/12-ui-designer.md`                      |
| 13  | Accessibility Specialist         | `templates/sdlc/agents/13-accessibility-specialist.md`         |
| 14  | Brand Strategist                 | `templates/sdlc/agents/14-brand-strategist.md`                 |
| 15  | Growth Marketer                  | `templates/sdlc/agents/15-growth-marketer.md`                  |
| 16  | CRO Specialist                   | `templates/sdlc/agents/16-cro-specialist.md`                   |
| 17  | Synthesis Agent                  | `templates/sdlc/agents/17-synthesis-agent.md`                  |
| 18  | Critic Agent                     | `templates/sdlc/agents/18-critic-agent.md`                     |
| 19  | Risk Agent                       | `templates/sdlc/agents/19-risk-agent.md`                       |
| 20  | Implementation Agent             | `templates/sdlc/agents/20-implementation-agent.md`             |
| 21  | Test Agent                       | `templates/sdlc/agents/21-test-agent.md`                       |
| 22  | PR/Review Agent                  | `templates/sdlc/agents/22-pr-review-agent.md`                  |
| 23  | Reevaluate Agent                 | `templates/sdlc/agents/23-reevaluate-agent.md`                 |
| 24  | Feature Agent                    | `templates/sdlc/agents/24-feature-agent.md`                    |
| 25  | Onboarding Agent                 | `templates/sdlc/agents/25-onboarding-agent.md`                 |
| 26  | Documentation Agent              | `templates/sdlc/agents/26-documentation-agent.md`              |
| 27  | GitHub Integration Agent         | `templates/sdlc/agents/27-github-integration-agent.md`         |
| 28  | Sprint Retrospective Agent       | `templates/sdlc/agents/28-retrospective-agent.md`              |
| 29  | KPI/Metrics Agent                | `templates/sdlc/agents/29-kpi-agent.md`                        |
| 30  | Brand & Assets Agent (Canva)     | `templates/sdlc/agents/30-brand-assets-agent.md`               |
| 31  | Storybook Agent                  | `templates/sdlc/agents/31-storybook-agent.md`                  |
| 32  | Content Strategist / UX Writer   | `templates/sdlc/agents/32-content-strategist.md`               |
| 33  | Legal / Privacy Counsel          | `templates/sdlc/agents/33-legal-counsel.md`                    |
| 34  | Product Manager                  | `templates/sdlc/agents/34-product-manager.md`                  |
| 35  | Localization Specialist          | `templates/sdlc/agents/35-localization-specialist.md`          |
| 36  | Questionnaire Agent              | `templates/sdlc/agents/36-questionnaire-agent.md`              |
| 37  | Scope Change Agent               | `templates/sdlc/agents/37-scope-change-agent.md`               |
| 38  | Architecture Compliance Reviewer | `templates/sdlc/agents/38-architecture-compliance-reviewer.md` |

---

## GUARDRAILS REFERENCE

| Scope                         | Guardrail file                                              |
| ----------------------------- | ----------------------------------------------------------- |
| Global                        | `templates/sdlc/guardrails/00-global-guardrails.md`         |
| Business                      | `templates/sdlc/guardrails/01-business-guardrails.md`       |
| Architecture                  | `templates/sdlc/guardrails/02-architecture-guardrails.md`   |
| Security                      | `templates/sdlc/guardrails/03-security-guardrails.md`       |
| UX                            | `templates/sdlc/guardrails/04-ux-guardrails.md`             |
| Marketing                     | `templates/sdlc/guardrails/05-marketing-guardrails.md`      |
| Implementation                | `templates/sdlc/guardrails/06-implementation-guardrails.md` |
| Legal & Privacy               | `templates/sdlc/guardrails/07-legal-guardrails.md`          |
| Content & Localization        | `templates/sdlc/guardrails/08-content-guardrails.md`        |
| Questionnaire & Official Docs | `templates/sdlc/guardrails/09-questionnaire-guardrails.md`  |
| Truth-Source Policy           | `templates/sdlc/guardrails/truth-source-policy.md`          |

---

## CONTRACTS REFERENCE

| Contract                  | File                                                                  |
| ------------------------- | --------------------------------------------------------------------- |
| Analysis output           | `templates/sdlc/contracts/analysis-output-contract.md`                |
| Recommendations output    | `templates/sdlc/contracts/recommendations-output-contract.md`         |
| Sprint plan output        | `templates/sdlc/contracts/sprintplan-output-contract.md`              |
| Guardrails output         | `templates/sdlc/contracts/guardrails-output-contract.md`              |
| Agent Handoff             | `templates/sdlc/contracts/agent-handoff-contract.md`                  |
| Implementation output     | `templates/sdlc/contracts/implementation-output-contract.md`          |
| Questionnaire output      | `templates/sdlc/contracts/questionnaire-output-contract.md`           |
| Feature output            | `templates/sdlc/contracts/feature-output-contract.md`                 |
| Tooling                   | `templates/sdlc/contracts/tooling-contract.md`                        |
| Session State             | `templates/sdlc/contracts/session-state-contract.md`                  |
| Human Escalation          | `templates/sdlc/contracts/human-escalation-protocol.md`               |
| Critic output             | `templates/sdlc/contracts/critic-output-contract.md`                  |
| Risk output               | `templates/sdlc/contracts/risk-output-contract.md`                    |
| Synthesis output          | `templates/sdlc/contracts/synthesis-output-contract.md`               |
| Test output               | `templates/sdlc/contracts/test-output-contract.md`                    |
| PR / Review output        | `templates/sdlc/contracts/pr-review-output-contract.md`               |
| KPI output                | `templates/sdlc/contracts/kpi-output-contract.md`                     |
| Documentation output      | `templates/sdlc/contracts/documentation-output-contract.md`           |
| GitHub Integration output | `templates/sdlc/contracts/github-integration-output-contract.md`      |
| Retrospective output      | `templates/sdlc/contracts/retrospective-output-contract.md`           |
| Reevaluate output         | `templates/sdlc/contracts/reevaluate-output-contract.md`              |
| Onboarding output         | `templates/sdlc/contracts/onboarding-output-contract.md`              |
| Brand Assets output       | `templates/sdlc/contracts/brand-assets-output-contract.md`            |
| Storybook output          | `templates/sdlc/contracts/storybook-output-contract.md`               |
| Scope Change output       | `templates/sdlc/contracts/scope-change-output-contract.md`            |
| Architecture Compliance   | `templates/sdlc/contracts/architecture-compliance-output-contract.md` |
| Decisions output          | `templates/sdlc/contracts/decisions-output-contract.md`               |
| GitHub State Snapshot     | `templates/sdlc/contracts/github-state-snapshot-output-contract.md`   |

---

## AGENT DEPENDENCY CHAIN

Key input/output dependencies between agents (read top-to-bottom):

| Producer Agent             | Output                                     | Consumer Agent(s)                                                |
| -------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| Onboarding (25)            | `onboarding-output.md`                     | Orchestrator (00) → all Phase 1 agents                           |
| Phase 1 Agents (01–04, 34) | Analysis + Recommendations + Sprint Plan   | Phase 2 Agents (05–09, 33)                                       |
| Product Manager (34)       | PRD (features, NFRs, constraints)          | Software Architect (05), UX Researcher (10), Implementation (20) |
| Phase 2 Agents (05–09, 33) | Architecture + Security decisions          | Phase 3 Agents (10–13, 32, 35)                                   |
| Phase 3 Agents             | UX/UI design + Content + a11y baseline     | Phase 4 Agents (14–16, 30, 31)                                   |
| Phase 4 Agents             | Brand + Growth + Design tokens             | Synthesis (17)                                                   |
| Critic (18) + Risk (19)    | Validation verdict per phase               | Orchestrator (00) → next phase or rework                         |
| Synthesis (17)             | Master Report + Department Reports         | GitHub Integration (27) → Sprint Gate                            |
| Questionnaire (36)         | Questionnaires + Official Documents        | All phase agents (via Orchestrator injection)                    |
| Orchestrator (00)          | Sprint Gate activation + lessons injection | Implementation (20)                                              |
| Implementation (20)        | Code per story                             | Test (21) → Compliance Reviewer (38) → PR/Review (22)            |
| Retrospective (28)         | `velocity-log.json` + `lessons-learned.md` | Orchestrator (00) → next sprint context                          |
| KPI (29)                   | `sprint-kpi.json`                          | Orchestrator (00) → trend analysis                               |
