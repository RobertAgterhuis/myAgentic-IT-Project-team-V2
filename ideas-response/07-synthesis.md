# Domain 07 — Cross-Domain Synthesis & Master Roadmap

> Analysis date: March 22, 2026  
> Analyst: GitHub Copilot (based on consultant recommendations)  
> Sources: `ideas/ideas.md`, `ideas/mcp_plugin_architecture_mapping_document.md`, `ideas/mcp_plugin_architecture_addendum_identity_consent.md`  
> Domains analyzed: 06 (MCP Architecture), 02 (Identity), 01 (RAG), 03 (Chat), 05 (Help), 04 (Git)

---

## 1. Executive Summary

Analysis of the consultant's three recommendation documents reveals a coherent, interlocking platform expansion spanning six architectural domains. These are not independent features — they form a layered dependency stack where the MCP Plugin Architecture is the structural backbone and everything else integrates into it.

The platform currently has a functional but narrow foundation: GitHub OAuth, SQLite persistence, Express routing, a single MCP server with no governance, and agent execution logic that lacks tool-level control. The six domains collectively transform this into a **governed, multi-provider, AI-assisted, document-aware, audit-complete SDLC platform**.

**Main conclusion:** Build in the order defined by the dependency graph. Do not start Chat before RAG. Do not start Workload Identity before the provider abstraction layer. Do not build Experience Plane without Runtime Plane.

---

## 2. Dependency Graph

```
──────────────────────────────────────────────────────────────────────
                     DEPENDENCY FLOW
──────────────────────────────────────────────────────────────────────

[06] MCP Plugin Architecture                     ← P0 CRITICAL
       │
       ├──→ [02] Identity & Authentication        ← P0 CRITICAL
       │           │
       │           └──→ [04] Git Backend          ← P1 (needs credential binding in Phase 2)
       │           └──→ [06] Workload Identity    ← feeds back to Phase 5 of MCP
       │
       ├──→ [01] RAG / Knowledge Retrieval        ← P0 (parallel with Identity)
       │           │
       │           └──→ [03] Chat Interface       ← P1 (needs RAG Phase 2 context injection)
       │
       ├──→ [05] Help System                      ← P2 (mostly independent; can start any time)
       │
       └──→ [04] Git Backend                      ← P1 (Phase 1 independent; Phase 2 needs Identity)

──────────────────────────────────────────────────────────────────────
Immediate parallel start:
  [06] Phase 1 (plugin core)
  [02] Phase 1 (provider abstraction)
  [01] Phase 1 (RAG infrastructure)
  [05] Phase 1 (help scaffold)                ← cannot block any other domain
  [04] Phase 1 (isomorphic-git integration)  ← cannot block any other domain
──────────────────────────────────────────────────────────────────────
```

### Integration Points

| Integration                           | Source Domain     | Target Domain       | Description                                                    |
| ------------------------------------- | ----------------- | ------------------- | -------------------------------------------------------------- |
| Agent identity in MCP session         | 02 Identity       | 06 MCP Runtime      | Every MCP request carries agent role claim                     |
| Consent state in ToolExecutionGuard   | 02 Identity       | 06 MCP Runtime      | Microsoft tool calls blocked if consent missing                |
| RAG context injection into tool calls | 01 RAG            | 06 MCP Runtime      | Context plane enhances agent prompts before dispatch           |
| RAG as Chat context source            | 01 RAG            | 03 Chat             | Phase 2+ Chat pulls from indexed collections                   |
| Entra token for Git authentication    | 02 Identity       | 04 Git              | Phase 2 Git uses Entra credential (no PAT)                     |
| Approval-via-chat                     | 03 Chat           | 06 MCP Runtime      | Chat operator approves `approval_required` gate via message    |
| Chat gate failure explainer           | 06 MCP Runtime    | 03 Chat             | Why-blocked context rendered in Chat detail panel              |
| Help page for MCP diagnostics         | 05 Help           | 06 MCP Experience   | Per-page help in diagnostics/overrides pages                   |
| MCP enable-disable console            | 06 MCP Experience | Tenant/Workspace UX | User-facing transparency for which servers are enabled and why |
| Agent workload identity               | 02 Identity       | 06 Phase 5          | Entra app registrations per agent role                         |

---

## 3. Master Milestone Timeline

```
Quarter 1 — Infrastructure Core

  Sprint 1–2: M-INFRA-1a  (Domain 06, Phase 1)
    Plugin structure, agent catalog, server registry, CLI init/bootstrap

  Sprint 1–2: M-INFRA-2a  (Domain 02, Phase 1)
    IAuthProvider abstraction; GitHub provider migration

  Sprint 1–2: M-INTEL-1   (Domain 01, Phase 1)
    LanceDB + embeddings; deterministic loader patterns

  Sprint 1–2: M-UX-1a     (Domain 05, Phase 1)
    Help scaffold, PageHelp type, 3 help pages

  Sprint 1–2: M-GIT-1a    (Domain 04, Phase 1)
    isomorphic-git integration; GitBackend interface

Quarter 2 — Policy Plane & Identity

  Sprint 3–4: M-INFRA-3a  (Domain 06, Phase 2)
    RBAC matrix compilation; environment scope model; policy sync

  Sprint 3–4: M-INFRA-2b  (Domain 02, Phase 2)
    Entra OIDC provider; multi-provider session model; admin panel

  Sprint 3–4: M-INTEL-2   (Domain 01, Phase 2)
    8 RAG collections; semantic search; context composition layer

  Sprint 3–4: M-GIT-1b    (Domain 04, Phase 2)
    Native git fallback; provider credential binding (Entra)

Quarter 3 — Runtime Plane + Chat

  Sprint 5–6: M-INFRA-3b  (Domain 06, Phase 3)
    Runtime manifests; tools/list filtering; ToolExecutionGuard

  Sprint 5–6: M-UX-2a     (Domain 03, Phase 1)
    Chat service; intent classifier; basic operator console

  Sprint 5–6: M-UX-1b     (Domain 05, Phase 2)
    8 help pages; LLM-grounded help drawer; help API

Quarter 4 — Experience, Workload Identity, Advanced Chat

  Sprint 7–8: M-INFRA-3c  (Domain 06, Phase 4)
    Permission matrix UI; enable-disable console; override console; reconcile; doctor

  Sprint 7–8: M-INFRA-2c  (Domain 02, Phase 3)
    Agent workload identity; consent lifecycle; per-agent app registrations

  Sprint 7–8: M-INFRA-3d  (Domain 06, Phase 5)
    Consent state in ToolExecutionGuard; workload identity in manifests

  Sprint 7–8: M-UX-2b     (Domain 03, Phase 2)
    Context injection; RAG-backed responses; approval-via-chat

Year 2+ Quarter 1 — Full Intelligence

  Sprint 9–10: M-INTEL-3  (Domain 01, Phase 3)
    Cross-session learning; agent-preference tuning; anomaly surface

  Sprint 9–10: M-GIT-2   (Domain 04, Phase 3)
    Full Git provider API integration; branch/PR per agent; audit log

  Sprint 9–10: M-UX-3    (Domain 03, Phase 3)
    Multi-agent chat orchestration; approval UX complete; session copilot
```

---

## 4. Critical Path Analysis

The critical path (sequence that determines earliest completion of the full platform):

```
M-INFRA-1a (plugin core)
    → M-INFRA-3a (policy plane)
        → M-INFRA-3b (runtime plane)
            → M-INFRA-3c (experience + reconcile)
                → M-INFRA-3d (workload identity)

M-INFRA-2a (provider abstraction)
    → M-INFRA-2b (Entra OIDC)
        → M-INFRA-2c (workload identity)
            → feeds M-INFRA-3d
```

Identity and MCP Architecture are on the **same critical path** — they converge at workload identity.

RAG → Chat is a **parallel track** that can overlap with the critical path.

Git Backend and Help System are **off-critical** and can be worked independently by separate team members.

---

## 5. Build Priority Summary

| Priority | Domain                         | Reason                                                      |
| -------- | ------------------------------ | ----------------------------------------------------------- |
| P0       | 06 — MCP Plugin Architecture   | Structural backbone; everything plugs into this             |
| P0       | 02 — Identity & Authentication | Required for workload identity; required for multi-provider |
| P0       | 01 — RAG / Knowledge Retrieval | Required for Chat Phase 2; high business value immediately  |
| P1       | 03 — Chat Interface            | Depends on RAG Phase 2; high value but not blocking         |
| P1       | 04 — Git Backend               | Phase 1 independent; Phase 2 depends on Identity            |
| P2       | 05 — Help System               | Independent; can be done incrementally by any sprint        |

---

## 6. Issue Count Summary

| Domain              | Phase 1 | Phase 2 | Phase 3+ | Total Issues |
| ------------------- | ------- | ------- | -------- | ------------ |
| 06 MCP Architecture | 10      | 8       | 14       | ~32          |
| 02 Identity         | 8       | 7       | 6        | ~21          |
| 01 RAG              | 7       | 6       | 5        | ~18          |
| 03 Chat             | 6       | 7       | 6        | ~19          |
| 04 Git Backend      | 5       | 5       | 4        | ~14          |
| 05 Help System      | 5       | 4       | 3        | ~12          |
| **TOTAL**           | **41**  | **37**  | **38**   | **~116**     |

---

## 7. Risk Matrix

| ID     | Risk                                                             | Likelihood | Impact   | Domain(s) | Mitigation                                                                               |
| ------ | ---------------------------------------------------------------- | ---------- | -------- | --------- | ---------------------------------------------------------------------------------------- |
| RSK-01 | RBAC matrix inconsistency in policy compilation                  | High       | Critical | 06        | Automated policy tests covering all 12×8 permutations in CI                              |
| RSK-02 | Entra OIDC app registration complexity delays Identity Phase 2   | High       | High     | 02        | Spike story first sprint; T-shirt size before commit                                     |
| RSK-03 | RAG retrieval recall is insufficient for agent grounding         | Medium     | High     | 01        | Retrieval quality evaluation harness from Phase 1, not Phase 2                           |
| RSK-04 | Chat LLM response latency unacceptable for operator console      | Medium     | High     | 03        | Stream all chat responses from M-UX-2a onwards                                           |
| RSK-05 | isomorphic-git incompatibility with large repos                  | Medium     | Medium   | 04        | Latency SLA tests in Phase 1; native fallback tested in Phase 1                          |
| RSK-06 | Approval workflow creates UX friction and operator abandonment   | Medium     | High     | 03, 06    | Usability test approval flow before M-INFRA-3c; async approval notifications             |
| RSK-07 | Workload identity consent blocking Microsoft MCP servers in prod | High       | Critical | 02, 06    | Consent pre-check in `doctor`; tenant admin playbook                                     |
| RSK-08 | Tool execution guard latency hurts agent throughput              | Medium     | High     | 06        | Manifest caching; < 5ms target; Redis for multi-instance                                 |
| RSK-09 | SQLite bottleneck under concurrent agent sessions                | Low        | High     | All       | Monitor `better-sqlite3` WAL mode; plan PostgreSQL migration if concurrent sessions > 10 |
| RSK-10 | Reconcile command causes unintended policy regression            | Medium     | Critical | 06        | Mandatory dry-run + diff display before every apply                                      |
| RSK-11 | Users cannot understand why an MCP server is unavailable         | Medium     | High     | 06        | Explicit enablement console, inherited-disable messaging, and enablement history UI      |

---

## 8. Architecture Decision Log

| Decision                                                    | Rationale                                                  | Alternatives Rejected                                       |
| ----------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| Plugin-driven MCP governance, not hard-coded                | Allows tenant customization; clean upgrade path            | Inline MCP server policy — too rigid, untestable            |
| IAuthProvider abstraction before Entra                      | Migration-safe; GitHub still works during Entra rollout    | Direct Entra replacement — would break existing users       |
| LanceDB for vector storage                                  | Embedded, file-based, fast; no additional service to run   | Pinecone/Weaviate — external dependency; overkill for scale |
| Declarative code-generated policy (not DB-first)            | Prevents policy drift; enables PR review of policy changes | DB-only policy — no audit trail, no code review             |
| isomorphic-git always available as fallback                 | Eliminates hard dependency on system Git                   | Native-only — breaks in Docker/isolated environments        |
| Per-agent-role Entra app registrations (not one global app) | Principle of least privilege; per-role revocability        | Single shared app — too broad; consent cannot be scoped     |
| Remote-first MCP server model                               | All production servers are remote; local only for dev      | Local-only — would not work in production SaaS context      |
| Approval-via-chat for HITL gates                            | Operator stays in one interface; natural language approval | Separate approval UI — context switch; slower               |
| Explicit MCP enable-disable UI                              | Transparency and tenant control are mandatory for trust    | CLI-only enablement — too opaque for operators and admins   |

---

## 9. "What to Build First" Recommendation

**Sprint 1 should run three tracks in parallel:**

**Track A — MCP Governance Scaffold (1 engineer):**

- Plugin package structure (`defineAgents`, `defineServers`, etc.)
- Agent catalog schema + DB migration
- `init` CLI command
- MCP server enablement API shape (`tenant-enablement`, `workspace-enablement`)

**Track B — Auth Provider Abstraction (1 engineer):**

- `IAuthProvider` interface
- `GitHubAuthProvider` wrapping current `auth.ts`
- `AuthService.authenticate()` routing function
- Zero regression: GitHub users still log in

**Track C — RAG Infrastructure (1 engineer):**

- LanceDB + `@xenova/transformers` setup
- Document loader for existing decision logs and governance docs
- Semantic search endpoint (`/api/v1/intelligence/search`)

**Track D — Help Scaffold (any engineer, 2 days):**

- `PageHelp` React component
- First 3 help pages (dashboard, project create, project audit)
- Lowest effort, highest immediate visibility

After Sprint 1: All three P0 domains have foundations. Sprint 2 continues all tracks with Phase 1 completion.

---

## 10. Quality Gates

Each Phase boundary must clear these gates before the next phase starts:

| Gate                       | Before                 | Checks                                                                           |
| -------------------------- | ---------------------- | -------------------------------------------------------------------------------- |
| Phase 1 Completeness       | All Phase 1 milestones | All Phase 1 issues closed; doctor runs clean; unit test coverage > 80%           |
| Policy Plane Correctness   | M-INFRA-3a             | All 12×8 policy combinations tested; dry-run shows correct diff                  |
| Runtime Plane End-to-End   | M-INFRA-3b             | tools/list returns correct filtered set; unauthorized call blocked               |
| Experience Plane Usability | M-INFRA-3c             | Operator can navigate full permission matrix; override recorded with audit entry |
| Identity Completeness      | M-INFRA-2c             | All agent workload identities provisioned; consent status clean in `doctor`      |
| Chat Grounding Accuracy    | M-UX-2b                | RAG-backed responses pass retrieval quality threshold ≥ 0.75 precision@3         |

---

## 11. "Handoff to Implementation" Instruction Set

When the implementation team picks up this analysis, the following files in `ideas-response/` provide the complete picture:

| File                                                                         | Domain           | Dependency                                  |
| ---------------------------------------------------------------------------- | ---------------- | ------------------------------------------- |
| [00-index.md](./00-index.md)                                                 | Master index     | None (read first)                           |
| [06-mcp-plugin-architecture.md](./06-mcp-plugin-architecture.md)             | MCP Architecture | None (start first)                          |
| [02-identity-authentication.md](./02-identity-authentication.md)             | Identity         | Start in parallel with 06                   |
| [01-rag-knowledge-retrieval.md](./01-rag-knowledge-retrieval.md)             | RAG              | Start in parallel with 06                   |
| [05-help-system.md](./05-help-system.md)                                     | Help System      | Independent; start anytime                  |
| [04-git-backend.md](./04-git-backend.md)                                     | Git Backend      | Phase 1 independent; Phase 2 needs Identity |
| [03-chat-conversational-interface.md](./03-chat-conversational-interface.md) | Chat             | After RAG Phase 2 and MCP Runtime Plane     |
| [07-synthesis.md](./07-synthesis.md)                                         | This file        | Read for priority and sequencing            |

---

## HANDOFF CHECKLIST

- [x] Dependency graph documented with direction and integration points
- [x] Master milestone timeline ordered and sprint-assigned
- [x] Critical path identified (MCP + Identity converge at workload identity)
- [x] Build priority table with per-domain rationale
- [x] Risk matrix with 10 risks, mitigations
- [x] Architecture decision log with 8 major decisions
- [x] "What to build first" recommendation with 4 parallel tracks
- [x] Quality gates per phase boundary
- [x] Implementation handoff instruction set
- [x] All domain files cross-referenced
- [x] No contradictory statements
- [x] Deliverable written to file
