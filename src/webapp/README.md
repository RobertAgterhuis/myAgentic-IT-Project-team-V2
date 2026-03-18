# myAgentic-IT-Project-team — Command Center

For full documentation, see **[docs/reference/technical-manual.md](../../docs/reference/technical-manual.md)**.
the agentic system uses

- **No database** — all state lives in your `BusinessDocs/` folder as JSON and
  Markdown files
- **Runtime dependencies:** `@modelcontextprotocol/sdk`, `ajv`, `ajv-formats`,
  `tsx`

## API Endpoints (selected)

| Method | Path                     | Description                                                                                                    |
| ------ | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/questionnaires`    | List all questionnaires with parsed questions                                                                  |
| GET    | `/api/session`           | Current session state (if exists)                                                                              |
| POST   | `/api/save`              | Save answer(s) for a questionnaire file (max 200 updates per request)                                          |
| POST   | `/api/reevaluate`        | Write reevaluation trigger file                                                                                |
| GET    | `/api/decisions`         | Parse and return all decisions from `decisions.md`                                                             |
| POST   | `/api/decisions`         | Create, answer, defer, or delete a decision (`action`: `create` / `answer` / `defer` / `delete`)               |
| POST   | `/api/command`           | Queue an agentic command (e.g. `CREATE`, `REEVALUATE`) and get clipboard text to paste in Copilot Chat         |
| GET    | `/api/command`           | Retrieve the currently queued command (or `null`)                                                              |
| GET    | `/api/progress`          | Live phase/agent progress derived from `session-state.json`                                                    |
| GET    | `/api/export`            | Export all questionnaire data as JSON                                                                          |
| GET    | `/api/help?topic=<slug>` | Without `topic`: returns help table-of-contents. With `topic`: returns the markdown content for that help file |
| GET    | `/api/health`            | Readiness probe (uptime, version, SSE connections, timestamp) — used by Docker HEALTHCHECK                     |
| GET    | `/api/dashboard/*`       | Dashboard aggregation endpoints (stats, activity, burndown)                                                    |
| GET    | `/api/metrics-dashboard` | Runtime metrics and per-endpoint timing data                                                                   |
| GET    | `/health`                | Liveness probe (status, version, uptime, store status)                                                         |
| GET    | `/events`                | SSE stream for real-time UI updates                                                                            |

## Reevaluation Flow

1. Answer questions in the UI
2. Click **Save** (or Ctrl+S)
3. Click **Reevaluate** → choose scope → confirm
4. The server writes `BusinessDocs/session/reevaluate-trigger.json`
5. In the Copilot chat, type `REEVALUATE ALL` (or the scope you selected)
6. The agentic system picks up the updated answers and re-processes

## Security Notes

- Server only listens on `127.0.0.1` — not accessible from the network
- Security headers on every response: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  and `Content-Security-Policy`
- All file writes use `safeWriteSync` with try-catch (returns 500 with a
  user-friendly message on I/O failure)
- Concurrent file writes protected by async file locking (per-file mutex)
- Path traversal protection on all file operations
- Request body limited to 1 MB
- Strict JSON content-type validation on POST endpoints
- Input string validation with `assertString()` (type + max-length enforcement)
- Batch save capped at 200 updates per request
- Question IDs validated against `Q-\d{2}-\d{3}` format
- Status values validated against allowed set (`OPEN`, `ANSWERED`, `DEFERRED`)
- Command validation uses strict allowlist matching
- PORT validated to 1–65535 range at startup
- Directory traversal depth limited to 20 levels
- SSE command queue capped at 50 entries
- Questionnaire index rebuild debounced (500ms) to prevent redundant I/O
- 405 responses include computed `Allow` header and security headers
- Server error handling with specific `EADDRINUSE` detection
