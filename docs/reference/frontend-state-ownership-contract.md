# Frontend State Ownership Contract

This contract defines where new state must live in the webapp UI.

## Decision Rule

1. Use TanStack Query for server-owned state.
2. Use Zustand for cross-page UI state that is not server-owned.
3. Use component local state for ephemeral, page-local interactions.

## TanStack Query (Server State)

Use Query when the source of truth is an API endpoint or server event stream.

Examples:

- Sessions, approvals, progress, orchestrator status
- Agent execution history and job status
- Policy evaluations and governance lists

Rules:

- Query keys must be defined in src/webapp/ui/src/lib/query-keys.ts.
- Mutations must invalidate affected query keys.
- Polling must use SSE-aware fallback via useSSEAwareRefetchInterval.

## Zustand (Client App State)

Use Zustand when state is UI-owned and reused across multiple pages/components.

Examples:

- Sidebar open/closed
- Help panel route/topic selection
- SSE connection status and last event
- Confirmation dialog shell state

Rules:

- Do not duplicate server entities in Zustand.
- Keep store actions synchronous and simple where possible.
- Keep state serializable unless strongly justified.

## Local Component State

Use component state for transient interactions scoped to one screen.

Examples:

- Form field drafts before submit
- Filter chips and panel toggles
- Selection state in a single page

Rules:

- Do not lift local state into Zustand unless reused across routes.
- Do not cache API payloads in local state as a second source of truth.

## Anti-Patterns

Avoid the following:

- Fetching server data into Zustand and Query at the same time.
- Copying Query data into useState just to render it.
- Adding polling loops when SSE already invalidates the same query key.

## Required Review Checks

For any UI PR touching data flow:

1. Identify each new state variable and classify it: Query, Zustand, or local.
2. Confirm there is a single source of truth for each entity.
3. Confirm polling uses SSE-aware fallback where SSE exists.
4. Confirm mutation invalidation covers all affected query keys.
