# Runtime Profiles Environment Contract

This document specifies the required and optional environment variables for each runtime profile supported by myAgentic-IT-Project-team.

## Profile Summary

| Profile                    | Use Case                   | External Services          | Startup Behavior          | Data Durability                |
| -------------------------- | -------------------------- | -------------------------- | ------------------------- | ------------------------------ |
| **local-dev**              | Developer workstation      | Optional (all)             | Tolerant; allows fallback | Ephemeral (file recovery only) |
| **ci-test**                | Automated testing          | Optional (all)             | Tolerant; deterministic   | Ephemeral (test isolation)     |
| **production-single-node** | Single-instance production | Partial (storage required) | Fail-closed; no fallback  | Persistent (SQLite required)   |
| **production-distributed** | Multi-instance HA          | Required (Redis + storage) | Fail-closed; no fallback  | Persistent (shared Redis + DB) |

## Environment Variables by Profile

### Common Variables (All Profiles)

| Variable   | Type     | Default       | Required | Description                                                                                                                        |
| ---------- | -------- | ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV` | `string` | `development` | No       | Set to `production` to enforce production profile, `test` for CI profile. Defaults to `development` (local-dev).                   |
| `PORT`     | `number` | `3000`        | No       | HTTP server port. Range: 1–65535.                                                                                                  |
| `HOST`     | `string` | `127.0.0.1`   | No       | HTTP server binding. Localhost default (`127.0.0.1`) exempts from proxy/auth requirements. Non-localhost triggers security checks. |

---

## Local Development (`local-dev`)

**Detection:** `NODE_ENV !== 'production'` AND localhost binding (`127.0.0.1`, `localhost`, `::1`).

**Example:** `npm start` (no env vars needed).

### Optional Variables

| Variable                                   | Type                                   | Default    | Notes                                                                                                                                        |
| ------------------------------------------ | -------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `STORAGE_PROVIDER`                         | `'file' \| 'sqlite'`                   | `'file'`   | File-based is zero-config; SQLite requires `STORAGE_PATH`.                                                                                   |
| `STORAGE_PATH`                             | `string`                               | Undefined  | Path to SQLite database file (if `STORAGE_PROVIDER=sqlite`). Auto-created if missing.                                                        |
| `QUEUE_PROVIDER`                           | `'memory' \| 'persistent' \| 'bullmq'` | `'memory'` | In-memory queue is ephemeral; good for dev.                                                                                                  |
| `SESSION_STORE`                            | `'sqlite' \| 'redis'`                  | `'sqlite'` | SQLite sessions are local; Redis requires `REDIS_URL`.                                                                                       |
| `REDIS_URL`                                | `string`                               | Undefined  | If omitted, Redis-backed features (SSE, distributed sessions, BullMQ) are disabled. If set but unreachable, logs warning; startup continues. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `string`                               | Undefined  | Optional; used for OAuth testing. If omitted, unauthenticated access allowed.                                                                |
| `API_KEY`                                  | `string` (24+ chars)                   | Undefined  | Optional; used for programmatic testing. Must be 24+ chars if set.                                                                           |
| `TRUST_PROXY`                              | `boolean \| string \| number`          | `false`    | Ignored on localhost; not enforced.                                                                                                          |

### Startup Behavior

- Tolerates missing external services.
- If storage provider init fails, logs warning and starts without persistent state.
- If Redis unavailable, logs warning and continues without Redis features.
- Logs are at `warn` level for missing services.

---

## CI/Test (`ci-test`)

**Detection:** `NODE_ENV=test`.

**Example:**

```bash
NODE_ENV=test npm test
```

### Optional Variables

| Variable                                   | Type                                   | Default    | Notes                                                            |
| ------------------------------------------ | -------------------------------------- | ---------- | ---------------------------------------------------------------- |
| `STORAGE_PROVIDER`                         | `'file' \| 'sqlite'`                   | `'file'`   | File storage for test isolation; SQLite per-test if needed.      |
| `STORAGE_PATH`                             | `string`                               | Undefined  | Optional; for SQLite-based tests. Auto-created in test temp dir. |
| `QUEUE_PROVIDER`                           | `'memory' \| 'persistent' \| 'bullmq'` | `'memory'` | In-memory is standard for test determinism.                      |
| `SESSION_STORE`                            | `'sqlite' \| 'redis'`                  | `'sqlite'` | SQLite provides good isolation.                                  |
| `REDIS_URL`                                | `string`                               | Undefined  | Optional. Only set if testing Redis-backed features explicitly.  |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `string`                               | Undefined  | Optional; provide fake values for OAuth path testing.            |
| `API_KEY`                                  | `string` (24+ chars)                   | Undefined  | Optional; provide fake value for API-key path testing.           |

### Startup Behavior

- Same as local-dev: tolerant of missing services.
- Used for isolation; each test run should have clean state.
- No external services should be assumed to be running.

---

## Production Single Node (`production-single-node`)

**Detection:** `NODE_ENV=production` OR non-localhost binding (`0.0.0.0`, `1.2.3.4`, etc.) with no Redis/BullMQ.

**Example:**

```bash
NODE_ENV=production \
  STORAGE_PROVIDER=sqlite \
  STORAGE_PATH=/var/lib/agentic/agentic.db \
  GITHUB_CLIENT_ID=... \
  GITHUB_CLIENT_SECRET=... \
  npm start
```

### Required Variables

| Variable                        | Type       | Constraints              | Description                                                       |
| ------------------------------- | ---------- | ------------------------ | ----------------------------------------------------------------- |
| `STORAGE_PROVIDER`              | `'sqlite'` | Fixed value              | Must be `sqlite`. File provider is not supported in production.   |
| `GITHUB_CLIENT_ID` or `API_KEY` | `string`   | Min 24 chars for API_KEY | Must configure at least one: GitHub OAuth credentials OR API_KEY. |

### Optional Variables

| Variable               | Type                           | Default                                 | Notes                                                                                                        |
| ---------------------- | ------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV`             | `'production'`                 | Implied if binding is non-local         | Explicit `production` also triggers single-node detection.                                                   |
| `STORAGE_PATH`         | `string`                       | `.agentic/agentic.db` (relative to cwd) | Must point to writable location. Auto-created if missing.                                                    |
| `QUEUE_PROVIDER`       | `'persistent' \| 'bullmq'`     | `'persistent'`                          | Persistent (file-backed) is safe for single node; BullMQ requires Redis.                                     |
| `SESSION_STORE`        | `'sqlite' \| 'redis'`          | `'sqlite'`                              | SQLite works; Redis optional (requires `REDIS_URL`).                                                         |
| `REDIS_URL`            | `string`                       | Undefined                               | Optional. If set, startup fails if unreachable (fail-closed). If omitted, only file-backed services used.    |
| `GITHUB_CLIENT_SECRET` | `string`                       | Required if using GitHub OAuth          | Pair with `GITHUB_CLIENT_ID` for OAuth-based auth.                                                           |
| `API_KEY`              | `string` (24+ chars)           | Undefined                               | Instead of OAuth; minimum 24 characters.                                                                     |
| `TRUST_PROXY`          | `number \| string \| string[]` | `false`                                 | **Required if behind proxy/load balancer.** Must be explicit: IP address, hop count, or list (never `true`). |
| `PORT`                 | `number`                       | `3000`                                  | Adjust if needed.                                                                                            |
| `HOST`                 | `string`                       | `0.0.0.0`                               | For production, typically `0.0.0.0` or specific IP. Non-localhost triggers auth enforcement.                 |

### Startup Behavior

- **Fail-closed:** Storage provider initialization failure → `exit(1)`.
- All required services must be reachable before startup succeeds.
- If `REDIS_URL` is set but unreachable → `exit(1)`.
- Startup logging explicitly communicates success or failure reasons.

---

## Production Distributed (`production-distributed`)

**Detection:** `NODE_ENV=production` OR non-localhost binding WITH `QUEUE_PROVIDER=bullmq`, `SESSION_STORE=redis`, and `REDIS_URL` set.

**Example:**

```bash
NODE_ENV=production \
  STORAGE_PROVIDER=sqlite \
  STORAGE_PATH=/shared-nfs/agentic.db \
  QUEUE_PROVIDER=bullmq \
  SESSION_STORE=redis \
  REDIS_URL=redis://redis-cluster:6379 \
  GITHUB_CLIENT_ID=... \
  GITHUB_CLIENT_SECRET=... \
  TRUST_PROXY=10 \
  npm start
```

### Required Variables

| Variable                                   | Type                              | Constraints                           | Description                                                                         |
| ------------------------------------------ | --------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| `STORAGE_PROVIDER`                         | `'sqlite'`                        | Fixed value                           | Must be `sqlite`. Shared database file on NFS or equivalent.                        |
| `QUEUE_PROVIDER`                           | `'bullmq'`                        | Fixed value                           | Must use BullMQ for distributed concurrency. Requires Redis.                        |
| `SESSION_STORE`                            | `'redis'`                         | Fixed value                           | Must use Redis-backed sessions for sharing across instances.                        |
| `REDIS_URL`                                | `string` (valid URL)              | `redis://host:port` or `rediss://...` | Must point to accessible Redis cluster. Startup fails if unreachable.               |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | `string` or `API_KEY` (24+ chars) | At least one auth method required     | OAuth credentials OR API_KEY (not both required, but at least one).                 |
| `TRUST_PROXY`                              | `number \| string \| string[]`    | Explicit (never `true`)               | **Required.** Load balancer in front; must specify proxy hop count or IP allowlist. |

### Optional Variables

| Variable                               | Type                 | Default               | Notes                                                                                 |
| -------------------------------------- | -------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| `STORAGE_PATH`                         | `string`             | `.agentic/agentic.db` | Path to shared database file (NFS, EBS, RDS, etc.). All instances must use same path. |
| `PORT`                                 | `number`             | `3000`                | Same on all instances for consistency.                                                |
| `HOST`                                 | `string`             | `0.0.0.0`             | Typically bind all interfaces or specific IP per instance.                            |
| `API_KEY`                              | `string` (24+ chars) | Undefined             | Alternative to GitHub OAuth. If both set, both work.                                  |
| Additional monitoring/metrics env vars |                      |                       | Observability tools can inject env vars for trace, logs, metrics.                     |

### Startup Behavior

- **Fail-closed:** Any infrastructure miss → `exit(1)`.
- All required services (storage, Redis, auth) must be reachable at startup.
- Instance registration via Redis pub/sub on successful startup.
- Load balancer health checks must wait for full startup (see `/api/health` endpoint).

---

## Migration Path

### From local-dev to production-single-node

1. Set `NODE_ENV=production`.
2. Set `STORAGE_PROVIDER=sqlite` and `STORAGE_PATH` (e.g., `/var/lib/agentic/agentic.db`).
3. Configure auth: `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` OR `API_KEY`.
4. If binding is non-localhost, set `TRUST_PROXY` explicitly.
5. Test locally with these env vars first (production profile detection works even on localhost if `NODE_ENV=production`).

### From production-single-node to production-distributed

1. Keep `STORAGE_PROVIDER=sqlite` but switch to shared NFS/EBS path.
2. Set `QUEUE_PROVIDER=bullmq` and `SESSION_STORE=redis`.
3. Set `REDIS_URL` to cluster endpoint.
4. Scale to multiple instances; each reads from same storage and Redis.

---

## Validation at Startup

The `runtime-profiles` module provides:

- `detectProfile()` — identifies the active profile from env vars.
- `validateProfile()` — checks provider combinations against the profile and returns errors/warnings.
- `hasAuthConfigured()` — checks for valid auth configuration.

Startup is enforced in [src/webapp/server.ts](../../src/webapp/server.ts) via `validateStartupRuntimeProfile()`,
which calls `validateProfile()` before bind and aborts with exit code 1 if `.valid === false`.

CI also includes a dedicated runtime profile contract gate in
[.github/workflows/ci.yml](../../.github/workflows/ci.yml) to run profile validation tests on every PR.

---

## References

- Source module: [src/webapp/runtime-profiles.ts](../runtime-profiles.ts)
- Integration: [src/webapp/server.ts](../server.ts) startup validation
- Profile documentation: [README.md](/README.md#runtime-profiles), [src/webapp/README.md](../README.md#runtime-providers), [docs/reference/technical-manual.md](/docs/reference/technical-manual.md#runtime-profiles)
