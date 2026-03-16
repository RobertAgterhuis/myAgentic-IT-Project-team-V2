# M17: Server Decomposition

> **Impact:** LOW | **Breaking changes:** NONE (internal refactor) | **Blocks:**
> nothing | **Blocked by:** nothing
>
> **Audit reference:** Weakness #4 — "Control-plane concentration risk. The
> server and orchestrator coordination logic remain dense. Even with modular
> routes, some central files carry a lot of responsibility."
>
> **Validation:** CONFIRMED. `server.ts` is ~560 lines and handles: HTTP server
> creation, custom router, static file serving, SSE management, rate limiting,
> API key guard, metrics collection, file watching, CORS, and wires 16 route
> modules. All concerns live in a single file.

---

## Rationale

A single dense server file increases maintenance risk, makes testing harder
(can't test rate limiting independently of routing), and will become a
bottleneck when adding features like WebSocket support, middleware chains, or
platform API versioning.

---

## Issues

### M17-001: Extract rate limiter into standalone module

**Labels:** `refactor`, `backend`

Move the in-memory rate limiter (currently inline in `server.ts` ~L63–80) to
`src/webapp/rate-limiter.ts`:

- Export a `createRateLimiter(options)` factory function
- Options: `windowMs`, `maxRequests`, `pruneIntervalMs`
- Return: `{ check(ip): { allowed: boolean, retryAfter?: number }, destroy() }`
- Add unit tests for rate limiter logic independently

**Acceptance criteria:**

- [ ] Rate limiter is a self-contained module with its own tests
- [ ] `server.ts` imports and uses the extracted module
- [ ] Behavior is identical (30 req/60s, periodic pruning)
- [ ] No breaking changes to API responses

---

### M17-002: Extract SSE manager into standalone module

**Labels:** `refactor`, `backend`

Move SSE connection management to `src/webapp/sse-manager.ts`:

- Export: `createSSEManager()` with methods `addClient(res)`,
  `broadcast(event, data)`, `destroy()`
- Handle heartbeat (30s), client disconnect cleanup, connection limits
- Add unit tests

**Acceptance criteria:**

- [ ] SSE logic is a self-contained module with tests
- [ ] `server.ts` uses the extracted SSE manager
- [ ] SSE endpoint (`/api/events`) behavior is unchanged

---

### M17-003: Extract static file handler

**Labels:** `refactor`, `backend`

Move static file serving logic to `src/webapp/static-handler.ts`:

- Export: `createStaticHandler(rootDir, options)` returning a request handler
- Handle: MIME types, cache headers, index.html fallback for SPA routing,
  conditional `Content-Security-Policy` for HTML vs assets
- Add unit tests for MIME resolution, path resolution, SPA fallback

**Acceptance criteria:**

- [ ] Static file serving is a self-contained module with tests
- [ ] `server.ts` uses the extracted handler
- [ ] SPA routing, MIME types, and CSP headers work identically

---

### M17-004: Extract metrics collector into standalone module

**Labels:** `refactor`, `backend`, `observability`

Move per-endpoint metrics collection and flushing to
`src/webapp/metrics-collector.ts`:

- Export: `createMetricsCollector(options)` with methods `record(endpoint,
duration, status)`, `flush()`, `getSnapshot()`, `destroy()`
- Options: `flushIntervalMs`, `outputPath`
- Add unit tests for recording, aggregation, and flushing

**Acceptance criteria:**

- [ ] Metrics collector is a self-contained module with tests
- [ ] `server.ts` uses the extracted metrics module
- [ ] `runtime-metrics.json` output format is unchanged

---

### M17-005: Create server composition root

**Labels:** `refactor`, `backend`

After extracting modules, refactor `server.ts` into a clear composition root:

- Import rate limiter, SSE manager, static handler, metrics, middleware, routes
- Wire them together in a readable `createServer()` function
- Target: `server.ts` should be < 200 lines — purely wiring, no business logic

**Acceptance criteria:**

- [ ] `server.ts` is < 200 lines
- [ ] All extracted modules are wired via explicit composition
- [ ] Server starts and passes all existing integration/smoke tests
- [ ] No behavioral changes

---

### M17-006: Document server architecture

**Labels:** `docs`, `backend`

Add `src/webapp/README.md` describing the server architecture:

- Module dependency diagram (text-based or Mermaid)
- Request lifecycle: incoming request → rate limiter → auth guard → router →
  route handler → response
- SSE lifecycle
- Metrics collection flow

**Acceptance criteria:**

- [ ] `src/webapp/README.md` exists with architecture overview
- [ ] Diagram matches actual module structure
