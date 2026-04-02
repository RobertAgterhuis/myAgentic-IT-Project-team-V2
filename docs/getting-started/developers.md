# Developer Quick Start

## Prerequisites

- Node.js 22+
- npm

## Local Setup

```bash
npm ci
npm ci --prefix src/webapp/ui
npm start
```

Open: `http://127.0.0.1:3000`

## Core Dev Commands

```bash
npm run build
npm run lint
npm run typecheck
npm run test:coverage
```

## Runtime Knobs

The backend runtime exposes a small set of operational env vars through `src/webapp/config.ts`.

- `OBSERVABILITY_SSE_MAX_CLIENTS`: cap concurrent SSE observability clients.
- `WEB_VITALS_SAMPLE_RETENTION_LIMIT`: retained browser vitals sample count on disk.
- `RAG_FRESHNESS_STALE_SEC`: stale threshold for RAG freshness observability.
- `MCP_HEALTH_INTERVAL_MS`: MCP health polling cadence.
- `MCP_HEALTH_FAILURE_THRESHOLD`: failed health-check count before unhealthy state.
- `STATIC_LOCALE_CACHE_MAX_AGE_SECONDS`: locale asset cache lifetime.

## Expected Workflow

1. Create a feature branch.
2. Implement changes with tests.
3. Run format, lint, coverage.
4. Open PR to `main`.
5. Merge only when CI is green.

See also: [Developer Workflow](../developer/workflow.md)
