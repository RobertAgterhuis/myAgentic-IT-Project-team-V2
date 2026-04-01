# Area 7 — Data Access Patterns & Layer Separation

[🟡 MEDIUM] DATA ACCESS: src/webapp/services/commands-service.ts:35
Issue: good service layer exists, but many other modules bypass it with direct fs access.
Pattern violation: inconsistent repository/service abstraction.
Risk: maintainability + integrity divergence across write paths.
Mitigation: enforce persistence via domain repositories only.

[🟠 HIGH] DATA ACCESS: src/webapp/services/auto-orchestration.ts:216
Issue: direct JSON file mutation for command queue/session state bypasses provider abstraction.
Pattern violation: data access scattered across services/routes.
Risk: data inconsistency under concurrent writes and lock-scope mismatch.
Mitigation: move queue/session persistence to dedicated provider-backed repository with strict schema checks.

[🟡 MEDIUM] DATA ACCESS: src/webapp/routes/jobs.ts:25
Issue: route layer instantiates queue objects and directly manipulates durable queue state.
Pattern violation: thin route -> service boundary is bypassed.
Risk: duplicated queue behavior and race-prone lifecycle management.
Mitigation: central job service singleton with ownership semantics.

[🟡 MEDIUM] DATA ACCESS: platform/engine/persistence/sqlite-provider.ts:280
Issue: list/query endpoints can run without mandatory limits.
Pattern violation: unbounded reads at persistence layer.
Risk: performance degradation as collections grow.
Mitigation: enforce default pagination/limits in provider and API layer.

[⚪ INFO] DATA ACCESS: platform/engine/persistence/sqlite-provider.ts:129
Issue: SQL uses parameterized queries in provider paths.
Pattern violation: none here.
Risk: low injection risk in these paths.
Mitigation: keep provider-level query parameterization mandatory.

[🟠 HIGH] DATA ACCESS: src/webapp/session-store-redis.ts:33
Issue: redis session store implementation exists but startup wiring does not clearly activate it by SESSION_STORE switch.
Pattern violation: configured capability without integrated access path.
Risk: operators assume distributed session durability that is not actually active.
Mitigation: explicit session-store factory and runtime assertion that selected store is in use.

## 7A–7D Verdict

- Dedicated data access layer: partial. Strong in some domains, scattered direct fs/sql in others.
- Query safety: generally parameterized in SQLite code; risk shifts to consistency/performance, not classic SQL injection.
- API-database mapping: mixed DTO rigor; several routes and services pass near-storage shapes directly.
- Caching layer: file cache exists (src/webapp/cache.ts:21) with mtime invalidation; no robust distributed cache invalidation strategy beyond local process context.
