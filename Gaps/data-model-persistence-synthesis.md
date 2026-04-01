# Data Model & Persistence Audit — Synthesis

## Data Model Health Overview

| Model/Entity                      |                      Defined                      | Schema Quality | CRUD Complete | Integrity Constraints | Indexed | Actively Used |
| --------------------------------- | :-----------------------------------------------: | :------------: | :-----------: | :-------------------: | :-----: | :-----------: |
| users                             |              src/webapp/auth.ts:153               |       8        |      YES      |          YES          |   YES   |      YES      |
| linked_accounts                   |              src/webapp/auth.ts:165               |       8        |      YES      |          YES          |   YES   |      YES      |
| sessions (auth)                   |              src/webapp/auth.ts:178               |       8        |      YES      |          YES          |   YES   |      YES      |
| workspaces                        | platform/engine/workspace/workspace-manager.ts:20 |       6        |      YES      |        PARTIAL        | PARTIAL |      YES      |
| projects                          | platform/engine/workspace/workspace-manager.ts:21 |       6        |      YES      |        PARTIAL        | PARTIAL |      YES      |
| jobs / jobs-dlq                   |    platform/engine/jobs/persistent-queue.ts:15    |       6        |    PARTIAL    |        PARTIAL        | PARTIAL |      YES      |
| audit_events                      |              src/webapp/audit.ts:82               |       7        |    PARTIAL    |          YES          |   NO    |      YES      |
| git_credentials                   |  src/webapp/services/git/credential-store.ts:88   |       7        |      YES      |        PARTIAL        |   YES   |      YES      |
| rag_collections/chunks/file_index |        src/webapp/services/rag/types.ts:50        |       8        |      YES      |          YES          | PARTIAL |      YES      |
| session-state.json                |     platform/engine/state-persistence.ts:120      |       5        |    PARTIAL    |        PARTIAL        |   NO    |      YES      |
| command-queue.json                |    src/webapp/services/commands-service.ts:35     |       5        |    PARTIAL    |        PARTIAL        |   NO    |      YES      |
| session tracker memory            |         src/webapp/session-tracker.ts:73          |       3        |      YES      |          NO           |   NO    |      YES      |

## Persistence Gap Summary

| Data Category            | Should Be Persisted | Actually Persisted |            Storage Mechanism             |  Retrievable   |
| ------------------------ | :-----------------: | :----------------: | :--------------------------------------: | :------------: |
| User accounts            |         ✅          |         ✅         |                  SQLite                  |      YES       |
| Project config           |         ✅          |         ✅         |       StorageProvider docs + files       |      YES       |
| Agent run history        |         ✅          |         ⚠️         |  run-history.json + artifacts + events   |    PARTIAL     |
| Generated artifacts      |         ✅          |         ✅         |      files + artifact registry view      |    PARTIAL     |
| LLM prompt/response logs |         ✅          |         🔴         |        partial chat history only         | NO (canonical) |
| Tool call logs           |         ✅          |         🔴         |           scattered logs only            | NO (canonical) |
| Workflow state           |         ✅          |         ✅         | session-state + transition events/lease  |      YES       |
| Human feedback/approvals |         ✅          |         ✅         |    governance state + decisions docs     |      YES       |
| Agent memory             |         ✅          |         ✅         | semantic-memory collections via provider |      YES       |
| Audit trail              |         ✅          |         ✅         |       JSONL + SQLite audit_events        |      YES       |

## Finding Count by Severity

| Severity    | Count |
| ----------- | ----- |
| 🔴 CRITICAL | 1     |
| 🟠 HIGH     | 12    |
| 🟡 MEDIUM   | 15    |
| 🔵 LOW      | 1     |
| ⚪ INFO     | 3     |
| TOTAL       | 32    |

## Top 10 Most Critical Findings

| Rank | Severity | Area | Model/Entity                           | Description                                                      | Data at Risk                                  |
| ---- | -------- | ---- | -------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| 1    | 🔴       | 8    | SQLite durability                      | No automated backup/restore strategy across critical DB files    | auth, identity, jobs, workspace, rag metadata |
| 2    | 🟠       | 3    | file-provider transaction              | best-effort sequential writes are not atomic                     | multi-document state coherence                |
| 3    | 🟠       | 5    | tool-call history                      | no canonical structured persistence for tool invocations         | forensic/debug traceability                   |
| 4    | 🟠       | 5    | LLM interaction ledger                 | no full prompt/response run table                                | reproducibility and model auditability        |
| 5    | 🟠       | 3/4  | queue persistence paths                | mixed direct fs and provider-backed updates                      | command/workflow consistency                  |
| 6    | 🟠       | 7    | session store wiring                   | redis session store exists but integration is unclear/incomplete | distributed session durability assumptions    |
| 7    | 🟠       | 4/8  | job retention                          | durable queue has no cleanup policy                              | unbounded storage growth                      |
| 8    | 🟠       | 2/3  | workspace/project relational integrity | logical references not DB-enforced                               | orphaned project/workspace refs               |
| 9    | 🟠       | 6    | migration fragmentation                | no unified migration framework                                   | schema drift and upgrade risk                 |
| 10   | 🟠       | 5    | session tracker volatility             | operational session timeline is memory-only                      | loss of execution evidence on restart         |

## Final Verdict

1. Persistence maturity

- Current level: between files on disk and basic database.
- Reality: production-ish components exist (SQLite, RAG, queue docs), but persistence is fragmented and lacks unified transactional and migration rigor.

2. Most likely normal-usage data loss scenario

- Concurrent updates hit file-based queue/session/chat paths. One writer overwrites stale content because there is no unified transactional model across all writers, causing silent loss of command or chat/session updates.

3. The big missing table

- Missing entity: workflow_runs (canonical run ledger).
- Why it matters: would unify trigger, steps, agent invocations, tool calls, prompts, outputs, costs, and final status in one queryable timeline.

4. Resumability test (kill server mid-workflow)

- Survives: session-state.json, transition-events.json, transition-lease.json, run-history.json, command-queue.json, durable provider collections, SQLite data.
- Lost: in-memory session tracker timelines, in-memory queue state (if memory queue active), in-process chat cache not yet flushed, transient runtime maps.

5. Scale breaking point

- Expected first break: file-heavy paths and unbounded lists/logs before core SQLite limits.
- Practical threshold: low thousands of runs/jobs/artifacts without retention and pagination hardening; list/read paths and operational reconciliation degrade first.

6. Data archaeology (investigating last week workflow failure)

- Possible: partial reconstruction from session files, run history, artifacts, audit logs.
- Missing: canonical tool-call ledger, full prompt/response provenance, guaranteed correlated run IDs across all stores.

7. Honest estimate (developer-weeks)

- 8 to 12 developer-weeks for a proper persistence layer:
  - 2 weeks schema architecture and unified model design
  - 2 to 3 weeks migrations framework and rollout tooling
  - 2 to 3 weeks repository/data-access consolidation and transaction hardening
  - 1 to 2 weeks retention/archival and backup/restore automation
  - 1 to 2 weeks observability, data quality checks, and migration testing

## Bottom Line

This system does persist important data, but it does so through multiple partially coordinated stores. It is not no-persistence; it is also not production-grade persistence yet. The highest risk is fragmentation: missing canonical workflow/tool-call models, weak cross-store atomicity, and absent formal durability operations.
