# Decisions: Caching

> Stack: caching | Status: ACTIVE | Applicable: YES
>
> Created 2026-03-16. Best-practice decisions for caching layers, invalidation
> strategies, CDN usage, and cache governance for full-stack applications.

---

## Decided Items

| ID      | Priority | Scope                         | Decision                                                                                                                                                                                                                                                                                           | Notes | Date       |
| ------- | -------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------- |
| DEC-341 | HIGH     | Phase 2 (Caching Strategy)    | Apply caching at the layer closest to the consumer: browser cache → CDN → API gateway → application cache → database cache. Every cached value must have an explicit TTL. No cache-aside pattern without a documented invalidation strategy.                                                       |       | 2026-03-16 |
| DEC-342 | HIGH     | Phase 2 (Cache Invalidation)  | Use event-driven invalidation (publish cache-bust events on write operations) for mutable data. Use time-based expiration (TTL) for read-heavy/rarely-changing data. Never rely on manual cache clearing in production. Document cache invalidation triggers in the service's runbook.             |       | 2026-03-16 |
| DEC-343 | HIGH     | Phase 2 (HTTP Caching)        | Set `Cache-Control` headers on all responses. Use `no-store` for authenticated/personalized data. Use `max-age` + `stale-while-revalidate` for public cacheable resources. Set `ETag` or `Last-Modified` for conditional requests. Never cache error responses or 3xx redirects.                   |       | 2026-03-16 |
| DEC-344 | MEDIUM   | Phase 2 (CDN)                 | Serve all static assets (JS, CSS, images, fonts) via CDN with immutable cache headers and content-hashed filenames. Configure CDN to respect origin `Cache-Control`. Purge CDN cache as part of the deployment pipeline. Set up a fallback origin for CDN failure.                                 |       | 2026-03-16 |
| DEC-345 | MEDIUM   | Phase 2 (Distributed Cache)   | Use a distributed cache when: (a) multiple application instances need shared state, (b) database read load exceeds acceptable thresholds, (c) expensive computations are repeated with the same inputs. Redis is the recommended default. Set memory limits and eviction policies (`allkeys-lru`). |       | 2026-03-16 |
| DEC-346 | MEDIUM   | Phase 2 (Session/Token Cache) | Store session data in a distributed cache (Redis) — not in application memory — for horizontal scalability. Cache validated JWT claims to avoid repeated token introspection. Set cache TTL equal to token expiration. Invalidate cached sessions on logout/revocation.                            |       | 2026-03-16 |
| DEC-347 | LOW      | Phase 2 (Cache Warming)       | Pre-warm caches for critical paths after deployment (e.g., frequently-accessed reference data, configuration). Use lazy loading for all other cache entries. Pre-warming must complete before traffic is routed to the new instance.                                                               |       | 2026-03-16 |
| DEC-348 | LOW      | Phase 2 (Cache Monitoring)    | Monitor cache hit/miss ratios per cache layer. Alert when hit ratio drops below 80% for production caches. Track cache eviction rates, memory usage, and connection counts. Include cache metrics in application dashboards.                                                                       |       | 2026-03-16 |
