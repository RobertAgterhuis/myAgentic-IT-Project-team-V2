# Chat Grounding Protocol

> Scope: Support contract for Domain 03 chat responses  
> Primary domain: `03-chat-conversational-interface.md`

---

## Purpose

This document defines the minimum grounding rules for the built-in chat experience so it behaves like a governed operator console instead of an unconstrained assistant.

The protocol exists to ensure that:

- chat responses are anchored in platform state
- proposed actions are justified by cited evidence
- low-confidence answers fail safely
- governance flows stay deterministic

---

## Core Rules

1. Every substantive operational claim must be backed by at least one grounding source.
2. Every proposed action must be derived from the same grounded state shown to the operator.
3. If grounding is missing, contradictory, or stale, the system must ask for clarification or refuse to answer.
4. Structured platform records take precedence over summarization.
5. Chat is never the system of record.

---

## Grounding Source Order

Use sources in this order when available:

1. Live session state
2. Active approvals and gates
3. Artifact metadata and artifact content
4. Decisions and governance records
5. Policy records and runtime manifests
6. RAG retrieval results
7. Historical execution summaries

If a higher-priority source conflicts with a lower-priority source, the higher-priority source wins and the response should call out the conflict.

---

## Response Contract

A valid operational response should include:

- a direct answer
- citations for substantive claims
- optional actions only when platform state supports them
- links to the source screens or artifacts when possible

Minimum shape:

```typescript
interface GroundedChatResponse {
  content: string;
  citations: Array<{
    label: string;
    type:
      | 'session'
      | 'approval'
      | 'artifact'
      | 'decision'
      | 'policy'
      | 'rag_chunk';
    sourceId: string;
    excerpt?: string;
  }>;
  actions?: Array<{
    id: string;
    label: string;
    supportedByCitationIds: string[];
  }>;
  fallback?: {
    type: 'clarify' | 'refuse' | 'navigate';
    reason: string;
  };
}
```

---

## Safe Fallback Rules

Use fallback behavior when any of the following is true:

- intent classification confidence is below the configured threshold
- no valid citation can support a substantive answer
- multiple authoritative sources disagree
- the action would cross a governance boundary without required approval
- the request would expose secrets or RBAC-restricted information

Fallback outcomes:

- `clarify`: ask a narrower question
- `navigate`: send the operator to the correct screen with context
- `refuse`: decline unsupported or unsafe requests

---

## Action Emission Rules

An action button may only be shown when all conditions are true:

- the intent is classified with sufficient confidence
- the current user is authorized to see the action
- the cited platform state supports the action
- the downstream governed endpoint already exists

Chat must never create a hidden execution path around existing approvals, policy checks, or audit trails.

---

## Testing Expectations

The chat implementation should include automated checks for:

- citation coverage on governance and status responses
- low-confidence fallback behavior
- refusal when action support is missing
- disagreement handling when sources conflict
- RBAC-aware context filtering

Suggested baseline:

- 100% citation coverage for governance, approval, and session-status fixtures
- 0 unsupported actions emitted in low-confidence fixtures
- explicit fallback in every intentionally under-grounded test case

---

## Related Files

- [03-chat-conversational-interface.md](03-chat-conversational-interface.md)
- [06-mcp-plugin-architecture.md](06-mcp-plugin-architecture.md)
- [07-synthesis.md](07-synthesis.md)
