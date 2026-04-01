# Security Sweep 08: Governance and Action Abuse

## Scope

- Chat actions that mutate system state
- Approval/command operations reachable from chat flows
- Confirmation and role controls

## Findings

### 1) High-impact actions are executable through chat action endpoint

- Severity: MAJOR
- Evidence:
  - src/webapp/routes/chat.ts:1468
  - src/webapp/routes/chat.ts:1481
  - src/webapp/routes/chat.ts:1505
- Detail:
  - Chat actions can trigger governance approve/reject and queue command operations.
- Risk:
  - If action envelopes are forged, replayed, or generated under compromised prompt context, state changes are one request away.

### 2) Confirmation gate exists but depends on action metadata correctness

- Severity: MODERATE
- Evidence:
  - src/webapp/routes/chat.ts:1455
- Detail:
  - Confirmation is only enforced when `requires_confirmation` is true on the action payload.
- Risk:
  - Safety depends on correct action generation upstream. A missing/false confirmation flag weakens protection.

### 3) Positive controls: endpoint role checks are present

- Severity: DEFENSE
- Evidence:
  - src/webapp/routes/chat.ts:904
  - src/webapp/routes/chat.ts:923
- Detail:
  - Chat endpoints enforce operator/admin roles when auth middleware is active.

## Recommended Fixes

1. Server-side action policy map:

- Enforce confirmation by action type on server, independent of payload flag.
- Require `approve`, `reject`, and command-creating actions to always be confirmed.

2. Add replay/nonce protection to action envelopes:

- One-time token per action and short expiry.

3. Add immutable audit tags:

- Persist actor, source channel (`chat_action`), and action hash for forensic traceability.

## Verdict for this area

- Mutating operations are intentionally supported but rely on metadata-driven safeguards that should be hardened with server-enforced policy.
