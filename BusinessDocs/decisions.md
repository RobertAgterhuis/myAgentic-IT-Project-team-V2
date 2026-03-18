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

| Stack               | File                                                   | Count | Status   | Applicable |
| ------------------- | ------------------------------------------------------ | ----- | -------- | ---------- |
| Transformation      | [transformation.md](decisions/transformation.md)       | 15    | ACTIVE   | YES        |
| Reevaluation        | [reevaluation.md](decisions/reevaluation.md)           | 0     | ACTIVE   | YES        |
| GitHub Actions      | [github-actions.md](decisions/github-actions.md)       | 24    | ACTIVE   | PARTIAL    |
| TypeScript / ESLint | [typescript-eslint.md](decisions/typescript-eslint.md) | 24    | ACTIVE   | PARTIAL    |
| Cross-cutting       | [cross-cutting.md](decisions/cross-cutting.md)         | 9     | ACTIVE   | PARTIAL    |
| Bicep / IaC         | [bicep-iac.md](decisions/bicep-iac.md)                 | 29    | DEFERRED | PENDING    |
| Azure DevOps        | [azure-devops.md](decisions/azure-devops.md)           | 19    | DEFERRED | PENDING    |
| .NET / C#           | [dotnet.md](decisions/dotnet.md)                       | 19    | DEFERRED | PENDING    |
| Docker              | [docker.md](decisions/docker.md)                       | 20    | DEFERRED | PENDING    |
| Vite                | [vite.md](decisions/vite.md)                           | 11    | DEFERRED | PENDING    |
| NextJS              | [nextjs.md](decisions/nextjs.md)                       | 13    | DEFERRED | PENDING    |
| Microsoft Graph     | [microsoft-graph.md](decisions/microsoft-graph.md)     | 7     | DEFERRED | PENDING    |
| Entra ID            | [entra-id.md](decisions/entra-id.md)                   | 7     | DEFERRED | PENDING    |
| Exchange            | [exchange.md](decisions/exchange.md)                   | 5     | DEFERRED | PENDING    |
| Purview             | [purview.md](decisions/purview.md)                     | 5     | DEFERRED | PENDING    |
| Teams               | [teams.md](decisions/teams.md)                         | 6     | DEFERRED | PENDING    |
| SharePoint          | [sharepoint.md](decisions/sharepoint.md)               | 5     | DEFERRED | PENDING    |
| Lighthouse          | [lighthouse.md](decisions/lighthouse.md)               | 5     | DEFERRED | PENDING    |
| Playwright          | [playwright.md](decisions/playwright.md)               | 6     | DEFERRED | PENDING    |
| PowerShell          | [powershell.md](decisions/powershell.md)               | 6     | DEFERRED | PENDING    |

**Total:** 244 seed decisions (49 active, 32 individually deferred in partial
categories, 163 category-deferred)

### Uncategorized Decisions

> New decisions created via the webapp land here. Move them to a category file
> when appropriate.

| ID  | Priority | Scope | Decision | Notes | Date |
| --- | -------- | ----- | -------- | ----- | ---- |

---

## Change Log

- 2026-03-18T18:17:30.800Z | `expire` | `DEC-100` | source: webapp
