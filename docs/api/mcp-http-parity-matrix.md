# M20-001: MCP vs HTTP API Parity Matrix

> Generated: 2026-03-17 | Status: COMPLETE

## Summary

- **17 MCP tools** registered in `src/webapp/mcp-server.ts`
- **16 HTTP route modules** in `src/webapp/routes/`
- **3 MCP resources** (session-state, decisions, command-queue)

## Parity Matrix

| #   | MCP Tool              | HTTP Endpoint(s)                                    | Parity                                           | Duplicated Logic                                              | Recommendation                                  |
| --- | --------------------- | --------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------- |
| 1   | `get_project_status`  | `GET /api/session` (misc.ts)                        | PARTIAL — MCP adds commandQueue summary          | YES — both read session-state.json + command-queue.json       | CONVERGE → `SessionService.getProjectStatus()`  |
| 2   | `get_progress`        | `GET /api/progress` (progress.ts)                   | EQUIVALENT                                       | YES — both build progress from session-state                  | CONVERGE → `SessionService.getProgress()`       |
| 3   | `list_questionnaires` | `GET /api/questionnaires` (questionnaires.ts)       | EQUIVALENT                                       | YES — both walk BusinessDocs/ for \*-questionnaire.md         | CONVERGE → `QuestionnaireService.list()`        |
| 4   | `get_questionnaire`   | Embedded in `GET /api/questionnaires` response      | PARTIAL — MCP takes file param, HTTP returns all | YES — same parse logic                                        | CONVERGE → `QuestionnaireService.get(file)`     |
| 5   | `save_answers`        | `POST /api/save` (questionnaires.ts)                | EQUIVALENT                                       | YES — both update markdown content with file lock             | CONVERGE → `QuestionnaireService.saveAnswers()` |
| 6   | `list_decisions`      | `GET /api/decisions` (decisions.ts)                 | PARTIAL — HTTP includes categories               | YES — both parse decisions.md                                 | CONVERGE → `DecisionService.list()`             |
| 7   | `create_decision`     | `POST /api/decisions` action=create (decisions.ts)  | EQUIVALENT                                       | YES — both call models.addOpenQuestion/addOperationalDecision | CONVERGE → `DecisionService.create()`           |
| 8   | `answer_decision`     | `POST /api/decisions` action=answer (decisions.ts)  | EQUIVALENT                                       | YES — both call models.answerOpenQuestion                     | CONVERGE → `DecisionService.answer()`           |
| 9   | `decide_question`     | `POST /api/decisions` action=decide (decisions.ts)  | EQUIVALENT                                       | YES — both call models.moveToDecided                          | CONVERGE → `DecisionService.decide()`           |
| 10  | `queue_command`       | `POST /api/command` (commands.ts)                   | EQUIVALENT                                       | YES — both validate + append to command-queue.json            | CONVERGE → `CommandService.queue()`             |
| 11  | `get_command_queue`   | `GET /api/command` (commands.ts)                    | EQUIVALENT                                       | YES — both read command-queue.json                            | CONVERGE → `CommandService.getQueue()`          |
| 12  | `get_help`            | `GET /api/help` (misc.ts)                           | EQUIVALENT                                       | YES — both read docs/help/\*.md                               | CONVERGE → `HelpService.get()`                  |
| 13  | `check_drift`         | `GET /api/drift` (drift.ts)                         | EQUIVALENT                                       | YES — both call detectDrift with session + sync reports       | CONVERGE → `SessionService.checkDrift()`        |
| 14  | `get_audit_log`       | `GET /api/audit` (misc.ts)                          | EQUIVALENT                                       | YES — both call audit.read(limit)                             | CONVERGE → `AuditService.read()`                |
| 15  | `list_approvals`      | `GET /api/v1/approvals` (approvals.ts)              | EQUIVALENT                                       | YES — both call governance.getPendingApprovals()              | CONVERGE → `GovernanceService.listApprovals()`  |
| 16  | `approve_request`     | `POST /api/v1/approvals/:id/approve` (approvals.ts) | EQUIVALENT                                       | YES — both call governance.decide(id, user, true, reason)     | CONVERGE → `GovernanceService.approve()`        |
| 17  | `reject_request`      | `POST /api/v1/approvals/:id/reject` (approvals.ts)  | EQUIVALENT                                       | YES — both call governance.decide(id, user, false, reason)    | CONVERGE → `GovernanceService.reject()`         |

## HTTP-Only Operations (no MCP equivalent)

| HTTP Endpoint                                         | Route Module         | Notes                                      |
| ----------------------------------------------------- | -------------------- | ------------------------------------------ |
| `GET /api/agents`, `GET /api/agents/:id`              | agents.ts            | Agent metadata — non-critical for MCP      |
| `GET /api/v1/analytics/*`                             | analytics.ts         | Analytics dashboards — read-only telemetry |
| `GET /api/v1/artifacts/*`                             | artifacts.ts         | Artifact browsing — read-only              |
| `GET /api/dashboard/*`                                | dashboard.ts         | UI dashboard metrics                       |
| `GET /api/metrics/dashboard`                          | metrics-dashboard.ts | Unified metrics                            |
| `GET/POST /api/milestones/*`                          | milestones.ts        | Milestone CRUD                             |
| `GET /api/orchestrator/*`, `POST /api/orchestrator/*` | orchestrator.ts      | State machine engine                       |
| `GET /api/sessions/*`                                 | sessions.ts          | Session history browsing                   |
| `POST /api/subscribe`                                 | subscribe.ts         | Newsletter subscription                    |
| `GET /api/export`                                     | misc.ts              | Data export                                |
| `GET /api/sse/subscribe`                              | misc.ts              | SSE event stream                           |
| `GET /api/metrics`, `GET /api/health`                 | misc.ts              | Health/metrics endpoints                   |
| `POST /api/decisions/activate-category`               | decisions.ts         | Category activation                        |
| `POST /api/decisions` action=defer/expire/reopen/edit | decisions.ts         | Extended decision mutations                |

## MCP Resources

| Resource URI              | Equivalent HTTP                  | Notes                       |
| ------------------------- | -------------------------------- | --------------------------- |
| `agentic://session-state` | `GET /api/session`               | Same data, different format |
| `agentic://decisions`     | `GET /api/decisions`             | Same data                   |
| `agentic://command-queue` | `GET /api/command` (queue field) | Same data                   |

## Behavioral Differences

| Area                  | HTTP Route                                             | MCP Tool                                | Gap                                                  |
| --------------------- | ------------------------------------------------------ | --------------------------------------- | ---------------------------------------------------- |
| **File access**       | Uses `FileStore` singleton via `getStore()`            | Creates own `FileStore` instance        | Service layer should inject store                    |
| **Caching**           | Uses `FileCache` from context                          | Creates own `FileCache` instance        | Service layer should inject cache                    |
| **Audit logging**     | Uses `ctx._audit` from context                         | Creates own `AuditTrail` instance       | Service layer should inject audit                    |
| **SSE notifications** | Calls `sseNotify()` after mutations                    | No SSE (stdio transport)                | Service returns result; caller decides notifications |
| **Validation**        | Uses `schemas.*` + `assertString` + `sanitizeMarkdown` | Uses `schemas.*` + `sanitizeMarkdown`   | Converge in service layer                            |
| **Secret detection**  | Full `detectSecrets` + logging                         | Partial `detectSecrets`                 | Converge in service layer                            |
| **Error format**      | `{ error, code, details }` via `errorResponse()`       | `{ error: string }` via `errorResult()` | Service throws; caller formats                       |
| **File locking**      | `withFileLock()` always used                           | `withFileLock()` always used            | Keep in service layer                                |

## Service Layer Mapping (M20-002)

| Service Module             | Operations                                                                  | Source Files                                     |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| `decisions-service.ts`     | list, create, answer, decide, defer, expire, reopen, edit, activateCategory | decisions.ts + mcp-server.ts                     |
| `questionnaire-service.ts` | list, get, saveAnswers, rebuildIndex                                        | questionnaires.ts + mcp-server.ts                |
| `commands-service.ts`      | queue, getQueue, getLatest, validateCommand                                 | commands.ts + mcp-server.ts                      |
| `governance-service.ts`    | listApprovals, approve, reject                                              | approvals.ts + mcp-server.ts                     |
| `session-service.ts`       | getStatus, getProgress, checkDrift, readState                               | misc.ts + progress.ts + drift.ts + mcp-server.ts |
