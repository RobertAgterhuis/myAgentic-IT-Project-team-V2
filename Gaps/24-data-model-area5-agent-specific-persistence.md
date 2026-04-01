# Area 5 — Agent-Specific Persistence

[🟡 MEDIUM] AGENT PERSISTENCE: agent run history
What should be stored: every invocation start/end, inputs, outputs, status, token/cost, errors.
What is actually stored: run-history snapshots plus per-agent output files and job/session events; no single canonical run table.
Storage mechanism: platform/engine/state-persistence.ts:247, src/webapp/routes/orchestrator.ts:2252, BusinessDocs/session/agent-runs/\*.md
Retrievability: PARTIALLY
Impact: reconstruction requires stitching multiple stores and file formats.

[🟡 MEDIUM] AGENT PERSISTENCE: artifact persistence
What should be stored: versioned artifacts with run linkage and rollback metadata.
What is actually stored: file artifacts plus registry lineage in memory-backed engine registry paths.
Storage mechanism: platform/engine/artifact-registration.ts:92, src/webapp/routes/artifacts.ts:85
Retrievability: PARTIALLY
Impact: artifact content is retrievable, version history is not first-class for all outputs.

[🟠 HIGH] AGENT PERSISTENCE: conversation and prompt history
What should be stored: full LLM prompt/response with model, token count, latency, and run correlation.
What is actually stored: chat session history for UI assistant messages; not full orchestrator LLM call ledger in one queryable model.
Storage mechanism: src/webapp/services/chat-service.ts:145, src/webapp/services/chat-service.ts:296
Retrievability: PARTIALLY
Impact: limited replay/debug for model behavior and token economics.

[🟠 HIGH] AGENT PERSISTENCE: tool call logs
What should be stored: structured tool invocations with inputs, outputs, duration, status.
What is actually stored: scattered logs/events and markdown artifacts; no dedicated durable tool-call table found.
Storage mechanism: distributed logging/event paths only
Retrievability: NO (as canonical structured store)
Impact: weak forensic capability for failed workflows.

[🟡 MEDIUM] AGENT PERSISTENCE: memory and knowledge tiers
What should be stored: scoped long-term memory with retention and pruning.
What is actually stored: semantic memory tiers backed by StorageProvider when available, with TTL/pruning logic.
Storage mechanism: platform/engine/semantic-memory.ts:34, src/webapp/server.ts:152, src/webapp/server.ts:212
Retrievability: YES
Impact: good baseline, but quality depends on selected provider and retention governance.

[🟠 HIGH] AGENT PERSISTENCE: workflow state resumability
What should be stored: durable step status + leases + transition intent.
What is actually stored: session-state + transition intent/completion + transition events + lease file.
Storage mechanism: platform/engine/state-persistence.ts:282, platform/engine/transition-event-log.ts:48, platform/engine/transition-lease.ts:84
Retrievability: YES
Impact: resumability exists, but mixed file/document paths and partial validation still permit drift/corruption under concurrent writes.

## 5A–5E Verdict

- Agent history: present but fragmented.
- Artifacts: persistent but unevenly versioned.
- Prompt history: partial.
- Memory: implemented and tiered.
- Resumability: implemented with write-ahead intent and lease/event logs, but still file-heavy and consistency-fragile.
