# Ideas Response — Master Index

> Analysis authored: March 22, 2026  
> Source material: `ideas/ideas.md`, `ideas/mcp_plugin_architecture_mapping_document.md`, `ideas/mcp_plugin_architecture_addendum_identity_consent.md`  
> Methodology: Deep analysis of consultant recommendations mapped against the existing codebase and architecture.

---

## Purpose

This folder contains a domain-by-domain implementation analysis, phased roadmap, and synthesis derived from the external consultant's recommendations. Each domain receives a dedicated file to stay within manageable document length. This index provides orientation and cross-domain linkage.

---

## Domain Files

| #   | File                                                                       | Domain                                                       | Effort Estimate | Priority      |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------- | ------------- |
| 01  | [01-rag-knowledge-retrieval.md](01-rag-knowledge-retrieval.md)             | RAG / Knowledge Retrieval                                    | Large           | P1 — High     |
| 02  | [02-identity-authentication.md](02-identity-authentication.md)             | Identity & Authentication (Entra ID + MCP Workload Identity) | Large           | P1 — High     |
| 03  | [03-chat-conversational-interface.md](03-chat-conversational-interface.md) | Built-in Chat / Conversational Interface                     | Large           | P1 — High     |
| 04  | [04-git-backend.md](04-git-backend.md)                                     | Embedded Git Backend                                         | Medium          | P2 — Medium   |
| 05  | [05-help-system.md](05-help-system.md)                                     | Internal Help System (Per-Page)                              | Small–Medium    | P2 — Medium   |
| 06  | [06-mcp-plugin-architecture.md](06-mcp-plugin-architecture.md)             | MCP Plugin Architecture (RBAC + Identity + Governance)       | X-Large         | P0 — Critical |
| 07  | [07-synthesis.md](07-synthesis.md)                                         | Cross-Domain Synthesis & Master Roadmap                      | —               | —             |

---

## Support Files

| File                                                     | Purpose                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| [chat-grounding-protocol.md](chat-grounding-protocol.md) | Shared grounding and fallback contract for Domain 03 chat responses |

---

## Key Findings Summary

### What the consultant recommends

1. **RAG layer** — Add semantic retrieval as a _context plane_ alongside the existing deterministic control plane. Never use RAG as workflow state or governance authority.

2. **Microsoft Entra ID login** — Replace GitHub-only identity with a federated multi-provider model. Core architectural change to `auth.ts`.

3. **Built-in chat** — A governed operator console grounded in session state, artifacts, and policies with action buttons and citations. Positioned as the platform control surface.

4. **Embedded Git backend** — Replace OS `git` dependency with a pluggable backend (`isomorphic-git` primary, native fallback, provider API for metadata).

5. **Internal help system** — Per-page contextual help with two layers: inline summary and expandable topic detail. Reduces reliance on external documentation.

6. **MCP Plugin Architecture** — Plugin-driven, remote-first, agent-centric RBAC model with explicit bootstrap/reconcile flows, code-generated policy, Microsoft Entra workload identity per agent role, and explicit frontend enable/disable controls for MCP visibility and transparency.

### Current platform state (gap baseline)

| Capability         | Current State                     | Gap                                     |
| ------------------ | --------------------------------- | --------------------------------------- |
| Semantic retrieval | None                              | Full RAG stack needed                   |
| Identity providers | GitHub OAuth only (`auth.ts`)     | No Entra ID, no federated model         |
| In-platform chat   | None                              | Full feature needed                     |
| Git execution      | OS `git` process calls via shell  | No embedded backend                     |
| Contextual help    | Static docs + MCP `get_help` only | No per-page UI help                     |
| MCP governance     | Basic MCP server exposure         | No RBAC, no identity, no reconcile loop |

---

## Priority Stack Ranking

Based on the analysis in each domain file, the recommended implementation order is:

```text
P0-CRITICAL:  MCP Plugin Architecture (structural backbone — everything else depends on it)
P1-HIGH:      Identity & Authentication (gates enterprise adoption, required for MCP identity)
P1-HIGH:      RAG / Knowledge Retrieval (highest product intelligence gain)
P1-HIGH:      Built-in Chat (highest UX leverage; synergizes with RAG)
P2-MEDIUM:    Internal Help System (ships ahead of chat; lower complexity, immediate UX gain)
P2-MEDIUM:    Embedded Git Backend (systemic improvement, lower urgency)
```

---

## Milestone / Sprint Map

| Milestone | Domains                        | Deliverable                                                                |
| --------- | ------------------------------ | -------------------------------------------------------------------------- |
| M-INFRA-1 | MCP Architecture (foundations) | Plugin skeleton, CLI commands, agent catalog schema, remote registry model |
| M-INFRA-2 | Identity (core)                | Provider-agnostic auth refactor, Entra ID OIDC login                       |
| M-INFRA-3 | MCP Architecture (policy)      | RBAC matrix compilation, environment scopes, approval policies             |
| M-INTEL-1 | RAG (foundations)              | Vector store setup, indexer pipeline, first collections                    |
| M-INTEL-2 | RAG (integration)              | Agent context injection, cross-phase retrieval, decision similarity        |
| M-UX-1    | Help System                    | Per-page help infrastructure, content for top 10 pages                     |
| M-UX-2    | Chat (foundations)             | Chat API, session-grounded responses, action panel v1                      |
| M-UX-3    | Chat (full)                    | RAG-backed retrieval in chat, approval actions, operator flows             |
| M-GIT-1   | Git Backend                    | isomorphic-git embedded backend for core operations                        |
| M-GIT-2   | Git Backend (hardening)        | Native fallback, provider API backend, full integration                    |

---

## Reading Order

For implementation planning, read files in this order:

1. [06-mcp-plugin-architecture.md](06-mcp-plugin-architecture.md) — structural backbone
2. [02-identity-authentication.md](02-identity-authentication.md) — identity dependency
3. [01-rag-knowledge-retrieval.md](01-rag-knowledge-retrieval.md) — intelligence layer
4. [03-chat-conversational-interface.md](03-chat-conversational-interface.md) — user surface
5. [chat-grounding-protocol.md](chat-grounding-protocol.md) — chat grounding and fallback contract
6. [05-help-system.md](05-help-system.md) — near-term UX win
7. [04-git-backend.md](04-git-backend.md) — operational infrastructure
8. [07-synthesis.md](07-synthesis.md) — full cross-domain roadmap

---

_All domain files follow the same structure: Executive Summary → Gap Analysis → Phased Plan → Milestones → Epics → Issues → Risks → Handoff Checklist._
