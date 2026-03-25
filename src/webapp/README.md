# myAgentic-IT-Project-team — Command Center

For full documentation, see **[docs/reference/technical-manual.md](../../docs/reference/technical-manual.md)**.

## Runtime Providers

The system uses a pluggable architecture for persistence and async work. By default:

- **Storage:** File-based JSON (local development) or SQLite (production)
- **Queue:** In-memory (local development) or BullMQ with Redis (production distributed)
- **Sessions:** SQLite (local development) or Redis (production distributed)
- **Audit trail:** All changes logged to `BusinessDocs/` as JSON and Markdown files (immutable history)

Configuration via environment variables; see [Configuration](#configuration) below.

### Default Local Development Setup

- `STORAGE_PROVIDER=file` — all state in `BusinessDocs/` folder
- `QUEUE_PROVIDER=memory` — in-process async work, does not survive restart
- `SESSION_STORE=sqlite` — session database in `.agentic/sessions.db`
- No `REDIS_URL` → Redis features disabled
- `NODE_ENV` defaults to `development`; startup allows degraded modes

This requires zero external services — everything works with a fresh clone.

### Production Setup (Single Node)

Set these environment variables:

```bash
NODE_ENV=production
STORAGE_PROVIDER=sqlite        # Persistent database storage
STORAGE_PATH=/data/agentic.db  # Must exist, is created if missing
QUEUE_PROVIDER=persistent      # Persistent job queue
```

Startup will **fail** (exit code 1) if `STORAGE_PROVIDER` initialization fails. Fallback to degraded mode is not allowed in production.

### Production Setup (Distributed)

For Redis-backed high-availability:

```bash
NODE_ENV=production
STORAGE_PROVIDER=sqlite
STORAGE_PATH=/data/agentic.db
QUEUE_PROVIDER=bullmq
SESSION_STORE=redis
REDIS_URL=redis://redis-primary:6379
```

The system will use Redis pub/sub for SSE, BullMQ for async work, and Redis-backed sessions.
All services must be reachable; startup fails if REDIS_URL is set but unreachable.

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

## Configuration

All configuration is environment-based. See `src/webapp/config.ts` for parsed defaults and validation.

**For complete environment variable requirements by profile, see [docs/reference/runtime-profiles-env-contract.md](../../docs/reference/runtime-profiles-env-contract.md).**

### Quick Reference Table

| Variable                                  | Default                                               | Production            | Notes                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                                    | `3000`                                                | `3000`                | Port to listen on (1–65535 range validated)                                                                                |
| `HOST`                                    | `127.0.0.1`                                           | varies                | Bind address; non-local bindings require auth or API_KEY                                                                   |
| `NODE_ENV`                                | `development`                                         | `production`          | Affects startup strictness: `production` enforces storage provider success                                                 |
| `STORAGE_PROVIDER`                        | `file`                                                | `sqlite`              | `file` = JSON in BusinessDocs/, `sqlite` = SQLite database                                                                 |
| `STORAGE_PATH`                            | `{PROJECT_ROOT}/.agentic/storage`                     | `/data/agentic.db`    | Path to storage backend (required for sqlite)                                                                              |
| `QUEUE_PROVIDER`                          | `memory`                                              | `persistent`/`bullmq` | Async job queue: `memory` = in-process, `persistent` = on-disk, `bullmq` = Redis-backed                                    |
| `SESSION_STORE`                           | `sqlite`                                              | `redis`               | Session state: `sqlite` = local database, `redis` = distributed                                                            |
| `REDIS_URL`                               | _(none)_                                              | varies                | Enable Redis features (sessions, pub/sub, BullMQ) — fails startup if set but unreachable                                   |
| `API_KEY`                                 | _(none)_                                              | {24+ chars}           | Enable API-only (non-OAuth) access for non-local bindings (minimum 24 characters)                                          |
| `GITHUB_CLIENT_ID`                        | _(none)_                                              | {GitHub App ID}       | GitHub OAuth client ID for login                                                                                           |
| `GITHUB_CLIENT_SECRET`                    | _(none)_                                              | {GitHub App Secret}   | GitHub OAuth client secret                                                                                                 |
| `TRUST_PROXY`                             | `false`                                               | varies                | Trusted proxy configuration (false/true/hop-count/CIDR/list); defaults to reject all forwarded IPs                         |
| `RATE_LIMIT_MAX`                          | `30`                                                  | `60` (recommended)    | Max requests per IP within the configured window for API rate limiting                                                     |
| `RATE_LIMIT_WINDOW_MS`                    | `60000`                                               | `60000`               | Rate-limit window length in milliseconds                                                                                   |
| `ENFORCE_PREDECESSOR_CONTRACT_CONTINUITY` | auto-by-profile (`false` local/CI, `true` production) | `true` or scoped JSON | Dispatcher continuity policy override. Accepts booleans (`true`/`false`) or JSON: `{"states":["PHASE_2"],"agents":["05"]}` |

### Startup Behavior

- **Local development** (`localhost` binding, `NODE_ENV !== production`):
  - Runtime profile contract is validated at startup; local-dev profile allows tolerant startup
  - Storage provider init failure logs warning but does not exit
  - Missing Redis/auth is allowed; system continues with fallback modes

- **Production** (`non-localhost` binding or `NODE_ENV=production`):
  - Runtime profile contract is validated before bind; invalid profile combinations abort startup
  - Requires auth: `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` OR `API_KEY` (minimum 24 chars)
  - Requires explicit `TRUST_PROXY` configuration for production profiles
  - Storage provider init failure **aborts startup** (exit code 1)
  - No fallback to degraded mode

## Security Notes

- Server only listens on `127.0.0.1` by default — not accessible from the network
- Non-local bindings require auth or API_KEY; all non-local `/api/**` requests rejected with 401 if missing
- Security headers on every response: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
  and `Content-Security-Policy` (without unsafe-inline)
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
- Rate limiting: API routes throttled (30 reqs/min); `/api/health` and `/api/events` exempt
- Proxy trust: explicit configuration required; defaults to false (secure-by-default)
