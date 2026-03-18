# Decisions: API Design

> Stack: api-design | Status: ACTIVE | Applicable: YES
>
> Created 2026-03-16. Best-practice decisions for RESTful API design, contract
> governance, error handling, versioning, and documentation for full-stack
> applications.

---

## Decided Items

| ID      | Priority | Scope                                 | Decision                                                                                                                                                                                                                                                                   | Notes | Date       |
| ------- | -------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---------- |
| DEC-311 | HIGH     | Phase 2 (API Style)                   | RESTful HTTP/JSON is the default for synchronous APIs. Use GraphQL only when clients require flexible/partial data retrieval across deeply nested domains. Use gRPC for internal service-to-service communication where latency is critical.                               |       | 2026-03-16 |
| DEC-312 | HIGH     | Phase 2 (Versioning Strategy)         | URL path versioning (`/api/v1/`) is mandatory for all public APIs. Header-based versioning is acceptable for internal APIs. Never introduce breaking changes without incrementing the major version. Maintain at most 2 concurrent versions.                               |       | 2026-03-16 |
| DEC-313 | HIGH     | Phase 2 (Error Response Format)       | Use RFC 9457 (Problem Details for HTTP APIs) as the error envelope. Every error response must include `type`, `title`, `status`, `detail`, and `instance`. Include `traceId` for correlation. Never expose stack traces or internal details in production.                 |       | 2026-03-16 |
| DEC-314 | HIGH     | Phase 2 (Request/Response Validation) | Validate all request bodies, query parameters, and path parameters at the API boundary using schema validation (JSON Schema, Zod, or equivalent). Reject invalid requests with 400 and descriptive Problem Details. Never trust client input.                              |       | 2026-03-16 |
| DEC-315 | HIGH     | Phase 2 (OpenAPI Specification)       | Yes. All REST APIs must have an OpenAPI 3.1 specification. Spec must be auto-generated from code annotations or kept in sync via CI contract tests. Spec drift (code ≠ spec) fails the build.                                                                              |       | 2026-03-16 |
| DEC-316 | HIGH     | Phase 2 (Pagination)                  | Cursor-based pagination is the default for large or frequently-changing collections. Offset-based pagination is acceptable for small, static datasets. Always return `totalCount` (when affordable), `nextCursor`/`prevCursor`, and `pageSize` in response metadata.       |       | 2026-03-16 |
| DEC-317 | MEDIUM   | Phase 2 (Idempotency)                 | All POST endpoints that create resources must support an `Idempotency-Key` header. PUT and DELETE are naturally idempotent. Document idempotency behavior in the OpenAPI spec. Store idempotency keys for at least 24 hours.                                               |       | 2026-03-16 |
| DEC-318 | MEDIUM   | Phase 2 (Content Negotiation)         | Default to `application/json` for request and response bodies. Support `Accept` header for content negotiation. Return `406 Not Acceptable` for unsupported media types. Use `application/octet-stream` for file downloads.                                                |       | 2026-03-16 |
| DEC-319 | MEDIUM   | Phase 2 (Rate Limiting)               | All public-facing APIs must enforce rate limits. Return `429 Too Many Requests` with `Retry-After` header. Include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers. Define limits per endpoint tier (public, authenticated, admin).              |       | 2026-03-16 |
| DEC-320 | MEDIUM   | Phase 2 (Naming Conventions)          | Use plural nouns for resource collections (`/users`, `/orders`). Use kebab-case for multi-word URL segments. Use camelCase for JSON property names. Use consistent verb semantics: GET (read), POST (create), PUT (full replace), PATCH (partial update), DELETE (remove). |       | 2026-03-16 |
