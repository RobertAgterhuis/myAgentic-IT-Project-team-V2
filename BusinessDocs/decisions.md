# Decisions & Open Questions

> This file is your direct communication channel with the Agentic Team.  
> The Orchestrator consults this file at every Sprint Gate and at the start of
> each sprint.  
> Fill it in yourself — agents automatically adapt their behavior based on the
> status below.
>
> **Web UI available:** Run `npm start` and open
> http://127.0.0.1:3000 → **Decisions** tab to view, create, and answer
> decisions in a visual interface. The web UI writes directly to this file.

---

## How does this file work?

| Column                  | Explanation                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| **ID**                  | Unique ID, format `DEC-NNN`                                                                           |
| **Type**                | `DECIDED` (you have decided) or `OPEN_QUESTION` (waiting for your answer)                             |
| **Status**              | `OPEN` · `DECIDED` · `DEFERRED` · `EXPIRED`                                                           |
| **Priority**            | `HIGH` · `MEDIUM` · `LOW`                                                                             |
| **Scope**               | Which phase, agent, or sprint this affects (e.g. `Phase 2`, `SP-3`, `PR/Review Agent`, `All sprints`) |
| **Decision / Question** | What has been decided or what needs to be answered                                                    |
| **Your answer / Notes** | Fill this in for OPEN_QUESTION so the Orchestrator can process it                                     |
| **Date**                | Date of entry or last update                                                                          |

**Orchestrator behavior rules:**

- `OPEN` + priority `HIGH` + sprint touches the scope → **Sprint Gate blocks**
  until you answer
- `OPEN` + priority `MEDIUM/LOW` → Orchestrator reports it but does not block
- `DECIDED` → Orchestrator injects the decision as a hard constraint into all
  relevant agents
- `DEFERRED` → Orchestrator ignores until date or scope trigger
- `EXPIRED` → Orchestrator ignores entirely

---

## Open Questions (waiting for your answer)

| ID  | Priority | Scope | Question | Your answer | Date |
| --- | -------- | ----- | -------- | ----------- | ---- |

## | | | | _(No open questions)_ | | |

## Decision Categories

> Decided items are organized by technology stack in separate files under
> `BusinessDocs/decisions/`. The Orchestrator reads **ACTIVE** category files at
> Sprint Gate and injects their decisions as hard constraints. **DEFERRED**
> categories are skipped — the Orchestrator auto-activates them when the agentic
> team detects the technology is needed (RULE ORC-45). You can also activate
> manually via the web UI.

| Stack               | File                                                             | Count | Status   | Applicable |
| ------------------- | ---------------------------------------------------------------- | ----- | -------- | ---------- |
| Transformation      | [transformation.md](decisions/transformation.md)                 | 15    | ACTIVE   | YES        |
| Reevaluation        | [reevaluation.md](decisions/reevaluation.md)                     | 0     | ACTIVE   | YES        |
| GitHub Actions      | [github-actions.md](decisions/github-actions.md)                 | 24    | ACTIVE   | PARTIAL    |
| TypeScript / ESLint | [typescript-eslint.md](decisions/typescript-eslint.md)           | 24    | ACTIVE   | YES        |
| Cross-cutting       | [cross-cutting.md](decisions/cross-cutting.md)                   | 12    | ACTIVE   | PARTIAL    |
| React / UI          | [react.md](decisions/react.md)                                   | 12    | ACTIVE   | YES        |
| Node.js / tsx       | [nodejs-runtime.md](decisions/nodejs-runtime.md)                 | 9     | ACTIVE   | YES        |
| Tailwind CSS        | [tailwind.md](decisions/tailwind.md)                             | 8     | ACTIVE   | YES        |
| Storybook           | [storybook.md](decisions/storybook.md)                           | 8     | ACTIVE   | YES        |
| API Design          | [api-design.md](decisions/api-design.md)                         | 10    | ACTIVE   | YES        |
| Database            | [database.md](decisions/database.md)                             | 10    | ACTIVE   | YES        |
| Authentication      | [authentication.md](decisions/authentication.md)                 | 10    | ACTIVE   | YES        |
| Caching             | [caching.md](decisions/caching.md)                               | 8     | ACTIVE   | YES        |
| Logging / Obs.      | [logging-observability.md](decisions/logging-observability.md)   | 10    | ACTIVE   | YES        |
| Error Handling      | [error-handling.md](decisions/error-handling.md)                 | 8     | ACTIVE   | YES        |
| Security            | [security.md](decisions/security.md)                             | 12    | ACTIVE   | YES        |
| Env Management      | [environment-management.md](decisions/environment-management.md) | 10    | ACTIVE   | YES        |
| Git Workflow        | [git-workflow.md](decisions/git-workflow.md)                     | 10    | ACTIVE   | YES        |
| i18n                | [i18n.md](decisions/i18n.md)                                     | 8     | ACTIVE   | YES        |
| Performance         | [performance.md](decisions/performance.md)                       | 10    | ACTIVE   | YES        |
| Monitoring          | [monitoring.md](decisions/monitoring.md)                         | 10    | ACTIVE   | YES        |
| Data Modeling       | [data-modeling.md](decisions/data-modeling.md)                   | 8     | ACTIVE   | YES        |
| Accessibility       | [accessibility.md](decisions/accessibility.md)                   | 10    | ACTIVE   | YES        |
| Documentation       | [documentation.md](decisions/documentation.md)                   | 8     | ACTIVE   | YES        |
| Testing Strategy    | [testing-strategy.md](decisions/testing-strategy.md)             | 10    | ACTIVE   | YES        |
| Background Jobs     | [background-jobs.md](decisions/background-jobs.md)               | 10    | ACTIVE   | YES        |
| File Storage        | [file-storage.md](decisions/file-storage.md)                     | 8     | ACTIVE   | YES        |
| Compliance/Privacy  | [compliance-privacy.md](decisions/compliance-privacy.md)         | 10    | ACTIVE   | YES        |
| Analytics           | [analytics.md](decisions/analytics.md)                           | 8     | ACTIVE   | YES        |
| CI/CD Pipeline      | [cicd-pipeline.md](decisions/cicd-pipeline.md)                   | 10    | ACTIVE   | YES        |
| Bicep / IaC         | [bicep-iac.md](decisions/bicep-iac.md)                           | 29    | DEFERRED | PENDING    |
| Azure DevOps        | [azure-devops.md](decisions/azure-devops.md)                     | 19    | DEFERRED | PENDING    |
| .NET / C#           | [dotnet.md](decisions/dotnet.md)                                 | 19    | DEFERRED | PENDING    |
| Docker              | [docker.md](decisions/docker.md)                                 | 20    | DEFERRED | PENDING    |
| Vite                | [vite.md](decisions/vite.md)                                     | 11    | DEFERRED | PENDING    |
| NextJS              | [nextjs.md](decisions/nextjs.md)                                 | 13    | DEFERRED | PENDING    |
| Microsoft Graph     | [microsoft-graph.md](decisions/microsoft-graph.md)               | 7     | DEFERRED | PENDING    |
| Entra ID            | [entra-id.md](decisions/entra-id.md)                             | 7     | DEFERRED | PENDING    |
| Exchange            | [exchange.md](decisions/exchange.md)                             | 5     | DEFERRED | PENDING    |
| Purview             | [purview.md](decisions/purview.md)                               | 5     | DEFERRED | PENDING    |
| Teams               | [teams.md](decisions/teams.md)                                   | 6     | DEFERRED | PENDING    |
| SharePoint          | [sharepoint.md](decisions/sharepoint.md)                         | 5     | DEFERRED | PENDING    |
| Lighthouse          | [lighthouse.md](decisions/lighthouse.md)                         | 5     | DEFERRED | PENDING    |
| Playwright          | [playwright.md](decisions/playwright.md)                         | 6     | DEFERRED | PENDING    |
| PowerShell          | [powershell.md](decisions/powershell.md)                         | 6     | DEFERRED | PENDING    |

**Total:** 479 decisions (311 active, 5 individually deferred in partial
categories, 163 category-deferred)

> **Reevaluation 2026-03-16 (round 3):** +56 decisions across 6 new
> best-practice files for production readiness: testing-strategy.md (10),
> background-jobs.md (10), file-storage.md (8), compliance-privacy.md (10),
> analytics.md (8), cicd-pipeline.md (10). DEC-453 through DEC-508.
>
> **Reevaluation 2026-03-16 (round 2):** +142 decisions across 15 new
> best-practice files for full-stack development: api-design.md (10),
> database.md (10), authentication.md (10), caching.md (8),
> logging-observability.md (10), error-handling.md (8), security.md (12),
> environment-management.md (10), git-workflow.md (10), i18n.md (8),
> performance.md (10), monitoring.md (10), data-modeling.md (8),
> accessibility.md (10), documentation.md (8). DEC-311 through DEC-452.
>
> **Reevaluation 2026-03-16 (round 1):** +37 decisions. 16 TypeScript decisions
> re-activated (were incorrectly deferred). 4 new files added: react.md (12),
> nodejs-runtime.md (9), tailwind.md (8), storybook.md (8). 3 cross-cutting
> decisions added (DEC-308–310). Multiple existing decisions updated for best
> practice alignment (see individual file headers for details).

### Uncategorized Decisions

> New decisions created via the webapp land here. Move them to a category file
> when appropriate.

| ID      | Priority | Scope | Decision           | Notes | Date |
| ------- | -------- | ----- | ------------------ | ----- | ---- |
| DEC-100 | —        | —     | _(Add a decision)_ |       |      |
