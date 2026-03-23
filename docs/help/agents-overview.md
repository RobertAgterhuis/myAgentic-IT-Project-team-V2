---
title: Agent Catalog and Dependencies
description: Agent roles across phases and dependency flow.
keywords:
  - agents
  - dependencies
  - phases
---

# Agent Catalog and Dependencies

The platform orchestrates specialized agents with explicit phase ownership and dependency order.

## Agent coverage

- Business and discovery: Agents `01` to `04`, `34`.
- Technical architecture: Agents `05` to `09`, `33`.
- UX and content: Agents `10` to `13`, `32`, `35`.
- Marketing and brand: Agents `14` to `16`, `30`, `31`.
- Cross-phase control: Agents `18`, `19` for critic and risk checks.
- Synthesis and execution: Agents `17`, `20` to `22`, `26` to `29`, `38`.
- Special flows: Agents `23`, `24`, `25`, `36`, `37`.

## Dependency principle

Most agents run after their listed upstream dependency completes. Gate transitions ensure downstream agents do not proceed while blocking items remain unresolved.

## Practical usage

Use agent outputs as phase artifacts. Treat dependency order as mandatory unless an approved exception path explicitly permits bypass.
