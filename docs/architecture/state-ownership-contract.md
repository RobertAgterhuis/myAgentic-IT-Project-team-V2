# State Ownership Architecture Contract

**Issue:** [P1-UI-E1-I3](https://github.com/RobertAgterhuis/myAgentic-IT-Project-team-V2/issues/1072)  
**Epic:** P1-UI-E1 — Architecture Decomposition and State Ownership  
**Status:** Active  
**Last updated:** 2026-03-24

---

## Purpose

This document defines where application state lives and why. Every new feature
must place state in the correct layer. Mismatch causes stale UI, redundant
fetches, or unsafe mutations.

---

## The Three Layers

### 1. TanStack Query — Server State

Use for any state that originates from or must synchronise with the server API.

| Characteristics                                      | Examples                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| Lives in the server; mirrors a REST resource         | Agents list, approvals, session data                               |
| Needs cache invalidation on mutation                 | After `POST /approve`, invalidate `queryKeys.governance.approvals` |
| Shared by multiple components                        | cockpit health shown in header AND dashboard                       |
| Benefits from background refetch / SSE-aware polling | Cockpit health, dependency graph                                   |

**Location:** `src/webapp/ui/src/hooks/use-*.ts` — one hook file per domain  
**Query keys:** always via `queryKeys` in `src/webapp/ui/src/lib/query-keys.ts`  
**Mutation pattern:** `useMutation` → `onSuccess: () => queryClient.invalidateQueries(...)`

**Canonical examples:**

```ts
// ✅ correct — server resource, shared data
export function useCockpitHealth() {
  const refetchInterval = useSSEAwareRefetchInterval(15_000);
  return useQuery({
    queryKey: queryKeys.cockpit.health,
    queryFn: () => apiGet<CockpitHealthResponse>('/v1/cockpit/health'),
    refetchInterval: POLL_ENABLED ? refetchInterval : false,
  });
}
```

---

### 2. Zustand — Client UI State

Use for purely client-side state that has no server counterpart and must survive
component unmount or be shared across distant components.

| Characteristics                                           | Examples                              |
| --------------------------------------------------------- | ------------------------------------- |
| No server equivalent                                      | Sidebar open/closed, modal visibility |
| Shared across layout boundaries (header ↔ sidebar ↔ main) | `sidebarOpen`, `chatOpen`             |
| Real-time signal aggregation                              | SSE connection status, last SSE event |
| Transient runtime event buffer                            | `RuntimeStore.events` (ring buffer)   |

**Stores:**

- `src/webapp/ui/src/stores/ui-store.ts` — layout, modals, help, connection status, last SSE event
- `src/webapp/ui/src/stores/runtime-store.ts` — runtime event buffer, active session ID
- `src/webapp/ui/src/stores/auth-store.ts` — authenticated user identity (hydrated once on mount)

**Canonical examples:**

```ts
// ✅ correct — client-only UI toggle, no server origin
const connectionStatus = useUIStore((s) => s.connectionStatus);
const hasSeenEvent = useUIStore((s) => !!s.lastSSEEvent);

// ✅ correct — transient ring buffer of runtime events
const events = useRuntimeStore((s) => s.events);
```

---

### 3. Local State (`useState` / `useReducer`) — Ephemeral Component State

Use for state that is completely internal to a single component and has no value
outside it.

| Characteristics                                        | Examples                             |
| ------------------------------------------------------ | ------------------------------------ |
| Scoped to one component's lifetime                     | Form input value, local loading flag |
| Not needed by siblings or parents                      | Active tab index within a card       |
| Destroyed when component unmounts without side-effects | Tooltip open/closed                  |

**Canonical examples:**

```ts
// ✅ correct — form field value never leaves this component
const [comment, setComment] = useState('');

// ✅ correct — toggle only this component needs to know
const [showDetails, setShowDetails] = useState(false);
```

---

## Decision Matrix

| Scenario                                                | Correct Layer                            |
| ------------------------------------------------------- | ---------------------------------------- |
| Data from a `GET /api/...` endpoint                     | TanStack Query                           |
| Data written by `POST/PATCH/DELETE` to an endpoint      | TanStack Query (+ invalidate on success) |
| Sidebar / modal / drawer visibility                     | Zustand (`ui-store`)                     |
| SSE connection health                                   | Zustand (`ui-store`)                     |
| Live agent execution events                             | Zustand (`runtime-store`)                |
| Logged-in user identity                                 | Zustand (`auth-store`)                   |
| Form field being edited                                 | Local `useState`                         |
| Toggle scoped to one card                               | Local `useState`                         |
| Pagination offset that resets on unmount                | Local `useState`                         |
| Pagination offset that should persist across navigation | TanStack Query (search param)            |

---

## SSE-First, Polling as Fallback

All TanStack Query hooks that poll live data MUST use `useSSEAwareRefetchInterval`:

```ts
import { useSSEAwareRefetchInterval } from '@/hooks/use-sse-aware-polling';

const refetchInterval = useSSEAwareRefetchInterval(15_000); // 15 s fallback
return useQuery({
  ...
  refetchInterval: POLL_ENABLED ? refetchInterval : false,
});
```

When `connectionStatus === 'connected'` and at least one SSE event has been
received, `useSSEAwareRefetchInterval` returns `false` — disabling the poll.
The SSE stream drives updates instead.

**Rule:** Never add a plain numeric `refetchInterval` to a cockpit / approval /
session query without first wrapping it with `useSSEAwareRefetchInterval`.

---

## Anti-Patterns

| Anti-pattern                                              | Fix                                                      |
| --------------------------------------------------------- | -------------------------------------------------------- |
| Fetching in a component via `fetch()` or `axios` directly | Move fetch to a `useQuery` hook                          |
| Storing API response in `useState`                        | Remove local state, consume from TanStack Query directly |
| Putting a loading spinner flag in Zustand                 | Use `useQuery.isLoading` instead                         |
| Polling every N ms without checking SSE health            | Wrap with `useSSEAwareRefetchInterval`                   |
| Using Zustand for data that needs cache invalidation      | Move to TanStack Query                                   |
| Using `useQuery` for UI toggle state                      | Move to local `useState`                                 |

---

## Ownership Table

| Domain                | State type     | Hook / Store                          |
| --------------------- | -------------- | ------------------------------------- |
| Agents list           | Server         | `use-agents.ts`                       |
| Agent execution jobs  | Server         | `use-agents.ts`                       |
| Cockpit health        | Server         | `use-cockpit.ts`                      |
| Approvals             | Server         | `use-governance.ts`, `use-cockpit.ts` |
| Sessions              | Server         | `use-sessions.ts`                     |
| Decisions             | Server         | `use-decisions.ts`                    |
| Questionnaires        | Server         | `use-questionnaires.ts`               |
| Dashboard metrics     | Server         | `use-dashboard.ts`                    |
| Sidebar open/close    | Client UI      | `ui-store` (`sidebarOpen`)            |
| Chat panel open       | Client UI      | `ui-store` (`chatOpen`)               |
| Confirm dialog        | Client UI      | `ui-store` (`confirmDialog`)          |
| SSE connection status | Client UI      | `ui-store` (`connectionStatus`)       |
| Last SSE event        | Client UI      | `ui-store` (`lastSSEEvent`)           |
| Runtime event buffer  | Client runtime | `runtime-store` (`events`)            |
| Active session        | Client runtime | `runtime-store` (`activeSessionId`)   |
| Authenticated user    | Client auth    | `auth-store`                          |
| Form fields           | Ephemeral      | local `useState`                      |

---

## Related

- [docs/architecture/overview.md](overview.md) — System architecture overview
- [src/webapp/ui/src/lib/query-keys.ts](../../src/webapp/ui/src/lib/query-keys.ts) — Canonical query key registry
- [src/webapp/ui/src/hooks/use-sse-aware-polling.ts](../../src/webapp/ui/src/hooks/use-sse-aware-polling.ts) — SSE-aware refetch helper
- [src/webapp/ui/src/stores/ui-store.ts](../../src/webapp/ui/src/stores/ui-store.ts)
- [src/webapp/ui/src/stores/runtime-store.ts](../../src/webapp/ui/src/stores/runtime-store.ts)
