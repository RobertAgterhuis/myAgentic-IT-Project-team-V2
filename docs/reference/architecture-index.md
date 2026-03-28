---
title: Architecture Index
parent: Reference
nav_order: 6
description: Auto-generated architecture mapping from canonical runtime schema.
---

# Architecture Index

> Auto-generated from canonical schema. Do not edit manually.
> Generated at: 2026-03-28T07:47:02.343Z

## Runtime Flow

```text
IDLE -> ONBOARDING -> PHASE_1 -> CRITIC_1 -> PHASE_2 -> CRITIC_2 -> PHASE_3 -> CRITIC_3 -> PHASE_4 -> CRITIC_4 -> SYNTHESIS -> SPRINT_GATE -> PHASE_5_EXECUTING -> COMPLETED
```

## Phase-Agent Mapping

### IDLE

- No agents mapped.

### ONBOARDING

| ID  | Agent            | Role                             | Dependencies |
| --- | ---------------- | -------------------------------- | ------------ |
| 25  | Onboarding Agent | Onboarding Agent specialist role | none         |

### PHASE_1

| ID  | Agent             | Role                              | Dependencies |
| --- | ----------------- | --------------------------------- | ------------ |
| 01  | Business Analyst  | Business Analyst specialist role  | 25           |
| 02  | Domain Expert     | Domain Expert specialist role     | 01           |
| 03  | Sales Strategist  | Sales Strategist specialist role  | 02           |
| 04  | Financial Analyst | Financial Analyst specialist role | 03           |
| 34  | Product Manager   | Product Manager specialist role   | 04           |

### CRITIC_1

- No agents mapped.

### PHASE_2

| ID  | Agent                   | Role                                    | Dependencies |
| --- | ----------------------- | --------------------------------------- | ------------ |
| 05  | Software Architect      | Software Architect specialist role      | 19           |
| 06  | Senior Developer        | Senior Developer specialist role        | 05           |
| 07  | DevOps Engineer         | DevOps Engineer specialist role         | 06           |
| 08  | Security Architect      | Security Architect specialist role      | 07           |
| 09  | Data Architect          | Data Architect specialist role          | 08           |
| 33  | Legal / Privacy Counsel | Legal / Privacy Counsel specialist role | 09           |

### CRITIC_2

- No agents mapped.

### PHASE_3

| ID  | Agent                          | Role                                           | Dependencies |
| --- | ------------------------------ | ---------------------------------------------- | ------------ |
| 10  | UX Researcher                  | UX Researcher specialist role                  | 19           |
| 11  | UX Designer                    | UX Designer specialist role                    | 10           |
| 12  | UI Designer                    | UI Designer specialist role                    | 11           |
| 13  | Accessibility Specialist       | Accessibility Specialist specialist role       | 12           |
| 32  | Content Strategist / UX Writer | Content Strategist / UX Writer specialist role | 13           |
| 35  | Localization Specialist        | Localization Specialist specialist role        | 32           |

### CRITIC_3

- No agents mapped.

### PHASE_4

| ID  | Agent                        | Role                                         | Dependencies |
| --- | ---------------------------- | -------------------------------------------- | ------------ |
| 14  | Brand Strategist             | Brand Strategist specialist role             | 19           |
| 15  | Growth Marketer              | Growth Marketer specialist role              | 14           |
| 16  | CRO Specialist               | CRO Specialist specialist role               | 15           |
| 30  | Brand & Assets Agent (Canva) | Brand & Assets Agent (Canva) specialist role | 19           |
| 31  | Storybook Agent              | Storybook Agent specialist role              | 30           |

### CRITIC_4

- No agents mapped.

### SYNTHESIS

| ID  | Agent           | Role                            | Dependencies |
| --- | --------------- | ------------------------------- | ------------ |
| 17  | Synthesis Agent | Synthesis Agent specialist role | 31           |

### SPRINT_GATE

| ID  | Agent        | Role                         | Dependencies |
| --- | ------------ | ---------------------------- | ------------ |
| 00  | Orchestrator | Orchestrator specialist role | none         |

### PHASE_5_EXECUTING

| ID  | Agent                            | Role                                                                          | Dependencies |
| --- | -------------------------------- | ----------------------------------------------------------------------------- | ------------ |
| 20  | Implementation Agent             | Implementation Agent specialist role                                          | 27           |
| 21  | Test Agent                       | Test Agent specialist role                                                    | 20           |
| 22  | PR/Review Agent                  | PR/Review Agent specialist role                                               | 21           |
| 26  | Documentation Agent              | Documentation Agent specialist role                                           | 29           |
| 27  | GitHub Integration Agent         | GitHub Integration Agent specialist role                                      | 17           |
| 28  | Sprint Retrospective Agent       | Sprint Retrospective Agent specialist role                                    | 27           |
| 29  | KPI/Metrics Agent                | KPI/Metrics Agent specialist role                                             | 22           |
| 38  | Architecture Compliance Reviewer | Validates implemented code against Phase 1-4 design decisions before PR merge | 21           |

### COMPLETED

- No agents mapped.

### ERROR

- No agents mapped.

### CRITIC_RISK

| ID  | Agent        | Role                         | Dependencies |
| --- | ------------ | ---------------------------- | ------------ |
| 18  | Critic Agent | Critic Agent specialist role | 34           |
| 19  | Risk Agent   | Risk Agent specialist role   | 18           |

### REEVALUATE

| ID  | Agent            | Role                             | Dependencies |
| --- | ---------------- | -------------------------------- | ------------ |
| 23  | Reevaluate Agent | Reevaluate Agent specialist role | none         |

### FEATURE

| ID  | Agent         | Role                          | Dependencies |
| --- | ------------- | ----------------------------- | ------------ |
| 24  | Feature Agent | Feature Agent specialist role | none         |

### QUESTIONNAIRE

| ID  | Agent               | Role                                | Dependencies |
| --- | ------------------- | ----------------------------------- | ------------ |
| 36  | Questionnaire Agent | Questionnaire Agent specialist role | none         |

### SCOPE_CHANGE

| ID  | Agent              | Role                               | Dependencies |
| --- | ------------------ | ---------------------------------- | ------------ |
| 37  | Scope Change Agent | Scope Change Agent specialist role | none         |
